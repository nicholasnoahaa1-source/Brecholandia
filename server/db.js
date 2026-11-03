import { MongoClient } from 'mongodb'
import { existsSync } from 'node:fs'
import { ensureIndexes } from './app.js'

// Carrega .env local quando existir (Node 20.12+). Na Vercel as variáveis vêm do painel.
if (existsSync('.env')) process.loadEnvFile('.env')

/**
 * Deixa a MONGODB_URI no formato que o driver aceita, corrigindo os erros mais
 * comuns ao colar o valor na Vercel:
 * - aspas em volta, prefixo "MONGODB_URI=" ou o comando inteiro do mongosh;
 * - senha com @ : / # ? % sem codificar;
 * - senha ainda entre < > (como aparece no modelo do Atlas);
 * - porta junto de mongodb+srv (não é permitido).
 */
export function normalizeMongoUri(raw) {
  const text = String(raw ?? '')
  // Pega só o trecho que começa em mongodb:// ou mongodb+srv:// até um espaço ou aspas.
  const found = /mongodb(?:\+srv)?:\/\/[^\s"'`]+/.exec(text)
  const uri = (found ? found[0] : text).trim()
  // O último @ antes do endereço separa a senha do host (a senha pode ter @ / # :).
  const m = /^(mongodb(?:\+srv)?:\/\/)(.*)@([^@/?#]+)((?:[/?].*)?)$/s.exec(uri)
  if (!m) return uri
  const [, scheme, userinfo, hostPart, rest] = m
  const host = scheme === 'mongodb+srv://' ? hostPart.replace(/:\d+$/, '') : hostPart
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
  let user = i === -1 ? userinfo : userinfo.slice(0, i)
  let pass = i === -1 ? null : userinfo.slice(i + 1)
  if (pass && pass.length > 2 && pass.startsWith('<') && pass.endsWith('>') && pass !== '<db_password>' && pass !== '<password>')
    pass = pass.slice(1, -1)
  user = enc(user)
  const auth = pass === null ? user : `${user}:${enc(pass)}`
  return `${scheme}${auth}@${host}${rest}`
}

/** Motivo legível da falha, sem expor senha nem endereço. */
export function describeDbError(err, raw = process.env.MONGODB_URI) {
  const msg = String(err?.message ?? '')
  const text = String(raw ?? '')
  if (err?.code === 'NO_URI' || !text.trim()) return 'a variável MONGODB_URI não está configurada na Vercel'
  if (/<db_password>|<password>/i.test(text))
    return 'a MONGODB_URI ainda tem o texto <db_password>; troque pela senha do usuário do banco, sem os sinais < >'
  if (!/mongodb(\+srv)?:\/\//.test(text))
    return 'a MONGODB_URI não tem uma string de conexão; ela deve começar com mongodb+srv://'
  if (/mongosh|--username/.test(text) || !/mongodb(\+srv)?:\/\/[^\s"'`/]*@/.test(text))
    return 'a MONGODB_URI está sem usuário e senha; use a string de Connect > Drivers, no formato mongodb+srv://USUARIO:SENHA@...'
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
