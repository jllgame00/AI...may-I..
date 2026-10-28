import PromptEditor from './PromptEditor'
import { executionRoutes, guideContext, stageCandidate } from '../lib/aiGuide'
import { primaryAccessCandidates, accessCategory } from '../lib/modelAccess'
import { candidateSummary } from '../lib/candidatePresentation'
import type { PromptDraft, Session } from '../types'

export default function StageWorkspace({session,onStage,onDraft,onCandidate,onReviewed,onCompare,onEdit,onNew}:{session:Session;onStage:(id:string)=>void;onDraft:(id:string,draft:PromptDraft)=>void;onCandidate:(stage:string,id:string)=>void;onReviewed:(id:string,value:boolean)=>void;onCompare:()=>void;onEdit:()=>void;onNew:()=>void}){
  const bundle=session.bundle!,steps=bundle.guideStages??[]
  const stage=steps.find(s=>s.id===session.activeStageId)??steps[0]
  if(!stage)return null
  const index=steps.indexOf(stage),selection=session.selection??{default:null,byStage:{}}
  const c=stageCandidate(selection,stage.id,session.comparison?.recommendations??[])
  const candidates=primaryAccessCandidates(session.comparison?.recommendations??[],session.comparison?.analysis.requiredFeatures??[],c?.id)
  const context=guideContext(stage,bundle.context)
  const required=session.comparison?.analysis.requiredFeatures??[]
  return <section className="result-page"><div className="page-heading"><h1 tabIndex={-1}>프롬프트를 편집하고 복사하세요</h1><p>외부 AI에 직접 붙여넣고, 확인한 결과를 다음 단계로 옮겨 주세요.</p></div>
    <div className="workspace"><aside className="context-panel"><h2>작업 단계</h2><ol className="stage-list">{steps.map((s,i)=><li key={s.id}><button id={`stage-${s.id}`} className={s.id===stage.id?'active-stage':''} aria-current={s.id===stage.id?'step':undefined} onClick={()=>onStage(s.id)}><span>{i+1}. {s.title}</span>{session.reviewed?.[s.id]&&<small>직접 검토함</small>}</button></li>)}</ol><details><summary>작업 원문</summary><p>{session.request.text}</p></details><button id="change-ai" className="text-button" onClick={onCompare}>모델 다시 비교</button><button id="change-request" className="text-button" onClick={onEdit}>작업·조건 수정</button><button id="new-task" className="text-button" onClick={onNew}>새 작업 시작</button></aside>
    <div className="prompt-column"><div className="stage-context"><p className="eyebrow">{index+1} / {steps.length}</p><h2 id="stage-title" tabIndex={-1}>{stage.title}</h2><p>{stage.purpose}</p>
      {c&&<div className="selected-model"><strong>{c.model?.name??c.service.name}</strong><button className="text-button" onClick={onCompare}>변경</button><p className="minor-note">{required.length?candidateSummary(c,required).limit:accessCategory(c)!=='web'?'정확한 모델 버전의 웹 제공 여부를 확인해야 해요.':'평가와 실제 웹의 도구·설정은 다를 수 있어요.'}</p></div>}
    </div>
    <PromptEditor key={stage.id} template={stage} draft={session.drafts[stage.id]??{text:stage.text,context,previous:null}} context={context} onChange={draft=>onDraft(stage.id,draft)} primary/>
    <div className="external-use">{c&&executionRoutes(c).map(r=><a key={r.url} id="open-service" href={r.url} target="_blank" rel="noreferrer" className="button secondary">{c.service.name}에서 사용 ↗</a>)}<p>내용은 자동 전송되지 않아요. 서비스에서 모델·기능을 확인하고 직접 실행하세요.</p></div>
    <section className="stage-review"><h2>결과를 짧게 확인하세요</h2><ul>{stage.checks.map(x=><li key={x}>{x}</li>)}</ul><label className="review-check"><input id="review-stage" type="checkbox" checked={!!session.reviewed?.[stage.id]} onChange={e=>onReviewed(stage.id,e.target.checked)}/>원자료·요구사항과 직접 대조했어요</label><details><summary>다음 단계로 가져갈 내용</summary><ul>{stage.handoff.map(x=><li key={x}>{x}</li>)}</ul><p>다음 프롬프트의 [앞 단계…] 위치에 직접 붙여넣으세요.</p></details><div className="question-actions">{index>0&&<button className="button secondary" onClick={()=>onStage(steps[index-1].id)}>이전 단계</button>}{index<steps.length-1&&<button id="next-stage" className="button primary" onClick={()=>onStage(steps[index+1].id)}>다음: {steps[index+1].title} →</button>}</div></section>
    <details className="usage-details"><summary>모델·기능·단계 입력 상세</summary><p>서비스 {c?.service.name} · 플랜 {c?.plan.name} · 모드 {c?.mapping.mode??'미확인'}</p><p>{c?.mapping.note}</p><p>{c?.holds.join(' · ')}</p><p>필요한 입력: {stage.inputs.join(' · ')}</p><p>산출물: {stage.output}</p><label>이 단계에서만 후보 변경<select id="stage-candidate" value={c?.id??''} onChange={e=>onCandidate(stage.id,e.target.value)}><option value="" disabled>후보 선택</option>{candidates.map(x=><option key={x.id} value={x.id}>{x.model?.name??`${x.service.name} · 모델 미지정`} · {x.plan.name}</option>)}</select></label></details>
    </div></div>
  </section>
}
