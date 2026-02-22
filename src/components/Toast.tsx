interface ToastProps {
  message: string
  visible: boolean
}

export default function Toast({ message, visible }: ToastProps) {
  if (!message) return null

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-xs text-white/90 z-50 pointer-events-none ${
        visible ? 'toast-enter' : 'toast-exit'
      }`}
      style={{ background: 'rgba(40, 40, 55, 0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      {message}
    </div>
  )
}
