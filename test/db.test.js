import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MongoClient } from 'mongodb'
import { describeDbError, normalizeMongoUri } from '../server/db.js'

test('senha com caracteres especiais é codificada', () => {
  const u = normalizeMongoUri('mongodb+srv://usuario:ab@c#d:e/f@cluster0.abc.mongodb.net/?retryWrites=true&w=majority')
  assert.equal(u, 'mongodb+srv://usuario:ab%40c%23d%3Ae%2Ff@cluster0.abc.mongodb.net/?retryWrites=true&w=majority')
  // Aceita pelo driver (não lança erro de formato).
  assert.doesNotThrow(() => new MongoClient(u))
})

test('string já codificada ou sem senha não muda', () => {
  const ok = 'mongodb+srv://usuario:ab%40c@cluster0.abc.mongodb.net/?retryWrites=true'
  assert.equal(normalizeMongoUri(ok), ok)
  assert.equal(normalizeMongoUri('mongodb://localhost:27017/x'), 'mongodb://localhost:27017/x')
  assert.equal(normalizeMongoUri('  mongodb://u:p@h/ '), 'mongodb://u:p@h/')
})

test('motivos da falha são legíveis', () => {
  assert.match(describeDbError({ code: 'NO_URI' }, ''), /não está configurada/)
  assert.match(describeDbError({ name: 'MongoParseError' }, 'mongodb://u:p@h/'), /formato inválido/)
  assert.match(describeDbError({ name: 'MongoServerError', code: 18, message: 'bad auth : authentication failed' }, 'mongodb://u:p@h/'), /usuário ou a senha/)
  assert.match(describeDbError({ message: 'querySrv ENOTFOUND _mongodb._tcp.x' }, 'mongodb://u:p@h/'), /não foi encontrado/)
  assert.match(describeDbError({ name: 'MongoServerSelectionError', message: 'Server selection timed out' }, 'mongodb://u:p@h/'), /Network Access/)
})

test('valor colado com aspas, prefixo ou comando do mongosh é limpo', () => {
  const H = 'cluster0.abc.mongodb.net'
  const certo = `mongodb+srv://usuario:Ab1@${H}/?retryWrites=true`
  assert.equal(normalizeMongoUri(`"${certo}"`), certo)
  assert.equal(normalizeMongoUri(`MONGODB_URI=${certo}`), certo)
  assert.equal(normalizeMongoUri(`'${certo}'\n`), certo)
  // senha ainda entre < > e porta junto de +srv
  assert.equal(normalizeMongoUri(`mongodb+srv://usuario:<Ab1>@${H}/?retryWrites=true`), certo)
  assert.equal(normalizeMongoUri(`mongodb+srv://usuario:Ab1@${H}:27017/?retryWrites=true`), certo)
  for (const v of [`"${certo}"`, `MONGODB_URI=${certo}`]) assert.doesNotThrow(() => new MongoClient(normalizeMongoUri(v)))
})

test('motivo aponta o que corrigir na MONGODB_URI', () => {
  const parse = { name: 'MongoParseError', message: 'x' }
  assert.match(describeDbError(parse, 'mongodb+srv://u:<db_password>@h.x.net/'), /<db_password>/)
  assert.match(describeDbError(parse, 'cluster0.abc.mongodb.net'), /deve começar com mongodb\+srv/)
  assert.match(describeDbError(parse, 'mongosh "mongodb+srv://h.x.net/" --username u'), /sem usuário e senha/)
  assert.match(describeDbError({ code: 18, message: 'bad auth' }, 'mongodb+srv://u:p@h.x.net/'), /recusou/)
})
