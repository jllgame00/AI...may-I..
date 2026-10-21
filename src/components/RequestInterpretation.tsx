import { featureLabels, scoringTaskLabels } from '../data/recommendationPolicy'
import { interpretRequest } from '../lib/recommend'
import type { FeatureId, RequestInput, ScoringTask } from '../types'

export default function RequestInterpretation({ draft, onChange }: { draft: RequestInput; onChange: (draft: RequestInput) => void }) {
  const detected = interpretRequest(draft.text)
  const tasks = draft.tasks ?? detected.tasks
  const features = draft.requiredFeatures ?? detected.requiredFeatures
  const reorder = (index: number) => {
    const next = [...tasks]; [next[index - 1], next[index]] = [next[index], next[index - 1]]
    onChange({ ...draft, tasks: next })
  }
  return <section className="interpretation-panel" aria-label="분석된 작업과 필수 기능 수정">
    <h3>분석된 작업을 확인해 주세요</h3>
    <p>키워드로 제안한 해석입니다. 실제 작업과 필수 조건을 직접 수정할 수 있어요.</p>
    {!tasks.length && <p role="status">{detected.kind === 'image' && draft.tasks === undefined ? '이미지는 기존 텍스트 기획·프롬프트 기능으로 진행합니다. 벤치마크 점수 대상 밖입니다.' : '작업이 명확하지 않습니다. 아래 작업을 선택하거나 요청을 구체화해 주세요.'}</p>}
    <fieldset><legend>수행할 작업</legend><div className="editable-options">{(Object.entries(scoringTaskLabels) as [ScoringTask, string][]).map(([id, label]) => <label key={id}><input type="checkbox" checked={tasks.includes(id)} onChange={event => onChange({ ...draft, tasks: event.target.checked ? [...tasks, id] : tasks.filter(t => t !== id) })} />{label}</label>)}</div></fieldset>
    {tasks.length > 1 && <ol className="task-order">{tasks.map((task, index) => <li key={task}>{scoringTaskLabels[task]}{index > 0 && <button type="button" className="text-button" aria-label={`${scoringTaskLabels[task]} 순서 위로`} onClick={() => reorder(index)}>↑ 위로</button>}</li>)}</ol>}
    <fieldset><legend>모든 단계에 필요한 필수 기능</legend><div className="editable-options">{(Object.entries(featureLabels) as [FeatureId, string][]).map(([id, label]) => <label key={id}><input type="checkbox" checked={features.includes(id)} onChange={event => onChange({ ...draft, requiredFeatures: event.target.checked ? [...features, id] : features.filter(f => f !== id) })} />{label}</label>)}</div></fieldset>
    <p>필수가 아닌 기능은 해제하세요. 기능 미지원은 제외하고 미확인은 조건부로 표시합니다.</p>
  </section>
}
