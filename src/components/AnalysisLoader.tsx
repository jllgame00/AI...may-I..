import { ArrowLeft, Check, LoaderCircle, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { analysisStages } from '../data/services'

export default function AnalysisLoader({ request, onComplete, onCancel }: { request: string; onComplete: () => void; onCancel: () => void }) {
  const [stage, setStage] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setStage(current => current + 1), 470)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => { if (stage >= analysisStages.length) onComplete() }, [stage, onComplete])
  return <section className="analysis-page page-enter" aria-busy="true"><div className="analysis-orbit"><Sparkles size={34} strokeWidth={1.4} /></div><p className="eyebrow">FINDING YOUR AI MATE</p><h1 tabIndex={-1}>당신에게 맞는 방법을 찾고 있어요</h1><p className="analysis-subtitle">하고 싶은 일, 예산, 필요한 기능을 차근차근 살펴볼게요.</p><div className="analysis-request">“{request}”</div><ol className="analysis-stages" aria-label="분석 단계">{analysisStages.map((label, index) => <li key={label} className={index < stage ? 'complete' : index === stage ? 'processing' : ''}><span className="stage-icon">{index < stage ? <Check size={15} /> : index === stage ? <LoaderCircle className="spin" size={15} /> : String(index + 1).padStart(2, '0')}</span><span>{label}</span><span className="stage-status">{index < stage ? '완료' : index === stage ? '분석 중' : '대기'}</span></li>)}</ol><div className="analysis-progress" role="progressbar" aria-label="분석 진행률" aria-valuenow={Math.min(stage + 1, 5) * 20} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(stage + 1, 5) * 20}%` }} /></div><p className="sr-only" role="status">{analysisStages[Math.min(stage, 4)]}</p><p className="analysis-demo">외부 AI 호출 없이 로컬 예시 로직으로 분석합니다.</p><button className="text-button" onClick={onCancel}><ArrowLeft size={15} /> 요청 수정하기</button></section>
}
