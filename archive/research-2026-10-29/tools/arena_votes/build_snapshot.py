"""Run manually outside the frontend. Failure never writes a result snapshot."""
import argparse
import hashlib
import importlib.metadata
import json
from pathlib import Path
import platform
import re
import sys
import urllib.request

DATASET = 'lmarena-ai/arena-human-preference-140k'
REVISION = '6322995'  # Immutable commit reference observed on the official dataset card.
ROOT = Path(__file__).resolve().parents[2]
PACKAGES = {'numpy': '2.2.5', 'scipy': '1.15.3', 'pyarrow': '19.0.1'}


def fetch_json(url):
    with urllib.request.urlopen(url, timeout=30) as response:
        return json.load(response)


def digest(path):
    with path.open('rb') as file: return hashlib.file_digest(file, 'sha256').hexdigest()


def download(url, path, expected_hash=None):
    if not isinstance(expected_hash, str) or not re.fullmatch(r'[a-f0-9]{64}', expected_hash):
        raise ValueError('Expected source SHA256 is required before downloading')
    if path.exists() and digest(path) == expected_hash: return
    temp = path.with_suffix(path.suffix+'.part')
    try:
        with urllib.request.urlopen(url, timeout=60) as response, temp.open('wb') as file:
            while chunk := response.read(1024*1024): file.write(chunk)
        if digest(temp) != expected_hash: raise ValueError('Dataset file hash mismatch')
        temp.replace(path)
    finally:
        if temp.exists(): temp.unlink()


def build(cache, output):
    actual = {p: importlib.metadata.version(p) for p in PACKAGES}
    if actual != PACKAGES: raise ValueError('Install the exact versions in tools/arena_votes/requirements.txt')
    import pyarrow.parquet as pq
    from compute import COLUMNS, MIN_VOTES, METHOD_VERSION, compute_snapshot
    info = fetch_json(f'https://huggingface.co/api/datasets/{DATASET}/revision/{REVISION}?blobs=true')
    revision = info['sha']
    if not re.fullmatch(r'[a-f0-9]{40}', revision) or not revision.startswith(REVISION):
        raise ValueError('Pinned dataset revision did not resolve as expected')
    if info.get('cardData', {}).get('license') != 'cc-by-4.0':
        raise ValueError('Dataset license metadata changed or unavailable; no snapshot written')
    files = sorted((f for f in info['siblings'] if re.fullmatch(r'data/train-\d{5}-of-00007\.parquet', f['rfilename'])), key=lambda f:f['rfilename'])
    if [f['rfilename'] for f in files] != [f'data/train-{i:05d}-of-00007.parquet' for i in range(7)]:
        raise ValueError('Expected all seven pinned dataset shards')
    if any(not re.fullmatch(r'[a-f0-9]{64}', f.get('lfs', {}).get('sha256', '')) for f in files):
        raise ValueError('Source SHA256 missing; refusing unverified dataset files')
    cache = cache / revision
    cache.mkdir(parents=True, exist_ok=True)
    rows, hashes = [], []
    for index, entry in enumerate(files):
        name = entry['rfilename']
        path = cache / Path(name).name
        expected = entry.get('lfs', {}).get('sha256')
        download(f'https://huggingface.co/datasets/{DATASET}/resolve/{revision}/{name}', path, expected)
        # Conversation/prompt columns are NOT decoded or logged.
        table = pq.read_table(path, columns=COLUMNS)
        rows.extend(table.to_pylist())
        hashes.append({'path': name, 'sha256': digest(path)})
        print(f'Shard {index+1}/7: {table.num_rows} metadata rows')
    if not rows: raise ValueError('No real data received; no snapshot written')
    result = compute_snapshot(rows)
    if result['counts']['retainedRows'] == 0: raise ValueError('No valid sessions; no snapshot written')
    if not all(result['period'][key].startswith('2025-') for key in ['start', 'end']):
        raise ValueError('Observed period is outside the historical 2025 UI contract; review required')
    result.update(schemaVersion=1,
        source=dict(datasetId=DATASET, revision=revision,
                    url=f'https://huggingface.co/datasets/{DATASET}/tree/{revision}',
                    license='CC-BY-4.0', licenseUrl='https://creativecommons.org/licenses/by/4.0/',
                    attribution='Arena / LMArena — arena-human-preference-140k', files=hashes),
        method=dict(version=METHOD_VERSION, name='Bradley–Terry · 세션당 첫 표 · 집단별 sandwich 95% CI',
                    reference='https://arena.ai/blog/arena-rank', minVotes=MIN_VOTES, ciLevel=.95,
                    changes='공개 투표를 독립 재분석. 반복 세션 제거·최소 표본 필터·연결 집단별 합계 0 제약. 스타일/인기 보정 없음.',
                    settings=dict(tie=.5, bothBad=.5, sessions='first-valid-order-timestamp-id',
                                  scale=400, base=10, center=1000, optimizer='L-BFGS-B',
                                  maxiter=2000, ftol=1e-12, gtol=1e-8, hessianRegularization=0,
                                  inferenceSettings=None, category='overall'),
                    packages={**actual, 'python': platform.python_version()},
                    scriptSha256=digest(Path(__file__)), computeSha256=digest(Path(__file__).with_name('compute.py'))))
    # JSON allow_nan=False makes non-finite output a hard failure; atomic replacement.
    encoded = json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2, allow_nan=False)+'\n'
    output.parent.mkdir(parents=True, exist_ok=True)
    temp = output.with_suffix('.json.tmp')
    try:
        temp.write_text(encoded, encoding='utf-8')
        temp.replace(output)
    finally:
        if temp.exists(): temp.unlink()
    print(json.dumps({'output':str(output), 'rows':result['counts'], 'models':result['modelCount'],
                      'period':result['period'], 'revision':revision}, ensure_ascii=True))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, default=ROOT/'.arena-cache')
    parser.add_argument('--output', type=Path, default=ROOT/'public/data/arena-public-votes.json')
    args = parser.parse_args()
    try: build(args.cache, args.output)
    except Exception as exc:
        # Never dump dataset records, request bodies, or credential-bearing URLs.
        print(f'Snapshot NOT generated ({type(exc).__name__}). Check pinned dependencies/network/source metadata. Existing output unchanged.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__': raise SystemExit(main())
