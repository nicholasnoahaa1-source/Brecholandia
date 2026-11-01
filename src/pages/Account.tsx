import { AnimatePresence, motion } from 'motion/react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PieceVisual, lot } from '../components/bits'
import { useDialog } from '../components/Dialog'
import { brl, changePassword, closeReservation, holdDeadline, logout, shortDate, updateAccount, useCurrentUser, useDB, type User } from '../lib/db'
import { ease, spring } from '../lib/motion'
import { useTitle } from '../lib/useTitle'

const STATUS = { ativa: 'Aguardando retirada', retirada: 'Retirada', cancelada: 'Cancelada' }

export default function Account() {
  const user = useCurrentUser()!
  const mine = useDB((d) => d.myReservations)
  const store = useDB((d) => d.store)
  const navigate = useNavigate()
  useTitle('Minhas reservas')
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
          <h1 className="display-l">{user.name}</h1>
          <p className="muted account-who">
            <span>{user.email}</span>
            <span>{user.phone}</span>
            {user.role === 'admin' && <span>Administra a loja</span>}
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
          <strong>Onde retirar</strong>
          {store.address && <p>{store.address}</p>}
          {store.hours && <p>{store.hours}</p>}
        </div>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      <h2 className="section-title">
        Esperando você retirar <span className="count">{active.length}</span>
      </h2>
      {active.length === 0 ? (
        <p className="muted">
          Nenhuma reserva no momento. <Link to="/catalogo">Ver o catálogo</Link>
        </p>
      ) : (
        <ul className="res-list">
          <AnimatePresence>
            {active.map((r) => {
              const p = r.piece
              const dl = holdDeadline(r, store)
              return (
                <motion.li key={r.id} layout exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }} className="res">
                  {p ? (
                    <Link to={`/peca/${p.id}`} className="res-img">
                      <PieceVisual piece={p} />
                    </Link>
                  ) : (
                    <div className="res-img" />
                  )}
                  <div className="res-body">
                    <span className="meta">{p ? lot(p) : 'Peça removida'}</span>
                    <strong>{p?.title}</strong>
                    <span>{p && brl(p.price)}</span>
                    <span className="meta">
                      Reservada em {shortDate(r.createdAt)}
                      {dl && <>, retirar até {shortDate(dl)}</>}
                    </span>
                  </div>
                  <button className="link-btn" onClick={() => cancel(r.id, p?.title)}>
                    Cancelar
                  </button>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
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
                    <td className="meta">{shortDate(r.closedAt ?? r.createdAt)}</td>
                    <td>{STATUS[r.status]}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}

      <AccountSettings user={user} />
    </div>
  )
}

function AccountSettings({ user }: { user: User }) {
  const [open, setOpen] = useState<'' | 'dados' | 'senha'>('')
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const dialog = useDialog()

  const run = async (fn: () => Promise<void>, done: string) => {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
      setOpen('')
      dialog.toast(done)
    } catch (e) {
      setMsg({ text: (e as Error).message, ok: false })
    } finally {
      setBusy(false)
    }
  }

  const saveData = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    run(() => updateAccount({ name: String(f.get('nome') ?? ''), phone: String(f.get('telefone') ?? '') }), 'Dados salvos.')
  }
  const savePassword = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const next = String(f.get('nova') ?? '')
    if (next !== String(f.get('nova2') ?? '')) return setMsg({ text: 'As senhas novas não conferem.', ok: false })
    run(() => changePassword(String(f.get('atual') ?? ''), next), 'Senha trocada.')
  }

  const toggle = (k: 'dados' | 'senha') => {
    setMsg(null)
    setOpen((o) => (o === k ? '' : k))
  }

  return (
    <section className="settings" aria-labelledby="settings-title">
      <h2 id="settings-title" className="section-title">
        Seus dados
      </h2>
      <div className="settings-row">
        <button className="link-btn" aria-expanded={open === 'dados'} onClick={() => toggle('dados')}>
          Alterar nome e telefone
        </button>
        <button className="link-btn" aria-expanded={open === 'senha'} onClick={() => toggle('senha')}>
          Trocar senha
        </button>
      </div>
      <AnimatePresence initial={false} mode="wait">
        {open && (
          <motion.div
            key={open}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto', transition: { duration: 0.28, ease } }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.18 } }}
            style={{ overflow: 'hidden' }}
          >
            {open === 'dados' ? (
              <form className="form form-wide settings-form" onSubmit={saveData}>
                <label className="field">
                  <span className="field-label">Nome</span>
                  <input name="nome" defaultValue={user.name} autoComplete="name" required />
                </label>
                <label className="field">
                  <span className="field-label">Telefone ou WhatsApp</span>
                  <input name="telefone" type="tel" defaultValue={user.phone} autoComplete="tel" required />
                  <small>A loja vê este número junto das suas reservas.</small>
                </label>
                {msg && <p className="error" role="alert">{msg.text}</p>}
                <motion.button className="btn" disabled={busy} whileTap={{ scale: 0.97 }} transition={spring}>
                  {busy ? 'Salvando…' : 'Salvar dados'}
                </motion.button>
              </form>
            ) : (
              <form className="form form-wide settings-form" onSubmit={savePassword}>
                <label className="field">
                  <span className="field-label">Senha atual</span>
                  <input name="atual" type="password" autoComplete="current-password" required />
                </label>
                <label className="field">
                  <span className="field-label">Nova senha</span>
                  <input name="nova" type="password" autoComplete="new-password" minLength={6} required />
                  <small>Pelo menos 6 caracteres. Outros aparelhos conectados saem da conta.</small>
                </label>
                <label className="field">
                  <span className="field-label">Repita a nova senha</span>
                  <input name="nova2" type="password" autoComplete="new-password" required />
                </label>
                {msg && <p className="error" role="alert">{msg.text}</p>}
                <motion.button className="btn" disabled={busy} whileTap={{ scale: 0.97 }} transition={spring}>
                  {busy ? 'Trocando…' : 'Trocar senha'}
                </motion.button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
