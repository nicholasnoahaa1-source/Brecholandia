import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PieceVisual, lot } from '../../components/bits'
import { brl, closeReservation, deletePiece, holdDeadline, saveStore, shortDate, useDB, type StoreInfo } from '../../lib/db'
import { ease, spring } from '../../lib/motion'

const TABS = [
  { id: 'pecas', label: 'Peças' },
  { id: 'reservas', label: 'Reservas' },
  { id: 'loja', label: 'Dados da loja' },
] as const

export default function Admin() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('aba') as (typeof TABS)[number]['id']) || 'pecas'
  const activeRes = useDB((d) => d.reservations).filter((r) => r.status === 'ativa').length

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
  const list = useMemo(() => pieces.filter((p) => filter === 'todas' || p.status === filter), [pieces, filter])

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
      <div className="chips">
        {(['todas', 'disponivel', 'reservada', 'retirada'] as const).map((s) => (
          <button key={s} className={`size-opt ${filter === s ? 'on' : ''}`} onClick={() => setFilter(s)}>
            {s === 'todas' ? 'Todas' : PSTATUS[s]} <span className="mono">{s === 'todas' ? pieces.length : pieces.filter((p) => p.status === s).length}</span>
          </button>
        ))}
      </div>
      <ul className="admin-list">
        <AnimatePresence initial={false}>
          {list.map((p) => (
            <motion.li key={p.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -24 }} transition={spring}>
              <div className="admin-thumb">
                <PieceVisual piece={p} />
              </div>
              <div className="admin-main">
                <span className="mono">
                  {lot(p)} · {p.type} · {p.size || 's/ tam.'}
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
                  onClick={() => confirm(`Excluir “${p.title}”? Reservas ativas desta peça serão canceladas.`) && deletePiece(p.id)}
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
  const reservations = useDB((d) => d.reservations)
  const pieces = useDB((d) => d.pieces)
  const users = useDB((d) => d.users)
  const store = useDB((d) => d.store)
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
              const p = pieces.find((x) => x.id === r.pieceId)
              const u = users.find((x) => x.id === r.userId)
              const dl = holdDeadline(r, store)
              const late = dl && dl.getTime() < Date.now()
              return (
                <motion.li key={r.id} layout exit={{ opacity: 0, x: 24 }} transition={spring} className="res-admin">
                  <div className="admin-thumb">{p && <PieceVisual piece={p} />}</div>
                  <div className="admin-main">
                    <span className="mono">
                      {p ? lot(p) : '—'} · reservada em {shortDate(r.createdAt)}
                      {dl && (
                        <em className={late ? 'late' : ''}>
                          {' '}
                          · {late ? 'prazo vencido em' : 'retirar até'} {shortDate(dl)}
                        </em>
                      )}
                    </span>
                    <strong>{p?.title ?? 'Peça removida'}</strong>
                    <span className="muted">
                      {u ? `${u.name} · ${u.phone} · ${u.email}` : 'Cliente removido'}
                    </span>
                  </div>
                  <span className="admin-price">{p && brl(p.price)}</span>
                  <div className="admin-actions">
                    <button className="btn btn-sm" onClick={() => closeReservation(r.id, 'retirada')}>
                      Marcar retirada
                    </button>
                    <button className="link-btn danger" onClick={() => confirm('Cancelar a reserva? A peça volta ao catálogo.') && closeReservation(r.id, 'cancelada')}>
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
                    <td>{pieces.find((p) => p.id === r.pieceId)?.title ?? 'Peça removida'}</td>
                    <td>{users.find((u) => u.id === r.userId)?.name ?? '—'}</td>
                    <td className="mono">{shortDate(r.closedAt ?? r.createdAt)}</td>
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

  const fields: { k: keyof StoreInfo; label: string; hint: string; area?: boolean }[] = [
    { k: 'address', label: 'Endereço de retirada', hint: 'Rua, número, bairro, cidade', area: true },
    { k: 'hours', label: 'Horário de retirada', hint: 'Ex.: dias da semana e horários em que a loja atende' },
    { k: 'holdDays', label: 'Prazo para retirar (dias)', hint: 'Quantos dias a peça fica separada. Deixe vazio se não houver prazo.' },
    { k: 'payment', label: 'Formas de pagamento', hint: 'Como o cliente paga na retirada' },
    { k: 'contact', label: 'Contato', hint: 'Telefone, WhatsApp ou Instagram da loja' },
    { k: 'notes', label: 'Observações', hint: 'Qualquer regra extra da retirada', area: true },
  ]

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const next = Object.fromEntries(fields.map(({ k }) => [k, String(f.get(k) ?? '').trim()])) as StoreInfo
    saveStore(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  return (
    <form className="form form-wide" onSubmit={submit}>
      <p className="muted">
        Só aparece no site o que estiver preenchido aqui. Campos vazios ficam ocultos.
      </p>
      {fields.map((f) => (
        <label key={f.k} className="field">
          <span className="mono">{f.label}</span>
          {f.area ? (
            <textarea name={f.k} defaultValue={store[f.k]} rows={2} />
          ) : (
            <input name={f.k} defaultValue={store[f.k]} inputMode={f.k === 'holdDays' ? 'numeric' : undefined} />
          )}
          <small>{f.hint}</small>
        </label>
      ))}
      <div className="confirm-row">
        <motion.button className="btn" whileTap={{ scale: 0.97 }} transition={spring}>
          Salvar
        </motion.button>
        <AnimatePresence>
          {saved && (
            <motion.span className="mono ok" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              Salvo
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </form>
  )
}
