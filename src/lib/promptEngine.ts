import type { ConditionField, Conditions, PromptBundle, PromptRequest, PromptTemplate, ResolvedConditions, TaskKind } from '../types'
import { deliverableIntent, resolveDeliverables } from './deliverables.ts'
import { renderDeliverable } from './deliverablePrompts.ts'

export const fieldLabels: Record<ConditionField,string> = { purpose: '사용 목적', audience: '대상 독자', format: '결과 형식', length: '분량', tone: '말투', constraints: '꼭 지킬 조건' }
export const fieldHints: Record<ConditionField,string> = { purpose: '예: 수업 발표, 고객 안내', audience: '예: 처음 배우는 대학생', format: '예: 이메일, 표, 발표 대본', length: '예: 5분, 500자, 3문장', tone: '예: 정중하게, 친근하게', constraints: '예: 전문 용어를 풀어 쓰기' }
const fields = Object.keys(fieldLabels) as ConditionField[]
export function taskKind(text: string): TaskKind {
  if (/코드|코딩|버그|디버깅|python|react|typescript|javascript/i.test(text)) return 'coding'
  if (/논문|연구|리서치|근거|자료.*분석/.test(text)) return 'research'
  if (/요약|회의록/.test(text) && !/대본|발표/.test(text)) return 'summary'
  if (/이미지|포스터|일러스트|그림|로고|사진/.test(text)) return 'image'
  if (/글|이메일|메일|편지|대본|보고서|문장|초안|발표|안내문|소개문|공지문|감상문/.test(text)) return 'writing'
  return 'general'
}
export function extractConditions(text: string): Conditions {
  const explicit = (name: string) => text.match(new RegExp(`${name}\\s*[:：]\\s*([^\\n.;]+)`))?.[1].trim() ?? ''
  const formats = ['발표 대본','체크리스트','이메일','보고서','요약문','개요','대본','메일','JSON','마크다운','목록','코드']
  const explicitOutputs = [...text.matchAll(/(발표 대본|체크리스트|이메일|보고서|요약문|개요|대본|메일|JSON|마크다운|목록|코드|표)\s*(?:형식(?:으로|로)?|형태(?:로)?|으로|로)(?!\s*(?:주어진|제공된|받은|있는))/gi)]
  const candidates = formats.filter(f => text.toLowerCase().includes(f.toLowerCase()) && !new RegExp(`${f}(?:이|가|은|는)?\\s*(?:아닌|말고|제외)`,'i').test(text) && !new RegExp(`${f}(?:의)?\\s*(?:내용|자료|원문)|${f}(?:을|를)?\\s*(?:요약|분석|읽)`,'i').test(text))
  const mentioned = candidates.filter(f => !candidates.some(other => other !== f && other.includes(f)))
  const format = explicitOutputs.at(-1)?.[1] ?? (mentioned.length === 1 ? mentioned[0] : mentioned.find(f => text.match(new RegExp(`${f}(?:을|를)?\\s*(?:작성|만들|써|출력)`,'i'))) ?? '')
  return {
    purpose: explicit('목적') || text.match(/수업\s*발표(?:용)?|고객\s*안내용|업무\s*공유용|면접\s*준비용/)?.[0] || '',
    audience: explicit('대상(?: 독자)?') || text.match(/(초등학생|중학생|고등학생|대학생|초보자|비전공자|전문가|신입사원|고객|교수|동료|팀원|어린이|학부모|투자자|면접관)(?=\s*(?:에게|대상|용|을\s*위한|를\s*위한|도\s*이해))|(?<=대상\s)(초등학생|중학생|고등학생|대학생|초보자|비전공자|전문가|고객|교수)/)?.[0] || '',
    format: explicit('형식') || format,
    length: explicit('분량') || text.match(/A4\s*\d+\s*장|\d+\s*(?:[~–-]\s*\d+\s*)?(?:분|자|문장|줄|단어|페이지|쪽|장|개\s*항목|개\s*문단)/)?.[0] || '',
    tone: explicit('말투') || text.match(/친근(?:하게|한)?|정중(?:하게|한)?|공손(?:하게|한)?|격식\s*있게|간결(?:하게|한)?|전문적(?:으로|인)?|차분(?:하게|한)?|쉽게|쉬운\s*말로/)?.[0] || '',
    constraints: explicit('제약') || text.match(/[^.!?\n]*(?:금지|제외|하지\s*마|반드시|포함하지|넣지\s*마)[^.!?\n]*/)?.[0].trim() || '',
  }
}
export function resolveConditions(request: PromptRequest): ResolvedConditions {
  const inferred = extractConditions(request.text)
  return Object.fromEntries(fields.map(field => [field,{ value: (request.overrides[field] ?? inferred[field]).trim(), source: request.overrides[field] !== undefined ? 'user' : inferred[field] ? 'input' : 'unknown' }])) as ResolvedConditions
}
export function questionsFor(request: PromptRequest): ConditionField[] {
  const kind = taskKind(request.text), conditions = resolveConditions(request)
  const questionOrder: ConditionField[] = kind === 'general' ? ['purpose','format','length'] : kind === 'writing' || /발표|대본/.test(request.text) ? ['audience','format','length'] : kind === 'summary' ? ['format','length'] : kind === 'research' ? ['format'] : []
  return questionOrder.filter(field => !conditions[field].value && request.overrides[field] === undefined).slice(0,3)
}
export function skipQuestions(request: PromptRequest, questions: ConditionField[]): PromptRequest {
  const overrides = { ...request.overrides }
  for (const field of questions) if (overrides[field] === undefined) overrides[field] = ''
  return { ...request, overrides }
}
const checks: Record<TaskKind,string[]> = {
  writing: ['요청한 독자·분량·말투와 맞는지 확인하세요.', '추측한 사실·과장·개인정보가 없는지 확인하세요.', '필수 내용과 빠진 조건을 확인하세요.'],
  summary: ['주장·수치를 원본과 대조하세요.', '결정 사항·예외·한계가 빠지지 않았는지 확인하세요.', '자료에 없는 해석이 섞이지 않았는지 확인하세요.'],
  research: ['사실·수치를 원문과 대조하세요.', '인용·페이지·링크가 실제로 존재하는지 확인하세요.', '근거가 있는 내용과 추측을 구분하세요.', '최종 형식·분량이 요청과 맞는지 확인하세요.'],
  coding: ['별도 환경에서 코드를 실행하고 테스트하세요.', '오류 재현·예외 입력·기존 기능을 확인하세요.', '비밀 키·개인정보·의존성 변경을 검토하세요.'],
  image: ['필수 문구·구도·비율과 결과가 맞는지 확인하세요.', '수치·문자·시각 오류를 확인하세요.', '저작권·초상권·개인정보를 확인하세요.'],
  general: ['요청한 작업과 결과가 일치하는지 확인하세요.', '자료에 없는 사실이나 개인정보가 포함되지 않았는지 확인하세요.', '남은 빈칸과 미확인 내용을 확인하세요.'],
}
export function buildPromptBundle(request: PromptRequest): PromptBundle {
  const text = request.text.trim()
  if (!text) throw new Error('어떤 작업을 하고 싶은지 입력해 주세요.')
  if (text.length > 4000) throw new Error('작업 설명은 4,000자 이내로 적어 주세요.')
  const kind = taskKind(text), conditions = resolveConditions(request)
  const value = (field: ConditionField) => conditions[field].value
  const material = ['summary','research','coding'].includes(kind) || /첨부|원문|자료|원고|기존\s*글/.test(text)
  const sections = [text]
  if (value('purpose') || kind === 'general') sections.push(`사용 맥락\n${value('purpose') || '[사용 목적을 입력하세요]'}`)
  const presentation = fields.filter(f => f !== 'purpose' && f !== 'constraints' && value(f)).map(f => `- ${fieldLabels[f]}: ${value(f)}`)
  const edited = fields.filter(f => request.overrides[f] !== undefined)
  const precedence = edited.length ? `별도로 정한 조건을 원래 요청보다 우선 적용해 주세요.${edited.some(f => !value(f)) ? ` 다음 조건은 미정이므로 원래 요청의 값을 확정하지 말고 필요한 경우 물어봐 주세요: ${edited.filter(f => !value(f)).map(f => fieldLabels[f]).join(', ')}.` : ''}` : ''
  if (precedence) sections.push(`조건 적용\n${precedence}`)
  if (presentation.length) sections.push(`작성 조건\n${presentation.join('\n')}`)
  if (!value('format') && kind === 'general') sections.push('결과 형식\n[원하는 결과 형식을 입력하세요]')
  if (material) sections.push(`입력 자료\n${kind === 'coding' ? '[관련 코드와 오류 메시지를 붙여넣으세요]' : '[분석할 자료 또는 직접 확인한 요약을 붙여넣으세요]'}\n자료가 없으면 내용을 추측하지 말고 필요한 자료를 물어봐 주세요.`)
  if(kind==='coding')sections.push('수행 순서\n1. 코드와 오류·기대 동작을 대조하고 버그의 재현 조건을 확인해 주세요.\n2. 원인을 설명하고 기존 기능을 유지하는 최소 수정안을 작성해 주세요.\n3. 재현 테스트와 회귀 테스트를 작성하고 실행 방법을 알려 주세요.\n\n산출물은 변경 코드 또는 패치, 수정 이유, 테스트 방법과 실제 실행 결과입니다. 코드를 실행할 수 없으면 그 한계와 직접 검증할 절차를 적어 주세요.')
  if(kind==='writing'&&/홍보|모집|광고|캠페인/.test(text))sections.push('핵심 매력과 참여 방법이 드러나는 완성 글을 작성해 주세요. 동아리·행사 이름, 모집 대상·일정, 신청 방법 등 꼭 필요한 정보가 없으면 먼저 물어봐 주세요. 확인되지 않은 혜택이나 실적은 만들지 마세요.')
  const constraints = [value('constraints'), ...(material && kind!=='coding' ? ['제공한 자료에 없는 사실·수치·인용을 만들지 마세요. 확인할 수 없는 내용은 구분해 주세요.'] : [])].filter(Boolean)
  if (constraints.length) sections.push(`지킬 조건\n${constraints.join('\n')}`)
  sections.push(`답변 전 확인\n${kind === 'coding' ? '수정 이유와 직접 실행할 테스트 방법을 포함해 주세요. 실행하지 않은 테스트를 통과했다고 말하지 마세요.' : '요청한 목적·형식·분량을 지켰는지 확인하고, 정보가 부족한 부분은 임의로 채우지 마세요.'}`)
  const intents=resolveDeliverables(request)
  const outputs=intents.map((intent,index)=>renderDeliverable(request,intent,conditions,{scope:'request',includeReference:index===0}))
  const main: PromptTemplate = { id: 'main', title: '기본 프롬프트', text: intents.some(intent=>intent.kind!=='general_writing')?outputs.map(output=>output.text).join('\n\n'):sections.join('\n\n'), deliverable:outputs[0].contract }
  const steps: PromptTemplate[] = []
  if (/논문|자료|문서/.test(text) && /발표|대본/.test(text) && !intents.some(intent=>intent.origin==='explicit')) {
    steps.push({ id: 'analysis', title: '1. 자료의 핵심 정리', text: '' })
    steps.push({ id: 'outline', title: '2. 발표 구성', text: '' })
    if (/이미지|그림|포스터/.test(text)) steps.push({ id: 'image', title: '3. 이미지 제작용 프롬프트', text: '' })
    if (/대본/.test(text)) steps.push({ id: 'script', title: `${steps.length+1}. 대본 작성`, text: '' })
  }
  const stageConditions = fields.filter(f => f !== 'format' && f !== 'length' && value(f)).map(f => `- ${fieldLabels[f]}: ${value(f)}`).join('\n')
  const stageFormats: Record<string,string> = { analysis: '핵심 주장·수치·한계·출처 표', outline: '슬라이드별 메시지·순서·시각화 목적·출처 목록', image: '실제 이미지와 시각화 근거', script: value('format') || '발표 대본' }
  const stageKinds={analysis:'analysis',outline:'presentation_outline',image:'image',script:'presentation_script'} as const
  const stageActions:Record<string,string>={analysis:'제공한 원본 자료의 핵심 주장·수치·한계·원문 위치·출처를 표로 분석해 주세요. 자료가 없으면 먼저 요청하고 수치·출처를 만들지 마세요.',outline:'앞 단계에서 확인한 내용으로 슬라이드별 메시지·순서·시각화 목적·출처를 정리해 주세요. 이 단계에서는 발표 구성을 제공하세요.',image:'앞 단계에서 확인한 시각화 목적·수치·문구·구도에 맞는 실제 이미지를 제작해 주세요. 실제 이미지 생성이 불가능하면 그 한계를 밝히고 설명문을 이미지 파일이라고 말하지 마세요.'}
  for (const [index,step] of steps.entries()) {
    const rendered=renderDeliverable(request,deliverableIntent(stageKinds[step.id as keyof typeof stageKinds]),conditions,{instruction:stageActions[step.id],previous:steps[index-1]?.deliverable})
    step.deliverable=rendered.contract
    step.text=rendered.text+`\n\n이 단계의 작성 조건\n- 결과 형식: ${stageFormats[step.id]}\n${[stageConditions,...(['outline','script'].includes(step.id) && value('length') ? [`- 전체 발표 분량: ${value('length')}`] : []),precedence].filter(Boolean).join('\n')}`
  }
  const followups: PromptTemplate[] = [
    { id: 'shorter', title: '더 짧게', text: `앞선 답변을 ${value('length') ? `${value('length')} 범위 안에서 더 간결하게` : '핵심만 남겨 더 짧게'} 다듬어 주세요. 필수 조건과 중요한 주의사항은 유지해 주세요.` },
    { id: 'simpler', title: '쉽게 설명', text: `앞선 답변을 ${value('audience') || '읽는 사람'}이 이해하기 쉽게 풀어 주세요. 어려운 용어는 짧게 설명하고, 사실과 비유를 구분해 주세요.` },
    kind === 'coding' ? { id: 'debug', title: '오류 다시 확인', text: '[오류 메시지와 재현 조건을 붙여넣으세요]\n앞선 코드에서 이 오류의 원인을 사실과 가정으로 나누고, 최소 수정안과 테스트 방법을 제시해 주세요.' } : material ? { id: 'evidence', title: '근거 보완', text: '앞선 답변에서 자료로 확인된 주장과 추가 확인이 필요한 주장을 나누고, 실제 확인 가능한 출처·원문 위치를 표시해 주세요. 출처를 찾지 못하면 만들지 마세요.' } : { id: 'tone', title: '말투 다듬기', text: `앞선 답변을 ${value('tone') || '[원하는 말투]'}로 다듬어 주세요. 의미와 필수 내용을 유지하고 과장된 표현은 줄여 주세요.` },
  ]
  return { context: JSON.stringify([text,conditions]), kind, conditions, main, steps, followups,
    improvements: [presentation.length ? '입력한 독자·형식·분량·말투를 작성 조건으로 정리했어요.' : '작업 목표와 답변 확인 기준을 정리했어요.', ...(material ? ['자료를 직접 넣을 위치와 추측을 막는 지시를 추가했어요.'] : [])], checklist: checks[kind] }
}
