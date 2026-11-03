import { MongoClient } from 'mongodb'
import { existsSync } from 'node:fs'
import { ensureIndexes } from './app.js'

// Carrega .env local quando existir (Node 20.12+). Na Vercel as variáveis vêm do painel.
if (existsSync('.env')) process.loadEnvFile('.env')

let cached

/** Uma conexão por processo, reaproveitada entre requisições (importante na Vercel). */
export function getDb() {
  cached ??= (async () => {
    const uri = process.env.MONGODB_URI
    if (!uri) throw new Error('Defina MONGODB_URI (veja .env.example).')
    const client = new MongoClient(uri, { maxPoolSize: 5 })
    await client.connect()
    const db = client.db(process.env.MONGODB_DB || 'brecholandia')
    await ensureIndexes(db)
    return { client, db }
  })().catch((err) => {
    cached = undefined
    throw err
  })
  return cached
}
