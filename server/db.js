import { MongoClient } from 'mongodb'
import { existsSync } from 'node:fs'
import { ensureIndexes } from './app.js'

// Carrega .env local quando existir (Node 20.12+). Na Vercel as variáveis vêm do painel.
if (existsSync('.env')) process.loadEnvFile('.env')

/**
 * Senhas com @ : / # ? % quebram a string de conexão se não forem codificadas.
 * Aqui o usuário e a senha são codificados automaticamente (o que já estiver
 * codificado continua igual).
 */
export function normalizeMongoUri(raw) {
  const uri = String(raw ?? '').trim()
  // O último @ antes do endereço separa a senha do host (a senha pode ter @ / # :).
  const m = /^(mongodb(?:\+srv)?:\/\/)(.*)@([^@/?#]+)((?:[/?].*)?)$/s.exec(uri)
  if (!m) return uri
  const [, scheme, userinfo, host, rest] = m
  const i = userinfo.indexOf(':')
  const enc = (s) => {
    let v = s
    try {
      v = decodeURIComponent(s)
    } catch {
      /* tinha % solto: usa como está */
    }
    return encodeURIComponent(v)
  }
  const auth = i === -1 ? enc(userinfo) : `${enc(userinfo.slice(0, i))}:${enc(userinfo.slice(i + 1))}`
  return `${scheme}${auth}@${host}${rest}`
}

/** Motivo legível da falha, sem expor senha nem endereço. */
export function describeDbError(err) {
  const msg = String(err?.message ?? '')
  if (err?.code === 'NO_URI') return 'a variável MONGODB_URI não está configurada na Vercel'
  if (err?.name === 'MongoParseError') return 'a MONGODB_URI está em formato inválido'
  if (err?.code === 18 || /auth|authentication/i.test(msg)) return 'o Atlas recusou o usuário ou a senha da MONGODB_URI'
  if (/ENOTFOUND|querySrv/i.test(msg)) return 'o endereço do cluster na MONGODB_URI não foi encontrado'
  if (/ServerSelection|timed out|ECONNREFUSED/i.test(err?.name + msg)) return 'o Atlas não respondeu (confira o Network Access)'
  return 'erro desconhecido ao conectar (veja os logs da Vercel)'
}

let cached

/** Uma conexão por processo, reaproveitada entre requisições (importante na Vercel). */
export function getDb() {
  cached ??= (async () => {
    if (!process.env.MONGODB_URI) throw Object.assign(new Error('MONGODB_URI não definida'), { code: 'NO_URI' })
    const client = new MongoClient(normalizeMongoUri(process.env.MONGODB_URI), {
      maxPoolSize: 5,
      // Falha rápido em vez de deixar a página esperando 30 s.
      serverSelectionTimeoutMS: 8000,
    })
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
