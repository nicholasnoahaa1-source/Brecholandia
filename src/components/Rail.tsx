import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router-dom'
import { brl, type Piece } from '../lib/db'
import { tilt } from '../lib/motion'
import { PieceVisual } from './bits'

/*
 * A arara: as peças mais novas penduradas pela etiqueta numa barra.
 * É o único movimento que acontece sozinho no site: cada peça cai no
 * cabide e balança até parar. Com "reduzir movimento" ligado, elas já
 * aparecem no lugar.
 */
export default function Rail({ pieces, ready }: { pieces: Piece[]; ready: boolean }) {
  const reduce = useReducedMotion()

  return (
    <div className="rail" aria-label="Peças que entraram por último">
      <div className="rail-bar" aria-hidden />
      {!ready ? (
        <div className="rail-row" aria-hidden>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="rail-item is-ghost">
              <span className="rail-hook" />
              <div className="rail-photo" />
            </div>
          ))}
        </div>
      ) : pieces.length === 0 ? (
        <p className="rail-empty">A arara está vazia por enquanto. As peças aparecem aqui assim que a loja cadastrar.</p>
      ) : (
        <ul className="rail-row">
          {pieces.map((p, i) => {
            const rest = tilt(p.id, 4)
            return (
              <motion.li
                key={p.id}
                className="rail-item"
                style={{ transformOrigin: '50% 0' }}
                initial={reduce ? false : { y: -70, rotate: rest * 4, opacity: 0 }}
                animate={{ y: 0, rotate: rest, opacity: 1 }}
                transition={{
                  y: { type: 'spring', stiffness: 260, damping: 18, delay: 0.15 + i * 0.09 },
                  opacity: { duration: 0.2, delay: 0.15 + i * 0.09 },
                  rotate: { type: 'spring', stiffness: 120, damping: 5, delay: 0.15 + i * 0.09 },
                }}
                whileHover={{ rotate: 0, transition: { type: 'spring', stiffness: 170, damping: 7 } }}
              >
                <span className="rail-hook" aria-hidden />
                <Link to={`/peca/${p.id}`} className="rail-link">
                  <div className="rail-photo">
                    <PieceVisual piece={p} />
                  </div>
                  <span className="rail-tag">
                    <span className="rail-title">{p.title}</span>
                    <span className="rail-price">{brl(p.price)}</span>
                  </span>
                </Link>
              </motion.li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
