import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ title, onClose, children, width = 'max-w-lg' }) {
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-iron-950/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative w-full ${width} card p-6 animate-scale-in shadow-2xl shadow-black/50`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-iron-100">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-2 rounded-lg">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
