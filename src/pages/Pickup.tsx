import { Link } from 'react-router-dom'
import { useCurrentUser, useDB } from '../lib/db'
import { useTitle } from '../lib/useTitle'

export default function Pickup() {
  const store = useDB((d) => d.store)
  const user = useCurrentUser()
  useTitle('Como retirar')

  const steps = [
    ['Escolha no catálogo', 'Filtre por categoria, tipo de peça, cor, tamanho, condição e preço.'],
    ['Reserve com a sua conta', 'Entre ou crie uma conta e toque em “Reservar para retirada”. A peça fica reservada no seu nome e ninguém mais consegue reservá-la.'],
    ['Retire na loja', 'Não fazemos entregas nem envios. A peça reservada é retirada na loja.'],
  ]

  const info = [
    ['Endereço', store.address],
    ['Horário de retirada', store.hours],
    ['Prazo para retirar', store.holdDays && `${store.holdDays} dia(s) após a reserva`],
    ['Pagamento', store.payment],
    ['Contato', store.contact],
    ['Observações', store.notes],
  ].filter(([, v]) => v && v.trim())

  return (
    <div className="wrap pickup">
      <h1 className="display-xl pickup-title">Só retirada.</h1>
      <p className="pickup-lede">Não fazemos entregas nem envios. É assim que uma peça sai da arara e vai com você:</p>

      <ol className="steps">
        {steps.map(([t, d], i) => (
          <li key={t}>
            <span className="step-n">{i + 1}</span>
            <div>
              <h2 className="display-s">{t}</h2>
              <p>{d}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="pickup-info">
        <h2 className="display-s">Onde e quando retirar</h2>
        {info.length ? (
          <dl className="specs specs-lg">
            {info.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="muted">
            A loja ainda não publicou endereço e horário de retirada.
            {user?.role === 'admin' && (
              <>
                {' '}
                <Link to="/admin?aba=loja">Preencher agora</Link>
              </>
            )}
          </p>
        )}
      </section>
    </div>
  )
}
