import { taskEvidenceResearch } from '../data/taskEvidence.ts'
import { primaryAccessCandidates } from './modelAccess.ts'
import { collectComparisonSets, validObservations } from './evidenceComparisons.ts'
import { inferCodingIntent } from './codingIntent.ts'
import { referenceCandidatesForTask } from './recommend.ts'
import type { CodingIntent, FeatureId, Recommendation, RecommendationSnapshot, ScoringTask, TaskRecommendationDecision, TaskRecommendationEntry } from '../recommendationTypes'

// Performance evidence is independent of web access and price. No cross-metric average.
export function taskRecommendations(task:ScoringTask,text:string,required:FeatureId[],candidates:Recommendation[],data:RecommendationSnapshot,references:Recommendation[]=referenceCandidatesForTask(task,{text},[],data).recommendations,intent:CodingIntent|null=task==='coding'?inferCodingIntent(text):null):TaskRecommendationDecision {
  const models=new Map(primaryAccessCandidates([...candidates,...references]).map(c=>[c.model!.id,c]))
  const all=validObservations(data.evaluations??[]).filter(e=>data.models.some(m=>m.id===e.modelId&&m.version===e.modelVersion))
  const relevant=all.filter(e=>task==='coding'?e.domain==='coding':task==='writing'?e.domain==='writing':['math','reasoning','knowledge','factuality'].includes(e.domain))
  const groups=collectComparisonSets(relevant,references,models,intent)
  const representative=task==='coding'&&intent!=='unspecified'?groups.find(g=>g.fit>=2)??null:null
  const represented=new Set(representative?.entries.map(e=>e.candidate.model!.id)??[])
  const review:TaskRecommendationEntry[]=[...models.values()].flatMap(candidate=>{
    const evidence=relevant.filter(e=>e.modelId===candidate.model!.id&&e.modelVersion===candidate.model!.version)
      .sort((a,b)=>Number(b.domain==='reasoning')-Number(a.domain==='reasoning')||a.benchmark.localeCompare(b.benchmark)||a.id.localeCompare(b.id))
    const e=evidence[0]??null
    if(!e&&(relevant.length||!candidate.model?.capabilities?.length))return []
    const reason=e?`${e.benchmark} ${e.benchmarkVersion}에서 ${e.rawScore}${e.unit}가 기록된 ${e.domain==='writing'?'글 생성':e.domain==='coding'?'코드 작업':'추론·문제 해결'} 근거가 있습니다.`:
      `${candidate.model!.capabilities!.filter(s=>!/API|설정|effort|도구/.test(s)).slice(0,1).join('·')||'텍스트 생성'} 기능으로 ${task==='coding'?'코드 작성과 검토':'요청한 작업'}를 검토할 후보입니다.`
    return [{candidate,rank:null,tied:false,equal:true,evaluation:e,relevance:e?'indirect' as const:'features' as const,reason,
      relation:task==='coding'?`${e?.evaluationType==='agent'?'에이전트 실행 구성 평가':'코드 생성 평가·기능'} → 현재 코드에 적용하는 것은 추론입니다. 일반 웹 채팅의 성공률 측정이 아닙니다.`:
        task==='writing'?'글 생성 평가 → 한국어·요청 장르의 품질로 확장하는 것은 추론입니다. 언어·judge·작업 조건의 동일성은 미확인입니다.':
        '수학·일반 추론 근거 → 통계 방법과 해석을 검토할 후보라는 추론입니다. 설문 통계의 직접 정확성 평가는 아닙니다.',
      limitation:required.length?'필수 파일·분석 기능의 웹 지원과 정확한 모델 선택을 확인해야 합니다.':'웹에서 정확한 평가 버전·설정의 제공을 별도로 확인하세요.'}]
  })
  const coverage=data.models.map(m=>{
    const evaluations=relevant.filter(e=>e.modelId===m.id&&e.modelVersion===m.version)
    return {modelId:m.id,modelName:m.name??m.id,category:represented.has(m.id)?'representative' as const:evaluations.length?'alternative' as const:'insufficient' as const,evaluations,
      reason:represented.has(m.id)?'대표 평가의 비교 집합에 포함됩니다.':evaluations.length?'다른 평가·실행 조건의 간접 근거입니다. 대표 집합과 합산하지 않습니다.':'이 작업에 연결할 평가가 부족합니다. 성능이 낮다는 뜻은 아닙니다.'}
  })
  return {mode:representative?'ranked':'review',representative,groups,coverage,codingIntent:intent,
    entries:representative?.entries??review,alternatives:representative?review.filter(e=>!represented.has(e.candidate.model!.id)):[],
    basis:representative?`${representative.benchmark} ${representative.version} · ${representative.selectionReason}`:'동등한 우선 검토 후보 · 순서를 정할 직접 비교 근거가 부족합니다.',
    scope:'확보한 비교 집합 안의 결과입니다. 전체 모델의 절대 순위가 아니며 가격·무료 여부는 순위에 반영하지 않습니다.',
    gaps:task==='analysis'?['현재 릴리스의 설문 통계 방법 선택·계산·해석을 직접 비교한 자료가 부족합니다. 수학·추론 평가는 간접 근거입니다.']:task==='writing'?['한국어·요청 장르·평가 언어와 judge가 일치하는 비교가 부족합니다. 글 생성 평가를 한국어 품질 순위로 바꾸지 않습니다.']:representative?[]:['작업에 맞는 비교 가능한 평가 집합이 부족합니다.'],
    examinedCount:(data.evaluations??[]).length,relevantCount:relevant.length,researchSources:task==='analysis'?[taskEvidenceResearch[0]]:task==='writing'?[taskEvidenceResearch[1]]:[]}
}
