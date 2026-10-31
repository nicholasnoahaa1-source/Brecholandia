import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useCurrentUser } from '../lib/db'
import { ease, spring } from '../lib/motion'
import Logo from './Logo'

export default function Header() {
  const user = useCurrentUser()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])

  const links = [
    { to: '/catalogo', label: 'Catálogo' },
    { to: '/retirada', label: 'Retirada' },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Gerenciar' }] : []),
    user ? { to: '/conta', label: user.name.split(' ')[0] || 'Minha conta' } : { to: '/entrar', label: 'Entrar' },
  ]

  return (
    <header className="header">
      <div className="strip">
        <span>Somente retirada na loja</span>
        <span aria-hidden>/</span>
        <span>Não fazemos entregas</span>
      </div>
      <div className="header-row wrap">
        <NavLink to="/" className="brand" aria-label="Brecholândia, início">
          <Logo />
          <span className="brand-name">
            Brecho<em>lândia</em>
          </span>
        </NavLink>

        <nav className="nav-desktop" aria-label="Principal">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className="nav-link">
              {({ isActive }) => (
                <>
                  {l.label}
                  {isActive && <motion.span layoutId="nav-mark" className="nav-mark" transition={spring} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <button
          className="menu-btn"
          aria-expanded={open}
          aria-controls="menu-mobile"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="mono">{open ? 'Fechar' : 'Menu'}</span>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="menu-mobile"
            className="nav-mobile"
            aria-label="Principal"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease } }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.18 } }}
          >
            {links.map((l, i) => (
              <motion.div
                key={l.to}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.04 * i, duration: 0.35, ease } }}
              >
                <NavLink to={l.to} className="nav-mobile-link">
                  <span className="mono">0{i + 1}</span>
                  {l.label}
                </NavLink>
              </motion.div>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
