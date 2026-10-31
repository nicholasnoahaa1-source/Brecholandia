// Servidor para rodar localmente ou numa hospedagem Node comum.
// Na Vercel quem atende é api/index.js.
import express from 'express'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { getDb } from './db.js'

const { client, db } = await getDb().catch((err) => {
  console.error(err.message)
  process.exit(1)
})

const app = createApp(db, { secureCookies: process.env.NODE_ENV === 'production' })

// Em produção, o mesmo servidor entrega o site já compilado (pasta dist/).
const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
if (existsSync(dist)) app.use(express.static(dist, { index: 'index.html', maxAge: '1h' }))

const port = Number(process.env.PORT) || 3001
app.listen(port, () => console.log(`Brecholândia na porta ${port}, banco "${db.databaseName}"`))

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => client.close().finally(() => process.exit(0)))
