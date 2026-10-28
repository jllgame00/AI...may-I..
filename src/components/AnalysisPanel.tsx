import { featureLabels, scoringTaskLabels } from '../data/recommendationPolicy'
import { interpretTask } from '../lib/aiGuide'
import { structureSurveyTask } from '../lib/surveyTask'
import { resolveConditions } from '../lib/promptEngine'
import { codingIntentLabels } from '../lib/codingIntent'
import type { CodingIntent, FeatureId, ScoringTask } from '../recommendationTypes'
import type { PromptRequest } from '../types'

export default function AnalysisPanel({request,onChange}:{request:PromptRequest;onChange:(r:PromptRequest)=>void}){
  const a=interpretTask(request),c=resolveConditions(request),survey=structureSurveyTask(request,c)
  const update=(key:keyof NonNullable<PromptRequest['details']>,value:string)=>onChange({...request,details:{...request.details,[key]:value}})
  return <section className="analysis-panel"><p>원문은 그대로 두고 아래 해석만 수정할 수 있어요. 직접 수정한 값이 우선합니다.</p>
    <div className="analysis-facts"><p><strong>작업</strong> {a.tasks.map(t=>scoringTaskLabels[t]).join(' → ')||'미정'}</p><p><strong>산출물</strong> {c.format.value||'미정'}{c.length.value&&` · ${c.length.value}`}{c.tone.value&&` · ${c.tone.value}`}</p>{a.survey&&<p><strong>단계</strong> 통계 분석 → 결과 해석{a.tasks.includes('writing')?' → 보고서 초안 → 검토':''}</p>}</div>
    {a.survey&&<div className="analysis-edit-grid"><label>작업 목표<input id="detail-task" value={survey.task} onChange={e=>update('task',e.target.value)}/></label><label>자료 종류·조사 대상<input id="detail-material" value={survey.material} onChange={e=>update('material',e.target.value)}/></label><label className="wide">연구 질문 <span>한 줄에 하나씩</span><textarea id="detail-questions" rows={3} value={survey.questions.join('\n')} onChange={e=>update('researchQuestions',e.target.value)}/></label><label className="wide">설명 수준<input id="detail-explanation" value={survey.explanation} onChange={e=>update('explanation',e.target.value)}/></label><p className="wide minor-note">{survey.sample?`${survey.sample}은 요청에 적힌 조사 대상입니다. `:''}실제 응답 수와 분석별 유효 표본 수는 외부 AI에서 자료로 확인해야 해요. 자료 형식: {survey.fileFormat||'미정'}.</p></div>}
    {!!a.requiredFeatures.length&&<p className="feature-notice">필요한 기능: {a.requiredFeatures.map(f=>featureLabels[f]).join(' · ')}. 이 사이트에는 파일을 올리지 않아요.</p>}
    <details><summary>작업 종류·필수 기능 수정</summary><fieldset><legend>수행할 작업</legend><div className="radio-options">{(Object.entries(scoringTaskLabels) as [ScoringTask,string][]).map(([id,label])=><label key={id}><input type="checkbox" checked={a.tasks.includes(id)} onChange={e=>onChange({...request,tasks:e.target.checked?[...a.tasks,id]:a.tasks.filter(t=>t!==id)})}/>{label}</label>)}</div></fieldset>
      {a.codingIntent&&<label>코딩 작업<select id="coding-intent" value={a.codingIntent} onChange={e=>onChange({...request,codingIntent:e.target.value as CodingIntent})}>{(Object.entries(codingIntentLabels) as [CodingIntent,string][]).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>}
      <fieldset><legend>필수 기능</legend><div className="radio-options">{(Object.entries(featureLabels) as [FeatureId,string][]).map(([id,label])=><label key={id}><input type="checkbox" checked={a.requiredFeatures.includes(id)} onChange={e=>onChange({...request,requiredFeatures:e.target.checked?[...a.requiredFeatures,id]:a.requiredFeatures.filter(f=>f!==id)})}/>{label}</label>)}</div></fieldset>
    </details>
  </section>
}
