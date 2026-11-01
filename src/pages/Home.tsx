import { motion } from 'motion/react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Rail from '../components/Rail'
import { useCurrentUser, useDB } from '../lib/db'
import { ease } from '../lib/motion'
import { CATEGORIES } from '../lib/taxonomy'

export default function Home() {
  const pieces = useDB((d) => d.pieces)
  const ready = useDB((d) => d.ready)
  const user = useCurrentUser()

  const available = useMemo(() => pieces.filter((p) => p.status === 'disponivel'), [pieces])
  const latest = useMemo(() => [...available].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6), [available])

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <h1 className="hero-word">
            Brecho<span>lândia</span>
          </h1>
          <div className="hero-side">
            <p className="hero-lede">Peças de segunda mão, uma de cada. Você reserva pelo site e retira na loja.</p>
            <div className="hero-actions">
              <Link className="btn" to="/catalogo">
                Ver o catálogo{ready && available.length > 0 ? ` (${available.length})` : ''}
              </Link>
              {!user && (
                <Link className="link-btn" to="/entrar">
                  Entrar ou criar conta
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="wrap">
          <Rail pieces={latest} ready={ready} />
        </div>
      </section>

      {pieces.length === 0 && ready && user?.role === 'admin' && (
        <section className="wrap admin-hint">
          <p className="display-s">O catálogo está vazio. Cadastre as peças e preencha endereço e horário de retirada.</p>
          <div className="hero-actions">
            <Link className="btn" to="/admin/peca/nova">
              Cadastrar peça
            </Link>
            <Link className="link-btn" to="/admin?aba=loja">
              Preencher dados da loja
            </Link>
          </div>
        </section>
      )}

      <section className="cats" aria-labelledby="cats-title">
        <div className="wrap">
          <h2 id="cats-title" className="cats-title">
            Procurar por categoria
          </h2>
          <ul className="cats-list">
            {CATEGORIES.map((c) => {
              const n = available.filter((p) => p.category === c).length
              return (
                <li key={c}>
                  <motion.div initial="rest" animate="rest" whileHover="hover">
                    <Link to={`/catalogo?cat=${encodeURIComponent(c)}`} className="cat-link">
                      <motion.span
                        className="cat-fill"
                        aria-hidden
                        variants={{ rest: { scaleX: 0 }, hover: { scaleX: 1 } }}
                        transition={{ duration: 0.3, ease }}
                      />
                      <span className="cat-name">{c}</span>
                      <span className="cat-n">{!ready ? '' : n === 0 ? 'nenhuma peça agora' : n === 1 ? '1 peça' : `${n} peças`}</span>
                    </Link>
                  </motion.div>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <section className="band">
        <div className="wrap band-grid">
          <p className="band-big">Não entregamos.</p>
          <div>
            <p>Toda reserva é retirada pessoalmente na loja. Veja endereço, horários e prazo antes de reservar.</p>
            <Link to="/retirada" className="btn btn-dark">
              Ver como funciona a retirada
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
