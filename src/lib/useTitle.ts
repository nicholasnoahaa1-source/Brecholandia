import { useEffect } from 'react'

/** Título da aba do navegador (e do link compartilhado) por página. */
export function useTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | Brecholândia` : 'Brecholândia'
  }, [title])
}
