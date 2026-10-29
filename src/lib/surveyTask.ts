import type { PromptRequest, ResolvedConditions } from '../types'

// Keep the source separate from derived fields. Never remove words from the
// source to manufacture a stage instruction; unknown fields remain inputs.
export interface SurveyTask {
  readonly originalText: string
  readonly task: string
  readonly material: string
  readonly sample: string
  readonly fileFormat: string
  readonly questions: readonly string[]
  readonly explanation: string
  readonly finalOutput: Readonly<{ format: string; length: string }>
}
export function structureSurveyTask(request: PromptRequest, conditions: ResolvedConditions): SurveyTask {
  const text = request.text
  const questions:string[]=[]
  // Split at complete question boundaries, retaining each intact source
  // clause. A recognized question must never hide its unfamiliar neighbour.
  const clauses=text.split(/[.!?\n,;]+|(?<=(?:차이|관계|상관|비교|영향))\s*(?:와|과|및|그리고|또한)\s*/)
  for(const clause of clauses) {
    const groupQuestions=[...clause.matchAll(/(?:학년|전공|성별|연령|학과|지역|두\s*집단|집단)(?:별|의)?\s*[^.!?\n,]*?(?:차이|관계|상관|비교)/g)].map(m=>m[0])
    const relation=clause.match(/([가-힣]+(?:\s+[가-힣]+)?)\s*[·ㆍ와과]\s*([가-힣]+?)(?:의)?\s*(관계|상관(?:관계)?)/)
    // Only the punctuation-delimited relation is paraphrased. Natural Korean
    // conjunctions already belong to an intact clause and need no rewriting.
    if(relation && /[·ㆍ]/.test(relation[0]) && !clause.slice(0,relation.index).trim() && !groupQuestions.length) {
      const left=relation[1],right=relation[2]
      questions.push(`${left}${(left.charCodeAt(left.length-1)-0xac00)%28===0?'와':'과'} ${right}의 ${relation[3]}`)
    } else if(/차이|관계|상관|비교|영향|예측|알고\s*싶|보고\s*싶/.test(clause) && !/보고서|A4|분량/.test(clause)) {
      questions.push(clause.trim())
    } else questions.push(...groupQuestions)
  }
  return Object.freeze({originalText:text, task:request.details?.task ?? '설문 통계 분석',
    material:request.details?.material ?? text.match(/[^.!?\n,]*?설문\s*(?:CSV|엑셀|자료|결과|통계값)?/i)?.[0].trim() ?? '',
    sample:text.match(/(?:(?:대학생|대학원생|학생|성인|응답자|참여자)\s*)?\d+\s*명/)?.[0] ?? '',
    fileFormat:(request.details?.material ?? text).match(/엑셀|xlsx|csv|스프레드시트/i)?.[0] ?? '',
    questions:Object.freeze(request.details?.researchQuestions !== undefined ? request.details.researchQuestions.split('\n').filter(q=>q.trim()) : [...new Set(questions)]),
    explanation:request.details?.explanation ?? (conditions.tone.source==='user'?conditions.tone.value:conditions.tone.value || (/통계를\s*잘\s*몰|통계\s*초보|쉬운\s*설명/.test(text)?'쉽게':'')),
    finalOutput:Object.freeze({format:conditions.format.value,length:conditions.length.value})})
}
export function surveyContext(task: SurveyTask): string {
  return [`작업 원문 (그대로 보존한 참고 자료)\n<원문>\n${task.originalText}\n</원문>\n\n원문의 조사 배경·추가 조건도 반영하되, 아래 정리·수정한 조건과 현재 단계 실행 지시를 우선 적용하세요. 다른 단계의 산출물은 이 단계에서 생성하지 마세요. 분석·해석 단계에는 최종 보고서 분량을 강제하지 마세요.`,
    `작업: ${task.task}`,
    `자료: ${task.material || '[설문 자료의 주제와 수집 대상을 입력하세요]'}`,
    task.sample?`요청에 제시된 조사 대상: ${task.sample}. 실제 응답 수와 분석별 유효 표본 수는 자료에서 확인해 주세요.`:'조사 대상·표본 수: [확인한 대상과 표본 수를 입력하세요]',
    task.fileFormat?`자료 형식: ${task.fileFormat}`:'자료 형식: [제공할 자료의 형태를 입력하세요]',
    `연구 질문\n${task.questions.length?task.questions.map((q,i)=>`${i+1}. ${q}`).join('\n'):'[분석할 연구 질문을 입력하세요]'}`,
    task.explanation?`설명 수준: ${task.explanation} 설명해 주세요. 분석 방법과 결과 해석에서 어려운 통계 용어를 풀어 주세요.`:'',
  ].filter(Boolean).join('\n')
}
