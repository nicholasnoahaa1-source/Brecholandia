import { AnimatePresence, motion } from 'motion/react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, type ReactNode } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Catalog from './pages/Catalog'
import PieceDetail from './pages/PieceDetail'
import Auth from './pages/Auth'
import Account from './pages/Account'
import Pickup from './pages/Pickup'
import Admin from './pages/admin/Admin'
import PieceForm from './pages/admin/PieceForm'
import { useCurrentUser, useDB } from './lib/db'
import { page } from './lib/motion'

function Page({ children }: { children: ReactNode }) {
  return (
    <motion.main variants={page} initial="initial" animate="enter" exit="exit" className="page">
      {children}
    </motion.main>
  )
}

function RequireUser({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const user = useCurrentUser()
  const ready = useDB((d) => d.ready)
  const loc = useLocation()
  if (!ready) return <p className="wrap loading">Carregando…</p>
  if (!user) return <Navigate to={`/entrar?volta=${encodeURIComponent(loc.pathname)}`} replace />
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const location = useLocation()
  const offline = useDB((d) => d.offline)

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <>
      <a className="skip" href="#conteudo">Pular para o conteúdo</a>
      <Header />
      {offline && (
        <p className="offline" role="alert">
          Não foi possível falar com o servidor. Recarregue a página em instantes.
        </p>
      )}
      <div id="conteudo">
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Page><Home /></Page>} />
            <Route path="/catalogo" element={<Page><Catalog /></Page>} />
            <Route path="/peca/:id" element={<Page><PieceDetail /></Page>} />
            <Route path="/retirada" element={<Page><Pickup /></Page>} />
            <Route path="/entrar" element={<Page><Auth /></Page>} />
            <Route path="/conta" element={<RequireUser><Page><Account /></Page></RequireUser>} />
            <Route path="/admin" element={<RequireUser admin><Page><Admin /></Page></RequireUser>} />
            <Route path="/admin/peca/:id" element={<RequireUser admin><Page><PieceForm /></Page></RequireUser>} />
            <Route path="*" element={<Page><NotFound /></Page>} />
          </Routes>
        </AnimatePresence>
      </div>
      <Footer />
    </>
  )
}

function NotFound() {
  return (
    <section className="wrap empty-state">
      <h1 className="display-m">Esta página não está no cabide.</h1>
      <a className="btn" href="#/catalogo">Ver o catálogo</a>
    </section>
  )
}
