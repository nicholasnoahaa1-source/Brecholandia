// Função da Vercel: todas as rotas /api/* chegam aqui (veja vercel.json).
import { createApp } from '../server/app.js'
import { getDb } from '../server/db.js'

let app

export default async function handler(req, res) {
  try {
    if (!app) app = createApp((await getDb()).db, { secureCookies: true })
  } catch (err) {
    console.error(err)
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ error: 'Banco de dados indisponível. Tente de novo em instantes.' }))
  }
  return app(req, res)
}
