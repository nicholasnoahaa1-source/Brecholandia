import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { useCurrentUser, useDB } from '../lib/db'
import { rise, stagger } from '../lib/motion'

export default function Pickup() {
  const store = useDB((d) => d.store)
  const user = useCurrentUser()

  const steps = [
    ['Escolha no catálogo', 'Filtre por categoria, tipo de peça, cor, tamanho e condição. Cada peça é única.'],
    ['Reserve com a sua conta', 'Entre ou crie uma conta e toque em “Reservar para retirada”. A peça sai do catálogo e fica no seu nome.'],
    ['Retire na loja', 'Não fazemos entregas nem envios. A peça reservada é retirada pessoalmente na loja.'],
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
      <h1 className="display-xl pickup-title">
        Só
        <br />
        <span className="hl">retirada.</span>
      </h1>

      <motion.ol className="steps" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
        {steps.map(([t, d], i) => (
          <motion.li key={t} variants={rise}>
            <span className="step-n">{i + 1}</span>
            <div>
              <h2 className="display-s">{t}</h2>
              <p>{d}</p>
            </div>
          </motion.li>
        ))}
      </motion.ol>

      <section className="pickup-info">
        <h2 className="mono">Dados da loja</h2>
        {info.length ? (
          <dl className="specs specs-lg">
            {info.map(([k, v]) => (
              <div key={k}>
                <dt className="mono">{k}</dt>
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
