import type { CodingIntent } from '../recommendationTypes'

export const codingIntentLabels:Record<CodingIntent,string>={algorithm:'알고리즘·문제 풀이',application:'앱·웹 개발',repository:'기존 코드 오류 수정·저장소 작업',unspecified:'코딩 세부 목적 미정'}
export function inferCodingIntent(text:string):CodingIntent {
  if(/오류|버그|디버|기존\s*코드|저장소|리팩터|패치|repository|debug|bug|fix/i.test(text))return 'repository'
  if(/알고리즘|문제\s*풀이|코딩\s*테스트|백준|프로그래머스|leetcode|경진/i.test(text))return 'algorithm'
  if(/react|앱|웹|기능\s*구현|프론트|백엔드|서비스\s*개발|사이트/i.test(text))return 'application'
  return 'unspecified'
}
export function codingMetricFit(benchmark:string,intent:CodingIntent):{value:number;reason:string} {
  const algorithm=/LiveCodeBench|HumanEval|MultiPL|Coding Index/i.test(benchmark)
  const repository=/SWE|SWE-bench|SWE-Dev/i.test(benchmark)
  const application=/CursorBench/i.test(benchmark)
  if(intent==='algorithm')return algorithm?{value:4,reason:'알고리즘 코드 생성·문제 정답 검증과 직접 관련'}:{value:1,reason:'도구·저장소 실행 과제이며 알고리즘 정답 비교와 다른 평가'}
  if(intent==='application')return application?{value:4,reason:'코딩 편집기에서 개발 작업을 수행하는 구성 평가로 앱 구현에 관련'}:repository?{value:2,reason:'저장소 수정 과제로 관련되지만 앱 기능·React 품질의 직접 평가는 아님'}:{value:1,reason:'알고리즘 또는 터미널 과제로 앱·웹 개발의 대표 근거로 부족'}
  if(intent==='repository')return repository?{value:4,reason:'기존 저장소의 코드 수정·문제 해결을 평가하므로 오류 수정과 관련'}:application?{value:2,reason:'개발 도구 작업 평가이며 저장소 버그 수정과 일부 관련'}:{value:1,reason:'알고리즘 또는 터미널 과제로 실제 저장소 버그 수정의 직접 비교는 아님'}
  return {value:1,reason:'세부 작업이 미정이므로 특정 코딩 평가를 대표로 확정하지 않음'}
}
