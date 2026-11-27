import { PiggyBank } from 'lucide-react'

/** The PennyPig mark: a flat tile in the brand green with an outline pig. */
export function LogoMark({ size = 'md' }) {
  const box =
    size === 'xl' ? 'h-12 w-12 rounded-xl text-[26px]' : size === 'lg' ? 'h-9 w-9 rounded-[10px] text-[20px]' : 'h-7 w-7 rounded-lg text-[16px]'
  return (
    <span className={`flex ${box} shrink-0 items-center justify-center bg-primary text-on-primary`} aria-hidden="true">
      <PiggyBank size="1em" strokeWidth={2} />
    </span>
  )
}

/** PennyPig wordmark: the mark plus the name. */
export default function Logo({ size = 'md', showName = true }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      {showName && (
        <span
          className={`font-display font-semibold tracking-[-0.02em] text-on-surface ${
            size === 'lg' ? 'text-[22px]' : 'text-[17px]'
          }`}
        >
          PennyPig
        </span>
      )}
    </span>
  )
}
