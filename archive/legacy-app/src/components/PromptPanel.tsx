import { useEffect, useRef, useState } from 'react'
import { catalogById } from '../data/catalog'
import { services } from '../data/services'
import { buildPrompt } from '../lib/prompts'
import { candidateLabel, selectedCandidate } from '../lib/recommend'
import { copyPrompt, findPlaceholders, regenerateDraft, restoreDraft, updateDraft } from '../lib/taskSession'
import type { PromptDraft } from '../lib/taskSession'
import type { Analysis, CatalogService, ServiceId, ServicePlan, WorkflowStep } from '../types'

export default function PromptPanel({ analysis, workflow, selected, onSelect, activeStepId, onStep, onCandidate, onWorkflow, onEdit, exploration, drafts: suppliedDrafts, onDrafts, detailed: suppliedDetailed, onDetailed, checks: suppliedChecks, onChecks, followup: suppliedFollowup, onFollowup }: {
  analysis: Analysis | null; workflow: WorkflowStep[]; selected: ServiceId; onSelect: (id: ServiceId) => void; onWorkflow: () => void; onEdit: () => void
  activeStepId: string; onStep: (id: string) => void; onCandidate: (stepId: string, candidateId: string) => void
  exploration?: { service: CatalogService; plan?: ServicePlan }; drafts?: Record<string,PromptDraft>; onDrafts?: (drafts: Record<string,PromptDraft>) => void; detailed?: boolean; onDetailed?: (detailed: boolean) => void
  checks?: Record<string,boolean>; onChecks?: (checks: Record<string,boolean>) => void; followup?: string; onFollowup?: (text: string) => void
}) {
  const [localDrafts, setLocalDrafts] = useState<Record<string,PromptDraft>>({})
  const [localDetailed, setLocalDetailed] = useState(true)
  const detailed = suppliedDetailed ?? localDetailed
  const drafts = suppliedDrafts ?? localDrafts
  const saveDrafts = onDrafts ?? setLocalDrafts
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const [allowPlaceholders, setAllowPlaceholders] = useState(false)
  const [localFollowup, setLocalFollowup] = useState('')
  const [localChecks, setLocalChecks] = useState<Record<string,boolean>>({})
  const followup = suppliedFollowup ?? localFollowup
  const setFollowup = onFollowup ?? setLocalFollowup
  const checks = suppliedChecks ?? localChecks
  const setChecks = onChecks ?? setLocalChecks
  const editor = useRef<HTMLTextAreaElement>(null)
  const step = workflow.find(s => s.id === activeStepId) ?? workflow[0]
  const assigned = selectedCandidate(step)
  const candidate = !exploration && assigned?.service.id === selected ? assigned : null
  const service = exploration?.service ?? catalogById[selected]
  const plan = exploration?.plan ?? candidate?.plan
  const key = exploration ? 'exploration' : step?.id ?? 'unassigned'
  const context = JSON.stringify([analysis?.request ?? null, workflow.map(s => [s.id,s.candidateId,s.title]),activeStepId,service.id,plan?.id])
  const generated = !exploration && analysis ? buildPrompt(analysis,selected,workflow,activeStepId) : `[역할]\n한국어로 설명하는 작업 파트너입니다.\n\n[나의 요청]\n${analysis?.request.text ?? '[입력할 작업과 원하는 결과]'}\n\n[입력 자료]\n[여기에 직접 확인한 자료 또는 요약을 붙여 넣으세요]\n\n[원하는 결과 형식]\n요청에 맞는 초안과 사용자가 직접 확인할 항목을 적어 주세요.\n\n[주의사항]\n자료에 없는 사실·출처·수치를 만들지 마세요. 부족한 정보는 질문하고 미확인을 구분하세요. 외부 AI를 자동 호출하지 마세요.`
  const current = drafts[key] ?? { text: generated, context, previous: null }
  const latestCopyContext = useRef('')
  latestCopyContext.current = JSON.stringify([current.text, context])
  const stale = current.context !== context
  const placeholders = findPlaceholders(current.text)
  const available = !!candidate || !!exploration
  useEffect(() => {
    if (!drafts[key]) saveDrafts({ ...drafts, [key]: { text: generated, context, previous: null } })
  },[key, context, drafts, generated, saveDrafts])
  useEffect(() => { setCopyState('idle'); setAllowPlaceholders(false) },[current.text,context])
  const write = (next: PromptDraft) => saveDrafts({ ...drafts, [key]: next })
  const copy = async () => {
    const startedContext = latestCopyContext.current
    const copied = await copyPrompt(current.text, async text => {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(text)
    })
    if (startedContext !== latestCopyContext.current) return
    setCopyState(copied ? 'copied' : 'error')
    if (!copied) { editor.current?.focus(); editor.current?.select() }
  }
  const kind = exploration ? 'unknown' : step?.kind ?? 'unknown'
  const checklist = kind === 'coding' ? ['코드를 별도 환경에서 실행·테스트했나요?', '오류 재현과 예외 입력을 확인했나요?', '비밀 키·개인정보와 의존성 변경을 검토했나요?', '요구사항과 결과 형식이 맞나요?'] : kind === 'image' ? ['저작권·초상권과 민감정보를 확인했나요?', '요청한 문구·구도와 결과가 맞나요?', '이미지 안의 글자·수치·시각 오류를 직접 확인했나요?'] : ['사실·수치를 원본과 대조했나요?', '인용·페이지·링크가 실제로 존재하나요?', '누락·추측·개인정보를 확인했나요?', '요청한 분량·형식에 맞나요?']
  const followups = [
    ['너무 길어요', `앞선 답변을 ${analysis?.request.duration ?? '요청한 분량'}에 맞춰 줄여 주세요. 핵심 주장과 주의사항을 유지하고 생략한 내용을 알려 주세요.`],
    ['근거가 부족해요', '앞선 답변에서 자료로 확인된 주장과 추가 확인이 필요한 주장을 나누고 확인 가능한 출처를 표시해 주세요. 출처를 찾지 못하면 만들지 마세요.'],
    ['쉽게 설명해 주세요', '앞선 답변을 초보자가 이해할 수 있게 용어를 풀고 짧은 예를 들어 설명해 주세요. 사실과 비유를 구분해 주세요.'],
    ...(kind === 'coding' ? [['오류가 계속 나요','[여기에 오류 메시지와 재현 조건을 붙여 넣으세요]\n원인을 가정과 사실로 나누고 최소 수정안과 검증 명령을 제시해 주세요. 직접 실행했다고 말하지 마세요.']] : []),
  ]
  return <div className="page-enter"><div className="page-intro compact"><h1 tabIndex={-1}>프롬프트를 준비하고 직접 사용해 보세요</h1><p>{service.name} · {plan?.name ?? '플랜 미확인'} · {plan?.route ?? service.routes}</p><p>일반 템플릿 초안입니다. 서비스별 최적화나 응답 정확성 검증을 완료한 것이 아닙니다.</p></div>
    <button className="secondary-button" aria-pressed={detailed} onClick={() => (onDetailed ?? setLocalDetailed)(!detailed)}>{detailed ? '간단한 안내로 전환' : '자세한 안내로 전환'}</button>
    {!exploration && step && <><label className="stage-control">프롬프트 작업 단계<select value={step.id} onChange={e => onStep(e.target.value)}>{workflow.map((s,i) => <option key={s.id} value={s.id}>{i+1}. {s.title}{s.needsReview ? ' · 다시 확인 필요' : ''}</option>)}</select></label>
      <div className="service-choices" aria-label="서비스 선택">{services.map(s => <button key={s.id} className="secondary-button" aria-pressed={selected === s.id} onClick={() => onSelect(s.id)}>{s.name}{selected === s.id ? ' · 선택됨' : ''}</button>)}</div>
      <label className="stage-control">이 단계의 플랜 선택<select value={candidate?.id ?? ''} onChange={e => onCandidate(step.id,e.target.value)}><option value="" disabled>직접 후보를 선택하세요</option>{step.recommendations.filter(r => r.service.id === selected).map(r => <option key={r.id} value={r.id}>{candidateLabel(r)} · {r.suitability}</option>)}</select></label>
    </>}
    <section className="panel preparation-panel"><h2>1. 준비물</h2><p>{step?.needsReview && !exploration ? '앞 단계 또는 조건이 바뀌었어요. 이 단계의 입력·선택을 다시 확인하세요. ' : ''}개인정보를 제거한 작업 조건, 직접 확인한 자료 또는 앞 단계 요약을 준비하세요.</p>
      <p>무료 범위: {plan?.freeScope ?? '미확인 · 일반 초안 준비만 가능'}</p><p>비용·기능 제한: {plan ? `${plan.upgrade} ${plan.limits.join(' ')}` : service.unknowns}</p>
      <p>확인 필요: {candidate?.holds.join(' · ') || (exploration ? '이 작업의 필수 기능 적합성은 판정하지 않았어요. 공식 플랜·경로를 직접 확인하세요.' : '현재 단계의 후보가 없습니다. 직접 선택하거나 조건을 수정하세요.')}</p>
      {detailed && <p>{plan?.features.pdf.status === 'supported' ? '이 웹 플랜은 PDF 분석이 문서상 확인되어 있습니다. 스캔·암호·분량 제한은 먼저 확인하고 허용된 자료만 첨부하세요.' : 'PDF 첨부는 이 작업·플랜에서 확정하지 않습니다. 권한을 먼저 확인하거나 직접 검토한 텍스트를 준비하세요.'} {plan?.features.web.status === 'supported' ? '웹 검색은 이 플랜의 문서상 지원 범위에서 직접 켤 수 있습니다. 출처는 직접 열어 확인하세요.' : '웹 검색 사용을 전제로 하지 않습니다.'}</p>}
    </section>
    {stale && <div className="empty-state" role="status"><strong>기존 초안을 유지하고 있어요. 변경된 서비스·조건은 아직 반영되지 않았어요.</strong><p>아래 초안을 계속 편집하거나 새 초안을 만들어 주세요. 새 초안을 만들면 이전 내용으로 복구할 수 있어요.</p><button className="secondary-button" onClick={() => editor.current?.focus()}>기존 초안 계속 편집</button><button className="primary-button" onClick={() => write(regenerateDraft(current,generated,context))}>변경 조건으로 새 초안 만들기</button></div>}
    <section className="panel prompt-editor-panel"><h2>2. 편집 가능한 초안</h2><label htmlFor="prompt-editor">요청·자료·결과 형식을 직접 편집하세요</label><textarea ref={editor} id="prompt-editor" className="prompt-editor" value={current.text} onChange={e => write(updateDraft(current,e.target.value))} />
      <div className="page-actions"><button className="secondary-button" onClick={() => write(regenerateDraft(current,generated,context))}>현재 조건으로 새 초안</button>{current.previous && <button className="secondary-button" onClick={() => write(restoreDraft(current))}>이전 초안 복구</button>}</div>
      {!!placeholders.length && <div className="placeholder-warning"><p>미입력 항목 {placeholders.length}개: {placeholders.join(' · ')}</p><label><input type="checkbox" checked={allowPlaceholders} onChange={e => setAllowPlaceholders(e.target.checked)} /> 빈칸을 확인했으며 직접 채워 사용할게요</label></div>}
      <h2>3. 복사·공식 서비스 이동</h2><p>복사한 내용은 자동 전송되지 않아요. 열린 서비스에 직접 붙여넣어 주세요. 외부 이동은 작업 완료가 아닙니다.</p>
      <div className="page-actions"><button className="primary-button" disabled={!available || !current.text.trim() || (!!placeholders.length && !allowPlaceholders)} onClick={copy}>{copyState === 'copied' ? '복사 완료' : '프롬프트 복사'}</button><a className="secondary-button" href={service.url} target="_blank" rel="noreferrer">공식 서비스 열기 (새 창)</a></div>
      {!available && <p>선택한 서비스의 후보가 없습니다. 플랜을 선택하거나 작업 조건을 수정하세요.</p>}
      <p role="status" aria-live="polite">{copyState === 'copied' ? '복사했어요. 사용할 AI에 직접 붙여넣어 주세요.' : copyState === 'error' ? '자동 복사가 되지 않았어요. 편집창 내용을 선택해 Ctrl+C 또는 기기의 복사 메뉴로 복사해 주세요.' : ''}</p>
    </section>
    {detailed && <section className="panel preparation-panel"><h2>4. 직접 사용하는 순서</h2><ol><li>공식 화면의 플랜·한도·비용과 필요한 기능을 확인하세요.</li><li>수정한 프롬프트를 직접 붙여넣고, 허용된 자료만 제공하세요.</li><li>답변을 원본과 대조하세요. 서비스가 바뀌면 앞 단계에서 확인한 요약을 새 서비스에 직접 붙여넣어야 해요.</li></ol></section>}
    <section className="panel preparation-panel"><h2>5. 후속 프롬프트·직접 확인해 주세요</h2><div className="service-choices">{followups.map(([label,text]) => <button className="secondary-button" key={label} onClick={() => setFollowup(text)}>{label}</button>)}</div>{followup && <label className="stage-control">후속 초안 (직접 편집·선택 복사)<textarea value={followup} onChange={e => setFollowup(e.target.value)} /></label>}
      <p>체크는 사용자의 자기 점검입니다. 시스템의 정확성 인증이 아닙니다.</p><div className="self-check">{checklist.map((label,i) => { const id = `${key}:${context}:${i}`; return <label key={id}><input type="checkbox" checked={!!checks[id]} onChange={e => setChecks({ ...checks, [id]: e.target.checked })} />{label}</label> })}</div>
    </section><div className="page-actions"><button className="secondary-button" onClick={onWorkflow}>작업 설계·목록으로 돌아가기</button><button className="secondary-button" onClick={onEdit}>작업 조건 수정</button></div>
  </div>
}
