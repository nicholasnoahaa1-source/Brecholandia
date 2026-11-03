import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCb)

export const SESSION_DAYS = 30

export const newId = (bytes = 9) => randomBytes(bytes).toString('base64url')

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const key = await scrypt(password, salt, 64)
  return `${salt}:${key.toString('hex')}`
}

export async function verifyPassword(password, stored) {
  const [salt, hex] = String(stored).split(':')
  if (!salt || !hex) return false
  const key = await scrypt(password, salt, 64)
  const expected = Buffer.from(hex, 'hex')
  return expected.length === key.length && timingSafeEqual(expected, key)
}

export function readCookie(req, name) {
  const header = req.headers.cookie
  if (!header) return null
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i > -1 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim())
  }
  return null
}

export function sessionCookie(token, { secure, maxAgeDays = SESSION_DAYS }) {
  const attrs = [`sid=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${Math.round(maxAgeDays * 86400)}`]
  if (secure) attrs.push('Secure')
  return attrs.join('; ')
}

// Limite simples de tentativas de login por IP (memória do processo).
export function attemptLimiter({ max = 10, windowMs = 15 * 60_000 } = {}) {
  const hits = new Map()
  return {
    blocked(key) {
      const now = Date.now()
      const h = hits.get(key)
      if (!h || h.until < now) return false
      return h.count >= max
    },
    fail(key) {
      const now = Date.now()
      const h = hits.get(key)
      if (!h || h.until < now) hits.set(key, { count: 1, until: now + windowMs })
      else h.count++
    },
    reset(key) {
      hits.delete(key)
    },
  }
}
