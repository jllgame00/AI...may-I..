import { priorityLabels } from '../data/services'
import { executionRoutes } from '../lib/aiGuide'
import { mappingLabel } from '../lib/currentEvidence'
import ModelEvaluationReference from './ModelEvaluationReference'
import CurrentModelCatalog, { CandidateEvidence } from './CurrentModelEvidence'
import EvaluationComparisons from './EvaluationComparisons'
import AAConnectionStatus from './AAConnectionStatus'
import { accessCategory, accessLabels, accessOptions, primaryAccessCandidates } from '../lib/modelAccess'
import type { Comparison, PromptRequest } from '../types'
import type { Recommendation } from '../recommendationTypes'

export default function CandidateComparison({ comparison,request,selected,onSelect,onEdit }: { comparison:Comparison;request:PromptRequest;selected:string|null;onSelect:(id:string)=>void;onEdit:()=>void }) {
  const models=primaryAccessCandidates(comparison.recommendations)
  const ready=models.filter(c=>['web','api'].includes(accessCategory(c)))
  const comparable=ready.filter(c=>c.suitability==='조건 비교 가능')
  const pending=ready.filter(c=>c.suitability!=='조건 비교 가능')
  const installation=comparison.recommendations.filter(c=>!c.configuration&&c.model&&c.mapping.routeKind==='self-hosted')
  const unknown=models.filter(c=>accessCategory(c)==='unknown')
  const shown=new Set([...ready,...installation,...unknown].map(c=>c.id))
  const other=comparison.recommendations.filter(c=>c.model&&!c.configuration&&!shown.has(c.id))
  const unlinked=comparison.recommendations.filter(c=>!c.model)
  const card=(c:Recommendation)=><article className={`candidate-card ${selected===c.id?'selected-candidate':''}`} key={c.id}>
    <p className="candidate-status">작업 조건: {c.suitability}{selected===c.id?' · 선택됨':''}</p>
    <h2>{c.model?.name ?? c.service.name}</h2>
    <p className="model-name"><strong>{c.model?`${c.model.provider} · v${c.model.version} · ${c.mapping.mode ?? '모드 미확인'}`:c.mapping.selection==='automatic'?'자동 라우팅 · 정확한 모델·버전 선택 가능 여부 미확인':'정확한 모델·버전·모드 연결 미확인'}</strong></p>
    {c.model&&<p className="minor-note">모델 ID: {c.model.id}</p>}
    <p><strong>이용 준비: {accessLabels[accessCategory(c)]}</strong></p>
    {c.model?.route?.kind==='self-hosted'&&<p className="evidence-limit">과거 고정 체크포인트의 평가예요. 현재 채팅 서비스의 최신 모델 점수로 적용하지 않아요. 호스팅 제공 여부와 평가 당시 실행 조건은 별개예요.</p>}
    <h3>현재 작업에 맞는 이유</h3><p>{c.reason}</p>
    <CandidateEvidence candidate={c} peers={comparison.recommendations}/>
    <h3>실제 이용 경로 확인</h3><p>{mappingLabel(c.mapping)} · {c.accessStatus}</p>
    <p>{c.accessStatus==='연결 미확인'?'이 화면의 모델 평가가 이 서비스·플랜에서 해당 모델을 선택할 수 있다는 뜻은 아니에요. 선택 후 이용권한을 확인하세요.':'모델·경로 연결 근거가 있어요. 실제 계정의 이용권한·설정은 선택 후 직접 확인하세요.'}</p>
    <p className="evidence-limit">{c.holds.filter(h=>h!=='현재 작업에 직접 연결할 성능 근거 부족').join(' · ')}</p><p>{c.model?.limits?.join(' ')}</p>
    <details><summary>속도·설정·다른 공식 서비스의 확인 상태</summary><p>속도: {c.model?.speed ?? '동일 조건의 속도 미확인'}</p><p>설정 부담: {c.mapping.note}</p><p>이용 준비 그룹과 성능 평가 순위는 별도예요.</p>{c.model&&accessOptions(c.model).filter(r=>r.exactVersion!=='confirmed').map(r=><p key={r.id}><a href={r.url} target="_blank" rel="noreferrer">{r.label} (새 창)</a> · {r.exactVersion==='retired'?'해당 API 은퇴 확인':'정확 버전 연결 미확인'} · {r.note}</p>)}</details>
    <div className="candidate-sources"><h3>출처·확인일</h3>{[...new Map([...(c.model?.sources ?? []),...c.mapping.sources].map(s=>[s.url,s])).values()].slice(0,2).map((s,i)=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">모델·경로 근거 {i+1} (새 창)</a> · {s.checkedAt}</p>)}</div>
    <button id={c.model?`choose-${encodeURIComponent(c.id)}`:`choose-${c.plan.id}`} className="button primary" onClick={()=>onSelect(c.id)}>{c.model?'이 모델로 단계별 준비':'이 경로로 단계별 준비'}</button>
    <a href={executionRoutes(c)[0].url} target="_blank" rel="noreferrer" className="text-button">공식 경로 확인 (새 창)</a>
  </article>
  return <div className="comparison-page"><div className="result-top"><div><p className="eyebrow">COMPARE & CHOOSE</p><h1 tabIndex={-1}>작업에 맞는 모델을 검토하고 선택하세요.</h1><p>작업 목적·필수 기능·관련 평가를 살펴보세요. 이용 경로의 확인 상태는 별도로 안내해요. 요청한 소비자·API 경로가 미확인이어도 정확한 모델 평가와 자체 호스팅 경로는 표시합니다.</p></div><button id="edit-analysis" className="text-button" onClick={onEdit}>조건 수정</button></div>
    <div className="comparison-summary"><p>{request.text}</p><strong>{priorityLabels[request.priority ?? 'quality']}</strong><p>경로: {request.usageRoute==='api'?'개발자 API · 직접 실행':request.usageRoute==='work'?'ChatGPT Work (웹)':request.usageRoute==='chat'?'일반 웹 채팅':'소비자 웹서비스 · Chat / Work'}</p><p>{comparison.analysis.notes[1]}</p><p>비교 조건이 맞는 원점수만 참고하고, 근거가 부족하면 확정 순위나 종합 점수를 만들지 않아요. 가격·플랜·사용 한도는 선택 후 이용 조건에서 확인하세요.</p></div>
    <EvaluationComparisons candidates={comparison.recommendations} onSelect={onSelect}/>
    <h2>작업 조건 검토 가능 · {comparable.length}개</h2><p>웹 → API → 고급 설치 순서는 이용 준비의 차이예요. 성능 우열·가격 순위가 아니며 설치형 모델도 아래에서 선택할 수 있어요. 107건은 서로 다른 평가·버전·시점의 관측이며 공통 시험 집합이 아니에요.</p>{!comparable.length&&<div className="draft-notice" role="status"><p>현재 경로에서 필수 기능을 확인한 정확한 모델 후보가 없어요. 기능 확인이 필요한 후보와 고급 선택지를 살펴보세요.</p><button className="button secondary" onClick={onEdit}>작업·필수 기능 수정</button></div>}
    <h3>웹에서 바로 사용 · 로그인·권한 확인 필요</h3><div className="candidate-grid model-candidates web-candidates">{comparable.filter(c=>accessCategory(c)==='web').map(card)}</div>
    <h3>API 설정 필요 · 계정·키·호출 환경 별도</h3><div className="candidate-grid model-candidates api-candidates">{comparable.filter(c=>accessCategory(c)==='api').map(card)}</div>
    <details id="pending-options" className="extras"><summary>필수 기능 확인 필요 · {pending.length}개</summary><p>이 경로의 기능·입력 권한을 확인해야 해요. 가격이나 성능 자료 부족만으로 이 그룹에 넣지 않아요.</p><div className="candidate-grid">{pending.map(card)}</div></details>
    <details id="installation-options" className="extras"><summary>고급 선택지 · 직접 설치 필요 · {installation.length}개 경로</summary><p>공식 체크포인트의 장비·라이선스·추론 서버 설정이 필요해요. 호스팅 API가 있는 모델도 설치 경로를 선택할 수 있어요.</p><div className="candidate-grid">{installation.map(card)}</div></details>
    <details id="unknown-access-options" className="extras"><summary>정확 버전 이용 경로 미확인 · {unknown.length}개</summary><div className="candidate-grid">{unknown.map(card)}</div></details>
    <details id="other-access-options" className="extras"><summary>같은 모델의 다른 이용 경로 · {other.length}개</summary><p>경로·플랜별 기능·버전 연결을 개별 확인하세요. 이전 선택 경로도 유지했어요.</p><div className="candidate-grid">{other.map(card)}</div></details>
    <details id="unlinked-options" className="extras"><summary>정확한 모델 연결 미확인 서비스 경로 · {unlinked.length}개</summary><p>특정 모델의 평가 결과를 이 경로의 성능으로 적용하지 않아요.</p><div className="candidate-grid">{unlinked.map(card)}</div></details>
    <details className="extras"><summary>필수 기능 불일치 · {comparison.excluded.length}개</summary>{comparison.excluded.map(c=><div key={c.plan.id}><h3>{c.plan.serviceId} · 확인된 경로 제약</h3><p>{c.reasons.join(' · ')}</p></div>)}</details>
    <AAConnectionStatus/>
    <CurrentModelCatalog/>
    <details className="extras"><summary>과거 모델 평가 참고 · 현재 추천에는 반영하지 않음</summary><ModelEvaluationReference candidates={comparison.recommendations}/></details>
  </div>
}
