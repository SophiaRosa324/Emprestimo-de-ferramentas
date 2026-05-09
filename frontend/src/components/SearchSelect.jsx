import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, X, Check } from 'lucide-react'

/**
 * SearchSelect — ComboBox reutilizável com busca e autocomplete.
 *
 * Props:
 *   options:     Array de { value, label, sublabel?, cor? }
 *   value:       valor selecionado (string|number|null)
 *   onChange:    (value) => void
 *   placeholder: string
 *   disabled:    bool
 *   clearable:   bool
 */
export default function SearchSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Selecionar…',
  disabled = false,
  clearable = true,
}) {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const containerRef          = useRef(null)
  const inputRef              = useRef(null)

  const selected = options.find(o => String(o.value) === String(value))

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase()) ||
    (o.sublabel || '').toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false); setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const openDropdown = () => {
    if (disabled) return
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const selectOption = (opt) => {
    onChange(opt.value)
    setOpen(false); setQuery('')
  }

  const clear = (e) => {
    e.stopPropagation()
    onChange(null)
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <div
        onClick={openDropdown}
        className={`input flex items-center gap-2 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {selected?.cor && (
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: selected.cor }} />
        )}
        <span className={`flex-1 truncate ${selected ? 'text-iron-100' : 'text-iron-500'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {clearable && selected && (
            <button onClick={clear} className="text-iron-500 hover:text-iron-300 p-0.5">
              <X size={12} />
            </button>
          )}
          <ChevronDown size={14} className={`text-iron-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-iron-900 border border-iron-700/60 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-scale-in">
          {/* Search */}
          <div className="p-2 border-b border-iron-800/60">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-iron-500" />
              <input
                ref={inputRef}
                className="w-full bg-iron-800/60 border border-iron-700/40 text-iron-100 placeholder-iron-500 rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none focus:border-amber-500/60"
                placeholder="Buscar…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-center text-xs text-iron-600 py-4">Nenhum resultado</p>
            ) : (
              filtered.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => selectOption(opt)}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-iron-800/60 transition-colors ${
                    String(opt.value) === String(value) ? 'bg-amber-500/10' : ''
                  }`}
                >
                  {opt.cor && (
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: opt.cor }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-iron-100 truncate">{opt.label}</p>
                    {opt.sublabel && <p className="text-xs text-iron-500 truncate">{opt.sublabel}</p>}
                  </div>
                  {String(opt.value) === String(value) && (
                    <Check size={14} className="text-amber-400 flex-shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}