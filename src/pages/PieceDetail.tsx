import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ConditionMeter, PieceVisual, Swatch, lot } from '../components/bits'
import { useDialog } from '../components/Dialog'
import PieceCard from '../components/PieceCard'
import { brl, holdDeadline, reserve, shortDate, useCurrentUser, useDB } from '../lib/db'
import { ease, spring } from '../lib/motion'
import { colorById, conditionById } from '../lib/taxonomy'

export default function PieceDetail() {
  const { id } = useParams()
  const pieces = useDB((d) => d.pieces)
  const piece = useMemo(() => pieces.find((p) => p.id === id), [pieces, id])
  const dialog = useDialog()
  const reservations = useDB((d) => d.myReservations)
  const store = useDB((d) => d.store)
  const user = useCurrentUser()
  const [photo, setPhoto] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const ready = useDB((d) => d.ready)
  const total = piece?.photos.length ?? 0
  const go = (dir: 1 | -1) => total > 1 && setPhoto((i) => (i + dir + total) % total)

  // Setas do teclado trocam a foto (fora de campos de texto).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  useEffect(() => setPhoto(0), [id])

  // Outras peças da mesma categoria que ainda podem ser reservadas.
  const related = useMemo(
    () => (piece ? pieces.filter((p) => p.id !== piece.id && p.status === 'disponivel' && p.category === piece.category).slice(0, 4) : []),
    [pieces, piece],
  )

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      dialog.toast('Link copiado.')
    } catch {
      dialog.toast('Não foi possível copiar. Copie o endereço da barra do navegador.', 'erro')
    }
  }

  if (!piece && !ready) {
    return (
      <div className="wrap detail" aria-busy="true">
        <p className="sr-only" role="status">Carregando peça</p>
        <div className="detail-grid" aria-hidden>
          <div className="card-skeleton tall" />
          <div className="skeleton-lines">
            <span style={{ width: '30%' }} />
            <span style={{ width: '80%', height: 40 }} />
            <span style={{ width: '40%', height: 32 }} />
            <span style={{ width: '100%' }} />
            <span style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!piece) {
    return (
      <section className="wrap empty-state">
        <h1 className="display-m">Essa peça saiu do catálogo.</h1>
        <p className="muted">Ela pode ter sido retirada por alguém ou removida pela loja.</p>
        <Link className="btn" to="/catalogo">
          Voltar ao catálogo
        </Link>
      </section>
    )
  }

  const mine = reservations.find((r) => r.pieceId === piece.id && r.status === 'ativa')
  const deadline = mine ? holdDeadline(mine, store) : null
  const cond = conditionById(piece.condition)

  const specs: [string, React.ReactNode][] = [
    ['Código', lot(piece)],
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

  const doReserve = async () => {
    if (!user || busy) return
    setBusy(true)
    setError('')
    try {
      await reserve(piece.id)
      setConfirming(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="wrap detail">
      <nav className="crumbs" aria-label="Você está em">
        <Link to="/catalogo">Catálogo</Link>
        <span aria-hidden>/</span>
        <Link to={`/catalogo?cat=${encodeURIComponent(piece.category)}`}>{piece.category}</Link>
        <span aria-hidden>/</span>
        <Link to={`/catalogo?tipo=${encodeURIComponent(piece.type)}`}>{piece.type}</Link>
      </nav>

      <div className="detail-grid">
        <div className="gallery">
          <div className="gallery-main">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={photo}
                className="gallery-frame"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.25, ease } }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                // Arrastar para o lado troca a foto no celular.
                drag={total > 1 ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.25}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60 || info.velocity.x < -400) go(1)
                  else if (info.offset.x > 60 || info.velocity.x > 400) go(-1)
                }}
              >
                <PieceVisual piece={piece} index={photo} />
              </motion.div>
            </AnimatePresence>
            {piece.status !== 'disponivel' && <span className="stamp stamp-lg">Reservada</span>}
            {total > 1 && (
              <div className="gallery-nav">
                <button onClick={() => go(-1)} aria-label="Foto anterior">
                  <svg viewBox="0 0 24 24" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
                </button>
                <span aria-live="polite">
                  {photo + 1} de {total}
                </span>
                <button onClick={() => go(1)} aria-label="Próxima foto">
                  <svg viewBox="0 0 24 24" aria-hidden><path d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            )}
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

        <div className="detail-info">
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
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>

          {piece.description && <p className="detail-desc">{piece.description}</p>}

          <div className="reserve">
            <p className="reserve-label">Somente retirada na loja</p>

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
                      <motion.button className="btn" onClick={doReserve} disabled={busy} whileTap={{ scale: 0.97 }} transition={spring}>
                        {busy ? 'Reservando…' : 'Confirmar reserva'}
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

          <button className="link-btn copy-link" onClick={copyLink}>
            Copiar link da peça
          </button>
        </div>
      </div>

      {related.length > 0 && (
        <section className="related" aria-labelledby="related-title">
          <h2 id="related-title" className="display-s">
            Mais peças de {piece.category.toLowerCase()}
          </h2>
          <div className="grid">
            {related.map((p) => (
              <PieceCard key={p.id} piece={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
