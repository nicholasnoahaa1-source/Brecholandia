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
    { to: '/retirada', label: 'Como retirar' },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Gerenciar' }] : []),
    user ? { to: '/conta', label: 'Minhas reservas' } : { to: '/entrar', label: 'Entrar' },
  ]

  return (
    <header className="header">
      <p className="strip">Somente retirada na loja. Não fazemos entregas.</p>
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

        <button className="menu-btn" aria-expanded={open} aria-controls="menu-mobile" onClick={() => setOpen((o) => !o)}>
          {open ? 'Fechar' : 'Menu'}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="menu-mobile"
            className="nav-mobile"
            aria-label="Principal"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease } }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
          >
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className="nav-mobile-link">
                {l.label}
              </NavLink>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
