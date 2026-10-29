import '../tests/react-loader.mjs'
import assert from 'node:assert/strict'
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { providerCatalog } from '../src/data/providerCatalog.ts'
import { PROVIDER_POLICY } from '../src/data/providerPolicy.ts'
import { compareCandidates,buildGuideBundle,stageOptions,selectForWork } from '../src/lib/aiGuide.ts'
import { syncDrafts,editDraft,copyText,regenerateDraft,restoreDraft } from '../src/lib/promptSession.ts'
const {default:CandidateComparison}=await import('../src/components/CandidateComparison.tsx')
const {default:StageWorkspace}=await import('../src/components/StageWorkspace.tsx')
const {recommendationSnapshot:historical}=await import('../archive/model-recommendation-2026-10-29/src/data/recommendationSnapshot.ts')
const definitions=[['survey','설문 문항 작성','대학생의 학습 만족도 설문 문항을 작성해줘'],['xlsx','기존 XLSX 분석','기존 XLSX 설문 결과를 분석하고 학년별 차이를 설명해줘'],['pdf','PDF 논문 분석','PDF 논문을 업로드해서 핵심 주장과 한계를 분석해줘'],['script','발표 대본','대학생 대상 5분 발표 대본을 작성해줘'],['code','코드 오류 분석','React 코드 오류의 원인을 분석하고 수정안과 테스트를 작성해줘'],['image','이미지 생성','교내 환경 캠페인 포스터 이미지를 생성해줘'],['composite','복합 작업','기존 XLSX 설문 결과를 분석하고 발표자료를 만들고 발표 대본을 작성해줘']]
const noop=()=>{},cases=[]
mkdirSync('.qa/provider',{recursive:true})
for(const [id,title,text] of definitions){
  const request={text,overrides:{}},comparison=compareCandidates(request),initial=JSON.stringify(request)
  let selection={default:null,byStage:{}},bundle=buildGuideBundle(request,selection)
  const selected=[]
  for(const work of comparison.requirements.works){
    const stage=bundle.steps.find(s=>s.workId===work.id),options=stageOptions(comparison,stage)
    const option=options.find(o=>o.status==='eligible')??[...options].sort((a,b)=>b.checks.filter(c=>c.status==='supported').length-a.checks.filter(c=>c.status==='supported').length)[0]
    if(!option)continue
    selection=selectForWork(selection,bundle.steps,work.id,option.id)
    selected.push({workId:work.id,provider:option.provider.name,service:option.service.name,plan:option.plan.name,status:option.status})
  }
  bundle=buildGuideBundle(request,selection)
  assert.ok(bundle.steps.length>0&&bundle.steps.every(s=>s.text.includes(text)))
  let drafts=syncDrafts({},bundle.steps,bundle.context),first=bundle.steps[0],edited=first.text+'\n\n사용자 편집\n  두 칸 유지'
  drafts[first.id]=editDraft(drafts[first.id],edited)
  const changed=buildGuideBundle({...request,overrides:{tone:'간결하게'}},selection)
  drafts=syncDrafts(drafts,changed.steps,changed.context)
  assert.equal(drafts[first.id].text,edited)
  assert.equal(restoreDraft(regenerateDraft(drafts[first.id],changed.steps[0].text,changed.context)).text,edited)
  let copied=null;assert.equal(await copyText(edited,async s=>{copied=s}),true);assert.equal(copied,edited)
  assert.equal(await copyText(edited,async()=>{throw new Error('denied')}),false)
  assert.equal(JSON.stringify(request),initial)
  const html=renderToStaticMarkup(createElement(CandidateComparison,{comparison,request,selected:null,onSelect:noop,onEdit:noop}))
  assert.match(html,/<details class="other-services" id="needs-check-candidates">/)
  const workspace=renderToStaticMarkup(createElement(StageWorkspace,{session:{request,comparison,bundle,drafts,selection,checks:{}},onStage:noop,onDraft:noop,onCandidate:noop,onReviewed:noop,onCompare:noop,onEdit:noop,onNew:noop}))
  writeFileSync(`.qa/provider/${id}-comparison.html`,html);writeFileSync(`.qa/provider/${id}-workspace.html`,workspace)
  const concise=r=>({providerId:r.provider.id,company:r.provider.name,service:r.service.name,plan:r.plan.name,status:r.status,score:r.score,rank:r.rank,reason:r.reason,gaps:r.gaps,features:r.checks.map(c=>({id:c.id,status:c.status,sourceIds:c.evidence.map(e=>e.id)}))})
  cases.push({id,title,request,requirements:comparison.requirements,recommended:comparison.recommendations.map(concise),remaining:comparison.remaining.map(concise),conditional:comparison.conditional.map(concise),excluded:comparison.excluded.map(concise),selected,selection,stages:bundle.steps.map(s=>({id:s.id,workId:s.workId,title:s.title,text:s.text})),checks:{reactSSR:true,originalPreserved:true,draftPreserved:true,regenerationAndRecovery:true,copyWriterExact:true,copyFailureHandled:true,additionalInitiallyFolded:true,browser:false,osClipboard:false}})
}
let verification={note:'아직 최종 실행 기록 없음'}
try{verification=JSON.parse(readFileSync('.qa/provider-verification.json','utf8'))}catch{}
const trace={generatedAt:new Date().toISOString(),policy:PROVIDER_POLICY,catalog:{version:providerCatalog.version,providers:providerCatalog.providers.length,services:providerCatalog.services.length,plans:providerCatalog.plans.length,evidence:providerCatalog.evidence},historical:{models:historical.models.length,evaluations:historical.evaluations.length},verification,cases}
writeFileSync('docs/provider-recommendation-cases.json',JSON.stringify(trace,null,2)+'\n')
const cell=v=>String(v??'—').replaceAll('|',' / ').replaceAll('\n',' ')
const table=(heads,rows)=>[heads,heads.map(()=> '---'),...rows].map(row=>'| '+row.map(cell).join(' | ')+' |').join('\n')
const lines=[
  '# 회사 중심 추천 전환 완료 보고', '',`생성 ${trace.generatedAt}. 정책 ${PROVIDER_POLICY.version}, 데이터 ${providerCatalog.version}.`, '',
  '**모델별 점수·순위·가중치·fallback을 활성 추천 경로에서 제거하고, 회사 → 서비스 → 플랜 → 기능/공식 근거로 교체했다. 현재 직접 작업 품질 근거가 부족해 종합점수와 확정 순위는 만들지 않으며, 확인된 필수 조건을 통과한 회사만 공동 우선 후보로 표시한다.**', '',
  '[변경 전 조사·유지/수정/제거/역사 보존 분류](provider-recommendation-audit.md), [현재 데이터·판정 정책](provider-recommendation-policy.md), [실제 7개 사례·단계별 프롬프트·선택·검증 JSON](provider-recommendation-cases.json).', '',
  '## 기존 문제와 정리 결과', '',
  '기존 후보는 회사가 아니라 모델·버전·모드·API/웹 mapping 조합이었다. taskRanking/codingMetricFit는 특정 Qwen/Grok 표를 작업 대표 순위로 골랐고 weightedRecommendation은 지원 여부를 100/0과 파일 첨부1:나머지2의 비중으로 계산했다. 모델이 없는 서비스의 후순위 처리, 과거 원점수 대표 집합과 추정 score artifact가 현재 작업 선택에 섞일 수 있었다. Free 기능과 서비스/모델 범위도 여러 overlay에서 합쳐졌다.', '',
  `변경 전 106개 파일(기존 미커밋 수정 및 이전 턴의 추정 코드 포함)을 archive/model-recommendation-2026-10-29에 원본 바이트와 SHA-256 manifest로 보존했다. ${historical.models.length}개 모델·${historical.evaluations.length}건 평가는 역사 자료로 남겼다. 구형 recommend/weightedRecommendation/taskRanking/evidenceComparisons/scoreEstimation/modelAccess 및 관련 타입·설정·모델 카드·기대 순위 테스트는 활성 src에서 제거했다. active import graph가 이 코드에 도달하지 않는 테스트와 보존 파일 해시 검사가 있다. 원본 README와 별도 ARCHIVE-NOTES를 구분한다.`, '',
  '변경 전부터 존재한 미커밋 작업을 없애지 않았다. 전체 복사본과 working-tree-before.patch가 보관되어 있다. 구형 수집기는 자동 호출되지 않으며 새 회사 자료의 복구 fallback으로도 쓰이지 않는다. 옛 README/설계/점수 보고서는 당시 구현 기록이다.', '',
  '## 새 데이터와 알고리즘', '',
  `Provider ${providerCatalog.providers.length}개, Service ${providerCatalog.services.length}개, Plan ${providerCatalog.plans.length}개. Google의 Gemini/NotebookLM은 하나의 회사 ID에 연결한다. 주요 12개 회사·13개 서비스의 누락/중복·고아 관계를 데이터 검증에서 탐지한다. 모델 추가·삭제 및 임의의 과거 benchmark 변경으로 현재 결과가 달라지지 않는 테스트를 실행했다.`, '',
  '신규 요구 분석은 입력/출력 형식·문항 초안/실제 폼·코드 생성/실행·이미지 입력/생성·PDF 업로드/분석/생성을 구분한다. 필수/선호 기능, 무료 조건·월 예산·통화·국가, 명시된 크기·개수·분량을 추출한다. 미입력은 null, 질문은 최대3개이며 화면에서 수정한다. 규칙 기반이며 새 유료 LLM API를 사용하지 않는다.', '',
  '각 실제 플랜의 필수 기능과 scope가 일치하는 reviewed Evidence부터 확인한다. unknown·미해결 limited·명시한 처리량의 용량 근거 부족은 조건부다. 명시적 unsupported·확인된 한도 초과·무료 조건에 유료 플랜은 제외한다. 무료에서 유료 기능을 빌리지 않으며 PDF 분석과 XLSX 생성에서 역으로 업로드 지원을 추정하지 않는다. 통화/국가/월 청구액/세금 총액이 불명확하면 유료 예산 충족을 확정하지 않는다.', '',
  '동일 회사 안의 실제 플랜 대안에서 gate 통과·확인된 기능/선호 기능·무료 경로·중립 ID 순으로 대표를 고른다. 회사 사이의 품질 점수나 브랜드 보너스가 아니다. 공동 후보는 회사명 중립 순서로 최대3개를 먼저 표시하고 나머지를 접는다. 조건부/제외 후보는 별도다. 전체 작업을 수행할 단일 플랜이 없어도 각 단계의 실제 플랜을 비교할 수 있으며 서로 다른 서비스 기능을 합쳐 가상의 플랜을 만들지 않는다.', '',
  '새 가중치는 제안된 40/30/20/10을 providerPolicy 한 곳에서 관리한다. 실증 보정되지 않았다. 내부 fit=100은 필수 gate의 정책 코딩이며 UI에 품질 점수로 표시하지 않는다. 직접 작업 품질·비용 우열·편의 실측이 없으므로 나머지 항목과 총점/순위는 null이다. 구형 가중치·모델 평균/최댓값·이전 버전 상속·누락0·남은 비중 재분배는 사용하지 않는다.', '',
  'Model은 보조 plan-reference 타입으로 분리했으며 현재 활성 목록은 비어 있다. 개별 릴리스의 현재 플랜 제공을 새로 검증하지 않았기 때문이다. 원본 28개 모델의 버전·모드·이용 경로는 역사 데이터에 그대로 남아 있다. 현재 카드 상세는 서비스에서 실제 선택 가능 모델을 확인하도록 안내하며 구버전 모델을 회사 성능으로 표시하지 않는다.', '',
  '## 실제 작업 사례와 선택/프롬프트 검증', '',
  '실제 앱 함수와 React 서버 렌더링으로 다음 작업을 수행했다. 입력·조건 분석 → 회사 비교 → 실제 서비스/플랜 ID 선택 → 각 단계 프롬프트 생성 → 편집·조건 변경 보존 → 재생성/이전 초안 복구 → copyText의 성공/실패 writer를 실행했다. 이는 외부 AI 서비스에서 실제 파일을 처리했다는 뜻이 아니다. 브라우저 이벤트·OS 클립보드는 미실행이다.', '',
  table(['작업','공동 우선 후보(표시 순서는 성능 순위 아님)','조건부 회사 수','실제 선택 경로','단계 수'],cases.map(c=>[c.title,c.recommended.map(r=>`${r.company} / ${r.service} ${r.plan}`).join('; ')||'없음',c.conditional.length,c.selected.map(s=>`${s.workId}: ${s.provider} / ${s.service} ${s.plan} (${s.status})`).join('; '),c.stages.length])), '',
  ...cases.flatMap(c=>[`### ${c.title}`, '',`입력: ${c.request.text}`, '',`필수 기능: ${c.requirements.required.join(', ')}. 점수·순위: 모두 null.`, '',`단계: ${c.stages.map(s=>`${s.title} [${s.workId}]`).join(' → ')}. 원문·편집 초안·선택 context 및 접힘 상태의 SSR/함수 assertion 통과.`, '']),
  '단계별 회사 변경은 해당 작업 또는 해당 단계에만 적용한다. 비교 화면 복귀 후 다른 작업 선택을 삭제하지 않는다. 기존 default 경로는 단계 필수 기능이 확인된 경우만 상속하고, 미확인 기능에 자동 적용하지 않는다. 같은 회사/서비스가 호환되면 계속 사용할 수 있고 자동 추가 구독·결제·서비스 전환을 하지 않는다.', '',
  '## 공식 근거 범위와 부족한 회사·플랜', '',
  '기존 유효한 웹 서비스 조사 기록은 원본으로 보존했고 현재 가격/Free 범위가 불명확한 숫자를 그대로 새 정책에 이월하지 않았다. 이번에는 ChatGPT/Claude/Gemini/Firefly/Runway의 공식 가격·기능 페이지와 도움말을 수동 열람했다. OpenAI/Anthropic/Google의 모델 벤치마크는 반입하지 않았다. 최신 자동 수집 완료로 표시하지 않는다.', '',
  table(['공식 확인 출처','확인일','적용 범위'],providerCatalog.evidence.map(e=>[`[${e.id}](${e.url})`,e.checkedAt,e.scope])), '',
  'xAI/Grok, DeepSeek, Alibaba/Qwen, Moonshot/Kimi, Perplexity, Microsoft/Copilot, Mistral 서비스 및 NotebookLM의 현재 세부 웹 플랜/기능/무료 권한은 이관 가능한 충분한 검토 자료가 없어 unknown plan으로 남았다. 회사 등록은 유지된다. NotebookLM/Gemini Notebook 및 Le Chat/Vibe 명칭·경로 전환도 별도 확인 사항이다. 타사의 광범위한 제품 소개나 API 기능을 개인 무료 웹 플랜에 복사하지 않았다.', '',
  'PDF 논문의 현재 전체 처리 범위·페이지·스캔/도표 조건은 미확인이라 기본 입력에서는 공동 우선 후보가 없다. 명시한 대용량/파일 수/행 수는 별도 확인한다. 실제 설문 폼 배포·출처 검증 성공·임의 코드 런타임·특정 저장소 접근은 문항 작성·검색·코드 생성과 다르며 현재 근거로 확정하지 않는다. Firefly 가격은 일본 JPY 표기이고 한국 가격으로 표시하지 않는다. Claude/Runway의 $ 기호는 근거 없이 ISO 통화로 보정하지 않는다.', '',
  '## 변경 파일과 유지 범위', '',
  '- 새 데이터/정책/타입: src/providerTypes.ts, src/data/provider-catalog.json, providerCatalog.ts, providerPolicy.ts; scripts/provider-catalog-seed.ts는 새 Provider 복구 seed.',
  '- 새 분석/판정: src/lib/providerRequirements.ts, providerRecommendation.ts, providerValidation.ts.',
  '- 연결 변경: App.tsx, types.ts, aiGuide.ts, AnalysisPanel/CandidateComparison/StageWorkspace; workStages의 일반 글 입력 안내를 비홍보 작업에도 맞춤.',
  '- 유지: main.tsx·styles.css·Vite Pages base, PromptEditor/ConditionFields, promptEngine/promptSession/surveyTask의 원문·편집·복사·복구 구조. 스타일·레이아웃의 무관한 리디자인 없음.',
  '- 유지보수/테스트: scripts/provider-data-core.ts, refresh-data.mts, provider-report.mjs, 신규 단위·보존/import 격리·SSR 테스트, 갱신된 browser-check.mjs. 옛 전체 테스트는 보존본에 격리.',
  '- README·현재 정책·변경 전 조사·이 보고서·사례 JSON. 기존 연구 문서/원문/기록은 삭제하지 않음.',
  '- Pages schedule/base/권한/배포 작업은 유지하고, 실행하지 않은 수집을 암시하던 단계 이름만 새 수동 검토 스냅샷 검증/보존으로 수정. 워크플로를 실행하지 않음.', '',
  '## 데이터 갱신·복구와 검증 결과', '',
  '`data:refresh`는 새 Provider 스냅샷만 검증·보존하고 출처 날짜를 갱신하거나 원격 수집하지 않는다. `--import <reviewed.json>`은 검토된 전체 스냅샷의 schema/관계/근거 검증 후 저장한다. `data:restore`는 새 Provider 복구본/seed만 사용한다. 임시 파일→rename 저장, 잘못된 import 거부와 손상 primary의 backup 복구를 실제 임시 폴더 테스트로 확인했다. 저장 성공 시각/해시는 .refresh-cache/provider-state.json에 따로 기록하며 externalCollectionAt=null이다.', '',
  '최종 실행 기록:', '', '```json',JSON.stringify(verification,null,2),'```', '',
  '이전 221개 중 모델 순위·기능100/공동1위·Qwen/Grok 고정 결과에 의존하던 테스트는 현 정책의 기대값만 바꾼 것이 아니라 역사 보존 후 교체했다. 순수 프롬프트/초안 테스트17개는 그대로 재사용했다. 새 테스트는 회사 중복·모델 독립성·잘못된 scope·unknown/limited·무료/예산·명시한 용량·부정/선호 표현·입력/출력 분리·단계 선택 유지·React 렌더·원본 해시·import 경계를 검증한다.', '',
  '프로덕션 빌드는 TypeScript 후 Vite/esbuild의 자식 프로세스 spawn EPERM으로 실패했다. 우회 실행·환경 권한 확대·대체 빌드/기존 dist의 성공 보고를 하지 않았다. CUA는 browser access host와 native pipe unavailable을 반환했다. 기존 E2E runner는 회사 카드/예산/새 단계 선택자에 맞춰 교체했으나 실제 브라우저·반응형·키보드·OS 클립보드 E2E는 미실행이다. 수동 검증용 기존 qa:preview는 배포 빌드 대체가 아니다.', '',
  'commit·push·배포·외부 모델 실행·유료 API/평가·로그인/결제·메시지 전송은 하지 않았다.', '',
  '## 남은 개선 과제', '',
  '미확인 8개 서비스의 공식 개인 웹 플랜·기능·국가·무료 한도 조사, PDF/파일 용량과 실제 폼/출처 검증 조건의 구조화, 서비스·플랜·작업 조건이 일치하는 직접 품질 및 편의성 평가가 필요하다. 그 자료가 생기기 전에는 40/30/20/10 종합점수 경로를 임의로 활성화하지 않는다. 자연어 규칙은 복잡한 생략·부정·파일 역할에서 추가 사례 검증이 필요하며 해석 수정으로 보정할 수 있다. 브라우저 연결과 esbuild 실행이 가능한 환경에서 수정된 E2E와 실제 배포 빌드를 검증해야 한다.', '',
]
writeFileSync('docs/provider-refactor-report.md',lines.join('\n'))
console.log(JSON.stringify({outputs:['docs/provider-refactor-report.md','docs/provider-recommendation-cases.json'],cases:cases.map(c=>({id:c.id,recommended:c.recommended.map(r=>r.company),stages:c.stages.length})),historical:trace.historical},null,2))
