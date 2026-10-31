import { conditionById, colorById, CONDITIONS, type Condition } from '../lib/taxonomy'
import type { Piece } from '../lib/db'

export function Swatch({ id, size = 14 }: { id: string; size?: number }) {
  const c = colorById(id)
  if (!c) return null
  const bg =
    c.hex === 'pattern'
      ? 'repeating-linear-gradient(45deg, var(--lime) 0 3px, var(--ink) 3px 6px)'
      : c.hex === 'multi'
        ? 'conic-gradient(#C42B22, #F2CB2E, #2F7A3E, #2459B8, #5E3A8C, #C42B22)'
        : c.hex
  return <span className="swatch" style={{ width: size, height: size, background: bg }} title={c.label} aria-hidden />
}

// Quatro marcas, como os furos de um cinto: quanto mais cheio, melhor o estado.
export function ConditionMeter({ condition, label = true }: { condition: Condition; label?: boolean }) {
  const c = conditionById(condition)
  return (
    <span className="cond" aria-label={`Condição: ${c.label}`}>
      <span className="cond-bars" aria-hidden>
        {CONDITIONS.map((_, i) => (
          <i key={i} className={i < c.level ? 'on' : ''} />
        ))}
      </span>
      {label && <span className="mono">{c.short}</span>}
    </span>
  )
}

export function PieceVisual({ piece, index = 0, className = '' }: { piece: Piece; index?: number; className?: string }) {
  const src = piece.photos[index]
  if (src) return <img className={`visual ${className}`} src={src} alt={piece.title} loading="lazy" />
  // Sem foto: mostra a etiqueta tipográfica da peça em vez de uma imagem genérica.
  const main = colorById(piece.colors[0])
  return (
    <div className={`visual visual-empty ${className}`} role="img" aria-label={`${piece.title}, sem foto`}>
      <span className="visual-type">{piece.type}</span>
      <span className="visual-meta mono">
        {main?.label ?? 'Sem cor'} · sem foto
      </span>
      <span className="visual-chip">{piece.colors[0] && <Swatch id={piece.colors[0]} size={40} />}</span>
    </div>
  )
}

export const lot = (p: Piece) => `Nº ${p.id.slice(0, 4).toUpperCase()}`
