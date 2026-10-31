import { useSyncExternalStore } from 'react'
import type { Condition } from './taxonomy'

/*
 * Cliente da API (servidor Node + MongoDB, pasta server/).
 * Mantém um cache em memória que os componentes leem com useDB().
 * Toda alteração passa pelo servidor e depois atualiza o cache.
 */

export type Piece = {
  id: string
  title: string
  category: string
  type: string
  colors: string[]
  condition: Condition
  conditionNotes: string
  size: string
  brand: string
  measurements: string
  description: string
  price: number
  photos: string[]
  status: 'disponivel' | 'reservada' | 'retirada'
  createdAt: number
}

export type User = {
  id: string
  name: string
  email: string
  phone: string
  role: 'admin' | 'cliente'
}

export type Reservation = {
  id: string
  pieceId: string
  userId: string
  status: 'ativa' | 'retirada' | 'cancelada'
  createdAt: number
  closedAt?: number
  piece: Piece | null
  customer?: { name: string; phone: string; email: string } | null
}

export type StoreInfo = {
  address: string
  hours: string
  contact: string
  holdDays: string
  payment: string
  notes: string
}

type Data = {
  ready: boolean
  offline: boolean
  pieces: Piece[]
  store: StoreInfo
  user: User | null
  hasUsers: boolean
  myReservations: Reservation[]
  allReservations: Reservation[]
}

let data: Data = {
  ready: false,
  offline: false,
  pieces: [],
  store: { address: '', hours: '', contact: '', holdDays: '', payment: '', notes: '' },
  user: null,
  hasUsers: true,
  myReservations: [],
  allReservations: [],
}

const listeners = new Set<() => void>()
function set(patch: Partial<Data>) {
  data = { ...data, ...patch }
  listeners.forEach((l) => l())
}
function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Lê um pedaço do cache. O seletor deve devolver algo já existente (sem criar arrays novos). */
export function useDB<T>(select: (d: Data) => T): T {
  return useSyncExternalStore(subscribe, () => select(data))
}

export const useCurrentUser = () => useDB((d) => d.user)

export const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12)

/* ---------- http ---------- */

async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method: init?.method ?? 'GET',
      credentials: 'same-origin',
      headers: init?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
  } catch {
    throw new Error('Sem conexão com o servidor. Verifique a internet e tente de novo.')
  }
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Algo deu errado. Tente de novo.')
  return json as T
}

/* ---------- carga ---------- */

export async function refresh() {
  try {
    const b = await api<{ pieces: Piece[]; store: StoreInfo; user: User | null; hasUsers: boolean }>('/bootstrap')
    set({ ...b, ready: true, offline: false, ...(b.user ? {} : { myReservations: [], allReservations: [] }) })
    if (b.user) await loadReservations(false)
  } catch {
    set({ ready: true, offline: true })
  }
}

export async function loadReservations(all: boolean) {
  const { reservations } = await api<{ reservations: Reservation[] }>(`/reservas${all ? '?todas=1' : ''}`)
  set(all ? { allReservations: reservations } : { myReservations: reservations })
}

/* ---------- autenticação ---------- */

export async function register(input: { name: string; email: string; phone: string; password: string }) {
  await api('/cadastro', { method: 'POST', body: input })
  await refresh()
}

export async function login(email: string, password: string) {
  await api('/entrar', { method: 'POST', body: { email, password } })
  await refresh()
}

export async function logout() {
  await api('/sair', { method: 'POST' })
  await refresh()
}

/* ---------- peças ---------- */

export async function savePiece(piece: Piece) {
  await api(`/pecas/${encodeURIComponent(piece.id)}`, { method: 'PUT', body: piece })
  await refresh()
}

export async function deletePiece(id: string) {
  await api(`/pecas/${encodeURIComponent(id)}`, { method: 'DELETE' })
  await refresh()
}

/* ---------- reservas (somente retirada) ---------- */

export async function reserve(pieceId: string) {
  try {
    await api('/reservas', { method: 'POST', body: { pieceId } })
  } finally {
    // Atualiza mesmo em caso de erro: a peça pode ter sido reservada por outra pessoa.
    await refresh()
  }
}

export async function closeReservation(id: string, status: 'retirada' | 'cancelada') {
  await api(`/reservas/${encodeURIComponent(id)}/fechar`, { method: 'POST', body: { status } })
  await refresh()
  if (data.user?.role === 'admin') await loadReservations(true)
}

/* ---------- loja ---------- */

export async function saveStore(store: StoreInfo) {
  const res = await api<{ store: StoreInfo }>('/loja', { method: 'PUT', body: store })
  set({ store: res.store })
}

export function holdDeadline(r: Reservation, store: StoreInfo) {
  const days = parseInt(store.holdDays, 10)
  if (!days || days < 1) return null
  return new Date(r.createdAt + days * 86_400_000)
}

/* ---------- formatação ---------- */

export const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const shortDate = (d: number | Date) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
