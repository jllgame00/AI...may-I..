import { Sparkles } from 'lucide-react'
import type { ServiceId } from '../types'
import { serviceById } from '../data/services'

export function BrandMark({ small = false }: { small?: boolean }) {
  return <span className={`brand-mark ${small ? 'small' : ''}`}><Sparkles size={small ? 18 : 23} strokeWidth={1.7} /></span>
}

export function ServiceMark({ id, small = false }: { id: ServiceId; small?: boolean }) {
  return <span aria-hidden="true" className={`service-mark ${id} ${small ? 'small' : ''}`}>{serviceById[id].letter}</span>
}

export function DemoBadge() {
  return <span className="demo-badge">공식 정보 스냅샷</span>
}

export function SectionHeading({ number, title, description }: { number: string; title: string; description?: string }) {
  return <div className="section-heading"><span className="section-number">{number}</span><div><h2>{title}</h2>{description && <p>{description}</p>}</div></div>
}
