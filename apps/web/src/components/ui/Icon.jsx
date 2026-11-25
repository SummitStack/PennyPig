export default function Icon({ name, className = '', filled = false }) {
  return (
    <span
      className={`material-symbols-rounded ${className}`}
      style={
        filled
          ? { fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" }
          : undefined
      }
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
