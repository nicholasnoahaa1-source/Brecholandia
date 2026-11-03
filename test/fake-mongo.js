// Banco em memória com o subconjunto da API do driver MongoDB usado pelo servidor.
// Serve só para os testes rodarem sem um MongoDB de verdade.

const clone = (v) => structuredClone(v)

function matchValue(value, cond) {
  if (cond && typeof cond === 'object' && !Array.isArray(cond) && Object.keys(cond).some((k) => k.startsWith('$'))) {
    return Object.entries(cond).every(([op, arg]) => {
      if (op === '$ne') return value !== arg
      if (op === '$in') return arg.includes(value)
      if (op === '$nin') return !arg.includes(value)
      throw new Error(`operador não suportado no fake: ${op}`)
    })
  }
  return value === cond
}
const matches = (doc, query) => Object.entries(query).every(([k, c]) => matchValue(doc[k], c))

class Cursor {
  constructor(docs) { this.docs = docs }
  sort(spec) {
    const [[k, dir]] = Object.entries(spec)
    this.docs.sort((a, b) => (a[k] > b[k] ? dir : a[k] < b[k] ? -dir : 0))
    return this
  }
  limit(n) { this.docs = this.docs.slice(0, n); return this }
  async toArray() { return this.docs.map(clone) }
}

class Collection {
  constructor() { this.docs = [] }
  async findOne(q) { const d = this.docs.find((x) => matches(x, q)); return d ? clone(d) : null }
  find(q = {}) { return new Cursor(this.docs.filter((x) => matches(x, q))) }
  async countDocuments(q = {}) { return this.docs.filter((x) => matches(x, q)).length }
  async insertOne(doc) {
    if (this.docs.some((x) => x._id === doc._id)) throw Object.assign(new Error('dup'), { code: 11000 })
    this.docs.push(clone(doc)); return { insertedId: doc._id }
  }
  async updateOne(q, u, opts = {}) {
    let d = this.docs.find((x) => matches(x, q))
    if (!d && opts.upsert) { d = { ...q }; this.docs.push(d) }
    if (d) Object.assign(d, clone(u.$set))
    return { matchedCount: d ? 1 : 0 }
  }
  async updateMany(q, u) { for (const d of this.docs.filter((x) => matches(x, q))) Object.assign(d, clone(u.$set)) }
  async findOneAndUpdate(q, u) {
    const d = this.docs.find((x) => matches(x, q))
    if (!d) return null
    Object.assign(d, clone(u.$set)); return clone(d)
  }
  async deleteOne(q) { const i = this.docs.findIndex((x) => matches(x, q)); if (i > -1) this.docs.splice(i, 1) }
  async deleteMany(q) { this.docs = this.docs.filter((x) => !matches(x, q)) }
}

export function fakeDb() {
  const cols = new Map()
  return { databaseName: 'teste', collection: (n) => (cols.has(n) || cols.set(n, new Collection()), cols.get(n)) }
}
