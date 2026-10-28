import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { buildGuideBundle, compareCandidates, comparisonMatches, DEMO_REQUEST, interpretTask, selectForStages } from '../src/lib/aiGuide.ts'
import { recommendationSnapshot as snapshot } from '../src/data/recommendationSnapshot.ts'
import { assessCandidate, candidateFeatureSupport, exactWebModel, hasSupportSource, neutralCandidateOrder } from '../src/lib/taskReadiness.ts'
import { validObservations } from '../src/lib/evidenceComparisons.ts'
import { mergeRefreshSnapshot } from '../src/lib/refreshSnapshot.ts'
import { TASK_SCORE_POLICY_VERSION } from '../src/lib/weightedRecommendation.ts'
import { featureSupportForTask } from '../src/lib/featureConstraints.ts'
import type { EvidenceComparisonSet, RecommendationSnapshot, Source, WeightedTaskDecision, WeightedTaskRow } from '../src/recommendationTypes.ts'
import type { PromptRequest, StageSelection } from '../src/types.ts'

// Local report: no .qa dependencies, source edits, network or account calls.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputs = ['docs/weighted-recommendation-report.md', 'docs/weighted-recommendation-cases.json']
function files(dir: string): string[] {
  if (!fs.existsSync(path.join(root, dir))) return []
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(`${dir}/${e.name}`) : [`${dir}/${e.name}`])
}
const hash = (value: string | Buffer) => crypto.createHash('sha256').update(value).digest('hex')
const protectedFiles = [...new Set(['src', 'public', 'prompts', 'drafts', '.github', 'scripts', 'docs'].flatMap(files).filter(f => !outputs.includes(f)).concat(['package.json', 'package-lock.json']))].sort()
const hashes = () => Object.fromEntries(protectedFiles.map(f => [f, hash(fs.readFileSync(path.join(root, f)))]))
const before = hashes(), originalSnapshot = JSON.stringify(snapshot)
const definitions: { id: string; title: string; request: PromptRequest }[] = [
  { id: 'survey', title: '설문 엑셀 분석과 보고서', request: { text: DEMO_REQUEST, overrides: {} } },
  { id: 'algorithm', title: 'Python 알고리즘 문제 풀이', request: { text: '알고리즘 문제 풀이를 Python 코드로 작성해줘', overrides: {} } },
  { id: 'repository', title: 'React 저장소 오류 수정', request: { text: 'React 기존 저장소의 장바구니 오류 원인을 찾아 수정하고 회귀 테스트를 추가해줘', overrides: {} } },
  { id: 'writing', title: '한국어 동아리 모집 홍보 글', request: { text: '신입생 대상 독서 동아리 모집 홍보 글을 한국어로 친근하게 500자로 작성해줘. 매주 수요일에 책을 함께 읽고 토론하는 모임이야.', overrides: {} } },
]
const sourceRecords: Record<string, Source> = {}, sourceIds = new Map<string, string>()
function sourceRef(source: Source): string {
  const key = JSON.stringify(source)
  if (!sourceIds.has(key)) { const id = `source-${sourceIds.size + 1}`; sourceIds.set(key, id); sourceRecords[id] = source }
  return sourceIds.get(key)!
}
// Each model/evaluation/source is stored once; nested evidence uses references.
function normalize(value: unknown): any {
  if (Array.isArray(value)) return value.map(normalize)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if (key === 'sources' && Array.isArray(item)) return ['sourceRefs', item.map(sourceRef)]
    if (key === 'source' && item && typeof item === 'object' && 'url' in item) return ['sourceRef', sourceRef(item as Source)]
    return [key, normalize(item)]
  }))
}
const modelRecords = Object.fromEntries(snapshot.models.map(m => [m.id, normalize(m)]))
const evaluationRecords = Object.fromEntries((snapshot.evaluations ?? []).map(e => [e.id, normalize(e)]))
const researchSourceRefs = snapshot.sources.map(sourceRef)
const evaluations = validObservations(snapshot.evaluations ?? [])
const count = <T,>(rows: T[], by: (row: T) => string) => Object.fromEntries([...new Set(rows.map(by))].map(key => [key, rows.filter(r => by(r) === key).length]))
const modelName = (id: string) => snapshot.models.find(m => m.id === id)?.name ?? id
function groupTrace(group: EvidenceComparisonSet | null) {
  if (!group) return null
  const { entries, ...metadata } = group
  return { ...metadata, entries: entries.map(e => ({ modelId: e.candidate.model!.id, evaluationId: e.evaluation!.id, rank: e.rank, tied: e.tied, relation: e.relation, limitation: e.limitation })) }
}
function validate(decision: WeightedTaskDecision, data: RecommendationSnapshot) {
  assert.equal(decision.rows.length, data.models.length)
  assert.equal(new Set(decision.rows.map(r => r.candidate.model!.id)).size, data.models.length)
  if (decision.mode === 'functional') assert.ok(Math.abs(decision.criteria.reduce((n, c) => n + c.weight, 0) - 1) < 1e-9)
  const recommended = decision.rows.filter(r => r.judgment === 'recommended')
  for (const row of decision.rows) {
    if (decision.mode === 'functional') {
      assert.deepEqual(row.components.map(c => [c.id, c.weight]), decision.criteria.map(c => [c.id, c.weight]))
      for (const c of row.components) {
        assert.equal(c.value, c.status === 'supported' ? 100 : c.status === 'unsupported' ? 0 : null)
        assert.equal(c.contribution, c.value === null ? null : c.value * c.weight)
        if (c.status !== 'unknown') assert.ok(c.sources.some(s => /^https:\/\//.test(s.url) && s.checkedAt))
      }
      assert.equal(row.score, row.components.every(c => c.value !== null) ? row.components.reduce((n, c) => n + c.contribution!, 0) : null)
      if (row.judgment === 'recommended') {
        assert.ok(row.components.every(c => c.status === 'supported'))
        assert.equal(row.rank, 1 + recommended.filter(r => r.score! > row.score!).length)
        assert.equal(row.tied, recommended.filter(r => r.score === row.score).length > 1)
      } else assert.equal(row.rank, null)
      if (row.judgment === 'conditional') { assert.ok(row.components.some(c => c.status === 'limited')); assert.equal(row.score, null) }
      if (row.judgment === 'needs-check') { assert.ok(row.components.some(c => c.status === 'unknown')); assert.equal(row.score, null) }
    } else {
      assert.equal(row.score, null, '원점수 비교를 자체 가중 점수로 바꾸지 않습니다.')
      if (row.judgment === 'recommended') assert.ok(decision.cohort?.entries.some(e => e.evaluation?.id === row.evaluation?.id))
    }
  }
}
const runtimes = definitions.map(def => {
  const requestBefore = JSON.stringify(def.request), interpreted = interpretTask(def.request)
  const comparison = compareCandidates(def.request), decision = comparison.decision!.weighted!
  assert.deepEqual(comparison.analysis, interpreted); assert.ok(comparisonMatches(def.request, comparison)); validate(decision, snapshot)
  const selectable = (r: WeightedTaskRow) => ['chat', 'work'].includes(r.candidate.mapping.routeKind ?? '') &&
    comparison.recommendations.some(c => c.id === r.candidate.id) && !comparison.analysis.requiredFeatures.some(f => {
      const support = candidateFeatureSupport(r.candidate, f)
      return support?.status === 'unsupported' && hasSupportSource(support)
    })
  // Match WeightedComparison's visible card order and actual action rule.
  // Unknown exact-model support may be explicitly selected after checking it.
  const uiRows = [...decision.rows].sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || neutralCandidateOrder(a.candidate, b.candidate))
  const selected = uiRows.find(r => r.judgment === 'recommended' && selectable(r)) ?? uiRows.find(r => r.judgment !== 'recommended' && selectable(r))
  const selectedFromMain = selected?.judgment === 'recommended', selectedFromAdditional = !!selected && !selectedFromMain
  if (!selected) {
    assert.equal(JSON.stringify(def.request), requestBefore)
    return { def, comparison, decision, pipeline: {
      executed: ['interpretTask', 'compareCandidates'], interpretationMatches: true, comparisonContextMatches: true,
      requestUnchanged: true, originalRequestRetainedInEveryStage: null, selectionContextRetained: null,
      selectedWebModelId: null, selectedRecommendedWebModelId: null, selectedCandidateId: null,
      selectedFromMain: false, selectedFromAdditional: false, selectedExactWebModel: false, appSelectionVerified: false,
      selection: null, note: '현재 UI 규칙으로 선택할 수 있는 웹 후보가 없어 가이드/작업공간 경로 검증을 생략했습니다. null 선택으로 App 선택 검사를 우회하지 않았습니다.',
      resolvedConditions: null, stages: [] as { id: string; title: string; text: string; sha256: string }[],
    } }
  }
  assert.ok(comparison.recommendations.some(c => c.id === selected.candidate.id))
  assert.ok(selectable(selected))
  let selection: StageSelection = { default: selected?.candidate.id ?? null, byStage: {} }
  const firstBundle = buildGuideBundle(def.request, selection)
  if (selected && firstBundle.steps.length) selection = selectForStages(selection, firstBundle.steps[0].id, selected.candidate.id)
  const bundle = buildGuideBundle(def.request, selection), [baseContext, taskContext, selectionContext] = JSON.parse(bundle.context)
  assert.deepEqual(taskContext, interpreted); assert.deepEqual(selectionContext, selection)
  assert.equal(JSON.parse(baseContext)[0], def.request.text.trim())
  assert.ok(bundle.steps.length > 0 && bundle.steps.every(s => s.text.includes(def.request.text)))
  assert.equal(JSON.stringify(def.request), requestBefore)
  return { def, comparison, decision, pipeline: {
    executed: ['interpretTask', 'compareCandidates', 'buildGuideBundle'], interpretationMatches: true, comparisonContextMatches: true,
    requestUnchanged: true, originalRequestRetainedInEveryStage: true, selectionContextRetained: true,
    selectedWebModelId: selected.candidate.model!.id, selectedRecommendedWebModelId: selectedFromMain ? selected.candidate.model!.id : null,
    selectedCandidateId: selected.candidate.id, selectedFromMain, selectedFromAdditional, selectedExactWebModel: exactWebModel(selected.candidate), appSelectionVerified: true, selection,
    note: `${selectedFromMain ? '추천 영역의 현재 선택 가능한 웹 후보' : '추가 확인 영역의 현재 선택 가능한 웹 실행 대안'}를 선택해 가이드를 생성했습니다. ${selectedFromAdditional && decision.mode === 'benchmark' ? '선택한 실행 대안은 벤치마크 비교 집합의 선두 추천 모델이 아닙니다. ' : ''}${exactWebModel(selected.candidate) ? '정확한 웹 모델 연결 근거가 있습니다.' : '정확한 웹 모델·도구를 사용 전에 확인해야 하는 선택입니다.'} 외부 웹 서비스는 실행하지 않았습니다.`,
    resolvedConditions: bundle.conditions, stages: bundle.steps.map(s => ({ id: s.id, title: s.title, text: s.text, sha256: hash(s.text) })),
  } }
})
const runtime = (id: string) => runtimes.find(r => r.def.id === id)!
const survey = runtime('survey'), algorithm = runtime('algorithm'), writing = runtime('writing')
const judge = (id: string, data: RecommendationSnapshot) => {
  const decision = compareCandidates(runtime(id).def.request, data).decision!.weighted!
  validate(decision, data); return decision
}
const concise = (r: WeightedTaskRow) => ({ modelId: r.candidate.model!.id, judgment: r.judgment, score: r.score, rank: r.rank, tied: r.tied, components: r.components.map(c => ({ id: c.id, status: c.status, value: c.value, contribution: c.contribution })), evaluationId: r.evaluation?.id ?? null, rawScore: r.evaluation?.rawScore ?? null })
const transitions: any[] = []
// Clone-only fixtures target observed evidence states, not production brand rules.
{
  const data = structuredClone(snapshot), changed: string[] = []
  for (const m of data.mappings) if (m.routeKind === 'work' && m.features?.spreadsheet?.status === 'limited' && m.features.spreadsheet.sources.length) {
    m.features.spreadsheet.status = 'supported'; if (m.modelId) changed.push(m.modelId)
  }
  const after = judge('survey', data), ids = [...new Set(changed)]
  for (const id of ids) assert.equal(after.rows.find(r => r.candidate.model!.id === id)!.judgment, 'recommended')
  transitions.push({ id: 'worksheet-limited-to-supported', applied: !!ids.length, mutation: '복제한 Work mapping의 출처 있는 spreadsheet limited만 supported로 변경', affected: ids.map(id => ({ before: concise(survey.decision.rows.find(r => r.candidate.model!.id === id)!), after: concise(after.rows.find(r => r.candidate.model!.id === id)!) })), recommendedAfter: after.rows.filter(r => r.judgment === 'recommended').map(concise) })
}
{
  const data = structuredClone(snapshot), plans = data.plans.filter(p => p.serviceId === 'claude' && p.features.code?.status === 'supported')
  const ids = survey.decision.rows.filter(r => r.judgment === 'recommended' && plans.some(p => p.id === r.candidate.plan.id)).map(r => r.candidate.model!.id)
  for (const p of plans) p.features.code!.status = 'unsupported'
  const comparison = compareCandidates(survey.def.request, data), after = comparison.decision!.weighted!; validate(after, data)
  for (const id of ids) { assert.notEqual(after.rows.find(r => r.candidate.model!.id === id)!.judgment, 'recommended'); assert.ok(!comparison.recommendations.some(c => c.model?.id === id)) }
  transitions.push({ id: 'claude-code-supported-to-unsupported', applied: !!ids.length, mutation: '복제한 Claude plan의 공식 code 지원을 unsupported로 변경; 모델 이름으로 점수를 조정하지 않음', affected: ids.map(id => ({ before: concise(survey.decision.rows.find(r => r.candidate.model!.id === id)!), after: concise(after.rows.find(r => r.candidate.model!.id === id)!) })), removedFromWebRecommendations: ids.filter(id => !comparison.recommendations.some(c => c.model?.id === id)), recommendedAfter: after.rows.filter(r => r.judgment === 'recommended').map(concise) })
}
{
  const data = structuredClone(snapshot), target = data.mappings.find(m => m.routeKind === 'work' && m.features?.upload?.status === 'supported' && m.features.upload.sources.length)
  if (target) target.features!.upload!.sources = []
  const after = judge('survey', data), row = target ? after.rows.find(r => r.candidate.model!.id === target.modelId)! : null
  if (row) { assert.equal(row.components.find(c => c.id === 'upload')!.status, 'unknown'); assert.equal(row.judgment, 'needs-check'); assert.equal(row.score, null) }
  transitions.push({ id: 'official-feature-source-removed', applied: !!target, mutation: '복제한 Work upload의 상태·설명은 유지하고 공식 출처만 제거', affected: row ? [{ before: concise(survey.decision.rows.find(r => r.candidate.model!.id === target!.modelId)!), after: concise(row) }] : [] })
}
{
  const data = structuredClone(snapshot), target = writing.decision.rows.find(r => r.judgment === 'recommended' && r.components.some(c => c.reason.startsWith('공식 모델 설명:')) && !r.candidate.model?.taskEvidence?.length)
  if (target) data.models.find(m => m.id === target.candidate.model!.id)!.capabilities = ['이미지 입력']
  const after = judge('writing', data), row = target ? after.rows.find(r => r.candidate.model!.id === target.candidate.model!.id)! : null
  if (row) { assert.equal(row.judgment, 'needs-check'); assert.equal(row.components[0].status, 'unknown'); assert.equal(row.score, null) }
  transitions.push({ id: 'explicit-text-purpose-removed', applied: !!target, mutation: '복제 모델의 명시적 텍스트 생성·출력·작업 설명을 이미지 입력 설명으로 교체; 공식 URL은 유지', affected: row ? [{ before: concise(target!), after: concise(row) }] : [] })
}
{
  const members = algorithm.decision.rows.filter(r => r.judgment === 'recommended' && r.evaluation), first = members[0], others = members.slice(1)
  if (first && others.length) {
    const e = first.evaluation!, boundary = e.higherIsBetter ? Math.min(...others.map(r => r.evaluation!.rawScore!)) : Math.max(...others.map(r => r.evaluation!.rawScore!))
    const rawScore = boundary + (e.higherIsBetter ? -1 : 1) * Math.max(1, Math.abs(boundary) * .1)
    const data = mergeRefreshSnapshot(structuredClone(snapshot), { sources: { reportFixture: { checkedAt: snapshot.checkedAt, changedAt: snapshot.checkedAt, state: 'ok', updates: [{ id: e.id, rawScore }] } } })
    const after = judge('algorithm', data), changed = after.rows.find(r => r.candidate.model!.id === e.modelId)!
    assert.notEqual(changed.rank, first.rank); assert.deepEqual(data.evaluations!.find(r => r.id === e.id), { ...e, rawScore })
    transitions.push({ id: 'normal-refresh-raw-value-changes-order', applied: true, mutation: '정상 mergeRefreshSnapshot으로 기존 관측 ID의 rawScore만 갱신; 출처·조건·모델 버전 유지', update: { id: e.id, before: e.rawScore, after: rawScore }, beforeOrder: members.map(concise), afterOrder: after.rows.filter(r => r.judgment === 'recommended').map(concise) })
  } else transitions.push({ id: 'normal-refresh-raw-value-changes-order', applied: false, reason: '현재 알고리즘 집합에 순서 변경을 검증할 서로 다른 모델 관측이 부족합니다.' })
}
const cases = runtimes.map(({ def, comparison, decision, pipeline }) => ({
  id: def.id, title: def.title, request: def.request, analysis: comparison.analysis,
  mode: decision.mode, scope: decision.scope, criteria: decision.criteria, cohort: groupTrace(decision.cohort), explanation: decision.explanation,
  summary: { models: decision.rows.length, judgments: count(decision.rows, r => r.judgment), recommendedNames: decision.rows.filter(r => r.judgment === 'recommended').map(r => r.candidate.model!.name ?? r.candidate.model!.id), numericFunctionalScores: decision.rows.filter(r => r.score !== null).length },
  rows: decision.rows.map((r, index) => ({
    displayOrder: index + 1, ...concise(r), basis: r.basis, reason: r.reason, coverage: r.coverage,
    tieReason: r.tied ? decision.mode === 'functional' ? '동일한 공식 기능·용도 기준을 충족해 공동 추천합니다. 이름순은 우열이 아닙니다.' : '해당 출처 비교 집합의 원점수가 같아 공동 순위입니다.' : null,
    components: r.components.map(normalize), gaps: r.gaps, evidenceReferences: r.evidence.map(e => ({ evaluationId: e.evaluation.id, relevance: e.relevance, reason: e.reason })),
    selectedExecution: normalize({ candidateId: r.candidate.id, planId: r.candidate.plan.id, routeKind: r.candidate.mapping.routeKind, url: r.candidate.mapping.url ?? r.candidate.model!.route?.url ?? null, exactWebModel: exactWebModel(r.candidate), modelVersion: r.candidate.mapping.modelVersion, mode: r.candidate.mapping.mode, mappingStatus: r.candidate.mapping.status, sources: r.candidate.mapping.sources, assessment: assessCandidate(r.candidate, comparison.analysis.requiredFeatures), actuallyExecuted: false }),
  })), otherComparisonGroups: comparison.decision!.groups.map(groupTrace), pipeline,
}))
assert.equal(JSON.stringify(snapshot), originalSnapshot, '스냅샷 객체가 변경되었습니다.')
const after = hashes(); assert.deepEqual(after, before, '보호 입력 파일이 변경되었습니다.')
const limitFixture={status:'limited' as const,note:'규칙 검증용 가정: 파일당 최대 10MB, 파일 최대 2개, 1000행 이하, CSV 지원',sources:[{url:'https://example.org/constraint-fixture',checkedAt:'2026-10-29'}],constraints:{maxFileSizeMB:10,maxFiles:2,maxRows:1000,formats:['csv']}}
const limitExamples=[['CSV 파일 1개 5MB 500행','supported'],['CSV 파일 1개 11MB 500행','unsupported'],['CSV 파일 1개 5MB를 분석해줘','limited']].map(([task,expected])=>{
  const result=featureSupportForTask(limitFixture,'upload',task)
  assert.equal(result.status,expected)
  return {kind:'synthetic-rule-check',task,result,notice:'실제 서비스의 한도가 아닌 규칙 검증용 가정입니다.'}
})
const scopedSheet=runtimes[0].decision.rows.map(r=>({model:r.candidate.model!,support:candidateFeatureSupport(r.candidate,'spreadsheet')})).find(r=>r.support?.status==='limited'&&/작성[·ㆍ/]편집/.test(r.support.note))
const operationExamples=scopedSheet?['요약 값을 직접 입력해 새 스프레드시트 표를 작성해줘',DEMO_REQUEST].map(task=>({kind:'current-stored-scope',modelId:scopedSheet.model.id,task,result:featureSupportForTask(scopedSheet.support,'spreadsheet',task)})):[]
const trace = {
  schemaVersion: 2, command: 'node scripts/weighted-recommendation-report.mts', snapshotVersion: snapshot.version, snapshotCheckedAt: snapshot.checkedAt,
  policy: { version: TASK_SCORE_POLICY_VERSION, criteria: '각 작업의 실제 필수 기능 또는 공식 텍스트/코드 용도를 공통 기준으로 판정', displayFunctionalScores:false, functionalRankIsMeasuredQuality:false, missingImputation: false, limitedImputation: false, perCandidateReweighting: false, benchmarkScores: '원점수를 보존한 출처 비교 집합 내부 순위; 자체 합산 점수 없음', accountOrBrandScore: false },
  evidenceAudit: { models: snapshot.models.length, validEvaluations: evaluations.length, domains: count(evaluations, e => e.domain), directSurveyEvaluations: evaluations.filter(e => ['statistics', 'analysis'].includes(e.domain) && e.taskScope?.profile === 'survey').length },
  sourceRecords, modelRecords, evaluationRecords, researchSourceRefs, cases, behavioralTransitions: transitions,
  taskMatchedLimitExamples:[...operationExamples,...limitExamples],
  integrity: { protectedFiles: protectedFiles.length, before, after, identical: true, snapshotUnchanged: true, writes: outputs },
  executionScope: { remoteRequests: 0, externalModelExecutions: 0, accountVerification: false, note: '현재 저장된 공식 출처·상태로 로컬 해석/비교/가이드와 복제 입력 변화를 검증했습니다. 웹 서비스 실제 사용 시험이나 새 원문 확인이 아닙니다.' },
}
const nullText = (x: unknown) => x === null || x === undefined ? '—' : String(x)
const esc = (x: unknown) => nullText(x).replaceAll('|', '\\|').replaceAll('\n', ' ')
const table = (headers: string[], rows: unknown[][]) => [`| ${headers.map(esc).join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`, ...rows.map(r => `| ${r.map(esc).join(' | ')} |`)].join('\n')
const label: Record<string, string> = { recommended: '추천', conditional: '조건부', 'needs-check': '확인 필요', unsupported: '미지원', supported: '지원', limited: '제한', unknown: '미확인' }
const sourcesText = (refs: string[]) => refs.map(id => { const s = sourceRecords[id]; return `[${id}](${s.url}) (${s.checkedAt}; ${s.scope ?? '범위 메모 없음'})` }).join('; ')
const primary = ['gpt-6-astra', 'gpt-6.1-sol', 'gpt-6.1-terra', 'claude-opus-5-5', 'claude-sonnet-5-5']
const conditionsText = (e: any) => `effort=${e.effort ?? '미공개'}; agent=${e.agentName ?? '미공개'}/${e.agentVersion ?? '미공개'}; tools=${e.tools ?? '미공개'}; harness=${e.harness ?? '미공개'}; environment=${e.environment ?? '미공개'}; trials=${e.trials ?? '미공개'}; fallback=${e.fallbacks ?? '미공개'}`
const transitionSummary = (t: any) => !t.applied ? t.reason ?? '현재 자료에 변경 대상 없음' : t.affected ? t.affected.map((a: any) => `${modelName(a.after.modelId)}: ${label[a.before.judgment]}→${label[a.after.judgment]} (${nullText(a.before.score)}→${nullText(a.after.score)})`).join('; ') : `${t.beforeOrder.map((r: any) => `${modelName(r.modelId)} ${r.rawScore}/${r.rank}위`).join(', ')} → ${t.afterOrder.map((r: any) => `${modelName(r.modelId)} ${r.rawScore}/${r.rank}위`).join(', ')}`
const markdown = [
  '# 실제 작업별 추천 결과와 검증', '',
  `현재 저장된 ${snapshot.models.length}개 모델을 네 요청의 실제 비교 흐름에 넣었습니다. 기능·공식 활용 용도에 따른 적합성과 출처 표의 실측 원점수 순위를 구분합니다. 스냅샷은 \`${snapshot.version}\`, 정책은 \`${TASK_SCORE_POLICY_VERSION}\`입니다.`, '',
  table(['요청', '판정 방식', '추천', '조건부', '확인 필요', '미지원', '현재 추천 모델'], cases.map(c => [c.title, c.mode === 'benchmark' ? '출처 집합 원점수' : '공식 기능·용도', c.summary.judgments.recommended ?? 0, c.summary.judgments.conditional ?? 0, c.summary.judgments['needs-check'] ?? 0, c.summary.judgments.unsupported ?? 0, c.summary.recommendedNames.join(', ')])), '',
  '재현: `node scripts/weighted-recommendation-report.mts`. [전체 입력·행별 판정·행동 검증 JSON](./weighted-recommendation-cases.json)은 출처·모델·원관측을 상단 records에 한 번 저장하고 각 행에서 ID로 참조합니다. .qa 자료나 고정된 모델 수·결과값에 의존하지 않습니다.', '',
  '## 현재 실제 카드 문구와 제한 조건 대조', '',
  '- 설문 추천 카드: **공동 추천 · 같은 기능·용도 근거**, **필수 기능 3개 확인**. 100점이나 기능 점수의 1위를 카드에 표시하지 않습니다.',
  '- 현재 Work 엑셀 분석 카드: **필수 기능 2/3개 확인**, **조건부 추천: XLSX 입력·분석 범위 확인 필요**. 원래의 제한적 지원 표시와 이 작업의 판정·요청 조건은 상세에 함께 보존합니다.',
  '- 글쓰기 카드: **공식 텍스트 생성·출력 용도 확인**. 한국어 품질 순위 숫자는 표시하지 않습니다.',
  `- 글쓰기 목록: **공동 추천 모델 (전체 ${runtimes[3].decision.rows.filter(r=>r.judgment==='recommended').length}개)**. 동일 근거의 전체 후보 중 처음 3개를 모델명순으로 표시하며 표시 순서는 성능 순위가 아님을 카드 앞에서 안내합니다. 나머지 공동 후보는 펼쳐볼 수 있습니다.`, '',
  table(['근거 종류','사용자 작업','작업별 판정','조건 대조'],[...operationExamples,...limitExamples].map(e=>[e.kind==='current-stored-scope'?'현재 저장된 작성 범위':'규칙 검증용 한도 가정',e.task,label[e.result.status],e.result.checks.map(c=>`${c.condition}: 요청 ${c.requested??'미확인'} → ${c.result==='met'?'충족':c.result==='unmet'?'불충족':'확인 필요'}`).join('; ')])), '',
  '숫자 한도 예시는 10MB·2파일·1000행·CSV를 가정한 독립 규칙 검증이며 실제 Work 또는 다른 서비스의 한도를 추가한 것이 아닙니다. 현재 저장된 XLSX 처리 범위는 미확인으로 남깁니다. 한 파일의 크기만 알 때 다른 파일도 같은 크기로 추정하지 않습니다.', '',
  '## 공통 판정 규칙', '',
  '먼저 작업 전체의 공통 기준을 정하고 모든 모델에 같은 기준을 적용합니다. 파일 첨부는 비중 1, 나머지 필수 처리 기능은 비중 2입니다. 설문 입력에서는 시트 처리 40%·파일 첨부 20%·계산 실행 40%로 계산됩니다. 이는 문서로 확인된 기능 충족을 표현하는 제품 정책이며 실측 성공률로 보정한 가중치가 아닙니다. 공식 기능 설명 자체에 활용 용도가 포함되어 있으므로 같은 출처로 별도의 빈 용도 항목을 만들지 않습니다.', '',
  '내부 검증에서 supported는 100, unsupported는 0으로 코딩하지만 카드는 확인된 기능 수·용도로 표시합니다. limited는 구체적인 제한과 요청을 대조해 충족·불충족·조건부 중 하나로 판단합니다. 필요한 조건을 모를 때만 수치 합산을 보류합니다. unknown·출처 누락은 null이며 낮은 성능이나 0점으로 해석하지 않습니다. 중간값을 넣거나 후보마다 남은 기준으로 가중치를 다시 나누지 않습니다. 아래 내부값·비중은 품질 점수나 성공 확률이 아닙니다.', '',
  '직접 비교할 코딩 출처 집합이 있으면 그 집합의 원점수와 내부 순위를 사용합니다. 자체 기능 점수에 합산하지 않으며 집합 밖 모델은 확인 필요로 남깁니다. 모델 평가와 에이전트·도구 실행 구성 평가는 각각 표시하고, 미공개 effort·하네스·환경을 같다고 가정하지 않습니다. 가격·브랜드·무료 여부·계정 잔여 한도는 작업 점수에 넣지 않습니다.', '',
  `유효 수치 관측은 ${evaluations.length}개이며, 정확한 survey 작업 범위의 statistics/analysis 관측은 ${trace.evidenceAudit.directSurveyEvaluations}개입니다. 설문 기능 지원을 통계 방법 선택·계산·해석 정확도의 직접 측정으로 바꾸지 않습니다.`, '',
  '## Astra·Sol·Terra·Opus·Sonnet의 설문 근거', '',
  '아래는 각 모델에 실제 적용된 공통 기준과 기여값입니다. Work의 시트 제한은 XLSX 입력의 세부 분석 범위를 추가로 확인해야 한다는 뜻입니다. Claude의 supported도 코드 실행·파일 생성 활성화 및 계정 한도 확인을 요구합니다. 일반 ChatGPT 분석 기능을 Work 기능으로 복사하지 않습니다.', '',
  table(['모델', '전체 판정', '내부값/공동 판정', '기준', '내부 비중', '상태', '내부 기능값', '기여', '공식 출처·확인일·범위', '판정 메모'], primary.flatMap(id => {
    const row = cases[0].rows.find(r => r.modelId === id)
    return row ? row.components.map((c: any) => [modelName(id), label[row.judgment], `${nullText(row.score)}/${row.tied?'공동 추천':label[row.judgment]}`, c.label, `${c.weight * 100}%`, label[c.status], c.value, c.contribution, sourcesText(c.sourceRefs), c.reason]) : [[modelName(id), '현재 등록 없음', '—', '—', '—', '—', '—', '—', '—', '현재 데이터에 없는 모델은 생성하지 않음']]
  })), '',
  ...cases.flatMap(c => [
    `## ${c.title}`, '', `실제 입력: ${c.request.text}`, '',
    `해석: ${c.analysis.tasks.join(' → ')} / 입력 ${c.analysis.inputMode} / 필수 기능 ${c.analysis.requiredFeatures.join(', ') || '없음'}${c.analysis.codingIntent ? ` / 코딩 목적 ${c.analysis.codingIntent}` : ''}. 아래 행은 엔진 출력 순서입니다. 추천·조건부·확인 필요·미지원 순으로 묶고, 같은 순위 안의 이름순은 성능 우열을 뜻하지 않습니다.`, '', c.explanation, '',
    c.criteria.length ? table(['공통 기준', '가중치', '인정 규칙'], c.criteria.map(x => [x.label, `${x.weight * 100}%`, x.rule])) : `현재 원점수 집합: \`${c.cohort?.id ?? '없음'}\`.`, '',
    ...(c.id === 'writing' ? ['공식 모델 설명의 명시적 텍스트 생성·출력·작업 용도 하나를 내부 100% 기준으로 판정했습니다. 텍스트·이미지 입력, 함수 호출, JSON 출력, 일반 추론이나 저장소 존재만으로 글 작성 용도를 인정하지 않습니다. 한국어 홍보 글의 장르 적합성·지시 준수·수정 품질은 측정하지 않았습니다. 같은 문서 기준을 충족한 후보는 공동 추천이며 숫자 품질 순위를 만들지 않습니다.', ''] : []),
    table(['중립 표시 순서', '모델', '판정', '내부 검증값(품질 아님)', '공동 판정/원점수 순위', '원관측/원점수', '기준별 상태·기여 또는 근거 범위', '판정/동률 사유'], c.rows.map(r => [r.displayOrder, modelName(r.modelId), label[r.judgment], r.score, c.mode==='functional'?r.tied?'공동 추천':label[r.judgment]:`${nullText(r.rank)}${r.tied ? ' 공동' : ''}`, r.evaluationId ? `${r.evaluationId}: ${r.rawScore}${evaluationRecords[r.evaluationId].unit}` : '—', r.components.length ? r.components.map((x: any) => `${x.label}: ${label[x.status]} / 기여 ${nullText(x.contribution)}`).join('; ') : r.basis === 'benchmark' ? '해당 출처 표 내부 원점수' : '현재 비교 집합 밖', [r.reason, r.tieReason].filter(Boolean).join(' ')])), '',
    ...(c.mode === 'functional' ? ['### 행별 공식 근거와 경계', '', table(['모델', '공식 출처', '용도/제한 메모'], c.rows.map(r => [modelName(r.modelId), sourcesText([...new Set(r.components.flatMap((x: any) => x.sourceRefs))] as string[]) || '이 작업 기준의 출처 미확인', r.components.map((x: any) => x.reason).join('; ')])), ''] : []),
    ...(c.cohort ? [`### 원점수 비교 범위: ${c.cohort.benchmark} ${c.cohort.version}`, '', `${c.cohort.kind === 'source-table' ? '동일 출처가 발표한 표' : '공개 조건이 일치하는 집합'} / 게시자 ${c.cohort.publisher} / 목적 적합도 ${c.cohort.fit}. ${c.cohort.limitation}`, '', table(['순위', '모델', '원관측', '범위/하위집합', '원점수', '대상', '원문 실행 조건', '출처'], c.cohort.entries.map(entry => { const e = evaluationRecords[entry.evaluationId]; return [entry.rank, modelName(entry.modelId), e.id, `${e.benchmark} ${e.benchmarkVersion}; ${e.subset ?? '미공개'}`, `${e.rawScore}${e.unit}`, e.evaluationType, conditionsText(e), sourcesText([e.sourceRef])] })), '', '원점수의 대상·effort·agent 버전·도구·하네스·환경·시도 수·fallback은 JSON evaluationRecords에 원래 값으로 보존했습니다. 에이전트 표의 순위를 모델 단독 성능이나 현재 웹 성공률로 표현하지 않습니다. 다른 출처·평가 기간의 더 높은 값을 가져와 대체하지 않습니다.', ''] : []),
    '### 실제 가이드 생성 확인', '',
    `${c.pipeline.appSelectionVerified ? '`interpretTask → compareCandidates → buildGuideBundle`를 현재 UI에서 허용하는 실제 후보 ID로 실행했습니다.' : '`interpretTask → compareCandidates`까지만 실행했습니다.'} ${c.pipeline.note} ${c.pipeline.appSelectionVerified ? `선택 모델은 ${modelName(c.pipeline.selectedWebModelId!)}이며 ${c.pipeline.selectedFromMain ? '추천' : '추가 확인'} 영역의 후보입니다. 생성 단계 ${c.pipeline.stages.length}개 모두에 원문이 포함되며 비교 context·해석·단계 선택 context 보존을 assertion으로 확인했습니다.` : ''} 단계별 실제 본문·SHA-256과 선택 상태는 JSON pipeline에 있습니다.`, '',
  ]),
  '## 복제 입력의 변화에 따라 실제 결과가 바뀌는지 확인', '',
  '아래는 원본을 수정하지 않고 structuredClone한 스냅샷 또는 정상 refresh merge에 변경을 넣어 다시 비교한 결과입니다. 현 데이터에서 변경 대상을 찾아 구성하며 모델별 점수 보너스는 없습니다. 이후 데이터에 해당 상태가 사라지면 해당 fixture는 적용 대상 없음으로 보고합니다.', '',
  table(['검증', '변경', '계산된 전후 결과', '검증'], transitions.map(t => [t.id, t.mutation ?? t.reason, transitionSummary(t), t.applied ? 'assertion 통과' : '적용 대상 없음'])), '',
  ...transitions.filter(t => t.recommendedAfter).map(t => `- ${t.id} 변경 후 추천: ${t.recommendedAfter.map((r: any) => `${modelName(r.modelId)} ${r.score}/${r.rank}위${r.tied ? ' 공동' : ''}`).join(', ') || '없음'}`), '',
  '이 변화는 실제 기능 상태·출처·명시적 용도·원점수가 판정에 들어간다는 재현 근거입니다. 모든 지원값을 채웠다는 이유로 설문 통계 정확성이나 한국어 글쓰기 우위를 검증한 것은 아닙니다.', '',
  '## 실행 및 보존 범위', '',
  `보호 입력 ${protectedFiles.length}개 파일의 SHA-256이 생성 전후 일치하고 스냅샷 객체도 그대로입니다. 해시 전체는 JSON integrity에 있습니다. 출력은 이 Markdown과 JSON 두 개입니다. 원격 요청·모델 호출·웹 서비스 실행·계정 확인은 수행하지 않았습니다. 현재 저장된 공식 출처와 확인일을 사용했으며 현재 사용자 계정의 제공 모델·활성화·한도는 별도 확인 대상입니다.`, '',
  '정상 데이터 갱신 후 같은 명령을 실행하면 모델 수·판정·기여·동률·출처 집합·원점수·가이드 및 변화 검증을 다시 계산합니다. 보고서가 과거 개수나 고정 순위를 assertion으로 요구하지 않습니다.', '',
].join('\n')
fs.mkdirSync(path.join(root, 'docs'), { recursive: true })
fs.writeFileSync(path.join(root, outputs[0]), markdown, 'utf8')
fs.writeFileSync(path.join(root, outputs[1]), JSON.stringify(trace, null, 2) + '\n', 'utf8')
assert.deepEqual(hashes(), before)
console.log(JSON.stringify({ outputs, cases: cases.map(c => ({ id: c.id, ...c.summary, cohort: c.cohort?.id ?? null })), transitions: transitions.map(t => ({ id: t.id, applied: t.applied, result: transitionSummary(t) })), protectedFiles: protectedFiles.length, sourceHashesUnchanged: true }, null, 2))
