import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PieceCard from '../components/PieceCard'
import { Swatch } from '../components/bits'
import { useModalFocus } from '../components/Dialog'
import { useCurrentUser, useDB, type Piece } from '../lib/db'
import { ease, spring } from '../lib/motion'
import { CATEGORIES, COLORS, CONDITIONS, PIECE_TYPES, colorById, conditionById, type Condition } from '../lib/taxonomy'
import { useTitle } from '../lib/useTitle'

type Multi = 'cat' | 'tipo' | 'cor' | 'cond' | 'tam'

const SORTS = [
  { id: 'recentes', label: 'Mais recentes' },
  { id: 'menor', label: 'Menor preço' },
  { id: 'maior', label: 'Maior preço' },
]

export default function Catalog() {
  const all = useDB((d) => d.pieces)
  const user = useCurrentUser()
  const [params, setParams] = useSearchParams()
  const [drawer, setDrawer] = useState(false)
  // Mostra as peças aos poucos para a página não pesar com catálogos grandes.
  const PAGE = 24
  const [limit, setLimit] = useState(PAGE)
  useTitle('Catálogo')
  const drawerRef = useRef<HTMLDivElement>(null)
  const ready = useDB((d) => d.ready)
  useModalFocus(drawer, drawerRef, () => setDrawer(false))

  const get = (k: Multi) => params.getAll(k)
  const q = params.get('q') ?? ''
  const sort = params.get('ordem') ?? 'recentes'
  const showReserved = params.get('reservadas') !== 'nao'
  const min = params.get('min') ?? ''
  const max = params.get('max') ?? ''

  const toggle = (k: Multi, v: string) => {
    const next = new URLSearchParams(params)
    const cur = next.getAll(k)
    next.delete(k)
    ;(cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).forEach((x) => next.append(k, x))
    setParams(next, { replace: true })
  }
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next, { replace: true })
  }
  const clear = () => setParams(new URLSearchParams(), { replace: true })

  // Peças já retiradas saem do catálogo.
  const visible = useMemo(() => all.filter((p) => p.status !== 'retirada'), [all])

  const filtered = useMemo(() => {
    const cat = get('cat'), tipo = get('tipo'), cor = get('cor'), cond = get('cond'), tam = get('tam')
    const term = q.trim().toLowerCase()
    const lo = parseFloat(min), hi = parseFloat(max)
    const list = visible.filter(
      (p) =>
        (showReserved || p.status === 'disponivel') &&
        (!cat.length || cat.includes(p.category)) &&
        (!tipo.length || tipo.includes(p.type)) &&
        (!cor.length || p.colors.some((c) => cor.includes(c))) &&
        (!cond.length || cond.includes(p.condition)) &&
        (!tam.length || tam.includes(p.size)) &&
        (isNaN(lo) || p.price >= lo) &&
        (isNaN(hi) || p.price <= hi) &&
        (!term || [p.title, p.brand, p.type, p.description].join(' ').toLowerCase().includes(term)),
    )
    const sorted = [...list]
    if (sort === 'menor') sorted.sort((a, b) => a.price - b.price)
    else if (sort === 'maior') sorted.sort((a, b) => b.price - a.price)
    else sorted.sort((a, b) => b.createdAt - a.createdAt)
    return sorted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, params])

  // Filtros ligados, mostrados acima da grade para tirar um por um.
  const chips: { key: string; label: string; remove: () => void }[] = [
    ...(['cat', 'tipo', 'tam'] as const).flatMap((k) =>
      get(k).map((v) => ({ key: `${k}:${v}`, label: k === 'tam' ? `Tamanho ${v}` : v, remove: () => toggle(k, v) })),
    ),
    ...get('cor').map((v) => ({ key: `cor:${v}`, label: colorById(v)?.label ?? v, remove: () => toggle('cor', v) })),
    ...get('cond').map((v) => ({ key: `cond:${v}`, label: conditionById(v as Condition)?.short ?? v, remove: () => toggle('cond', v) })),
    ...(min ? [{ key: 'min', label: `A partir de R$ ${min}`, remove: () => set('min', '') }] : []),
    ...(max ? [{ key: 'max', label: `Até R$ ${max}`, remove: () => set('max', '') }] : []),
    ...(q ? [{ key: 'q', label: `“${q}”`, remove: () => set('q', '') }] : []),
    ...(!showReserved ? [{ key: 'res', label: 'Sem as reservadas', remove: () => set('reservadas', '') }] : []),
  ]

  // Volta ao começo da lista quando os filtros mudam.
  const paramsKey = params.toString()
  useEffect(() => setLimit(PAGE), [paramsKey])
  const shown = filtered.slice(0, limit)

  const activeCount = ['cat', 'tipo', 'cor', 'cond', 'tam'].reduce((n, k) => n + params.getAll(k).length, 0) + (min ? 1 : 0) + (max ? 1 : 0) + (q ? 1 : 0)

  const filters = (
    <FilterPanel
      pieces={visible}
      selected={{ cat: get('cat'), tipo: get('tipo'), cor: get('cor'), cond: get('cond'), tam: get('tam') }}
      toggle={toggle}
      min={min}
      max={max}
      setPrice={set}
      showReserved={showReserved}
      setShowReserved={(v) => set('reservadas', v ? '' : 'nao')}
    />
  )

  return (
    <div className="wrap catalog">
      <div className="catalog-head">
        <div>
          <h1 className="display-l">Catálogo</h1>
          <p className="catalog-count" aria-hidden>
            {!ready ? 'Carregando peças' : filtered.length === 1 ? '1 peça' : `${filtered.length} peças`}
            {ready && filtered.length !== visible.length && ` de ${visible.length}`}
          </p>
        </div>
        <div className="catalog-tools">
          <label className="search">
            <span className="meta">Buscar peça</span>
            <input
              type="search"
              value={q}
              placeholder="Marca, tipo, nome da peça"
              onChange={(e) => set('q', e.target.value)}
            />
          </label>
          <label className="select">
            <span className="meta">Ordenar por</span>
            <select value={sort} onChange={(e) => set('ordem', e.target.value === 'recentes' ? '' : e.target.value)}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-line filter-open" onClick={() => setDrawer(true)}>
            Filtros{activeCount ? ` (${activeCount})` : ''}
          </button>
        </div>
      </div>

      <div className="catalog-body">
        <aside className="filters-side" aria-label="Filtros">
          {filters}
          {activeCount > 0 && (
            <button className="link-btn" onClick={clear}>
              Limpar filtros
            </button>
          )}
        </aside>

        <section aria-busy={!ready}>
          <p className="sr-only" role="status">
            {ready ? `${filtered.length} ${filtered.length === 1 ? 'peça encontrada' : 'peças encontradas'}` : 'Carregando catálogo'}
          </p>
          <AnimatePresence initial={false}>
            {chips.length > 0 && (
              <motion.div
                className="active-filters"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto', transition: { duration: 0.25, ease } }}
                exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
              >
                <ul aria-label="Filtros ligados">
                  <AnimatePresence initial={false}>
                    {chips.map((c) => (
                      <motion.li
                        key={c.key}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
                        transition={spring}
                      >
                        <button className="chip" onClick={c.remove} aria-label={`Tirar filtro ${c.label}`}>
                          {c.label}
                          <span aria-hidden className="chip-x" />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                {chips.length > 1 && (
                  <button className="link-btn" onClick={clear}>
                    Limpar tudo
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          {!ready ? (
            <div className="grid" aria-hidden>
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="card-skeleton" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyCatalog admin={user?.role === 'admin'} />
          ) : filtered.length === 0 ? (
            <div className="empty-state small">
              <p className="display-s">Nenhuma peça com esses filtros.</p>
              <button className="btn" onClick={clear}>
                Limpar filtros
              </button>
            </div>
          ) : (
            <LayoutGroup>
              <motion.div layout className="grid">
                <AnimatePresence mode="popLayout">
                  {shown.map((p) => (
                    <PieceCard key={p.id} piece={p} />
                  ))}
                </AnimatePresence>
              </motion.div>
              {filtered.length > limit && (
                <div className="more">
                  <p className="muted">
                    Mostrando {limit} de {filtered.length} peças
                  </p>
                  <button className="btn btn-line" onClick={() => setLimit((l) => l + PAGE)}>
                    Mostrar mais {Math.min(PAGE, filtered.length - limit)}
                  </button>
                </div>
              )}
            </LayoutGroup>
          )}
        </section>
      </div>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              className="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
            />
            <motion.div
              ref={drawerRef}
              className="drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Filtros"
              initial={{ y: '100%' }}
              animate={{ y: 0, transition: { duration: 0.4, ease } }}
              exit={{ y: '100%', transition: { duration: 0.25, ease } }}
            >
              <div className="drawer-head">
                <span className="display-s">Filtros</span>
                <div className="drawer-head-actions">
                  <button className="link-btn" onClick={clear}>
                    Limpar
                  </button>
                  <button className="link-btn" onClick={() => setDrawer(false)}>
                    Fechar
                  </button>
                </div>
              </div>
              <div className="drawer-body">{filters}</div>
              <button className="btn btn-block" onClick={() => setDrawer(false)}>
                Ver {filtered.length} {filtered.length === 1 ? 'peça' : 'peças'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function EmptyCatalog({ admin }: { admin: boolean }) {
  return (
    <div className="empty-state small">
      <p className="display-s">Ainda não há peças cadastradas.</p>
      {admin ? (
        <Link className="btn" to="/admin/peca/nova">
          Cadastrar a primeira peça
        </Link>
      ) : (
        <p className="muted">Assim que a loja cadastrar as peças, elas aparecem aqui.</p>
      )}
    </div>
  )
}

type PanelProps = {
  pieces: Piece[]
  selected: Record<Multi, string[]>
  toggle: (k: Multi, v: string) => void
  min: string
  max: string
  setPrice: (k: string, v: string) => void
  showReserved: boolean
  setShowReserved: (v: boolean) => void
}

function FilterPanel({ pieces, selected, toggle, min, max, setPrice, showReserved, setShowReserved }: PanelProps) {
  const count = (fn: (p: Piece) => boolean) => pieces.filter(fn).length

  // Só aparecem opções que existem no catálogo (ou que já estão marcadas).
  const keep = (k: Multi, v: string, n: number) => n > 0 || selected[k].includes(v)

  const sizes = [...new Set(pieces.map((p) => p.size).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR', { numeric: true }),
  )

  return (
    <div className="filters">
      <Group title="Categoria">
        {CATEGORIES.map((c) => {
          const n = count((p) => p.category === c)
          return keep('cat', c, n) && <Check key={c} on={selected.cat.includes(c)} onClick={() => toggle('cat', c)} label={c} n={n} />
        })}
      </Group>

      <Group title="Tipo de peça">
        {PIECE_TYPES.map((t) => {
          const n = count((p) => p.type === t)
          return keep('tipo', t, n) && <Check key={t} on={selected.tipo.includes(t)} onClick={() => toggle('tipo', t)} label={t} n={n} />
        })}
      </Group>

      <Group title="Cor">
        <div className="color-grid">
          {COLORS.map((c) => {
            const n = count((p) => p.colors.includes(c.id))
            if (!keep('cor', c.id, n)) return null
            const on = selected.cor.includes(c.id)
            return (
              <motion.button
                key={c.id}
                className={`color-opt ${on ? 'on' : ''}`}
                aria-pressed={on}
                onClick={() => toggle('cor', c.id)}
                whileTap={{ scale: 0.94 }}
                transition={spring}
              >
                <Swatch id={c.id} size={18} />
                <span>{c.label}</span>
              </motion.button>
            )
          })}
        </div>
      </Group>

      <Group title="Condição">
        {CONDITIONS.map((c) => {
          const n = count((p) => p.condition === c.id)
          return keep('cond', c.id, n) && <Check key={c.id} on={selected.cond.includes(c.id)} onClick={() => toggle('cond', c.id)} label={c.short} n={n} />
        })}
      </Group>

      {sizes.length > 0 && (
        <Group title="Tamanho">
          <div className="size-row">
            {sizes.map((s) => {
              const on = selected.tam.includes(s)
              return (
                <button key={s} className={`size-opt ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle('tam', s)}>
                  {s}
                </button>
              )
            })}
          </div>
        </Group>
      )}

      <Group title="Preço (R$)">
        <div className="price-row">
          <input inputMode="decimal" placeholder="de" value={min} onChange={(e) => setPrice('min', e.target.value.replace(',', '.'))} aria-label="Preço mínimo" />
          <span aria-hidden>até</span>
          <input inputMode="decimal" placeholder="até" value={max} onChange={(e) => setPrice('max', e.target.value.replace(',', '.'))} aria-label="Preço máximo" />
        </div>
      </Group>

      <label className="switch">
        <input type="checkbox" checked={showReserved} onChange={(e) => setShowReserved(e.target.checked)} />
        <span className="switch-track" aria-hidden>
          <motion.span className="switch-dot" layout transition={spring} />
        </span>
        Mostrar peças reservadas
      </label>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <fieldset className="fgroup">
      <legend>
        <button className="fgroup-head" onClick={() => setOpen((o) => !o)} aria-expanded={open} type="button">
          <span className="fgroup-title">{title}</span>
          <motion.span animate={{ rotate: open ? 0 : -90 }} transition={spring} aria-hidden>
            ▾
          </motion.span>
        </button>
      </legend>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="fgroup-body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto', transition: { duration: 0.28, ease } }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.2, ease } }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </fieldset>
  )
}

function Check({ on, onClick, label, n }: { on: boolean; onClick: () => void; label: string; n: number }) {
  return (
    <button type="button" className={`check ${on ? 'on' : ''}`} aria-pressed={on} onClick={onClick}>
      <span className="check-box" aria-hidden>
        <AnimatePresence>
          {on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring} />}
        </AnimatePresence>
      </span>
      <span className="check-label">{label}</span>
      <span className="meta check-n">{n}</span>
    </button>
  )
}
