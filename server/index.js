import express from 'express'
import { MongoClient } from 'mongodb'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp, ensureIndexes } from './app.js'

// Carrega .env local quando existir (Node 20.12+).
if (existsSync('.env')) process.loadEnvFile('.env')

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('Defina MONGODB_URI (veja .env.example).')
  process.exit(1)
}

const client = new MongoClient(uri)
await client.connect()
const db = client.db(process.env.MONGODB_DB || 'brecholandia')
await ensureIndexes(db)

const production = process.env.NODE_ENV === 'production'
const app = createApp(db, { secureCookies: production })

// Em produção, o mesmo servidor entrega o site já compilado (pasta dist/).
const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist, { index: 'index.html', maxAge: '1h' }))
}

const port = Number(process.env.PORT) || 3001
app.listen(port, () => console.log(`Brecholândia na porta ${port}, banco "${db.databaseName}"`))

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => client.close().finally(() => process.exit(0)))
