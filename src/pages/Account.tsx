import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PieceVisual, lot } from '../components/bits'
import { useDialog } from '../components/Dialog'
import { brl, closeReservation, holdDeadline, logout, shortDate, useCurrentUser, useDB } from '../lib/db'
import { rise, stagger } from '../lib/motion'

const STATUS = { ativa: 'Aguardando retirada', retirada: 'Retirada', cancelada: 'Cancelada' }

export default function Account() {
  const user = useCurrentUser()!
  const mine = useDB((d) => d.myReservations)
  const store = useDB((d) => d.store)
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const dialog = useDialog()

  const cancel = async (id: string, title?: string) => {
    const ok = await dialog.confirm({
      title: 'Cancelar esta reserva?',
      body: `${title ? `“${title}” ` : 'A peça '}volta para o catálogo e outra pessoa pode reservar.`,
      confirm: 'Cancelar reserva',
      cancel: 'Manter reserva',
      danger: true,
    })
    if (!ok) return
    setError('')
    try {
      await closeReservation(id, 'cancelada')
      dialog.toast('Reserva cancelada.')
    } catch (e) {
      setError((e as Error).message)
    }
  }
  const active = mine.filter((r) => r.status === 'ativa')
  const past = mine.filter((r) => r.status !== 'ativa')

  return (
    <div className="wrap account">
      <div className="account-head">
        <div>
          <p className="mono">Minha conta{user.role === 'admin' ? ' · administradora' : ''}</p>
          <h1 className="display-l">{user.name}</h1>
          <p className="muted">
            {user.email} · {user.phone}
          </p>
        </div>
        <button
          className="btn btn-line"
          onClick={async () => {
            await logout().catch(() => {})
            navigate('/')
          }}
        >
          Sair
        </button>
      </div>

      {active.length > 0 && (store.address || store.hours) && (
        <div className="pickup-note">
          <span className="mono">Onde retirar</span>
          <p>
            {store.address}
            {store.address && store.hours ? ' · ' : ''}
            {store.hours}
          </p>
        </div>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      <h2 className="section-title">
        Reservas ativas <span className="mono">{active.length}</span>
      </h2>
      {active.length === 0 ? (
        <p className="muted">
          Nenhuma reserva no momento. <Link to="/catalogo">Ver o catálogo</Link>
        </p>
      ) : (
        <motion.ul className="res-list" variants={stagger} initial="hidden" animate="show">
          <AnimatePresence>
            {active.map((r) => {
              const p = r.piece
              const dl = holdDeadline(r, store)
              return (
                <motion.li key={r.id} variants={rise} layout exit={{ opacity: 0, x: -20 }} className="res">
                  {p ? (
                    <Link to={`/peca/${p.id}`} className="res-img">
                      <PieceVisual piece={p} />
                    </Link>
                  ) : (
                    <div className="res-img" />
                  )}
                  <div className="res-body">
                    <span className="mono">{p ? lot(p) : 'Peça removida'}</span>
                    <strong>{p?.title}</strong>
                    <span>{p && brl(p.price)}</span>
                    <span className="mono muted">
                      Reservada em {shortDate(r.createdAt)}
                      {dl && ` · retirar até ${shortDate(dl)}`}
                    </span>
                  </div>
                  <button className="link-btn" onClick={() => cancel(r.id, p?.title)}>
                    Cancelar
                  </button>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </motion.ul>
      )}

      {past.length > 0 && (
        <>
          <h2 className="section-title">Histórico</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Peça</th>
                <th>Data</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {past.map((r) => {
                const p = r.piece
                return (
                  <tr key={r.id}>
                    <td>{p?.title ?? 'Peça removida'}</td>
                    <td className="mono">{shortDate(r.closedAt ?? r.createdAt)}</td>
                    <td>{STATUS[r.status]}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
