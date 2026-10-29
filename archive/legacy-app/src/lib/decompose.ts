import type { RequestInput, StepDefinition, StepKind } from '../types'

export const stepKindLabels: Record<StepKind,string> = { analysis: '문서·자료 분석', outline: '발표·결과 구성', 'image-generation': '실제 이미지 제작', image: '이미지 기획·프롬프트', writing: '대본·글 작성', coding: '코드 작성·검토', unknown: '작업 유형 미정' }
export function stepContract(kind: StepKind): Omit<StepDefinition,'id' | 'dependencies' | 'origin' | 'requestedEvidence'> {
  const common = ['요구사항과 원하는 형식이 맞는지 확인', '사실·수치·출처·개인정보 직접 검토']
  const contracts = {
    analysis: { title: '문서 분석', description: '원문에서 핵심 주장·수치·근거·한계를 확인할 준비입니다.', output: '핵심 주장·수치·한계·원문 위치·출처 표', inputs: ['허용된 원본 자료 또는 직접 준비한 텍스트', '작업 목표와 확인할 질문'], handoff: ['사용자가 확인한 핵심 주장·수치·한계', '시각화 목적과 인용 가능한 원문 위치·출처'], checklist: ['원문과 주장·수치가 일치하는지 대조', '인용·페이지·출처가 존재하는지 확인', '추측·누락·스캔 인식 오류 확인'] },
    outline: { title: '발표 구성', description: '확인한 핵심 내용으로 발표 순서와 시각자료의 역할을 구성합니다.', output: '슬라이드별 핵심 메시지·시간 배분·시각화 목적·출처 표', inputs: ['앞 단계에서 확인한 핵심 주장·수치·출처', '대상 청중·발표 분량·목표'], handoff: ['슬라이드별 메시지·구성·시간 배분', '이미지별 시각화 목적·확인된 수치·출처'], checklist: ['목표·청중·분량과 구성이 맞는지 확인', '슬라이드 간 논리와 근거 연결 검토', '시각화에 필요한 수치와 출처 확인'] },
    'image-generation': { title: '이미지 제작', description: '외부 실행 환경의 실제 이미지 생성 도구가 필요한 작업입니다. 설명문만으로 완료되지 않습니다.', output: '실제 이미지 파일과 사용한 문구·시각화 근거·출처 메모', inputs: ['앞 단계에서 확인한 핵심 주장·수치·시각화 목적·출처', '구도·비율·필수 문구·사용 조건'], handoff: ['사용자가 확인한 실제 이미지 파일·파일명·대체 설명', '그림에 대응하는 핵심 메시지·수치·출처·남은 오류'], checklist: ['실제 이미지 파일을 받았는지 확인 (설명문만으로 완료 아님)', '그림의 수치·문구·도형을 원문과 대조', '저작권·초상권·개인정보와 사용 조건 확인', '발표 메시지와 이미지의 일관성 확인'] },
    image: { title: '이미지 기획·프롬프트 작성', description: '텍스트 콘셉트와 이미지 생성용 지시문을 준비하는 단계입니다. 실제 이미지 파일 제작과 구분합니다.', output: '구도·문구·콘셉트와 이미지 생성용 프롬프트', inputs: ['이미지 목적·대상·필수 문구', '확인한 핵심 내용·수치·출처'], handoff: ['확인한 콘셉트·구도·문구·생성용 지시문', '실제 이미지 제작이 별도로 필요한지 여부'], checklist: ['요청이 기획인지 실제 이미지 제작인지 확인', ...common] },
    writing: { title: '대본·글 작성', description: '확인한 근거와 구성에 맞춰 요청한 글을 작성합니다.', output: '요청한 분량·형식의 대본 또는 글과 검토할 사실 목록', inputs: ['확인된 핵심 내용·출처와 사용자가 검토한 구성', '이미지가 있으면 직접 확인한 이미지와 대응 메시지'], handoff: ['검토한 최종 글·대본·분량·출처', '남은 오류와 추가 수정이 필요한 항목'], checklist: ['사실·수치를 원본과 대조', '요청한 청중·분량·형식 확인', '앞 단계 구성·이미지와 글의 일관성 확인', '추측·인용·개인정보 검토'] },
    coding: { title: '코드 작성 및 오류 검토', description: '요구사항과 재현 조건을 정리하고 코드·검증 방법을 준비합니다.', output: '수정 코드·실행 방법·테스트 방법·알려진 한계', inputs: ['비밀정보를 제거한 관련 코드와 오류 메시지', '요구사항·재현 단계·실행 환경'], handoff: ['직접 테스트한 코드·변경 요약·검증 결과', '미해결 오류와 재현 조건'], checklist: ['별도 환경에서 실행·테스트', '오류 재현과 예외 입력 확인', '비밀 키·개인정보·의존성 변경 검토', '요구사항과 결과가 일치하는지 확인'] },
    unknown: { title: '요청을 구체화할 단계 초안', description: '규칙만으로 작업과 산출물을 판단하지 못했습니다. 단계명·유형·산출물을 직접 수정하세요.', output: '사용자가 정할 산출물', inputs: ['구체적인 작업 목표·대상 자료·원하는 산출물'], handoff: ['사용자가 확정한 작업 조건과 다음에 할 일'], checklist: ['필요한 작업과 산출물 직접 확정', '자료를 넣을 실행 환경과 지원 도구 확인', '자동 분해 완료로 오해하지 않았는지 확인'] },
  }
  return { ...contracts[kind], kind }
}
export function decomposeRequest(request: RequestInput): StepDefinition[] {
  const text = request.text
  const explicit = request.tasks !== undefined && request.conditionSources?.tasks !== 'inferred'
  const ambiguous = /또는|아니면|할까|\bor\b/i.test(text)
  const image = /이미지|포스터|그림|일러스트|로고|사진|썸네일/.test(text) && !/이미지(?:는|를)?\s*(없이|제외|필요\s*없|만들지)/.test(text)
  const planning = image && /프롬프트|설명문|기획|콘셉트|구도/.test(text) && !/실제\s*(이미지|그림)|이미지\s*파일|이미지(?:를)?\s*(직접\s*)?(생성해|제작해|만들어)/.test(text)
  const analysis = explicit ? request.tasks!.includes('analysis') : /논문|문서|연구|자료|리서치|요약|회의록/.test(text)
  const coding = explicit ? request.tasks!.includes('coding') : /코딩|코드|개발|디버|버그|파이썬|python|react|typescript|javascript|프로그래밍/i.test(text)
  const writing = explicit ? request.tasks!.includes('writing') : /대본|이메일|메일|편지|글쓰기|글을|보고서|초안|문장/.test(text) || (!image && /작성|써줘|써 줘/.test(text))
  const presentation = /발표|슬라이드|프레젠테이션/.test(text)
  const definitions: StepDefinition[] = []
  const add = (kind: StepKind, origin: StepDefinition['origin'], evidence: string[]) => {
    const previous = definitions.at(-1)
    definitions.push({ ...stepContract(kind), id: `step-${definitions.length+1}`, dependencies: previous ? [previous.id] : [], origin, requestedEvidence: evidence })
  }
  if ((!explicit && ambiguous) || (explicit && !request.tasks!.length)) { add('unknown','suggested',[]); return definitions }
  if (explicit) {
    for (const task of request.tasks!) {
      if (task === 'writing' && presentation) add('outline',/구성|개요/.test(text) ? 'request' : 'suggested',/구성|개요/.test(text) ? ['구성·개요 요청'] : [])
      add(task,'user',['사용자가 선택한 작업 유형'])
    }
  } else {
    if (analysis) add('analysis','request',text.match(/논문|문서|연구|자료|리서치|요약|회의록/g) ?? [])
    if (presentation) add('outline',/구성|개요/.test(text) ? 'request' : 'suggested',/구성|개요/.test(text) ? ['구성·개요 요청'] : [])
    if (image) add(planning ? 'image' : 'image-generation','request',text.match(/이미지|포스터|그림|일러스트|로고|사진|썸네일/g) ?? [])
    if (coding) add('coding','request',text.match(/코드|개발|버그|python|React/gi) ?? ['코딩 요청'])
    if (writing) { add('writing','request',text.match(/대본|이메일|편지|보고서|초안|문장|글쓰기/g) ?? ['글 작성 요청']); if (/대본/.test(text)) definitions.at(-1)!.title = '대본 작성' }
  }
  if (!definitions.length) add('unknown','suggested',[])
  return definitions
}
export function dependentStepIds(steps: StepDefinition[], id: string): Set<string> {
  const affected = new Set<string>([id])
  let changed = true
  while (changed) { changed = false; for (const step of steps) if (!affected.has(step.id) && step.dependencies.some(dep => affected.has(dep))) { affected.add(step.id); changed = true } }
  affected.delete(id)
  return affected
}
