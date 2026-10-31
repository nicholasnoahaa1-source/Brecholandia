import { useSyncExternalStore } from 'react'
import type { Condition } from './taxonomy'

/*
 * Banco local (localStorage). Serve para rodar o site sem servidor.
 * Cada navegador tem o seu próprio banco: para várias pessoas usarem
 * o mesmo catálogo é preciso trocar estas funções por uma API/backend.
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
  passwordHash: string
  salt: string
  role: 'admin' | 'cliente'
  createdAt: number
}

export type Reservation = {
  id: string
  pieceId: string
  userId: string
  status: 'ativa' | 'retirada' | 'cancelada'
  createdAt: number
  closedAt?: number
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
  pieces: Piece[]
  users: User[]
  reservations: Reservation[]
  store: StoreInfo
  session: string | null
}

const KEY = 'brecholandia:v1'

const empty: Data = {
  pieces: [],
  users: [],
  reservations: [],
  store: { address: '', hours: '', contact: '', holdDays: '', payment: '', notes: '' },
  session: null,
}

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(empty)
    const parsed = JSON.parse(raw)
    return { ...structuredClone(empty), ...parsed, store: { ...empty.store, ...parsed.store } }
  } catch {
    return structuredClone(empty)
  }
}

let data = load()
const listeners = new Set<() => void>()

function commit(next: Data) {
  data = next
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch (err) {
    // Normalmente acontece quando as fotos estouram a cota do navegador.
    throw new Error('Não foi possível salvar: o armazenamento do navegador está cheio. Tente fotos menores ou em menor quantidade.', { cause: err })
  }
  listeners.forEach((l) => l())
}

window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    data = load()
    listeners.forEach((l) => l())
  }
})

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useDB<T>(select: (d: Data) => T): T {
  return useSyncExternalStore(subscribe, () => select(data))
}

export const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12)

/* ---------- senhas ---------- */

async function hash(password: string, salt: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + password))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

/* ---------- autenticação ---------- */

export async function register(input: { name: string; email: string; phone: string; password: string }) {
  const email = input.email.trim().toLowerCase()
  if (data.users.some((u) => u.email === email)) throw new Error('Já existe uma conta com este e-mail.')
  if (input.password.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.')
  const salt = uid()
  const user: User = {
    id: uid(),
    name: input.name.trim(),
    email,
    phone: input.phone.trim(),
    salt,
    passwordHash: await hash(input.password, salt),
    // A primeira conta criada administra a loja.
    role: data.users.length === 0 ? 'admin' : 'cliente',
    createdAt: Date.now(),
  }
  commit({ ...data, users: [...data.users, user], session: user.id })
  return user
}

export async function login(emailRaw: string, password: string) {
  const email = emailRaw.trim().toLowerCase()
  const user = data.users.find((u) => u.email === email)
  if (!user || (await hash(password, user.salt)) !== user.passwordHash) throw new Error('E-mail ou senha incorretos.')
  commit({ ...data, session: user.id })
  return user
}

export function logout() {
  commit({ ...data, session: null })
}

export function useCurrentUser() {
  return useDB((d) => d.users.find((u) => u.id === d.session) ?? null)
}

export const hasAnyUser = () => data.users.length > 0

/* ---------- peças ---------- */

export function savePiece(piece: Piece) {
  const exists = data.pieces.some((p) => p.id === piece.id)
  commit({
    ...data,
    pieces: exists ? data.pieces.map((p) => (p.id === piece.id ? piece : p)) : [piece, ...data.pieces],
  })
}

export function deletePiece(id: string) {
  commit({
    ...data,
    pieces: data.pieces.filter((p) => p.id !== id),
    reservations: data.reservations.map((r) =>
      r.pieceId === id && r.status === 'ativa' ? { ...r, status: 'cancelada', closedAt: Date.now() } : r,
    ),
  })
}

/* ---------- reservas (somente retirada) ---------- */

export function reserve(pieceId: string, userId: string) {
  const piece = data.pieces.find((p) => p.id === pieceId)
  if (!piece || piece.status !== 'disponivel') throw new Error('Esta peça não está mais disponível.')
  const r: Reservation = { id: uid(), pieceId, userId, status: 'ativa', createdAt: Date.now() }
  commit({
    ...data,
    pieces: data.pieces.map((p) => (p.id === pieceId ? { ...p, status: 'reservada' } : p)),
    reservations: [r, ...data.reservations],
  })
  return r
}

export function closeReservation(id: string, status: 'retirada' | 'cancelada') {
  const r = data.reservations.find((x) => x.id === id)
  if (!r || r.status !== 'ativa') return
  commit({
    ...data,
    reservations: data.reservations.map((x) => (x.id === id ? { ...x, status, closedAt: Date.now() } : x)),
    pieces: data.pieces.map((p) =>
      p.id === r.pieceId ? { ...p, status: status === 'retirada' ? 'retirada' : 'disponivel' } : p,
    ),
  })
}

/* ---------- loja ---------- */

export function saveStore(store: StoreInfo) {
  commit({ ...data, store })
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
