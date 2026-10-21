import { ArrowUpRight, ChevronRight, CircleHelp, GitBranch, LayoutGrid, Lightbulb, ListChecks, Plus, Sparkles, WandSparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { View } from '../types'
import { BrandMark } from './ui'

const navigation = [
  { view: 'input' as const, label: 'AI 찾기', icon: Sparkles },
  { view: 'results' as const, label: '추천 결과', icon: LayoutGrid },
  { view: 'workflow' as const, label: '작업 설계', icon: GitBranch },
  { view: 'prompts' as const, label: '맞춤 프롬프트', icon: WandSparkles },
]

export default function Shell({ children, view, hasResults, onNavigate }: {
  children: ReactNode; view: View; hasResults: boolean; onNavigate: (view: View) => void
}) {
  const [helpOpen, setHelpOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (helpOpen) dialogRef.current?.showModal()
    else dialogRef.current?.close()
  }, [helpOpen])
  const activeView = view === 'analyzing' ? 'input' : view
  return <div className="app-shell">
    <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
    <aside className="sidebar">
      <button className="brand" onClick={() => onNavigate('input')} aria-label="AI...may I..? 홈"><BrandMark /><span className="brand-copy"><span className="brand-name">AI...may I..?</span><span className="brand-caption">YOUR AI COMPANION</span></span></button>
      <button className="new-request" onClick={() => onNavigate('input')}><Plus size={17} /> 요청 작성하기</button>
      <span className="nav-caption">WORKSPACE</span>
      <nav className="main-nav" aria-label="주요 메뉴">
        {navigation.map(({ view: destination, label, icon: Icon }) => <button key={destination} disabled={destination !== 'input' && (!hasResults || view === 'analyzing')} className={`nav-item ${activeView === destination ? 'active' : ''}`} aria-current={activeView === destination ? 'page' : undefined} onClick={() => onNavigate(destination)}><Icon size={18} strokeWidth={1.7} /><span>{label}</span>{activeView === destination && <span className="nav-dot" />}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="companion-note"><div className="note-icon"><Lightbulb size={18} /></div><p>AI 선택이 어려울 때,<br /><strong>당신 곁의 작은 가이드.</strong></p><span>잘 몰라도, 잘 쓸 수 있도록.</span></div>
        <button className="help-button" onClick={() => setHelpOpen(true)}><CircleHelp size={17} /> <span>AI...may I..? 사용 가이드</span> <ArrowUpRight size={14} /></button>
        <div className="sidebar-footer"><span className="status-dot" /> 인터랙티브 데모 <span>v0.1</span></div>
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumb"><span>워크스페이스</span><ChevronRight size={14} /><strong>{navigation.find(item => item.view === activeView)?.label}</strong></div><div className="topbar-right"><span className="prototype-badge"><span /> MVP PROTOTYPE</span><span className="avatar" aria-label="로그인 없는 데모 모드">AI</span></div></header>
      <main id="main-content" className="main-content">{children}</main>
      <footer className="workspace-footer"><span>© 2026 AI...may I..? <span className="footer-team">팀 Ai...Khu</span></span><span>선택은 당신이, 시작은 함께.</span><span>실제 AI 실행 없이 작동하는 프로토타입</span></footer>
    </div>
    <dialog ref={dialogRef} className="help-dialog" onCancel={() => setHelpOpen(false)} onClose={() => setHelpOpen(false)}>
      <button className="dialog-close icon-button" aria-label="가이드 닫기" onClick={() => setHelpOpen(false)}><X size={20} /></button>
      <BrandMark /><p className="eyebrow">A LITTLE HELP TO GET STARTED</p><h2>처음이어도 괜찮아요.</h2><p>AI...may I..?는 AI를 대신 실행하는 서비스가 아니라, 직접 이해하고 선택하도록 돕는 가이드입니다. ChatKHU 계정이나 로그인 없이 체험할 수 있어요.</p>
      <ol className="help-steps"><li><Sparkles size={20} /><div><strong>하고 싶은 일을 적어요</strong><p>자연어로 요청하고 작업·필수 기능·예산을 확인하세요.</p></div></li><li><ListChecks size={20} /><div><strong>추천을 비교하고 직접 골라요</strong><p>공식 근거와 미확인 항목을 살피고 단계별 서비스·플랜을 바꿔 보세요.</p></div></li><li><WandSparkles size={20} /><div><strong>프롬프트를 복사해 사용해요</strong><p>직접 선택한 서비스에서 자료와 함께 입력하세요.</p></div></li></ol>
      <div className="data-notice">2026-10-21 확인한 공식 정보 스냅샷을 사용합니다. 미확인 정보는 구분하고 점수를 보류합니다. 실제 플랜과 지원 기능은 각 서비스에서 확인하세요. 요청은 서버에 전송하거나 저장하지 않습니다.</div>
      <button className="primary-button full-width" onClick={() => setHelpOpen(false)}>좋아요, 시작할게요 <ChevronRight size={17} /></button>
    </dialog>
  </div>
}
