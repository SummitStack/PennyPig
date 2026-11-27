/**
 * Shows a formatted money string the way modern finance apps do: a true minus
 * sign, and the cents set smaller and raised so the dollars lead.
 * Display only: the string comes from the same money() formatter as before.
 */
export default function Amount({ value, className = '', cents = true }) {
  const text = String(value ?? '').replace(/^-/, '−')
  const m = cents ? text.match(/^(.*)(\.\d{2})$/) : null
  return (
    <span className={`num whitespace-nowrap ${className}`}>
      {m ? (
        <>
          {m[1]}
          <span className="align-[0.42em] text-[0.58em] font-[inherit] opacity-70">{m[2]}</span>
        </>
      ) : (
        text
      )}
    </span>
  )
}
