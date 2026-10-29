"""Offline Bradley–Terry reanalysis. No conversations are accepted or emitted."""
from collections import Counter, defaultdict
from datetime import datetime, timezone
import math
import numpy as np
from scipy.optimize import minimize
from scipy.special import expit

METHOD_VERSION = 'public-votes-bt-v1'
MIN_VOTES = 100
COLUMNS = ['id', 'model_a', 'model_b', 'winner', 'evaluation_session_id', 'evaluation_order', 'timestamp']
OUTCOMES = {'model_a': 1., 'model_b': 0., 'tie': .5, 'both_bad': .5}


def timestamp(value):
    dt = value if isinstance(value, datetime) else datetime.fromisoformat(str(value).replace('Z', '+00:00'))
    if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat(timespec='microseconds').replace('+00:00', 'Z')


def period(rows):
    times = [r['timestamp'] for r in rows]
    return {'start': min(times), 'end': max(times)} if times else None


def prepare_votes(rows):
    counts = dict(inputRows=len(rows), invalidRows=0, duplicateRows=0, repeatedSessionRows=0)
    unique = {}
    for raw in rows:
        # Explicit allowlist: private/unknown columns are never retained.
        row = {key: raw.get(key) for key in COLUMNS}
        strings = ['id', 'model_a', 'model_b', 'evaluation_session_id']
        try:
            if any(not isinstance(row[k], str) or not row[k].strip() for k in strings): raise ValueError()
            if row['model_a'] == row['model_b'] or row['winner'] not in OUTCOMES: raise ValueError()
            order = row['evaluation_order']
            if isinstance(order, bool) or not isinstance(order, int) or order < 0: raise ValueError()
            row['timestamp'] = timestamp(row['timestamp'])
        except (ValueError, TypeError, OverflowError):
            counts['invalidRows'] += 1
            continue
        if row['id'] in unique:
            if unique[row['id']] != row: raise ValueError('Conflicting duplicate vote ID; input rejected (contents omitted).')
            counts['duplicateRows'] += 1
        else: unique[row['id']] = row
    source_period = period(list(unique.values()))
    ordered = sorted(unique.values(), key=lambda r: (r['evaluation_session_id'], r['evaluation_order'], r['timestamp'], r['id']))
    selected, sessions = [], set()
    for row in ordered:
        if row['evaluation_session_id'] in sessions:
            counts['repeatedSessionRows'] += 1
            continue
        sessions.add(row['evaluation_session_id'])
        selected.append(row)
    counts.update(uniqueSessions=len(selected), retainedRows=len(selected),
                  ties=sum(r['winner'] == 'tie' for r in selected),
                  bothBad=sum(r['winner'] == 'both_bad' for r in selected))
    return selected, counts, source_period


def sample_counts(rows):
    return Counter(model for row in rows for model in (row['model_a'], row['model_b']))


def components(model_ids, edges):
    result, remaining = [], set(model_ids)
    while remaining:
        stack, group = [min(remaining)], set()
        while stack:
            node = stack.pop()
            if node in group: continue
            group.add(node)
            stack.extend(sorted(edges[node] - group))
        remaining -= group
        result.append(sorted(group))
    return result


def is_strongly_connected(ids, directed):
    def reachable(edges):
        seen, stack = set(), [ids[0]]
        while stack:
            node = stack.pop()
            if node not in seen:
                seen.add(node)
                stack.extend(edges[node] - seen)
        return len(seen) == len(ids)
    reverse = defaultdict(set)
    for a in ids:
        for b in directed[a]: reverse[b].add(a)
    return reachable(directed) and reachable(reverse)


