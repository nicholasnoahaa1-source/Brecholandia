import { AnimatePresence, motion } from 'motion/react'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { ease, spring } from '../lib/motion'

/*
 * Confirmações e avisos do site, no lugar de confirm()/alert() do navegador.
 * - Foco vai para "Voltar" (a opção que não destrói nada) e volta ao botão de origem ao fechar.
 * - Esc cancela; Tab fica preso dentro da caixa.
 */

type ConfirmOptions = { title: string; body?: string; confirm: string; cancel?: string; danger?: boolean }
type Toast = { id: number; text: string; tone: 'ok' | 'erro' }

type Ctx = {
  confirm: (o: ConfirmOptions) => Promise<boolean>
  toast: (text: string, tone?: Toast['tone']) => void
}

const DialogCtx = createContext<Ctx | null>(null)

export const useDialog = () => {
  const ctx = useContext(DialogCtx)
  if (!ctx) throw new Error('useDialog fora do DialogProvider')
  return ctx
}

/** Prende o foco dentro de `root` e fecha com Esc. Devolve o foco ao sair. */
export function useModalFocus(open: boolean, root: React.RefObject<HTMLElement | null>, onClose: () => void, initial?: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => (initial?.current ?? root.current?.querySelector<HTMLElement>('button, input, a'))?.focus())

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
      if (e.key === 'Tab' && root.current) {
        const items = [...root.current.querySelectorAll<HTMLElement>('button:not([disabled]), input, select, a[href], [tabindex="0"]')]
        if (!items.length) return
        const first = items[0], last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const box = useRef<HTMLDivElement>(null)
  const cancelBtn = useRef<HTMLButtonElement>(null)

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...o, resolve })), [])
  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'erro' ? 6000 : 3500)
  }, [])

  const close = (v: boolean) => {
    pending?.resolve(v)
    setPending(null)
  }

  useModalFocus(!!pending, box, () => close(false), cancelBtn)

  return (
    <DialogCtx.Provider value={{ confirm, toast }}>
      {children}

      <AnimatePresence>
        {pending && (
          <>
            <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} onClick={() => close(false)} />
            <motion.div
              ref={box}
              className={`dialog ${pending.danger ? 'is-danger' : ''}`}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="dialog-title"
              aria-describedby={pending.body ? 'dialog-body' : undefined}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease } }}
              exit={{ opacity: 0, y: 12, transition: { duration: 0.15 } }}
            >
              <p id="dialog-title" className="display-s">
                {pending.title}
              </p>
              {pending.body && <p id="dialog-body">{pending.body}</p>}
              <div className="dialog-actions">
                <button ref={cancelBtn} className="btn btn-line" onClick={() => close(false)}>
                  {pending.cancel ?? 'Voltar'}
                </button>
                <motion.button className={`btn ${pending.danger ? 'btn-danger' : ''}`} onClick={() => close(true)} whileTap={{ scale: 0.97 }} transition={spring}>
                  {pending.confirm}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="toasts" aria-live="polite" aria-atomic="false">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.p
              key={t.id}
              layout
              className={`toast toast-${t.tone}`}
              role={t.tone === 'erro' ? 'alert' : 'status'}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0, transition: { duration: 0.3, ease } }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              {t.text}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>
    </DialogCtx.Provider>
  )
}
