import {recommendationSnapshot} from '../data/recommendationSnapshot'
export default function AAConnectionStatus(){
  const count=(recommendationSnapshot.evaluations??[]).filter(e=>e.publisher==='Artificial Analysis').length
  return <details className="extras" id="aa-connection-status"><summary>Artificial Analysis · 현재 앱 수치 연결 {count}건 · 원문 확인 범위</summary>
    <p>원문에서 GPT-6.1 Sol / Terra의 medium 구성과 Intelligence Index v5.0 결과를 직접 확인했어요. 기존 107건과 다른 종합 평가이며 한국어 글쓰기·통계 성공률이나 Coding Agent Index로 대체하지 않아요.</p>
    <p><a href="https://artificialanalysis.ai/models/comparisons/gpt-6-1-terra-medium-vs-gpt-6-1-sol-medium" target="_blank" rel="noreferrer">확인한 모델·설정별 비교 원문 (새 창)</a> · 확인 2026-10-28</p>
    <p>공식 LLM API에는 모델별 지수·평가, 토큰 가격·속도·지연시간 필드가 문서화돼 있어요. {count?'이 스냅샷은 실제 응답·정확한 모델 연결·공개 사용 범위를 검토한 관측만 포함해요.':'현재 스냅샷에는 실제 API 응답이 없어요. 이번 점검에서 인증 키가 없어 인증 데이터 수집은 실행하지 않았어요.'} 모델 Coding Index 필드와 에이전트 Coding Agent Index는 다르고, 후자의 API 제공 근거는 확보하지 못했어요.</p>
    <p>공개 약관은 출처를 붙인 짧은 개별 인용을 허용하지만, 구조화된 원점수 공개와 모델 선택 안내 서비스에서의 사용은 별도 조항의 적용 대상입니다. {count?'허가된 범위·확인일·유효기간 안의 자료만 반영합니다.':'이번 앱의 원점수 저장·추천 반영은 그 범위를 검토하기 전까지 보류했어요.'} 모든 공개 활용을 금지한다는 뜻은 아니에요.</p>
    <p><a href="https://artificialanalysis.ai/api-reference" target="_blank" rel="noreferrer">API 문서 (새 창)</a> · <a href="https://artificialanalysiscdn.com/legal/ProDataPlatformTerms.pdf" target="_blank" rel="noreferrer">적용 범위: §2.3, §2.4(c,d), §2.5, §5 (새 창)</a></p>
    <p>Source: <a href="https://artificialanalysis.ai/" target="_blank" rel="noreferrer">Artificial Analysis (artificialanalysis.ai)</a>. 이 앱이나 추천에 대한 AA의 보증·승인을 뜻하지 않습니다.</p>
  </details>
}
