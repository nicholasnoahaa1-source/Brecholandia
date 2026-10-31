import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { brl, type Piece } from '../lib/db'
import { ease, spring } from '../lib/motion'
import { ConditionMeter, PieceVisual, Swatch, lot } from './bits'

export default function PieceCard({ piece }: { piece: Piece }) {
  const reserved = piece.status !== 'disponivel'
  return (
    <motion.article
      layout
      className={`card ${reserved ? 'is-reserved' : ''}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease } }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
      transition={spring}
    >
      <Link to={`/peca/${piece.id}`} className="card-link">
        <motion.div className="card-img" whileHover={{ scale: 1.015 }} transition={spring}>
          <PieceVisual piece={piece} />
          {reserved && <span className="stamp">Reservada</span>}
        </motion.div>

        <div className="card-tag">
          <span className="card-hole" aria-hidden />
          <div className="card-top mono">
            <span>{lot(piece)}</span>
            <span>{piece.size || 'Sem tamanho'}</span>
          </div>
          <h3 className="card-title">{piece.title}</h3>
          <div className="card-bottom">
            <span className="card-price">{brl(piece.price)}</span>
            <span className="card-colors">
              {piece.colors.slice(0, 4).map((c) => (
                <Swatch key={c} id={c} />
              ))}
            </span>
          </div>
          <ConditionMeter condition={piece.condition} />
        </div>
      </Link>
    </motion.article>
  )
}
