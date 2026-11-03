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
  assert.match(describeDbError({ code: 'NO_URI' }), /não está configurada/)
  assert.match(describeDbError({ name: 'MongoParseError' }), /formato inválido/)
  assert.match(describeDbError({ name: 'MongoServerError', code: 18, message: 'bad auth : authentication failed' }), /usuário ou a senha/)
  assert.match(describeDbError({ message: 'querySrv ENOTFOUND _mongodb._tcp.x' }), /não foi encontrado/)
  assert.match(describeDbError({ name: 'MongoServerSelectionError', message: 'Server selection timed out' }), /Network Access/)
})
