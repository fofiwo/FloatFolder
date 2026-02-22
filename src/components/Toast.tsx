interface ToastProps {
  message: string
  visible: boolean
}

export default function Toast({ message, visible }: ToastProps) {
  if (!message) return null

  const [title, detail] = message.split('\n')

  return (
    <div
      className={`fixed bottom-5 left-1/2 px-4 py-2.5 rounded-mac text-[13px] text-mac-text z-50 pointer-events-none shadow-xl ${
        visible ? 'toast-enter' : 'toast-exit'
      }`}
      style={{
        background: 'var(--mac-popup-bg)',
        border: '1px solid var(--mac-popup-border)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-[1px] w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-emerald-500"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        <div className="flex flex-col leading-tight">
          <span className="font-medium">{title}</span>
          {detail && (
            <span className="text-[11px] text-mac-text-secondary mt-0.5 truncate max-w-[260px]">{detail}</span>
          )}
        </div>
      </div>
    </div>
  )
}
