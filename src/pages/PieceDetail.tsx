import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConditionMeter, PieceVisual, Swatch, lot } from '../components/bits'
import { brl, holdDeadline, reserve, shortDate, useCurrentUser, useDB } from '../lib/db'
import { ease, spring } from '../lib/motion'
import { colorById, conditionById } from '../lib/taxonomy'

export default function PieceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const piece = useDB((d) => d.pieces.find((p) => p.id === id))
  const reservations = useDB((d) => d.reservations)
  const store = useDB((d) => d.store)
  const user = useCurrentUser()
  const [photo, setPhoto] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  if (!piece) {
    return (
      <section className="wrap empty-state">
        <p className="mono">Peça não encontrada</p>
        <h1 className="display-m">Essa peça saiu do catálogo.</h1>
        <Link className="btn" to="/catalogo">
          Voltar ao catálogo
        </Link>
      </section>
    )
  }

  const mine = reservations.find((r) => r.pieceId === piece.id && r.status === 'ativa' && r.userId === user?.id)
  const deadline = mine ? holdDeadline(mine, store) : null
  const cond = conditionById(piece.condition)

  const specs: [string, React.ReactNode][] = [
    ['Categoria', piece.category],
    ['Tipo', piece.type],
    ['Tamanho', piece.size],
    ['Marca', piece.brand],
    ['Medidas', piece.measurements],
    [
      piece.colors.length > 1 ? 'Cores' : 'Cor',
      piece.colors.length ? (
        <span className="spec-colors">
          {piece.colors.map((c) => (
            <span key={c}>
              <Swatch id={c} /> {colorById(c)?.label}
            </span>
          ))}
        </span>
      ) : null,
    ],
  ]

  const doReserve = () => {
    if (!user) return
    try {
      reserve(piece.id, user.id)
      setConfirming(false)
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="wrap detail">
      <button className="back mono" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/catalogo'))}>
        ← Voltar
      </button>

      <div className="detail-grid">
        <div className="gallery">
          <div className="gallery-main">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={photo}
                className="gallery-frame"
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1, transition: { duration: 0.35, ease } }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                <PieceVisual piece={piece} index={photo} />
              </motion.div>
            </AnimatePresence>
            {piece.status !== 'disponivel' && <span className="stamp stamp-lg">Reservada</span>}
          </div>
          {piece.photos.length > 1 && (
            <div className="thumbs">
              {piece.photos.map((src, i) => (
                <button key={i} className="thumb" onClick={() => setPhoto(i)} aria-label={`Foto ${i + 1}`} aria-current={i === photo}>
                  <img src={src} alt="" />
                  {i === photo && <motion.span layoutId="thumb-mark" className="thumb-mark" transition={spring} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <motion.div
          className="detail-info"
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.5, ease, delay: 0.08 } }}
        >
          <p className="mono detail-lot">
            {lot(piece)} · {piece.category}
          </p>
          <h1 className="display-m">{piece.title}</h1>
          <p className="detail-price">{brl(piece.price)}</p>

          <div className="detail-cond">
            <ConditionMeter condition={piece.condition} label={false} />
            <div>
              <strong>{cond.label}</strong>
              {piece.conditionNotes && <p>{piece.conditionNotes}</p>}
            </div>
          </div>

          <dl className="specs">
            {specs
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="mono">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>

          {piece.description && <p className="detail-desc">{piece.description}</p>}

          <div className="reserve">
            <p className="reserve-label mono">Somente retirada na loja</p>

            {mine ? (
              <div className="reserve-done">
                <p className="display-s">Reservada para você.</p>
                {store.address && <p>Retire em: {store.address}</p>}
                {store.hours && <p>Horário: {store.hours}</p>}
                {deadline && <p>Prazo para retirar: até {shortDate(deadline)}</p>}
                <Link to="/conta" className="link-btn">
                  Ver minhas reservas
                </Link>
              </div>
            ) : piece.status !== 'disponivel' ? (
              <p className="muted">Esta peça já foi reservada por outra pessoa. Se a reserva for cancelada, ela volta ao catálogo.</p>
            ) : !user ? (
              <>
                <p className="muted">Entre na sua conta para reservar esta peça e retirar na loja.</p>
                <Link className="btn btn-block" to={`/entrar?volta=${encodeURIComponent(`/peca/${piece.id}`)}`}>
                  Entrar para reservar
                </Link>
              </>
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                {!confirming ? (
                  <motion.div key="a" exit={{ opacity: 0, y: -6 }}>
                    <motion.button
                      className="btn btn-block"
                      onClick={() => setConfirming(true)}
                      whileTap={{ scale: 0.97 }}
                      transition={spring}
                    >
                      Reservar para retirada
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="b"
                    className="confirm"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease } }}
                  >
                    <p>
                      A peça fica separada no seu nome e sai do catálogo. Não há entrega: você busca na loja.
                    </p>
                    {store.address && <p>Endereço: {store.address}</p>}
                    {store.hours && <p>Horário: {store.hours}</p>}
                    {store.holdDays && <p>Prazo para retirar: {store.holdDays} dia(s) após a reserva.</p>}
                    {store.payment && <p>Pagamento: {store.payment}</p>}
                    <div className="confirm-row">
                      <motion.button className="btn" onClick={doReserve} whileTap={{ scale: 0.97 }} transition={spring}>
                        Confirmar reserva
                      </motion.button>
                      <button className="link-btn" onClick={() => setConfirming(false)}>
                        Cancelar
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
            {error && <p className="error">{error}</p>}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
