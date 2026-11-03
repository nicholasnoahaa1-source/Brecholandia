import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createApp } from '../server/app.js'
import { fakeDb } from './fake-mongo.js'

let server
let base

before(async () => {
  server = createApp(fakeDb(), { adminEmails: ['loja@x.com'], adminCode: 'codigo-da-loja' }).listen(0)
  await new Promise((r) => server.once('listening', r))
  base = `http://127.0.0.1:${server.address().port}/api`
})
after(() => server.close())

// Cliente simples que guarda o cookie de sessão, como um navegador.
function client() {
  let cookie = ''
  return async (path, { method = 'GET', body } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const set = res.headers.get('set-cookie')
    if (set) cookie = set.split(';')[0]
    const ct = res.headers.get('content-type') ?? ''
    return { status: res.status, body: ct.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer()), ct }
  }
}

const admin = client()
const ana = client()
const bia = client()
const anon = client()

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
const piece = {
  title: 'Jaqueta jeans',
  category: 'Feminino',
  type: 'Jaqueta',
  colors: ['jeans'],
  condition: 'otimo',
  conditionNotes: '',
  size: 'M',
  brand: '',
  measurements: '',
  description: '',
  price: 89.9,
  photos: [PIXEL],
}

test('só o e-mail da loja administra, e criar essa conta exige o código', async () => {
  let r = await anon('/bootstrap')
  assert.equal(r.body.user, null)

  // A primeira conta criada não vira administradora.
  r = await ana('/cadastro', { method: 'POST', body: { name: 'Ana', email: 'ana@x.com', phone: '2', password: 'segredo2' } })
  assert.equal(r.status, 201)
  assert.equal(r.body.user.role, 'cliente')

  // Ninguém se cadastra com o e-mail da loja sem o código.
  const intruso = client()
  r = await intruso('/cadastro', { method: 'POST', body: { name: 'X', email: 'loja@x.com', phone: '1', password: 'segredo1' } })
  assert.equal(r.status, 403)
  assert.equal(r.body.code, 'codigo_loja')
  r = await intruso('/cadastro', { method: 'POST', body: { name: 'X', email: 'loja@x.com', phone: '1', password: 'segredo1', adminCode: 'chute' } })
  assert.equal(r.status, 403)

  r = await admin('/cadastro', { method: 'POST', body: { name: 'Loja', email: 'LOJA@x.com', phone: '1', password: 'segredo1', adminCode: 'codigo-da-loja' } })
  assert.equal(r.status, 201)
  assert.equal(r.body.user.role, 'admin')
  assert.equal(r.body.user.email, 'loja@x.com')
  assert.equal(r.body.user.passwordHash, undefined)
  await bia('/cadastro', { method: 'POST', body: { name: 'Bia', email: 'bia@x.com', phone: '3', password: 'segredo3' } })

  r = await anon('/cadastro', { method: 'POST', body: { name: 'X', email: 'ana@x.com', phone: '2', password: 'segredo2' } })
  assert.equal(r.status, 409)
})

test('login confere a senha', async () => {
  const c = client()
  assert.equal((await c('/entrar', { method: 'POST', body: { email: 'ana@x.com', password: 'errada' } })).status, 401)
  const r = await c('/entrar', { method: 'POST', body: { email: 'ana@x.com', password: 'segredo2' } })
  assert.equal(r.status, 200)
  assert.equal((await c('/bootstrap')).body.user.name, 'Ana')
  await c('/sair', { method: 'POST' })
  assert.equal((await c('/bootstrap')).body.user, null)
})

