import { AnimatePresence, Reorder, motion } from 'motion/react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConditionMeter, Swatch } from '../../components/bits'
import PieceCard from '../../components/PieceCard'
import { savePiece, uid, useDB, type Piece } from '../../lib/db'
import { compressImage } from '../../lib/images'
import { spring } from '../../lib/motion'
import { CATEGORIES, COLORS, CONDITIONS, PIECE_TYPES, SIZE_SUGGESTIONS, type Condition } from '../../lib/taxonomy'

const MAX_PHOTOS = 6

export default function PieceForm() {
  const { id } = useParams()
  const existing = useDB((d) => d.pieces.find((p) => p.id === id))
  const navigate = useNavigate()
  const isNew = id === 'nova'

  const [photos, setPhotos] = useState<string[]>(existing?.photos ?? [])
  const [colors, setColors] = useState<string[]>(existing?.colors ?? [])
  const [condition, setCondition] = useState<Condition>(existing?.condition ?? 'otimo')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  // Texto digitado, só para a prévia da etiqueta acompanhar o formulário.
  const [draft, setDraft] = useState({
    title: existing?.title ?? '',
    type: existing?.type ?? '',
    size: existing?.size ?? '',
    price: existing ? String(existing.price) : '',
  })

  if (!isNew && !existing)
    return (
      <div className="wrap empty-state">
        <p className="display-s">Peça não encontrada.</p>
        <Link className="btn" to="/admin">
          Voltar
        </Link>
      </div>
    )

  const addPhotos = async (files: FileList | null) => {
    if (!files) return
    setLoading(true)
    setError('')
    try {
      const room = MAX_PHOTOS - photos.length
      const list = await Promise.all(Array.from(files).slice(0, room).map((f) => compressImage(f)))
      setPhotos((p) => [...p, ...list])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const val = (k: string) => String(f.get(k) ?? '').trim()
    const price = parseFloat(val('price').replace(/\./g, '').replace(',', '.'))
    if (isNaN(price) || price < 0) return setError('Informe um preço válido.')
    if (!colors.length) return setError('Escolha pelo menos uma cor.')

    const piece: Piece = {
      id: existing?.id ?? uid(),
      title: val('title'),
      category: val('category'),
      type: val('type'),
      size: val('size'),
      brand: val('brand'),
      measurements: val('measurements'),
      description: val('description'),
      conditionNotes: val('conditionNotes'),
      condition,
      colors,
      price,
      photos,
      status: existing?.status ?? 'disponivel',
      createdAt: existing?.createdAt ?? Date.now(),
    }
    // A Vercel aceita até 4,5 MB por envio; as fotos novas vão junto com a peça.
    const payload = photos.filter((p) => p.startsWith('data:')).reduce((n, p) => n + p.length, 0)
    if (payload > 3_800_000) return setError('As fotos novas passam do limite de envio. Salve com menos fotos e adicione o resto depois.')
    setSaving(true)
    setError('')
    try {
      await savePiece(piece)
      navigate('/admin')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="wrap piece-form">
      <Link to="/admin" className="back">
        Voltar para Gerenciar
      </Link>
      <h1 className="display-l">{isNew ? 'Nova peça' : 'Editar peça'}</h1>

      <form
        className="pf-grid"
        onSubmit={submit}
        onChange={(e) => {
          const f = new FormData(e.currentTarget)
          const v = (k: string) => String(f.get(k) ?? '')
          setDraft({ title: v('title'), type: v('type'), size: v('size'), price: v('price') })
        }}
      >
        <section className="pf-photos">
          <div className="pf-preview" aria-label="Prévia no catálogo">
            <p className="field-label">Assim ela aparece no catálogo</p>
            <PieceCard
              linkable={false}
              piece={{
                id: existing?.id ?? '—',
                title: draft.title,
                type: draft.type || 'Peça',
                size: draft.size,
                price: parseFloat(draft.price.replace(/\./g, '').replace(',', '.')) || 0,
                colors,
                condition,
                photos,
                status: 'disponivel',
                category: '',
                brand: '',
                measurements: '',
                description: '',
                conditionNotes: '',
                createdAt: 0,
              }}
            />
          </div>
          <h2 className="field-label">
            Fotos ({photos.length} de {MAX_PHOTOS})
          </h2>
          <p className="muted small-txt">A primeira foto é a capa. Arraste para mudar a ordem.</p>
          <Reorder.Group axis="y" values={photos} onReorder={setPhotos} className="pf-photo-list">
            {photos.map((src, i) => (
              <Reorder.Item key={src} value={src} className="pf-photo" transition={spring}>
                <img src={src} alt={`Foto ${i + 1}`} draggable={false} />
                <span>{i === 0 ? 'Capa' : `Foto ${i + 1}`}</span>
                <button type="button" className="link-btn danger" onClick={() => setPhotos((p) => p.filter((x) => x !== src))}>
                  Remover
                </button>
              </Reorder.Item>
            ))}
          </Reorder.Group>
          {photos.length < MAX_PHOTOS && (
            <label className="upload">
              <input type="file" accept="image/*" multiple onChange={(e) => addPhotos(e.target.files)} />
              <span>{loading ? 'Processando…' : '+ Adicionar fotos'}</span>
            </label>
          )}
        </section>

        <section className="pf-fields">
          <label className="field">
            <span className="field-label">Nome da peça</span>
            <input name="title" defaultValue={existing?.title} required placeholder="Como a peça aparece no catálogo" />
          </label>

          <div className="row-2">
            <label className="field">
              <span className="field-label">Categoria</span>
              <select name="category" defaultValue={existing?.category ?? ''} required>
                <option value="" disabled>
                  Escolha
                </option>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Tipo de peça</span>
              <select name="type" defaultValue={existing?.type ?? ''} required>
                <option value="" disabled>
                  Escolha
                </option>
                {PIECE_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="row-3">
            <label className="field">
              <span className="field-label">Preço (R$)</span>
              <input name="price" inputMode="decimal" defaultValue={existing ? String(existing.price).replace('.', ',') : ''} required placeholder="0,00" />
            </label>
            <label className="field">
              <span className="field-label">Tamanho</span>
              <input name="size" list="sizes" defaultValue={existing?.size} />
              <datalist id="sizes">
                {SIZE_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>
            <label className="field">
              <span className="field-label">Marca</span>
              <input name="brand" defaultValue={existing?.brand} />
            </label>
          </div>

          <fieldset className="field">
            <legend className="field-label">Cor ({colors.length ? colors.length : 'escolha ao menos uma'})</legend>
            <div className="color-grid">
              {COLORS.map((c) => {
                const on = colors.includes(c.id)
                return (
                  <motion.button
                    type="button"
                    key={c.id}
                    className={`color-opt ${on ? 'on' : ''}`}
                    aria-pressed={on}
                    onClick={() => setColors((cs) => (on ? cs.filter((x) => x !== c.id) : [...cs, c.id]))}
                    whileTap={{ scale: 0.94 }}
                    transition={spring}
                  >
                    <Swatch id={c.id} size={18} />
                    <span>{c.label}</span>
                  </motion.button>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="field">
            <legend className="field-label">Condição</legend>
            <div className="cond-pick">
              {CONDITIONS.map((c) => (
                <label key={c.id} className={`cond-opt ${condition === c.id ? 'on' : ''}`}>
                  <input type="radio" name="condition" value={c.id} checked={condition === c.id} onChange={() => setCondition(c.id)} />
                  <ConditionMeter condition={c.id} label={false} />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <AnimatePresence initial={false}>
            {(condition === 'detalhes' || existing?.conditionNotes) && (
              <motion.label className="field" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <span className="field-label">Detalhes da condição</span>
                <textarea name="conditionNotes" rows={2} defaultValue={existing?.conditionNotes} placeholder="Descreva manchas, furos, desgaste, botão faltando…" />
              </motion.label>
            )}
          </AnimatePresence>

          <label className="field">
            <span className="field-label">Medidas</span>
            <input name="measurements" defaultValue={existing?.measurements} placeholder="Ex.: busto, cintura, comprimento em cm" />
          </label>

          <label className="field">
            <span className="field-label">Descrição</span>
            <textarea name="description" rows={4} defaultValue={existing?.description} />
          </label>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <div className="confirm-row">
            <motion.button className="btn" whileTap={{ scale: 0.97 }} transition={spring} disabled={loading || saving}>
              {saving ? 'Salvando…' : isNew ? 'Publicar no catálogo' : 'Salvar alterações'}
            </motion.button>
            <Link to="/admin" className="link-btn">
              Cancelar
            </Link>
          </div>
        </section>
      </form>
    </div>
  )
}
