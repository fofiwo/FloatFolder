interface ToastProps {
  message: string
  visible: boolean
}

export default function Toast({ message, visible }: ToastProps) {
  if (!message) return null

  return (
    <div
      className={`fixed bottom-5 left-1/2 px-4 py-2.5 rounded-mac text-[13px] text-white z-50 pointer-events-none shadow-lg ${
        visible ? 'toast-enter' : 'toast-exit'
      }`}
      style={{
        background: 'rgba(50, 50, 52, 0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#32d74b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        {message}
      </div>
    </div>
  )
}
