import { motion, useScroll, useTransform } from 'motion/react'
import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import PieceCard from '../components/PieceCard'
import { useCurrentUser, useDB } from '../lib/db'
import { ease, rise, spring, stagger } from '../lib/motion'
import { CATEGORIES } from '../lib/taxonomy'

export default function Home() {
  const pieces = useDB((d) => d.pieces)
  const ready = useDB((d) => d.ready)
  const user = useCurrentUser()
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const wordY = useTransform(scrollYProgress, [0, 1], [0, 80])

  const available = useMemo(() => pieces.filter((p) => p.status === 'disponivel'), [pieces])
  const latest = useMemo(() => [...available].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8), [available])

  const letters = 'Brecho'.split('')

  return (
    <>
      <section className="hero" ref={heroRef}>
        <div className="wrap hero-grid">
          <motion.h1 className="hero-word" style={{ y: wordY }} aria-label="Brecholândia">
            <span className="hero-line" aria-hidden>
              {letters.map((l, i) => (
                <motion.span
                  key={i}
                  initial={{ y: '105%' }}
                  animate={{ y: 0, transition: { delay: 0.04 * i, duration: 0.7, ease } }}
                >
                  {l}
                </motion.span>
              ))}
            </span>
            <span className="hero-line hero-line-2" aria-hidden>
              <motion.span initial={{ y: '105%' }} animate={{ y: 0, transition: { delay: 0.3, duration: 0.7, ease } }}>
                lândia
              </motion.span>
            </span>
          </motion.h1>

          <motion.div
            className="hero-side"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.55, duration: 0.6, ease } }}
          >
            <p className="hero-lede">
              Peças de segunda mão, uma de cada. Você reserva pelo site e retira na loja.
            </p>
            <motion.span
              className="hero-stamp"
              initial={{ rotate: -14, scale: 1.3, opacity: 0 }}
              animate={{ rotate: -6, scale: 1, opacity: 1, transition: { delay: 0.8, ...spring } }}
            >
              Somente
              <br />
              retirada
            </motion.span>
            <div className="hero-actions">
              <Link className="btn" to="/catalogo">
                Abrir o catálogo
              </Link>
              {!user && (
                <Link className="link-btn" to="/entrar">
                  Entrar ou criar conta
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="cats">
        <div className="wrap">
          <p className="mono cats-label">Por categoria</p>
          <motion.ul className="cats-list" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
            {CATEGORIES.map((c) => {
              const n = available.filter((p) => p.category === c).length
              return (
                <motion.li key={c} variants={rise}>
                  <Link to={`/catalogo?cat=${encodeURIComponent(c)}`} className="cat-link">
                    <motion.span className="cat-fill" aria-hidden initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} transition={{ duration: 0.35, ease }} />
                    <span className="cat-name">{c}</span>
                    <span className="mono cat-n">{!ready ? '' : n === 1 ? '1 peça' : `${n} peças`}</span>
                    <span className="cat-arrow" aria-hidden>
                      →
                    </span>
                  </Link>
                </motion.li>
              )
            })}
          </motion.ul>
        </div>
      </section>

      {latest.length > 0 && (
        <section className="wrap latest">
          <div className="latest-head">
            <h2 className="display-m">Entraram por último</h2>
            <Link to="/catalogo" className="link-btn">
              Ver todas as {available.length}
            </Link>
          </div>
          <div className="grid grid-home">
            {latest.map((p) => (
              <PieceCard key={p.id} piece={p} />
            ))}
          </div>
        </section>
      )}

      {pieces.length === 0 && user?.role === 'admin' && (
        <section className="wrap admin-hint">
          <p className="mono">Só você vê este aviso</p>
          <p className="display-s">O catálogo está vazio. Cadastre as peças e preencha endereço e horário de retirada.</p>
          <div className="hero-actions">
            <Link className="btn" to="/admin/peca/nova">
              Cadastrar peça
            </Link>
            <Link className="link-btn" to="/admin?aba=loja">
              Dados da loja
            </Link>
          </div>
        </section>
      )}

      <section className="band">
        <div className="wrap band-grid">
          <p className="band-big">Não entregamos.</p>
          <div>
            <p>Toda reserva é retirada pessoalmente na loja. Veja endereço, horários e prazo antes de reservar.</p>
            <Link to="/retirada" className="btn btn-dark">
              Como funciona a retirada
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
