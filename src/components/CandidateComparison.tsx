import { capabilityLabels, PROVIDER_POLICY } from '../data/providerPolicy'
import { accessSummary, conditionNotes, featureStatus, supportStatus, usageSteps } from '../lib/providerPresentation'
import type { ProviderRecommendation, PlanAssessment } from '../providerTypes'
import type { Comparison, PromptRequest } from '../types'
interface Props {comparison:Comparison;request:PromptRequest;selected:string|null;onSelect:(id:string,workId?:string)=>void;onEdit:()=>void;needsCheckOpen?:boolean;onNeedsCheckToggle?:(open:boolean)=>void}
export default function CandidateComparison({comparison,request,selected,onSelect,onEdit,needsCheckOpen=false,onNeedsCheckToggle}:Props){
  const stateLabel=(status:PlanAssessment['status'])=>({eligible:'공동 우선 후보',conditional:'조건부 후보',excluded:'필수 조건 불일치'}[status])
  const card=(row:ProviderRecommendation,workId?:string)=>{
    const access=accessSummary(row,row.alternatives),notes=conditionNotes(row)
    return <article className="candidate-card" data-provider-id={row.provider.id} data-status={row.status} key={row.provider.id}>
      <h2>{row.provider.name}</h2><p><strong>{row.service.name}</strong></p><p className="candidate-judgment">{stateLabel(row.status)}{selected===row.id?' · 선택됨':''}</p>
      <p>{featureStatus(row)} · {row.checks.filter(c=>c.status==='supported').length}/{row.checks.length}개</p>
      <p>{row.status==='eligible'?'이 작업에 필요한 기능과 이용 조건을 확인했습니다.':row.status==='conditional'?'필수 기능이나 이용 범위를 추가로 확인해야 합니다.':'요청한 기능 또는 무료·예산 조건과 맞지 않습니다.'}</p>
      <p className="access-summary">{access.selected}</p><p>{access.free}</p>
      {!!row.strengths.length&&<p>주요 기능: {row.strengths.join(' · ')}</p>}
      {!!notes.length&&<p className="candidate-limit">{notes.slice(0,2).join(' / ')}</p>}
      {row.status!=='excluded'&&<button id={`choose-${workId??'all'}-${row.id}`} className="button primary" onClick={()=>onSelect(row.id,workId)}>{row.status==='eligible'?'맞춤 프롬프트 준비하기':'조건 확인 후 프롬프트 준비'}</button>}
      <details className="provider-details"><summary>회사 상세보기 · {row.provider.name}</summary>
        <p>대표 서비스: {row.service.name}</p>
        <h3>주요 기능과 추천 이유</h3>
        {row.checks.map(c=><p key={c.id}><strong>{capabilityLabels[c.id]}</strong> · {supportStatus(c)}</p>)}
        {row.preferredChecks.map(c=><p key={`preferred-${c.id}`}>선호 기능 {capabilityLabels[c.id]} · {supportStatus(c)}</p>)}
        {notes.map(n=><p key={n}>{n}</p>)}
        <p>{access.selected} · {access.free}</p>
        <h3>실제 사용 방법</h3><ol>{usageSteps(row).map(step=><li key={step}>{step}</li>)}</ol>
        <p><a href={row.service.url} target="_blank" rel="noreferrer">{row.service.name} 공식 서비스 열기 ↗</a></p>
        <p>맞춤 프롬프트는 선택한 뒤 직접 편집·복사할 수 있습니다. 이 앱에서 외부 서비스로 내용을 자동 전송하지 않습니다.</p>
        <details><summary>공식 이용 안내·확인일</summary>{row.evidence.map(e=><p key={e.id}><a href={e.url} target="_blank" rel="noreferrer">{row.service.name} 공식 이용 안내</a> · 확인 {e.checkedAt}</p>)}{!row.evidence.length&&<p>구체적인 공식 이용 조건을 추가로 확인해야 합니다.</p>}</details>
      </details>
    </article>
  }
  return <section className="comparison-page"><button id="back-to-conditions" className="text-button" onClick={onEdit}>← 작업·조건 수정</button><div className="page-heading"><h1 tabIndex={-1}>이 작업에 맞는 AI 회사</h1><p className="task-summary">{request.text}</p></div>
    <div className="comparison-basis"><p>필수 기능과 무료·예산 조건을 확인했습니다. 공동 후보는 이름순으로 최대 {PROVIDER_POLICY.maxFeatured}개를 먼저 표시하며, 표시 순서는 품질 순위가 아닙니다.</p></div>
    <div id="recommended-options"><h2>공동 우선 후보 ({comparison.recommendations.length})</h2>{!comparison.recommendations.length&&<p>모든 필수 조건이 확인된 회사가 없습니다. 조건부 후보나 단계별 선택을 확인하세요.</p>}<div className="candidate-grid">{comparison.recommendations.map(r=>card(r))}</div></div>
    {!!comparison.remaining.length&&<details className="remaining-models"><summary>나머지 공동 후보 ({comparison.remaining.length})</summary><div className="candidate-grid">{comparison.remaining.map(r=>card(r))}</div></details>}
    {comparison.requirements.composite&&<section className="candidate-section" id="work-provider-options"><h2>작업 단계별 회사·서비스</h2><p>이미 선택한 서비스가 해당 단계에도 맞으면 계속 사용할 수 있습니다. 추가 구독이나 결제를 자동으로 권하지 않습니다.</p>{comparison.requirements.works.map(work=>{
      const rows=comparison.byWork[work.id],good=rows.filter(r=>r.status==='eligible'),pending=rows.filter(r=>r.status==='conditional'),max=PROVIDER_POLICY.maxFeatured
      return <section key={work.id}><h3>{work.label}</h3><div className="candidate-grid">{good.slice(0,max).map(r=>card(r,work.id))}</div>{!good.length&&<p>이 단계의 필수 조건을 모두 확인한 회사가 없습니다.</p>}<details><summary>이 단계의 나머지·조건부 후보 ({good.slice(max).length+pending.length})</summary><div className="candidate-grid">{[...good.slice(max),...pending].map(r=>card(r,work.id))}</div></details></section>
    })}</section>}
    {!!comparison.conditional.length&&<details className="other-services" id="needs-check-candidates" open={needsCheckOpen} onToggle={e=>onNeedsCheckToggle?.(e.currentTarget.open)}><summary id="needs-check-summary" aria-expanded={needsCheckOpen} aria-controls="needs-check-options">추가 확인이 필요한 회사 ({comparison.conditional.length})</summary><div id="needs-check-options" className="candidate-grid">{comparison.conditional.map(r=>card(r))}</div></details>}
    {!!comparison.excluded.length&&<details><summary>필수 조건이 맞지 않는 회사 ({comparison.excluded.length})</summary><div className="candidate-grid">{comparison.excluded.map(r=>card(r))}</div></details>}
    <details><summary>추천 기준·조사 범위</summary><p>공식 근거로 기능과 이용 조건을 확인합니다. 미확인은 낮은 품질을 뜻하지 않으며, 표시 순서는 회사명 기준입니다. 회사별 성능 점수나 순위를 산정하지 않습니다.</p></details>
  </section>
}