def fit_component(ids, rows):
    n = len(ids)
    index = {name: i for i, name in enumerate(ids)}
    # Aggregate only identical pair/outcome bins, preserving sandwich second moments.
    bins = Counter()
    for row in rows:
        a, b = index[row['model_a']], index[row['model_b']]
        y = OUTCOMES[row['winner']]
        if a > b: a, b, y = b, a, 1-y
        bins[a, b, y] += 1
    keys = sorted(bins)
    pairs = np.array([[a, b] for a, b, _ in keys])
    y = np.array([y for _, _, y in keys])
    weights = np.array([bins[key] for key in keys], dtype=float)
    # beta = T @ theta, so sum(beta) = 0 without an arbitrary anchor model.
    transform = np.vstack([np.eye(n-1), -np.ones(n-1)])
    x = transform[pairs[:, 0]] - transform[pairs[:, 1]]
    def objective(theta):
        d = x @ theta
        return (np.sum(weights*(np.logaddexp(0, d)-y*d))/weights.sum(),
                x.T @ (weights*(expit(d)-y))/weights.sum())
    fit = minimize(objective, np.zeros(n-1), jac=True, method='L-BFGS-B',
                   options={'maxiter': 2000, 'ftol': 1e-12, 'gtol': 1e-8})
    if not fit.success or np.max(np.abs(fit.jac)) > 1e-6: raise ArithmeticError('Optimization did not converge')
    p = expit(x @ fit.x)
    h = x.T @ ((weights*p*(1-p))[:, None]*x)
    j = x.T @ ((weights*(y-p)**2)[:, None]*x)
    if not np.isfinite(h).all() or np.linalg.cond(h) > 1e12: raise ArithmeticError('Singular or unstable Hessian')
    inverse = np.linalg.inv(h)
    covariance = transform @ inverse @ j @ inverse @ transform.T
    variance = np.diag(covariance)
    if not np.isfinite(variance).all() or np.any(variance < -1e-10): raise ArithmeticError('Invalid variance')
    alpha = 400/math.log(10)
    ratings = 1000+alpha*(transform @ fit.x)
    widths = 1.959963984540054*alpha*np.sqrt(np.maximum(variance, 0))
    if not np.isfinite(ratings).all() or not np.isfinite(widths).all(): raise ArithmeticError('Non-finite ratings')
    return [(float(r), [float(r-w), float(r+w)]) for r, w in zip(ratings, widths)]


def compute_snapshot(raw_rows, min_votes=MIN_VOTES):
    if min_votes < 1: raise ValueError('min_votes must be positive')
    rows, counts, source_period = prepare_votes(raw_rows)
    original_counts = sample_counts(rows)
    original_opponents = defaultdict(set)
    for row in rows:
        original_opponents[row['model_a']].add(row['model_b'])
        original_opponents[row['model_b']].add(row['model_a'])
    active = set(original_counts)
    filtered = rows
    while active:
        count = sample_counts(filtered)
        remove = {m for m in active if count[m] < min_votes}
        if not remove: break
        active -= remove
        filtered = [r for r in filtered if r['model_a'] in active and r['model_b'] in active]
    edges, directed = defaultdict(set), defaultdict(set)
    for row in filtered:
        a, b, y = row['model_a'], row['model_b'], OUTCOMES[row['winner']]
        edges[a].add(b); edges[b].add(a)
        if y > 0: directed[a].add(b)
        if y < 1: directed[b].add(a)
    result = []
    for ids in components(active, edges):
        group = set(ids)
        battles = [r for r in filtered if r['model_a'] in group]
        count = sample_counts(battles)
        strong = is_strongly_connected(ids, directed)
        status, scores = 'unidentifiable', [(None, None)]*len(ids)
        if strong and len(ids) > 1:
            try:
                scores = fit_component(ids, battles)
                status = 'scored'
            except (ArithmeticError, np.linalg.LinAlgError): status = 'numerical-failure'
        models = [dict(id=m, settings=None, samples=count[m], opponents=len(edges[m]),
                       rating=round(score, 6) if score is not None else None,
                       ci95=[round(v, 6) for v in ci] if ci is not None else None,
                       status=status) for m, (score, ci) in zip(ids, scores)]
        result.append(dict(id=f'component-{len(result)+1}', modelIds=ids, votes=len(battles),
                           connected=True, stronglyConnected=strong, status=status, models=models))
    excluded = [dict(id=m, settings=None, samples=original_counts[m], opponents=len(original_opponents[m]),
                     rating=None, ci95=None, status='insufficient-samples') for m in sorted(set(original_counts)-active)]
    counts.update(fittingRows=len(filtered), filteredRows=len(rows)-len(filtered),
                  scoredRows=sum(c['votes'] for c in result if c['status'] == 'scored'))
    return dict(counts=counts, period=source_period, usedPeriod=period(filtered),
                modelCount=len(original_counts), components=result, excludedModels=excluded)
