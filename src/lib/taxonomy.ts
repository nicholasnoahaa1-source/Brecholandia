// Vocabulário fixo do catálogo. São só opções de classificação:
// nenhuma peça, preço ou informação da loja é definida aqui.

export const CATEGORIES = ['Feminino', 'Masculino', 'Infantil', 'Unissex'] as const

export const PIECE_TYPES = [
  'Camiseta',
  'Blusa',
  'Camisa',
  'Regata',
  'Cropped',
  'Moletom',
  'Suéter',
  'Jaqueta',
  'Casaco',
  'Blazer',
  'Colete',
  'Calça',
  'Jeans',
  'Bermuda',
  'Short',
  'Saia',
  'Vestido',
  'Macacão',
  'Conjunto',
  'Roupa de banho',
  'Calçado',
  'Bolsa',
  'Cinto',
  'Chapéu e boné',
  'Bijuteria',
  'Outro acessório',
] as const

export type Condition = 'nova' | 'seminova' | 'otimo' | 'detalhes'

// A ordem importa: do melhor estado para o que tem marcas de uso.
export const CONDITIONS: { id: Condition; label: string; short: string; level: number }[] = [
  { id: 'nova', label: 'Nova com etiqueta', short: 'Nova', level: 4 },
  { id: 'seminova', label: 'Seminova, sem sinais de uso', short: 'Seminova', level: 3 },
  { id: 'otimo', label: 'Usada em ótimo estado', short: 'Ótimo estado', level: 2 },
  { id: 'detalhes', label: 'Usada com detalhes (descritos na peça)', short: 'Com detalhes', level: 1 },
]

export const COLORS: { id: string; label: string; hex: string }[] = [
  { id: 'preto', label: 'Preto', hex: '#111111' },
  { id: 'branco', label: 'Branco', hex: '#F6F5EF' },
  { id: 'off-white', label: 'Off-white', hex: '#E9E3D0' },
  { id: 'cinza', label: 'Cinza', hex: '#8E8E8A' },
  { id: 'bege', label: 'Bege', hex: '#CDB892' },
  { id: 'marrom', label: 'Marrom', hex: '#6B4429' },
  { id: 'caramelo', label: 'Caramelo', hex: '#B5732F' },
  { id: 'vermelho', label: 'Vermelho', hex: '#C42B22' },
  { id: 'vinho', label: 'Vinho', hex: '#6A1B2B' },
  { id: 'rosa', label: 'Rosa', hex: '#E89BB5' },
  { id: 'laranja', label: 'Laranja', hex: '#E8711F' },
  { id: 'amarelo', label: 'Amarelo', hex: '#F2CB2E' },
  { id: 'verde', label: 'Verde', hex: '#2F7A3E' },
  { id: 'verde-militar', label: 'Verde militar', hex: '#545B32' },
  { id: 'azul', label: 'Azul', hex: '#2459B8' },
  { id: 'azul-marinho', label: 'Azul-marinho', hex: '#16234A' },
  { id: 'jeans', label: 'Jeans', hex: '#4B6A92' },
  { id: 'roxo', label: 'Roxo', hex: '#5E3A8C' },
  { id: 'dourado', label: 'Dourado', hex: '#C5A044' },
  { id: 'prateado', label: 'Prateado', hex: '#BFC3C7' },
  { id: 'estampado', label: 'Estampado', hex: 'pattern' },
  { id: 'multicolorido', label: 'Multicolorido', hex: 'multi' },
]

export const SIZE_SUGGESTIONS = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'Único', '34', '36', '38', '40', '42', '44', '46', '48']

export const colorById = (id: string) => COLORS.find((c) => c.id === id)
export const conditionById = (id: Condition) => CONDITIONS.find((c) => c.id === id)!
