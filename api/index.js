// Função da Vercel: todas as rotas /api/* chegam aqui (veja vercel.json).
import { createApp } from '../server/app.js'
import { describeDbError, getDb } from '../server/db.js'
import { appConfig } from '../server/config.js'

let app

export default async function handler(req, res) {
  try {
    if (!app) app = createApp((await getDb()).db, { secureCookies: true, ...appConfig() })
  } catch (err) {
    console.error(err)
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ error: `Banco de dados indisponível: ${describeDbError(err)}.` }))
  }
  return app(req, res)
}
