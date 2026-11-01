import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PieceVisual, lot } from '../../components/bits'
import { useDialog } from '../../components/Dialog'
import { brl, closeReservation, deletePiece, holdDeadline, loadReservations, saveStore, shortDate, useDB, type StoreInfo } from '../../lib/db'
import { ease, spring } from '../../lib/motion'

const TABS = [
  { id: 'pecas', label: 'Peças' },
  { id: 'reservas', label: 'Reservas' },
  { id: 'loja', label: 'Dados da loja' },
] as const

export default function Admin() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('aba') as (typeof TABS)[number]['id']) || 'pecas'
  const activeRes = useDB((d) => d.allReservations).filter((r) => r.status === 'ativa').length

  useEffect(() => {
    loadReservations(true).catch(() => {})
  }, [])

  return (
    <div className="wrap admin">
      <div className="admin-head">
        <h1 className="display-l">Gerenciar</h1>
        <Link className="btn" to="/admin/peca/nova">
          + Nova peça
        </Link>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className="tab" onClick={() => setParams({ aba: t.id }, { replace: true })}>
            {t.label}
            {t.id === 'reservas' && activeRes > 0 && <span className="tab-count">{activeRes}</span>}
            {tab === t.id && <motion.span layoutId="admin-tab" className="tab-mark" transition={spring} />}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease } }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
        >
          {tab === 'pecas' && <PiecesTab />}
          {tab === 'reservas' && <ReservationsTab />}
          {tab === 'loja' && <StoreTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

const PSTATUS = { disponivel: 'Disponível', reservada: 'Reservada', retirada: 'Retirada' }

function PiecesTab() {
  const pieces = useDB((d) => d.pieces)
  const [filter, setFilter] = useState<'todas' | keyof typeof PSTATUS>('todas')
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    return pieces.filter(
      (p) =>
        (filter === 'todas' || p.status === filter) &&
        (!term || [p.title, p.brand, p.type, lot(p)].join(' ').toLowerCase().includes(term)),
    )
  }, [pieces, filter, q])
  const dialog = useDialog()
  const remove = async (id: string, title: string) => {
    const ok = await dialog.confirm({
      title: `Excluir “${title}”?`,
      body: 'A peça e as fotos saem do catálogo de vez. Se houver reserva ativa, ela é cancelada.',
      confirm: 'Excluir peça',
      danger: true,
    })
    if (!ok) return
    try {
      await deletePiece(id)
      dialog.toast('Peça excluída.')
    } catch (e) {
      dialog.toast((e as Error).message, 'erro')
    }
  }

  if (!pieces.length)
    return (
      <div className="empty-state small">
        <p className="display-s">Nenhuma peça cadastrada.</p>
        <Link className="btn" to="/admin/peca/nova">
          Cadastrar a primeira
        </Link>
      </div>
    )

  return (
    <>
      <div className="admin-tools">
        <div className="chips" role="group" aria-label="Mostrar">
          {(['todas', 'disponivel', 'reservada', 'retirada'] as const).map((s) => (
            <button key={s} className={`size-opt ${filter === s ? 'on' : ''}`} aria-pressed={filter === s} onClick={() => setFilter(s)}>
              {s === 'todas' ? 'Todas' : PSTATUS[s]} <span className="count">{s === 'todas' ? pieces.length : pieces.filter((p) => p.status === s).length}</span>
            </button>
          ))}
        </div>
        <label className="search">
          <span className="meta">Procurar peça</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, marca, tipo ou código" />
        </label>
      </div>
      {list.length === 0 && <p className="muted">Nenhuma peça com essa busca.</p>}
      <ul className="admin-list">
        <AnimatePresence initial={false}>
          {list.map((p) => (
            <motion.li key={p.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -24 }} transition={spring}>
              <div className="admin-thumb">
                <PieceVisual piece={p} />
              </div>
              <div className="admin-main">
                <span className="meta">
                  {lot(p)}, {p.type.toLowerCase()}, {p.size ? `tamanho ${p.size}` : 'sem tamanho'}
                </span>
                <strong>{p.title}</strong>
              </div>
              <span className="admin-price">{brl(p.price)}</span>
              <span className={`pill pill-${p.status}`}>{PSTATUS[p.status]}</span>
              <div className="admin-actions">
                <Link to={`/admin/peca/${p.id}`} className="link-btn">
                  Editar
                </Link>
                <button
                  className="link-btn danger"
                  onClick={() => remove(p.id, p.title)}
                >
                  Excluir
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </>
  )
}

function ReservationsTab() {
  const reservations = useDB((d) => d.allReservations)
  const store = useDB((d) => d.store)
  const [busy, setBusy] = useState('')
  const dialog = useDialog()
  const close = async (id: string, status: 'retirada' | 'cancelada', title = 'A peça') => {
    if (status === 'cancelada') {
      const ok = await dialog.confirm({
        title: 'Cancelar a reserva?',
        body: `${title} volta para o catálogo como disponível.`,
        confirm: 'Cancelar reserva',
        cancel: 'Manter reserva',
        danger: true,
      })
      if (!ok) return
    }
    setBusy(id)
    try {
      await closeReservation(id, status)
      dialog.toast(status === 'retirada' ? 'Marcada como retirada.' : 'Reserva cancelada.')
    } catch (e) {
      dialog.toast((e as Error).message, 'erro')
    } finally {
      setBusy('')
    }
  }
  const active = reservations.filter((r) => r.status === 'ativa')
  const past = reservations.filter((r) => r.status !== 'ativa')

  return (
    <>
      {active.length === 0 ? (
        <p className="muted">Nenhuma reserva aguardando retirada.</p>
      ) : (
        <ul className="admin-list">
          <AnimatePresence initial={false}>
            {active.map((r) => {
              const p = r.piece
              const u = r.customer
              const dl = holdDeadline(r, store)
              const late = dl && dl.getTime() < Date.now()
              return (
                <motion.li key={r.id} layout exit={{ opacity: 0, x: 24 }} transition={spring} className="res-admin">
                  <div className="admin-thumb">{p && <PieceVisual piece={p} />}</div>
                  <div className="admin-main">
                    <span className="meta">
                      {p ? lot(p) : 'Peça removida'}, reservada em {shortDate(r.createdAt)}
                      {dl && (
                        <em className={late ? 'late' : ''}>
                          {' '}
                          , {late ? 'prazo vencido em' : 'retirar até'} {shortDate(dl)}
                        </em>
                      )}
                    </span>
                    <strong>{p?.title ?? 'Peça removida'}</strong>
                    <span className="muted">
                      {u ? (
                        <>
                          {u.name}, <a href={`tel:${u.phone.replace(/[^\d+]/g, '')}`}>{u.phone}</a>, {u.email}
                        </>
                      ) : (
                        'Cliente removido'
                      )}
                    </span>
                  </div>
                  <span className="admin-price">{p && brl(p.price)}</span>
                  <div className="admin-actions">
                    <button className="btn btn-sm" disabled={busy === r.id} onClick={() => close(r.id, 'retirada', p?.title)}>
                      Marcar retirada
                    </button>
                    <button className="link-btn danger" disabled={busy === r.id} onClick={() => close(r.id, 'cancelada', p?.title ? `“${p.title}”` : undefined)}>
                      Cancelar
                    </button>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}

      {past.length > 0 && (
        <>
          <h2 className="section-title">Histórico</h2>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Peça</th>
                  <th>Cliente</th>
                  <th>Fechada em</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {past.map((r) => (
                  <tr key={r.id}>
                    <td>{r.piece?.title ?? 'Peça removida'}</td>
                    <td>{r.customer?.name ?? '—'}</td>
                    <td className="meta">{shortDate(r.closedAt ?? r.createdAt)}</td>
                    <td>{r.status === 'retirada' ? 'Retirada' : 'Cancelada'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}

function StoreTab() {
  const store = useDB((d) => d.store)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const fields: { k: keyof StoreInfo; label: string; hint: string; area?: boolean }[] = [
    { k: 'address', label: 'Endereço de retirada', hint: 'Rua, número, bairro, cidade', area: true },
    { k: 'hours', label: 'Horário de retirada', hint: 'Ex.: dias da semana e horários em que a loja atende' },
    { k: 'holdDays', label: 'Prazo para retirar (dias)', hint: 'Quantos dias a peça fica separada. Deixe vazio se não houver prazo.' },
    { k: 'payment', label: 'Formas de pagamento', hint: 'Como o cliente paga na retirada' },
    { k: 'contact', label: 'Contato', hint: 'Telefone, WhatsApp ou Instagram da loja' },
    { k: 'notes', label: 'Observações', hint: 'Qualquer regra extra da retirada', area: true },
  ]

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const next = Object.fromEntries(fields.map(({ k }) => [k, String(f.get(k) ?? '').trim()])) as StoreInfo
    setError('')
    try {
      await saveStore(next)
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <form className="form form-wide" onSubmit={submit}>
      <p className="muted">
        Só aparece no site o que estiver preenchido aqui. Campos vazios ficam ocultos.
      </p>
      {fields.map((f) => (
        <label key={f.k} className="field">
          <span className="field-label">{f.label}</span>
          {f.area ? (
            <textarea name={f.k} defaultValue={store[f.k]} rows={2} />
          ) : (
            <input name={f.k} defaultValue={store[f.k]} inputMode={f.k === 'holdDays' ? 'numeric' : undefined} />
          )}
          <small>{f.hint}</small>
        </label>
      ))}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="confirm-row">
        <motion.button className="btn" whileTap={{ scale: 0.97 }} transition={spring}>
          Salvar
        </motion.button>
        <AnimatePresence>
          {saved && (
            <motion.span className="ok" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              Salvo
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </form>
  )
}
