import { AnimatePresence, motion } from 'motion/react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { login, register, useDB } from '../lib/db'
import { ease, spring } from '../lib/motion'
import { useTitle } from '../lib/useTitle'

export default function Auth() {
  const hasUsers = useDB((d) => d.hasUsers)
  const [mode, setMode] = useState<'entrar' | 'criar'>(hasUsers ? 'entrar' : 'criar')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // Aparece só quando alguém tenta criar conta com o e-mail reservado da loja.
  const [needsCode, setNeedsCode] = useState(false)
  const [params] = useSearchParams()
  const navigate = useNavigate()
  useTitle(mode === 'entrar' ? 'Entrar' : 'Criar conta')

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const val = (k: string) => String(f.get(k) ?? '')
    setBusy(true)
    setError('')
    try {
      if (mode === 'entrar') await login(val('email'), val('senha'))
      else {
        if (val('senha') !== val('senha2')) throw new Error('As senhas não conferem.')
        await register({
          name: val('nome'),
          email: val('email'),
          phone: val('telefone'),
          password: val('senha'),
          ...(needsCode ? { adminCode: val('codigo') } : {}),
        })
      }
      navigate(params.get('volta') || '/catalogo', { replace: true })
    } catch (err) {
      if ((err as { code?: string }).code === 'codigo_loja') setNeedsCode(true)
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="wrap auth">
      <div className="auth-side">
        <h1 className="display-l">{mode === 'entrar' ? 'Entrar' : 'Criar conta'}</h1>
        <p className="auth-note">
          A conta serve para reservar peças. A peça reservada fica no seu nome até ser retirada na loja ou a reserva ser cancelada.
        </p>
      </div>

      <div className="auth-form-wrap">
        <div className="tabs" role="tablist">
          {(['entrar', 'criar'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              className="tab"
              onClick={() => {
                setMode(m)
                setError('')
                setNeedsCode(false)
              }}
            >
              {m === 'entrar' ? 'Já tenho conta' : 'Sou novo por aqui'}
              {mode === m && <motion.span layoutId="auth-tab" className="tab-mark" transition={spring} />}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.form
            key={mode}
            onSubmit={submit}
            className="form"
            initial={{ opacity: 0, x: mode === 'criar' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.3, ease } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            {mode === 'criar' && (
              <>
                <Field label="Nome" name="nome" autoComplete="name" required />
                <Field label="Telefone ou WhatsApp" name="telefone" type="tel" autoComplete="tel" required />
              </>
            )}
            <Field label="E-mail" name="email" type="email" autoComplete="email" required />
            <Field
              label="Senha"
              name="senha"
              type="password"
              autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
              minLength={mode === 'criar' ? 6 : undefined}
              hint={mode === 'criar' ? 'Pelo menos 6 caracteres.' : undefined}
              required
            />
            {mode === 'criar' && <Field label="Repita a senha" name="senha2" type="password" autoComplete="new-password" required />}
            {mode === 'criar' && needsCode && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease } }}>
                <Field label="Código da loja" name="codigo" type="password" autoComplete="off" hint="Definido pela loja na configuração do servidor." required />
              </motion.div>
            )}

            <AnimatePresence>
              {error && (
                <motion.p className="error" role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button className="btn btn-block" disabled={busy} whileTap={{ scale: 0.97 }} transition={spring}>
              {busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}
            </motion.button>
          </motion.form>
        </AnimatePresence>
      </div>
    </div>
  )
}

function Field({ label, hint, type, ...rest }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  const hintId = hint ? `${rest.name}-dica` : undefined
  return (
    <div className="field">
      <label className="field-label" htmlFor={rest.name}>
        {label}
      </label>
      <div className={isPassword ? 'field-row' : undefined}>
        <input id={rest.name} type={isPassword && show ? 'text' : type} aria-describedby={hintId} {...rest} />
        {isPassword && (
          <button type="button" className="field-toggle" aria-pressed={show} onClick={() => setShow((s) => !s)}>
            {show ? 'Ocultar' : 'Mostrar'}
          </button>
        )}
      </div>
      {hint && <small id={hintId}>{hint}</small>}
    </div>
  )
}
