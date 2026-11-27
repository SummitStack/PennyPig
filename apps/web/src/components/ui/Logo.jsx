/** PennyPig wordmark: a soft pig-pink coin badge plus the name. */
export default function Logo({ size = 'md', showName = true }) {
  const box = size === 'lg' ? 'h-10 w-10 text-[24px]' : 'h-8 w-8 text-[20px]'
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`flex ${box} items-center justify-center rounded-xl bg-gradient-to-br from-secondary to-secondary/70 text-white shadow-card`}
        aria-hidden="true"
      >
        <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>
          savings
        </span>
      </span>
      {showName && (
        <span
          className={`font-display font-extrabold tracking-tight text-on-surface ${
            size === 'lg' ? 'text-[26px]' : 'text-[18px]'
          }`}
        >
          PennyPig
        </span>
      )}
    </span>
  )
}
