import { Link } from 'react-router-dom'
import { useDB } from '../lib/db'

export default function Footer() {
  const store = useDB((d) => d.store)
  const rows = [
    ['Endereço de retirada', store.address],
    ['Horário', store.hours],
    ['Contato', store.contact],
  ].filter(([, v]) => v.trim())

  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        <p className="footer-word" aria-hidden>
          Brecho<em>lândia</em>
        </p>
        <dl className="footer-info">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="mono">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
          <div>
            <dt className="mono">Entrega</dt>
            <dd>Não fazemos. Toda peça é retirada na loja.</dd>
          </div>
        </dl>
        <nav className="footer-nav" aria-label="Rodapé">
          <Link to="/catalogo">Catálogo</Link>
          <Link to="/retirada">Como funciona a retirada</Link>
          <Link to="/conta">Minhas reservas</Link>
        </nav>
      </div>
    </footer>
  )
}