test('só a administração cadastra peças, e a foto é servida pela API', async () => {
  assert.equal((await ana('/pecas/p1', { method: 'PUT', body: piece })).status, 403)
  assert.equal((await anon('/pecas/p1', { method: 'PUT', body: piece })).status, 401)
  assert.equal((await admin('/pecas/p1', { method: 'PUT', body: { ...piece, colors: [] } })).status, 400)

  const r = await admin('/pecas/p1', { method: 'PUT', body: piece })
  assert.equal(r.status, 200)
  assert.equal(r.body.piece.status, 'disponivel')
  assert.match(r.body.piece.photos[0], /^\/api\/fotos\//)

  const foto = await anon(r.body.piece.photos[0].slice(4))
  assert.equal(foto.status, 200)
  assert.equal(foto.ct, 'image/png')
  assert.ok(foto.body.length > 0)

  const list = await anon('/bootstrap')
  assert.equal(list.body.pieces.length, 1)
})

test('reserva é exclusiva e somente com login', async () => {
  assert.equal((await anon('/reservas', { method: 'POST', body: { pieceId: 'p1' } })).status, 401)
  const r = await ana('/reservas', { method: 'POST', body: { pieceId: 'p1' } })
  assert.equal(r.status, 201)
  assert.equal(r.body.reservation.piece.status, 'reservada')

  // Outra pessoa não consegue reservar a mesma peça.
  assert.equal((await bia('/reservas', { method: 'POST', body: { pieceId: 'p1' } })).status, 409)

  // Cliente vê só as próprias reservas e não pode listar todas.
  assert.equal((await ana('/reservas')).body.reservations.length, 1)
  assert.equal((await bia('/reservas')).body.reservations.length, 0)
  assert.equal((await ana('/reservas?todas=1')).status, 403)

  const all = await admin('/reservas?todas=1')
  assert.equal(all.body.reservations[0].customer.name, 'Ana')
})

test('cliente não marca retirada nem cancela reserva de outra pessoa', async () => {
  const id = (await ana('/reservas')).body.reservations[0].id
  assert.equal((await ana(`/reservas/${id}/fechar`, { method: 'POST', body: { status: 'retirada' } })).status, 403)
  assert.equal((await bia(`/reservas/${id}/fechar`, { method: 'POST', body: { status: 'cancelada' } })).status, 404)
})

test('cancelar devolve a peça; retirar tira do catálogo público', async () => {
  let id = (await ana('/reservas')).body.reservations[0].id
  assert.equal((await ana(`/reservas/${id}/fechar`, { method: 'POST', body: { status: 'cancelada' } })).status, 200)
  assert.equal((await anon('/bootstrap')).body.pieces[0].status, 'disponivel')

  id = (await bia('/reservas', { method: 'POST', body: { pieceId: 'p1' } })).body.reservation.id
  assert.equal((await admin(`/reservas/${id}/fechar`, { method: 'POST', body: { status: 'retirada' } })).status, 200)
  assert.equal((await anon('/bootstrap')).body.pieces.length, 0)
  assert.equal((await admin('/bootstrap')).body.pieces[0].status, 'retirada')
  // O histórico continua mostrando a peça.
  assert.equal((await bia('/reservas')).body.reservations[0].piece.title, 'Jaqueta jeans')
})

test('dados da loja: só a administração altera, campos vazios ficam vazios', async () => {
  assert.equal((await ana('/loja', { method: 'PUT', body: { address: 'x' } })).status, 403)
  await admin('/loja', { method: 'PUT', body: { address: 'Rua Teste, 1', hours: '' } })
  const s = (await anon('/bootstrap')).body.store
  assert.equal(s.address, 'Rua Teste, 1')
  assert.equal(s.hours, '')
})

test('excluir peça apaga as fotos e cancela reserva ativa', async () => {
  const p = (await admin('/pecas/p2', { method: 'PUT', body: { ...piece, title: 'Saia' } })).body.piece
  await ana('/reservas', { method: 'POST', body: { pieceId: 'p2' } })
  assert.equal((await admin('/pecas/p2', { method: 'DELETE' })).status, 200)
  assert.equal((await anon(p.photos[0].slice(4))).status, 404)
  const r = (await ana('/reservas')).body.reservations.find((x) => x.pieceId === 'p2')
  assert.equal(r.status, 'cancelada')
  assert.equal(r.piece.title, 'Saia')
})

test('sem ADMIN_CODE configurado, ninguém cria a conta da loja', async () => {
  const srv = createApp(fakeDb(), { adminEmails: ['loja@x.com'] }).listen(0)
  await new Promise((r) => srv.once('listening', r))
  const res = await fetch(`http://127.0.0.1:${srv.address().port}/api/cadastro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'X', email: 'loja@x.com', phone: '1', password: 'segredo1', adminCode: '' }),
  })
  assert.equal(res.status, 403)
  srv.close()
})

test('papel salvo no banco não vale: conta antiga marcada como admin vira cliente', async () => {
  const db = fakeDb()
  const srv = createApp(db, { adminEmails: ['loja@x.com'], adminCode: 'c' }).listen(0)
  await new Promise((r) => srv.once('listening', r))
  const url = `http://127.0.0.1:${srv.address().port}/api`
  let res = await fetch(`${url}/cadastro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Velha', email: 'velha@x.com', phone: '1', password: 'segredo1' }),
  })
  const cookie = res.headers.get('set-cookie').split(';')[0]
  await db.collection('users').updateOne({ email: 'velha@x.com' }, { $set: { role: 'admin' } })
  res = await fetch(`${url}/bootstrap`, { headers: { Cookie: cookie } })
  assert.equal((await res.json()).user.role, 'cliente')
  res = await fetch(`${url}/loja`, { method: 'PUT', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: '{}' })
  assert.equal(res.status, 403)
  srv.close()
})

test('cliente edita nome e telefone e troca a senha', async () => {
  let r = await ana('/conta', { method: 'PUT', body: { name: 'Ana Souza', phone: '99' } })
  assert.equal(r.status, 200)
  assert.equal((await ana('/bootstrap')).body.user.name, 'Ana Souza')
  assert.equal((await ana('/conta', { method: 'PUT', body: { name: '', phone: '99' } })).status, 400)

  assert.equal((await ana('/conta/senha', { method: 'POST', body: { current: 'errada', next: 'novasenha' } })).status, 400)
  assert.equal((await ana('/conta/senha', { method: 'POST', body: { current: 'segredo2', next: '123' } })).status, 400)
  r = await ana('/conta/senha', { method: 'POST', body: { current: 'segredo2', next: 'novasenha' } })
  assert.equal(r.status, 200)
  // A sessão atual continua valendo e a senha nova funciona.
  assert.equal((await ana('/bootstrap')).body.user.email, 'ana@x.com')
  const c = client()
  assert.equal((await c('/entrar', { method: 'POST', body: { email: 'ana@x.com', password: 'segredo2' } })).status, 401)
  assert.equal((await c('/entrar', { method: 'POST', body: { email: 'ana@x.com', password: 'novasenha' } })).status, 200)
  assert.equal((await anon('/conta', { method: 'PUT', body: { name: 'x', phone: '1' } })).status, 401)
})

test('loja marca peça vendida no balcão e devolve ao catálogo', async () => {
  await admin('/pecas/p3', { method: 'PUT', body: { ...piece, title: 'Blusa', photos: [] } })
  assert.equal((await ana('/pecas/p3/situacao', { method: 'POST', body: { status: 'retirada' } })).status, 403)
  let r = await admin('/pecas/p3/situacao', { method: 'POST', body: { status: 'retirada' } })
  assert.equal(r.body.piece.status, 'retirada')
  assert.ok(!(await anon('/bootstrap')).body.pieces.some((p) => p.id === 'p3'))
  await admin('/pecas/p3/situacao', { method: 'POST', body: { status: 'disponivel' } })
  assert.ok((await anon('/bootstrap')).body.pieces.some((p) => p.id === 'p3'))
  // Com reserva ativa, não dá para mudar por aqui.
  await bia('/reservas', { method: 'POST', body: { pieceId: 'p3' } })
  assert.equal((await admin('/pecas/p3/situacao', { method: 'POST', body: { status: 'retirada' } })).status, 409)
})
