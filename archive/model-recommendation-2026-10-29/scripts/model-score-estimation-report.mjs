// Reproducible local app-function and React-render QA. No collection/model calls.
import { registerHooks } from 'node:module'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

registerHooks({
  resolve(specifier,context,next){if(specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))for(const ext of ['.ts','.tsx']){const url=new URL(specifier+ext,context.parentURL);if(existsSync(fileURLToPath(url)))return next(url.href,context)}return next(specifier,context)},
  load(url,context,next){if(url.endsWith('.tsx'))return {format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText};return next(url,context)},
})
const {recommendationSnapshot:snapshot}=await import('../src/data/recommendationSnapshot.ts')
const {auditSnapshot,estimateTables}=await import('../src/lib/scoreEstimation.ts')
const {publicationFor}=await import('../src/lib/scorePublication.ts')
const {compareCandidates,interpretTask,buildGuideBundle,DEMO_REQUEST,selectForStages}=await import('../src/lib/aiGuide.ts')
const {syncDrafts,editDraft,copyText,regenerateDraft,restoreDraft}=await import('../src/lib/promptSession.ts')
const {candidateFeatureSupport,hasSupportSource,neutralCandidateOrder}=await import('../src/lib/taskReadiness.ts')
const {featureSupportForTask}=await import('../src/lib/featureConstraints.ts')
const {default:Comparison}=await import('../src/components/CandidateComparison.tsx')
const artifact=JSON.parse(readFileSync('src/data/score-estimation.json','utf8'))
assert.notEqual(publicationFor(snapshot,artifact).state,'outdated')
const before=JSON.stringify(snapshot),audit=auditSnapshot(snapshot),results=estimateTables(audit.tables)
assert.deepEqual(results,artifact.attempts)
const hash=text=>createHash('sha256').update(text).digest('hex')
const name=id=>snapshot.models.find(m=>m.id===id)?.name??id
const definitions=[
  ['survey','설문 엑셀 분석·보고서',DEMO_REQUEST],
  ['algorithm','Python 알고리즘 문제 풀이','알고리즘 문제 풀이를 Python 코드로 작성해줘'],
  ['repository','React 저장소 오류 수정','React 기존 저장소의 장바구니 오류 원인을 찾아 수정하고 회귀 테스트를 추가해줘'],
  ['writing','한국어 동아리 모집 글','신입생 대상 독서 동아리 모집 홍보 글을 한국어로 친근하게 500자로 작성해줘. 매주 수요일에 책을 함께 읽고 토론하는 모임이야.'],
]
mkdirSync('.qa',{recursive:true})
const cases=[]
for(const [id,title,text] of definitions){
  const request={text,overrides:{}},inputBefore=JSON.stringify(request),analysis=interpretTask(request),comparison=compareCandidates(request),weighted=comparison.decision.weighted
  assert.deepEqual(analysis,comparison.analysis)
  const rows=[...weighted.rows].sort((a,b)=>(a.rank??Infinity)-(b.rank??Infinity)||neutralCandidateOrder(a.candidate,b.candidate))
  const selectable=row=>['chat','work'].includes(row.candidate.mapping.routeKind)&&comparison.recommendations.some(c=>c.id===row.candidate.id)&&!analysis.requiredFeatures.some(f=>{const s=featureSupportForTask(candidateFeatureSupport(row.candidate,f),f,text);return s.status==='unsupported'&&hasSupportSource(s)})
  const selected=rows.find(r=>r.judgment==='recommended'&&selectable(r))??rows.find(selectable)
  assert.ok(selected,`${id}: selectable web candidate required`)
  const html=renderToStaticMarkup(createElement(Comparison,{comparison,request,selected:null,onSelect:()=>{},onEdit:()=>{}}))
  if(comparison.decision.estimation.state==='withheld')assert.match(html,/공개 평가 추정 점수는 검증 근거 부족으로 보류/)
  assert.match(html,/<details class="other-services" id="needs-check-candidates">/)
  if(!comparison.decision.estimation.published.length)assert.doesNotMatch(html,/data-estimation-model=/)
  writeFileSync(`.qa/model-score-${id}.html`,html)
  let selection={default:selected.candidate.id,byStage:{}}
  let bundle=buildGuideBundle(request,selection)
  selection=selectForStages(selection,bundle.steps[0].id,selected.candidate.id)
  bundle=buildGuideBundle(request,selection)
  assert.ok(bundle.steps.length>0&&bundle.steps.every(step=>step.text.includes(text)))
  const drafts=syncDrafts({},bundle.steps,bundle.context),first=bundle.steps[0],edited=`${drafts[first.id].text}\n\n사용자 편집: 원문과 줄바꿈 유지\n  두 칸`
  drafts[first.id]=editDraft(drafts[first.id],edited)
  const changedBundle=buildGuideBundle({...request,overrides:{tone:'간결하게'}},selection)
  const retained=syncDrafts(drafts,changedBundle.steps,changedBundle.context)
  assert.equal(retained[first.id].text,edited)
  const regenerated=regenerateDraft(retained[first.id],changedBundle.steps[0].text,changedBundle.context)
  assert.equal(restoreDraft(regenerated).text,edited)
  let copied=null
  assert.equal(await copyText(edited,async text=>{copied=text}),true)
  assert.equal(copied,edited)
  assert.equal(await copyText(edited,async()=>{throw new Error('clipboard-denied')}),false)
  assert.equal(JSON.stringify(request),inputBefore)
  cases.push({id,title,request,analysis,estimationState:comparison.decision.estimation.state,qualityScores:comparison.decision.estimation.published,existingMode:weighted.mode,existingCohort:weighted.cohort?.id??null,mainRecommendations:rows.filter(r=>r.judgment==='recommended').map(r=>({modelId:r.candidate.model.id,name:name(r.candidate.model.id),rank:r.rank,rawScore:r.evaluation?.rawScore??null,benchmark:r.evaluation?.benchmark??null,judgment:r.judgment,functionalComponents:r.components.map(c=>({label:c.label,status:c.status})),reason:r.reason})),selectedWebModelId:selected.candidate.model.id,selectedFromMain:selected.judgment==='recommended',selection,stages:bundle.steps.map(s=>({id:s.id,title:s.title,text:s.text})),checks:{reactRender:true,originalPreserved:true,additionalInitiallyCollapsed:true,editedDraftPreserved:true,regenerateAndRestore:true,copyWriterExact:true,deniedCopyFallback:true,osClipboard:false,browser:false},htmlSha256:hash(html)})
}
assert.equal(JSON.stringify(snapshot),before)
const output={generatedAt:new Date().toISOString(),dataVersion:snapshot.version,datasetHash:artifact.datasetHash,models:snapshot.models.map(m=>({id:m.id,name:name(m.id),version:m.version,evaluationMode:m.evaluationMode,reasoning:m.reasoning,modes:m.modes})),evaluations:snapshot.evaluations,audit,results,cases}
writeFileSync('docs/model-score-estimation-results.json',JSON.stringify(output,null,2)+'\n')
const cell=value=>String(value??'—').replaceAll('|',' / ').replaceAll('\n',' ')
const table=(heads,rows)=>[heads.map(cell).join(' | '),heads.map(()=>'---').join(' | '),...rows.map(r=>r.map(cell).join(' | '))].map(line=>'| '+line+' |').join('\n')
const decimal=v=>v===null?'평가 불가':v.toFixed(3)
const byId=new Map(audit.measurements.map(m=>[m.id,m]))
const linked=new Set(audit.tables.flatMap(t=>t.rows.map(r=>r.evaluation.modelId)))
const lines=[
  '# 공개 평가 기반 모델 점수 추정 구현·검증 보고서', '',
  `실행일: ${output.generatedAt} (UTC). 데이터 ${snapshot.version}; SHA-256 \`${artifact.datasetHash}\`. 모형 ${artifact.modelVersion}, 환산 ${artifact.scaleVersion}, 사전 기준 ${artifact.protocolVersion}.`, '',
  '**추정·검증·앱 연결과 갱신 재계산을 구현했다. 현재 자료에서 공개 기준을 통과한 비교 집합은 0개이며 새 추정 점수·순위는 모두 보류한다. 기존 기능 추천과 출처 표 내부 원점수 순위는 그대로 유지한다.**', '',
  '[적합 전 고정한 계획·판정 기준](model-score-estimation-protocol.md), [전체 111건의 원문 메타데이터·그래프·검증·네 사례 실행 JSON](model-score-estimation-results.json). 출력 숫자를 만들기 위해 조건·가중치를 반복 조정하지 않았다.', '',
  '## 1. 현재 상태와 실제 자료 수', '',
  '시작 Git 작업 트리는 깨끗했다. 저장소 및 D:/, D:/univ, D:/univ/3-1, D:/univ/3-1/contest에서 AGENTS.md를 찾지 못했다. 원본 데이터·모델·평가·출처, 원문·초안·단계별 프롬프트, 갱신·복구, Pages 워크플로와 Vite base는 보존했다. commit·push·배포·유료 평가·외부 수집을 실행하지 않았다. 방법론 문헌 웹 조회는 평가 데이터 수집과 구분한다.', '',
  `실제 models=${audit.modelCount}, evaluations=${audit.observationCount}; 보고된 28/111과 일치한다. 구형 observations/cohorts 배열과 현재 evaluations를 중복 합산하지 않는다. 측정 식별 조건 묶음은 ${audit.measurements.length}개, 점수 충돌 없는 묶음 ${audit.measurements.filter(m=>!m.conflict).length}개다. 충돌 ${audit.duplicates.filter(d=>d.conflict).length}묶음, 확정 동일 점수 재게시 중복 ${audit.duplicates.filter(d=>!d.conflict).length}묶음이다. 110을 확정 독립 평가 수라고 부르지 않는다.`, '',
  ...audit.duplicates.map(d=>`- ${d.ids.join(' / ')}: ${d.conflict?'동일하게 저장된 조건에서 점수가 충돌한다. 다른 실행인지 재게시인지 확인 불가하므로 두 값을 추정에서 격리했다.':'동일 측정 재게시로 한 번만 센다.'}`), '',
  'Grok 4.6 DeepSWE 1.1은 65.9와 65.2로 다르다. 기존 원자료·기존 출처 순위는 수정하지 않았으며 새 추정에만 격리를 적용했다. Qwen의 Kimi LiveCodeBench v6 48.9는 2025.02~05, Moonshot 53.7은 2024.08~2025.05로 다른 관측이다. MMLU-Pro/GPQA의 미공개 버전, HumanEval/Plus·Pass@5, HLE text-only/full, Terminal 2/3/4, Cursor 3.2/4도 이름만으로 합치지 않았다.', '',
  '## 2. 연결 그래프와 추정 가능한 범위', '',
  `원문 비교 표/공개 조건으로 사용할 수 있는 평가 노드 ${audit.tables.length}개, 수치 관측 ${new Set(audit.tables.flatMap(t=>t.rows.map(r=>r.measurementId))).size}개, 모델 ${linked.size}개다. 구성 정점 ${new Set(audit.tables.flatMap(t=>t.rows.map(r=>r.configId))).size}개이며 서로 다른 effort와 에이전트는 별개다. 나머지 ${audit.isolatedModelIds.length}개 모델은 검증된 공통 비교 그래프에서 고립된다. 제외된 관측은 JSON audit.excluded에 개별 사유를 기록했다. 단일 모델 자체 보고 여러 건만으로 다른 모델과 척도를 연결하지 않는다.`, '',
  table(['평가 노드','영역·대상','구성 수','정확한 모델/effort'],audit.tables.map(t=>[t.id,`${t.domain}/${t.type}`,t.rows.length,t.rows.map(r=>`${name(r.evaluation.modelId)} (${r.evaluation.effort??'미공개'})`).join('; ')])), '',
  '영역을 합치지 않은 진단 성분은 아래 6개다. 영역을 넘어 원문 Performance 표의 명시된 non-thinking 열을 연결하는 일반 모델 그래프에서는 Qwen/Kimi 두 구성이 다리를 만든다. DeepSeek는 effort 미확인이라 두 평가의 서로 다른 구성이다. 모델 단독 그래프는 하나(4개 구성·2개 평가), 에이전트 그래프는 AutomationBench(10개 구성·1개 평가), CursorBench(2·1), Terminal-Bench(2·1) 세 개로 총 4개의 서로 분리된 연결 성분이다. 이 네 성분의 전역 척도는 만들지 않는다.', '',
  '전체 28개 모델의 판정:', '',
  table(['정확한 모델·버전','전체 원관측 수','공통 비교 관측 수','추정 점수·순위 상태'],snapshot.models.map(m=>[`${name(m.id)} / ${m.version}`,snapshot.evaluations.filter(e=>e.modelId===m.id&&e.modelVersion===m.version).length,audit.tables.flatMap(t=>t.rows).filter(r=>r.evaluation.modelId===m.id).length,linked.has(m.id)?'진단 적합 가능 · 예측 공개 검증 미통과 · 점수/순위 없음':'공통 비교 연결 부족 · 점수/순위 없음'])), '',
  '## 3. 관측 모형과 가정', '',
  '규제 Bradley–Terry 계열의 평가 내 순서 복합 목적함수를 사용한다. p(i>j)=sigmoid(theta_i−theta_j), 평균 theta=0, L2 lambda=0.25다. 한 표의 전체 쌍 가중치 합을 1로 두어 모델 열이 많은 표가 가상의 반복 시행처럼 커지지 않게 했다. y는 원점수의 좋은 방향을 반영한 0/1, 동점은 0.5다. 미관측은 어떤 항도 추가하지 않으며 0점을 채우지 않는다. 문항 수·반복 횟수를 생성하지 않았다. 단위가 다른 원점수를 백분율로 바꾸거나 재구성하지 않는다.', '',
  '이 모형은 원점수 크기·난이도를 예측하지 않고 숨긴 관측이 다른 모델보다 높을지 예측한다. 따라서 원점수 MAE 대신 순서 확률 Brier 오차와 순서 정확도를 검증한다. 실제 사용 성공 확률로 해석할 수 없다. 일반 잠재 역량은 제한된 영역의 공통 순서 경향이며 통계 분석·한국어 홍보 글·저장소 수정의 직접 실측 점수가 아니다. 영역별 자료가 없어 보류한 범위를 일반 점수로 대체하지 않았다.', '',
  '원문 Performance 표의 같은 모델 열·공개 모드라는 가정은 미공개 도구·환경의 동등성을 증명하지 않는다. 다른 제공사의 표는 환경·judge·샘플링·평가 선택 편향이 달라 임의로 연결하지 않았다. 실제 평가 주체와 결과 게시자는 JSON의 evaluator/publisher에 따로 보존했다. 공개되지 않은 evaluator를 publisher로 채우지 않았다. 게시일이 다른 것만으로 비교를 차단하지 않는다.', '',
  '방법론 참고: [BT 계산 연구 원문](https://jmlr.org/papers/v24/22-1086.html), [비교 그래프와 추정 존재성 연구](https://proceedings.mlr.press/v162/bong22a.html). 본 구현의 작은 집계 자료 검증은 논문의 표본 조건·통계적 보장을 그대로 충족한다는 주장이 아니다.', '',
  '## 4. 기준선 대비 예측·안정성 검증', '',
  '사전 기준은 구성≥3, 평가 노드≥3, 평가 가능한 관측 fold≥6 및 비율≥80%, 무정보 p=0.5 대비 Brier≥10% 개선, 순서 정확도≥65%, 평가 제거 순서 보존≥80%·전체 연결 유지≥80%, ±표 내 범위 1% 교란 20회 순서 보존≥90%다. 개별 공개 구성은 평가≥3개가 필요하다. 보조 기준선은 학습 내 Laplace 평활 승률 차이다. 판정 기준은 결과 후 변경하지 않았다.', '',
  table(['범위·대상','구성/평가','검증 가능/전체 fold','연결 단절','예측쌍 수','BT Brier','p=.5 기준선','승률 기준선','순서 정확도','평가 제거 순서 보존','평가 제거 연결 유지','교란 보존','판정'],results.map(r=>[`${r.scope}/${r.type}`,`${r.configIds.length}/${r.tableIds.length}`,`${r.validation.evaluableFolds}/${r.validation.totalFolds}`,r.validation.disconnectedFolds,r.validation.predictions,decimal(r.validation.brier),decimal(r.validation.baselineBrier),decimal(r.validation.winRateBrier),decimal(r.validation.accuracy),decimal(r.validation.leaveOutAgreement),decimal(r.validation.leaveOutConnected),decimal(r.validation.perturbAgreement),r.passed?'통과':r.reasons.join('; ')])), '',
  '관측 하나를 숨길 때 그 측정 식별자가 포함된 모든 학습 쌍을 제거했다. 동일 측정의 alias와 점수 충돌은 적합 전 처리했다. 예측에는 숨긴 원점수를 사용하지 않고, 비교 상대의 관측과 학습 theta만 사용한다. 같은 평가의 쌍과 fold는 서로 상관되어 있으므로 예측쌍 수를 독립 시행 수로 해석하지 않는다.', '',
  '일반 모델 성분의 6관측 중 4건(66.7%)만 평가 가능하며 2건은 해당 구성이 고립되어 예측할 수 없다. 8개 순서 예측에서 BT Brier≈0.276, 무정보≈0.250, 승률≈0.304, 순서 정확도 50%다. 단순 무정보 기준선보다 악화되어 공개하지 않는다. 다른 성분은 평가 노드를 하나 빼면 학습 연결이 사라진다. 교란 안정성이 높아도 예측 검증을 대신하지 못한다.', '',
  '평가 제거 및 결정적 작은 교란의 범위만 계산한다. 부트스트랩·모수적 신뢰구간·사후 신뢰구간은 계산하지 않았다. 범위를 제공할 때는 민감도 범위이며 신뢰구간이 아니다. 비교가 연결되어 남아 있는 경우만 평가 제거 순서 보존을 계산하며 전체 연결 유지 비율도 따로 보고했다.', '',
  '## 5. 점수·순위·불확실성의 앱 연결', '',
  `공개된 새 추정 점수/순위: ${artifact.published.length}개 비교 집합, 0개 모델. 모든 score/rank는 null이다. 숫자를 맞추기 위해 현재 후보 전체에 점수를 부여하지 않았다. 진단 theta·민감도는 JSON에 연구용으로 남지만 공개 추천 점수로 표시하지 않는다.`, '',
  '통과 경로는 구현되어 있다. 고정 round(100*sigmoid(theta)) 지수, 정수 표시, 성분 내 순위, 3점 이내 또는 민감도 중첩의 근소·동등 표시, 모델/모드/에이전트·출처 상세, 웹 실행 상태를 별도 카드로 표시한다. 후보 표시 필터로 재적합·min–max하지 않는다. 12개 가상 평가 표의 명시적인 테스트 fixture로 통과 경로·상위 3개·필터 불변·마지막 정상 유지 렌더링을 검증했다. 이 fixture는 실제 모델 실측 결과나 현재 공개 artifact에 들어가지 않는다.', '',
  '모든 현재 추정 구성은 한 평가 주체에 편중된다. 출처 편중·관측 부족·평가 제거 시 연결 단절을 상세로 표시한다. 기존 작업별 기능 충족·직접 원점수 순위와 분리한다. 작업별 가중 지수 합성은 하지 않으며 기존 기능 비중은 실증 성능 보정값으로 승격하지 않는다.', '',
  '## 6. 네 작업의 실제 앱 함수·React 출력', '',
  '각 입력에 interpretTask → compareCandidates → 현재 UI 규칙으로 선택 가능한 웹 후보 선택 → buildGuideBundle → 편집/조건변경 보존 → 다시 생성/복구 → copyText를 실제 실행했다. React 비교 화면을 서버 렌더링했다. 브라우저 사용자 이벤트와 OS 클립보드는 검증하지 못했다. copyText에는 메모리 writer와 실패 writer를 주입했으며 외부 AI 서비스로 프롬프트를 전송하지 않았다. 전체 단계 본문과 선택 context는 JSON cases에 있다.', '',
  ...cases.flatMap(c=>[
    `### ${c.title}`, '', `입력: ${c.request.text}`, '',
    `해석: ${c.analysis.tasks.join(' → ')}; 입력 ${c.analysis.inputMode}; 필수 기능 ${c.analysis.requiredFeatures.join(', ')||'없음'}; 코딩 목적 ${c.analysis.codingIntent??'해당 없음'}. 추정 점수 ${c.estimationState==='withheld'?'보류':'재검증 대기'}.`, '',
    `기존 ${c.existingMode==='benchmark'?'출처 표 원점수 추천':'공식 기능·용도 공동 추천'}: ${c.mainRecommendations.map(r=>`${r.name}${r.benchmark?` (집합 내 ${r.rank}위, ${r.benchmark} 원점수 ${r.rawScore})`:''}`).join('; ')}.`, '',
    `실제 선택 가능 웹 후보: ${name(c.selectedWebModelId)} (${c.selectedFromMain?'기존 추천 영역':'추가 확인 영역에서 선택; 원점수 선두와 다를 수 있음'}). 단계: ${c.stages.map(s=>`${s.id}: ${s.title}`).join(' → ')}.`, '',
    '원문 보존·추가 후보 기본 접힘·편집 초안 보존·재생성/복구·복사 writer의 정확한 문자열·복사 실패 반환 assertion 통과.', '',
  ]),
  '## 7. 데이터 갱신·재계산·복구', '',
  '새 명령 `npm run data:estimate`는 외부 요청 없이 현재 스냅샷을 진단·적합·검증한다. 기존 `data:refresh`의 수집/저장 후 및 `data:restore`의 복구 후에도 같은 saveEstimation을 직접 호출한다. `data:validate`는 기존 수집 스냅샷 검증 기능을 유지한다. Pages workflow는 수정하지 않았고 기존 refresh 호출을 통해 재계산이 연결된다.', '',
  'src/data/score-estimation.json에 데이터 SHA-256·브라우저 freshness key·데이터 버전·모형·환산·프로토콜 버전·실제 계산 성공 시각·최근 30회 변경 이력을 저장한다. .refresh-cache/score-estimation-last-good.json은 복구 복사본이다. 각 파일은 임시 파일 작성 후 rename으로 교체한다. 두 파일을 묶는 원자적 트랜잭션은 아니지만 backup-first로 중단 시 복구 가능성을 유지한다. artifact 전체 형태·중복 성분·공개 provenance를 검증하고 손상본은 재사용하지 않는다.', '',
  '검증 미통과 성분은 과거 통과한 동일 구성 성분을 stale로 유지하며 원래 계산 시각·데이터 해시를 보존한다. 정확한 모델 버전이 현재 카탈로그에 없으면 앱에 붙이지 않는다. 새 모델·모드·미연결 구성에 옛 수치를 상속하지 않는다. 현재는 과거 정상 공개 결과도 없어 보류 안내를 표시한다. 예기치 않은 계산/저장 오류는 작업을 실패시키며 기존 파일을 정상 결과로 바꾸지 않는다. 배포 작업은 실행하지 않았다.', '',
  `이번 계산 성공: ${artifact.computedAt}; 외부 수집 성공: ${artifact.lastExternalCollectionAt??'없음(null)'}. 기존 출처의 checkedAt·원점수는 바꾸지 않았다. 로컬 재계산을 최신 외부 수집 완료로 보고하지 않는다. refresh 연결은 코드와 로컬 검증으로 확인했으며 실외부 refresh·실복구 원본 변경은 실행하지 않았다.`, '',
  '## 8. 추가로 필요한 관측·키·권한', '',
  '- 일반 모델 성분: Qwen3-235B-A22B-Instruct-2507 non-thinking, Kimi-K2-Instruct non-thinking, 제3의 정확한 버전·모드가 명시된 모델을 포함하는 공통 평가가 필요하다. 최소 3개 서로 다른 평가에 각 구성이 3회 이상 나타나고 관측 하나를 숨겨도 연결이 남아야 한다. 현재 DeepSeek 열의 effort는 추정해서 채우지 않는다. 새 자료도 순서 불일치가 계속되면 공개하지 않는다.',
  '- 알고리즘 영역: 현재 v6 2025.02~05 비교 표 외에 동일 릴리스/모드의 적어도 두 추가 코딩 평가가 필요하다. 문제 기간·pass@k·도구·샘플링·평가자 메타데이터를 함께 확보해야 한다. Qwen30의 별도 카드 행을 동일 출처 비교 열로 자동 취급하지 않는다.',
  '- 저장소·에이전트: Grok 4.6 DeepSWE 65.9/65.2의 원실행 식별과 harness/agent 버전, Grok 4.7 high/xhigh 및 다른 모델의 정확한 agent/tool 구성에 걸친 공통 평가가 필요하다. AutomationBench의 열 10개를 독립 벤치마크 10개로 세지 않는다. 별도의 최소 두 평가에서 동일 에이전트 구성을 재관측해야 한다.',
  '- 설문: 정확한 릴리스/모드에 대한 통계 방법 선택·실제 계산·결과 해석의 공통 실측(예: StatQA 범위를 검토한 결과)이 없다. 일반 수학 점수나 파일 업로드 지원으로 대체할 수 없다.',
  '- 한국어 글쓰기: 평가 언어·장르·judge/루브릭 revision·문제 기간을 명시한 한국어 홍보 글·수정 과제의 공통 측정이 필요하다. Creative Writing v3만으로 현재 한국어 품질 지수를 만들지 않는다.',
  '- 추가 수치 출처 연결에는 기존 AA의 실제 인증 응답과 제품/공개 이용 범위 확인, LiveBench/공식 SWE 실험 결과의 정확한 버전·구성·재사용 범위 확인이 필요하다. 이번 구현에는 새 API 키·유료 모델 호출이 필요하지 않으며 비밀값을 읽거나 출력하지 않았다.',
  '- 프로덕션 빌드에는 환경에서 esbuild 자식 프로세스 실행이 허용되어야 한다. 브라우저 검증에는 사용 가능한 브라우저 연결 호스트가 필요하다. 권한을 확대하거나 거부된 실행 방법을 우회하지 않았다.', '',
  '## 9. 실행 검증과 미실행 항목', '',
  '- `npm test`: 221개 통과(기존 210개 포함). 중복·충돌·재게시 순서 불변·구성/버전 분리·단절 fold·고정 환산·합성 통과 경로·artifact 손상·중복 일반 성분·React 카드·기존 초안 흐름 검증.',
  '- `npm run typecheck`: 통과.',
  '- `npm run data:estimate`: 실제 실행, 현재 6개 진단 성분/0개 통과. 수집 성공 시각은 null.',
  '- `node scripts/model-score-estimation-report.mjs`: 네 사례 실제 함수 실행·React SSR·보존/복사 assertion 통과. .qa/model-score-*.html은 로컬 렌더 결과다.',
  '- `npm run data:validate`: 기존 갱신 스냅샷의 4개 출처 검증 통과. `git diff --check` 통과. 기존 데이터·Pages·Vite base·프롬프트 원본의 Git diff 없음.',
  '- `npm run build`: TypeScript 후 Vite config/esbuild `spawn EPERM`으로 실패. 실행 권한·configLoader·외부 빌드로 재시도하지 않았다. 기존 dist를 새 빌드 성공 결과로 주장하지 않는다.',
  '- 처음 독립 `node --test <file>` 호출은 worker spawn EPERM이었다. 이후 저장소의 기존 `npm test`(`--test-isolation=none`)를 그대로 사용했다. 권한 확대는 하지 않았다.',
  '- `npm run qa:preview`: 기존 소스 QA 미리보기(4175) 시작 성공. 프로덕션 빌드가 아니다. CUA inventory가 `browser access host is unavailable`을 반환하여 실제 브라우저 연결/클릭/스크린샷·모바일 오버플로·OS 클립보드 검증은 미실행이다. CDP나 다른 실행 경로로 우회하지 않았다.',
  '- 독립 읽기 전용 코드 리뷰 후 일반 성분 중복, 손상 artifact의 UI 전달, 동률 나머지 후보 누락, 구성 상세 provenance 문제를 수정했다. 리뷰용 fixture나 진단 결과는 실측 공개 점수로 사용하지 않는다.',
  '- 외부 평가 데이터 수집·data:refresh 실호출·원본 복구 변경·외부 서비스 실제 과제 실행·계정 권한 확인·유료 평가·commit·push·배포는 미실행.', '',
]
writeFileSync('docs/model-score-estimation-report.md',lines.join('\n')+'\n')
console.log(JSON.stringify({models:audit.modelCount,observations:audit.observationCount,measurementBuckets:byId.size,comparisons:results.length,passed:results.filter(r=>r.passed).length,cases:cases.map(c=>({id:c.id,main:c.mainRecommendations.map(r=>r.name),selected:name(c.selectedWebModelId),stages:c.stages.length,checks:c.checks}))},null,2))
