import { featureLabels, scoringTaskLabels } from '../data/recommendationPolicy'
import { interpretTask } from '../lib/aiGuide'
import type { FeatureId, ScoringTask } from '../recommendationTypes'
import type { PromptRequest, InputMode } from '../types'

export default function AnalysisPanel({ request,onChange }: { request:PromptRequest;onChange:(request:PromptRequest)=>void }) {
  const a = interpretTask(request)
  return <section className="analysis-panel"><h2>작업과 필요한 기능</h2><p>{a.notes[0]}</p><fieldset><legend>수행할 작업</legend><div className="radio-options">{(Object.entries(scoringTaskLabels) as [ScoringTask,string][]).map(([id,label]) => <label key={id}><input type="checkbox" checked={a.tasks.includes(id)} onChange={e => onChange({ ...request,tasks:e.target.checked ? [...a.tasks,id] : a.tasks.filter(t => t!==id) })} />{label}</label>)}</div></fieldset>
    {(a.needsInputMode || request.inputMode !== undefined) && <fieldset className="data-mode"><legend>어떤 형태로 자료를 넣을 예정인가요?</legend><div className="radio-options">{([['summary','요약 통계값·텍스트를 직접 입력'],['file','파일 첨부가 필요해요'],['unknown','아직 모르겠어요']] as [InputMode,string][]).map(([id,label]) => <label key={id}><input type="radio" name="input-mode" id={`mode-${id}`} checked={a.inputMode===id} onChange={() => onChange({ ...request,inputMode:id })} />{label}</label>)}</div><p>{a.notes[1]}</p></fieldset>}
    <details><summary>필수 기능 직접 수정</summary><p>선택한 기능만 후보 판단에 사용해요. 파일 첨부·코드 실행이 모든 작업에 필요한 것은 아니에요.</p><div className="radio-options">{(Object.entries(featureLabels) as [FeatureId,string][]).map(([id,label]) => <label key={id}><input type="checkbox" checked={a.requiredFeatures.includes(id)} onChange={e => onChange({ ...request,requiredFeatures:e.target.checked ? [...a.requiredFeatures,id] : a.requiredFeatures.filter(f => f!==id) })} />{label}</label>)}</div></details>
    {!a.tasks.length && <p className="error">작업 종류를 아직 확인하지 못했어요. 위에서 직접 선택하거나 입력을 수정해 주세요.</p>}
  </section>
}
