import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { brl, type Piece } from '../lib/db'
import { ease, spring, swing, tilt } from '../lib/motion'
import { ConditionMeter, PieceVisual, Swatch, lot } from './bits'

/*
 * A peça como etiqueta de brechó: a foto em cima e o papel pendurado por barbante.
 * Ao passar o mouse (ou focar com o teclado) a etiqueta endireita e balança.
 */
const MotionLink = motion.create(Link)

export default function PieceCard({ piece, linkable = true }: { piece: Piece; linkable?: boolean }) {
  const reserved = piece.status !== 'disponivel'
  const rest = tilt(piece.id)
  const body = (
    <>
      <div className="card-img">
        <PieceVisual piece={piece} />
        {reserved && <span className="stamp">Reservada</span>}
      </div>
      <motion.div
        className="card-tag"
        variants={{ rest: { rotate: rest }, lift: { rotate: rest * -0.35 } }}
        transition={swing}
      >
        <span className="card-hole" aria-hidden />
        <div className="card-top">
          <span>{lot(piece)}</span>
          <span>{piece.size ? `Tam. ${piece.size}` : 'Sem tamanho'}</span>
        </div>
        <h3 className="card-title">{piece.title || 'Sem nome'}</h3>
        <div className="card-bottom">
          <span className="card-price">{brl(piece.price || 0)}</span>
          <span className="card-colors">
            {piece.colors.slice(0, 4).map((c) => (
              <Swatch key={c} id={c} />
            ))}
          </span>
        </div>
        <ConditionMeter condition={piece.condition} />
      </motion.div>
    </>
  )

  return (
    <motion.article
      layout
      className={`card ${reserved ? 'is-reserved' : ''}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease } }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
      transition={spring}
    >
      {linkable ? (
        <MotionLink
          to={`/peca/${piece.id}`}
          className="card-link"
          initial="rest"
          animate="rest"
          whileHover="lift"
          whileFocus="lift"
          whileTap="lift"
        >
          {body}
        </MotionLink>
      ) : (
        <motion.div className="card-link" initial="rest" animate="rest" whileHover="lift">
          {body}
        </motion.div>
      )}
    </motion.article>
  )
}
