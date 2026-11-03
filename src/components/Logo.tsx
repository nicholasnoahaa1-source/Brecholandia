// Marca: uma etiqueta de preço com o furo do barbante.
export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="logo">
      <path d="M9 4h9.5a6 6 0 0 1 2.2 11.6A6.5 6.5 0 0 1 18.5 28H9z" fill="var(--limao)" />
      <circle cx="14" cy="10" r="2.2" fill="var(--preto)" />
      <path d="M14 10 C 8 6, 4 8, 2 3" stroke="var(--limao)" strokeWidth="1.4" fill="none" />
    </svg>
  )
}
