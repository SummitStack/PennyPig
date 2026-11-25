import { useEffect } from 'react'

/** Backdrop for dialogs: closes on Escape and on a click outside the panel. */
export function ModalBackdrop({ onClose, children }) {
  useEffect(() => {
    if (!onClose) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex animate-fade-in items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      {children}
    </div>
  )
}

/** Panel classes shared by every dialog: a bottom sheet on phones, a card on desktop. */
export const modalPanel =
  'w-full animate-pop-in rounded-t-2xl border border-border-hairline bg-surface-base shadow-pop sm:rounded-2xl'
