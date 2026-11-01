import { AnimatePresence, motion } from 'motion/react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { login, register, useDB } from '../lib/db'
import { ease, spring } from '../lib/motion'

export default function Auth() {
  const hasUsers = useDB((d) => d.hasUsers)
  const [mode, setMode] = useState<'entrar' | 'criar'>(hasUsers ? 'entrar' : 'criar')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const first = !hasUsers

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
        await register({ name: val('nome'), email: val('email'), phone: val('telefone'), password: val('senha') })
      }
      navigate(params.get('volta') || '/catalogo', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="wrap auth">
      <div className="auth-side">
        <p className="mono">Conta</p>
        <h1 className="display-l">{mode === 'entrar' ? 'Entrar' : 'Criar conta'}</h1>
        <p className="auth-note">
          A conta serve para reservar peças. Cada peça reservada fica separada no seu nome até você retirar na loja.
        </p>
        {first && (
          <p className="auth-first">
            <span className="mono">Primeiro acesso</span>
            Ainda não existe nenhuma conta. A primeira conta criada será a administradora da loja, com acesso ao cadastro de
            peças e às reservas.
          </p>
        )}
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
      <label className="mono" htmlFor={rest.name}>
        {label}
      </label>
      <div className={isPassword ? 'field-row' : undefined}>
        <input id={rest.name} type={isPassword && show ? 'text' : type} aria-describedby={hintId} {...rest} />
        {isPassword && (
          <button type="button" className="field-toggle mono" aria-pressed={show} onClick={() => setShow((s) => !s)}>
            {show ? 'Ocultar' : 'Mostrar'}
          </button>
        )}
      </div>
      {hint && <small id={hintId}>{hint}</small>}
    </div>
  )
}
