import { writeFile } from 'node:fs/promises'
import { buildGuideBundle,compareCandidates,DEMO_REQUEST } from '../src/lib/aiGuide.ts'
import { recommendationSnapshot as snapshot } from '../src/data/recommendationSnapshot.ts'

const requests=[{name:'대표 설문 사례',text:DEMO_REQUEST},{name:'기존 코드 수정',text:'React 장바구니의 수량 변경 버그를 수정하고 테스트 방법을 알려줘.'},{name:'홍보 글쓰기',text:'신입생 대상 독서 동아리 모집 홍보 글을 친근하게 500자로 작성해줘. 매주 수요일에 함께 책을 읽고 토론하는 모임이야.'}]
let doc='# 실제 생성된 단계별 프롬프트\n\n현재 `buildGuideBundle`이 생성한 본문 전문입니다. 원문은 별도 맥락으로 그대로 보존하며 직접 수정한 조건이 우선합니다. 원문의 최종 분량을 분석·해석 단계의 출력 분량으로 강제하지 않습니다. 편집 후 복사하면 화면에서 편집한 내용이 복사됩니다. 실제 설문 자료나 통계 결과를 제공한 것이 아니므로 이 문서는 분석 완료 보고서가 아닙니다.\n'
for(const r of requests){const request={text:r.text,overrides:{}};const comparison=compareCandidates(request);const c=comparison.recommendations[0];const bundle=buildGuideBundle(request,{default:c?.id??null,byStage:{}});doc+=`\n## ${r.name}\n\n입력: ${r.text}\n`;for(const stage of bundle.guideStages??[]){doc+=`\n### ${stage.title}\n\n\`\`\`text\n${stage.text}\n\`\`\`\n\n다음 단계에 전달: ${stage.handoff.join(' · ')}\n`}}
await writeFile('docs/generated-prompt-examples.md',doc)
const examples=['알고리즘 문제 풀이','React 장바구니 기능 구현','React 장바구니 오류 수정',DEMO_REQUEST,'한국어 동아리 모집 홍보 글 500자 작성']
const rows=examples.map(text=>{const d=compareCandidates({text,overrides:{}}).decision!;return {request:text,mode:d.mode,basis:d.basis,scope:d.scope,groups:d.groups.map(g=>({benchmark:g.benchmark,version:g.version,publisher:g.publisher,period:g.period,count:g.modelCount})),entries:d.entries.map(e=>({model:e.candidate.model?.name,rank:e.rank,tied:e.tied,benchmark:e.evaluation?.benchmark,version:e.evaluation?.benchmarkVersion,score:e.evaluation?.rawScore,reason:e.reason,relation:e.relation})),coverage:d.coverage.length}})
await writeFile('docs/recommendation-examples.json',JSON.stringify({models:snapshot.models.length,evaluations:snapshot.evaluations?.length,examples:rows},null,2)+'\n')
console.log('Generated prompt document and recommendation examples from current code:',snapshot.models.length,'models,',snapshot.evaluations?.length,'observations')
