import express from 'express'
import { timingSafeEqual } from 'node:crypto'
import { Binary } from 'mongodb'
import { attemptLimiter, hashPassword, newId, readCookie, SESSION_DAYS, sessionCookie, verifyPassword } from './auth.js'

const CONDITIONS = ['nova', 'seminova', 'otimo', 'detalhes']
const STORE_FIELDS = ['address', 'hours', 'contact', 'holdDays', 'payment', 'notes']
const MAX_PHOTOS = 6
const MAX_PHOTO_BYTES = 2 * 1024 * 1024

class HttpError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

const publicUser = (u) => u && { id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role }

const pieceOut = ({ _id, ...p }) => ({ id: _id, ...p })

const resOut = ({ _id, ...r }) => ({ id: _id, ...r })

/**
 * Cria a API. Recebe o banco já conectado para poder ser testada isoladamente.
 * Coleções: users, sessions, pieces, photos, reservations, config.
 */
export function createApp(db, { secureCookies = false, adminEmails = [], adminCode = '' } = {}) {
  const admins = new Set(adminEmails.map((e) => e.toLowerCase()))
  // O papel vem sempre da lista de e-mails, nunca do que está salvo no banco.
  const roleFor = (email) => (admins.has(email) ? 'admin' : 'cliente')
  const codeMatches = (given) => {
    if (!adminCode || typeof given !== 'string') return false
    const a = Buffer.from(given.trim()), b = Buffer.from(adminCode)
    return a.length === b.length && timingSafeEqual(a, b)
  }

  const users = db.collection('users')
  const sessions = db.collection('sessions')
  const pieces = db.collection('pieces')
  const photos = db.collection('photos')
  const reservations = db.collection('reservations')
  const config = db.collection('config')
  const limiter = attemptLimiter()

  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use('/api', express.json({ limit: '4mb' }))

  // Descobre quem está logado a partir do cookie de sessão.
  app.use('/api', async (req, _res, next) => {
    req.user = null
    const sid = readCookie(req, 'sid')
    if (sid) {
      const s = await sessions.findOne({ _id: sid })
      if (s && s.expiresAt > new Date()) req.user = await users.findOne({ _id: s.userId })
      if (req.user) req.user.role = roleFor(req.user.email)
    }
    next()
  })

  const needUser = (req) => {
    if (!req.user) throw new HttpError(401, 'Entre na sua conta para continuar.')
    return req.user
  }
  const needAdmin = (req) => {
    const u = needUser(req)
    if (u.role !== 'admin') throw new HttpError(403, 'Acesso restrito à administração da loja.')
    return u
  }

  async function startSession(res, userId) {
    const token = newId(32)
    await sessions.insertOne({ _id: token, userId, expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) })
    res.setHeader('Set-Cookie', sessionCookie(token, { secure: secureCookies }))
  }

  async function getStore() {
    const doc = await config.findOne({ _id: 'loja' })
    return Object.fromEntries(STORE_FIELDS.map((k) => [k, doc?.[k] ?? '']))
  }

  /* ---------- leitura inicial ---------- */

  app.get('/api/bootstrap', async (req, res) => {
    const admin = req.user?.role === 'admin'
    // Peças já retiradas só aparecem para a administração.
    const query = admin ? {} : { status: { $ne: 'retirada' } }
    const [list, store, userCount] = await Promise.all([
      pieces.find(query).sort({ createdAt: -1 }).toArray(),
      getStore(),
      users.countDocuments({}, { limit: 1 }),
    ])
    res.json({ pieces: list.map(pieceOut), store, user: publicUser(req.user), hasUsers: userCount > 0 })
  })

  /* ---------- contas ---------- */

  app.post('/api/cadastro', async (req, res) => {
    const name = str(req.body?.name, 120)
    const email = str(req.body?.email, 200).toLowerCase()
    const phone = str(req.body?.phone, 40)
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (!name || !phone) throw new HttpError(400, 'Preencha nome e telefone.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'E-mail inválido.')
    if (password.length < 6) throw new HttpError(400, 'A senha precisa ter pelo menos 6 caracteres.')
    if (await users.findOne({ email })) throw new HttpError(409, 'Já existe uma conta com este e-mail.')

    // E-mail da administração é reservado: só cria a conta quem tem o código da loja.
    if (roleFor(email) === 'admin' && !codeMatches(req.body?.adminCode)) {
      if (req.body?.adminCode) limiter.fail(req.ip ?? 'desconhecido')
      if (limiter.blocked(req.ip ?? 'desconhecido')) throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos e tente de novo.')
      if (!adminCode) throw new HttpError(403, 'Este e-mail é reservado à loja. Defina ADMIN_CODE no servidor para criar a conta.')
      throw new HttpError(403, req.body?.adminCode ? 'Código da loja incorreto.' : 'Este e-mail é reservado à loja. Informe o código da loja.', 'codigo_loja')
    }
    const user = {
      _id: newId(),
      name,
      email,
      phone,
      passwordHash: await hashPassword(password),
      role: roleFor(email),
      createdAt: Date.now(),
    }
    try {
      await users.insertOne(user)
    } catch (err) {
      if (err?.code === 11000) throw new HttpError(409, 'Já existe uma conta com este e-mail.')
      throw err
    }
    await startSession(res, user._id)
    res.status(201).json({ user: publicUser(user) })
  })

  app.post('/api/entrar', async (req, res) => {
    const key = req.ip ?? 'desconhecido'
    if (limiter.blocked(key)) throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos e tente de novo.')
    const email = str(req.body?.email, 200).toLowerCase()
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    const user = email ? await users.findOne({ email }) : null
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      limiter.fail(key)
      throw new HttpError(401, 'E-mail ou senha incorretos.')
    }
    limiter.reset(key)
    user.role = roleFor(user.email)
    await startSession(res, user._id)
    res.json({ user: publicUser(user) })
  })

  app.post('/api/sair', async (req, res) => {
    const sid = readCookie(req, 'sid')
    if (sid) await sessions.deleteOne({ _id: sid })
    res.setHeader('Set-Cookie', sessionCookie('', { secure: secureCookies, maxAgeDays: 0 }))
    res.json({ ok: true })
  })

  /* ---------- peças ---------- */

  app.put('/api/pecas/:id', async (req, res) => {
    needAdmin(req)
    const id = str(req.params.id, 40)
    const b = req.body ?? {}
    const price = Number(b.price)
    const colors = Array.isArray(b.colors) ? b.colors.map((c) => str(c, 40)).filter(Boolean).slice(0, 8) : []
    const photoList = Array.isArray(b.photos) ? b.photos.slice(0, MAX_PHOTOS) : []

    if (!str(b.title)) throw new HttpError(400, 'Informe o nome da peça.')
    if (!str(b.category) || !str(b.type)) throw new HttpError(400, 'Informe categoria e tipo de peça.')
    if (!Number.isFinite(price) || price < 0) throw new HttpError(400, 'Informe um preço válido.')
    if (!CONDITIONS.includes(b.condition)) throw new HttpError(400, 'Condição inválida.')
    if (!colors.length) throw new HttpError(400, 'Escolha pelo menos uma cor.')

    const existing = await pieces.findOne({ _id: id })

    // Fotos novas chegam como data URL e viram documentos na coleção "photos".
    const urls = []
    for (const p of photoList) {
      if (typeof p !== 'string') continue
      const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(p)
      if (m) {
        const buf = Buffer.from(m[2], 'base64')
        if (buf.length > MAX_PHOTO_BYTES) throw new HttpError(413, 'Uma das fotos é grande demais.')
        const photoId = newId()
        await photos.insertOne({ _id: photoId, pieceId: id, type: m[1], data: new Binary(buf), createdAt: Date.now() })
        urls.push(`/api/fotos/${photoId}`)
      } else if (p.startsWith('/api/fotos/')) {
        urls.push(p)
      }
    }

    const doc = {
      title: str(b.title, 120),
      category: str(b.category, 40),
      type: str(b.type, 40),
      colors,
      condition: b.condition,
      conditionNotes: str(b.conditionNotes, 1000),
      size: str(b.size, 20),
      brand: str(b.brand, 80),
      measurements: str(b.measurements, 300),
      description: str(b.description, 4000),
      price: Math.round(price * 100) / 100,
      photos: urls,
    }

    if (existing) {
      await pieces.updateOne({ _id: id }, { $set: doc })
    } else {
      await pieces.insertOne({ _id: id, ...doc, status: 'disponivel', createdAt: Date.now() })
    }

    // Remove fotos que saíram da peça.
    const keep = urls.map((u) => u.slice('/api/fotos/'.length))
    await photos.deleteMany({ pieceId: id, _id: { $nin: keep } })

    res.json({ piece: pieceOut(await pieces.findOne({ _id: id })) })
  })

  app.delete('/api/pecas/:id', async (req, res) => {
    needAdmin(req)
    const id = str(req.params.id, 40)
    const piece = await pieces.findOne({ _id: id })
    await pieces.deleteOne({ _id: id })
    await photos.deleteMany({ pieceId: id })
    await reservations.updateMany(
      { pieceId: id, status: 'ativa' },
      { $set: { status: 'cancelada', closedAt: Date.now(), piece: piece ? pieceOut(piece) : null } },
    )
    res.json({ ok: true })
  })

  app.get('/api/fotos/:id', async (req, res) => {
    const photo = await photos.findOne({ _id: str(req.params.id, 40) })
    if (!photo) throw new HttpError(404, 'Foto não encontrada.')
    res.setHeader('Content-Type', photo.type)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.end(Buffer.from(photo.data.buffer ?? photo.data))
  })

  /* ---------- reservas (somente retirada) ---------- */

  async function withDetails(list, includeCustomer) {
    const pieceIds = [...new Set(list.map((r) => r.pieceId))]
    const found = await pieces.find({ _id: { $in: pieceIds } }).toArray()
    const byId = new Map(found.map((p) => [p._id, pieceOut(p)]))
    let customers = new Map()
    if (includeCustomer) {
      const ids = [...new Set(list.map((r) => r.userId))]
      const us = await users.find({ _id: { $in: ids } }).toArray()
      customers = new Map(us.map((u) => [u._id, { name: u.name, phone: u.phone, email: u.email }]))
    }
    return list.map((r) => ({
      ...resOut(r),
      // Se a peça foi excluída, usa a cópia guardada na reserva.
      piece: byId.get(r.pieceId) ?? r.piece ?? null,
      ...(includeCustomer ? { customer: customers.get(r.userId) ?? null } : {}),
    }))
  }

  app.get('/api/reservas', async (req, res) => {
    const user = needUser(req)
    const all = req.query.todas === '1'
    if (all) needAdmin(req)
    const list = await reservations
      .find(all ? {} : { userId: user._id })
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray()
    res.json({ reservations: await withDetails(list, all) })
  })

  app.post('/api/reservas', async (req, res) => {
    const user = needUser(req)
    const pieceId = str(req.body?.pieceId, 40)
    // Operação atômica: só uma pessoa consegue reservar a mesma peça.
    const piece = await pieces.findOneAndUpdate(
      { _id: pieceId, status: 'disponivel' },
      { $set: { status: 'reservada' } },
      { returnDocument: 'after' },
    )
    if (!piece) throw new HttpError(409, 'Esta peça não está mais disponível.')
    const r = { _id: newId(), pieceId, userId: user._id, status: 'ativa', createdAt: Date.now() }
    await reservations.insertOne(r)
    const [out] = await withDetails([r], false)
    res.status(201).json({ reservation: out })
  })

  app.post('/api/reservas/:id/fechar', async (req, res) => {
    const user = needUser(req)
    const status = req.body?.status
    if (status !== 'retirada' && status !== 'cancelada') throw new HttpError(400, 'Situação inválida.')
    const admin = user.role === 'admin'
    // Cliente só pode cancelar a própria reserva. Marcar como retirada é da loja.
    if (status === 'retirada' && !admin) throw new HttpError(403, 'Só a loja marca a peça como retirada.')
    const filter = { _id: str(req.params.id, 40), status: 'ativa', ...(admin ? {} : { userId: user._id }) }
    const r = await reservations.findOneAndUpdate(filter, { $set: { status, closedAt: Date.now() } }, { returnDocument: 'after' })
    if (!r) throw new HttpError(404, 'Reserva não encontrada ou já encerrada.')
    await pieces.updateOne({ _id: r.pieceId }, { $set: { status: status === 'retirada' ? 'retirada' : 'disponivel' } })
    res.json({ ok: true })
  })

  /* ---------- dados da loja ---------- */

  app.put('/api/loja', async (req, res) => {
    needAdmin(req)
    const store = Object.fromEntries(STORE_FIELDS.map((k) => [k, str(req.body?.[k], 1000)]))
    await config.updateOne({ _id: 'loja' }, { $set: store }, { upsert: true })
    res.json({ store })
  })

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Rota não encontrada.')))

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Envio grande demais. Use fotos menores.' })
    const status = err instanceof HttpError ? err.status : 500
    if (status === 500) console.error(err)
    res.status(status).json({ error: status === 500 ? 'Erro no servidor. Tente de novo.' : err.message, ...(err?.code && status !== 500 ? { code: err.code } : {}) })
  })

  return app
}

export async function ensureIndexes(db) {
  await Promise.all([
    db.collection('users').createIndex({ email: 1 }, { unique: true }),
    db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('pieces').createIndex({ status: 1, createdAt: -1 }),
    db.collection('photos').createIndex({ pieceId: 1 }),
    db.collection('reservations').createIndex({ userId: 1, createdAt: -1 }),
    db.collection('reservations').createIndex({ pieceId: 1, status: 1 }),
  ])
}
