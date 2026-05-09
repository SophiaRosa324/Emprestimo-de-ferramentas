import { useEffect, useState } from 'react'
import { X, Wrench, CheckCircle, ArrowLeftRight, AlertTriangle, CalendarRange, Hash } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import StatusBadge from './StatusBadge'
import toast from 'react-hot-toast'

function StatPill({ label, value, color }) {
  return (
    <div className={`flex flex-col items-center px-4 py-2.5 rounded-xl border ${color}`}>
      <span className="text-lg font-display">{value}</span>
      <span className="text-[10px] uppercase tracking-wide mt-0.5 opacity-70">{label}</span>
    </div>
  )
}

export default function DetalhesCategoriaModal({ categoriaId, onClose }) {
  const api = useApi()
  const [dados,   setDados]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [busca,   setBusca]   = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  useEffect(() => {
    api.detalhesCategoria(categoriaId)
      .then(setDados)
      .catch(() => toast.error('Erro ao carregar categoria'))
      .finally(() => setLoading(false))
  }, [categoriaId])

  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const ferramentasFiltradas = (dados?.ferramentas || []).filter(f => {
    const okBusca  = !busca || f.nome.toLowerCase().includes(busca.toLowerCase()) || (f.codigo || '').toLowerCase().includes(busca.toLowerCase())
    const okEstado = !filtroEstado || f.estado === filtroEstado
    return okBusca && okEstado
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-iron-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl card overflow-hidden shadow-2xl shadow-black/60 animate-scale-in flex flex-col max-h-[90vh]">

        {/* ── Header ──────────────────────────────────── */}
        <div className="flex items-center gap-4 p-6 border-b border-iron-800/60 flex-shrink-0">
          {loading ? (
            <div className="w-10 h-10 rounded-xl bg-iron-800 animate-pulse" />
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: (dados?.cor || '#6366f1') + '33', border: `1px solid ${dados?.cor || '#6366f1'}55` }}
            >
              <div className="w-4 h-4 rounded-full" style={{ background: dados?.cor || '#6366f1' }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {loading
              ? <div className="h-5 w-32 bg-iron-800 rounded animate-pulse" />
              : <h2 className="font-display text-xl text-iron-100">{dados?.nome}</h2>}
            {!loading && dados?.descricao && (
              <p className="text-xs text-iron-500 mt-0.5 truncate">{dados.descricao}</p>
            )}
          </div>
          <button onClick={onClose} className="btn-ghost p-2 rounded-xl"><X size={16} /></button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-iron-800/60 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* ── Stats ─────────────────────────────────── */}
            <div className="flex gap-2 p-4 flex-shrink-0 flex-wrap">
              <StatPill label="Total"       value={dados.total}       color="border-iron-700/50 text-iron-200" />
              <StatPill label="Disponíveis" value={dados.disponiveis} color="border-emerald-800/50 text-emerald-400 bg-emerald-900/10" />
              <StatPill label="Emprestadas" value={dados.emprestadas} color="border-amber-800/50 text-amber-400 bg-amber-900/10" />
              <StatPill label="Manutenção"  value={dados.manutencao}  color="border-red-800/50 text-red-400 bg-red-900/10" />
              {dados.reservadas > 0 && (
                <StatPill label="Reservadas" value={dados.reservadas} color="border-blue-800/50 text-blue-400 bg-blue-900/10" />
              )}
            </div>

            {/* ── Filtros ───────────────────────────────── */}
            <div className="flex gap-2 px-4 pb-3 flex-shrink-0">
              <div className="relative flex-1">
                <input
                  className="input pl-3 text-xs h-9"
                  placeholder="Buscar por nome ou código…"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                />
              </div>
              <select
                className="input w-36 text-xs h-9"
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="disponivel">Disponíveis</option>
                <option value="emprestada">Emprestadas</option>
                <option value="manutencao">Manutenção</option>
              </select>
            </div>

            {/* ── Lista ─────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
              {ferramentasFiltradas.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-2">
                  <Wrench size={32} className="text-iron-700" strokeWidth={1} />
                  <p className="text-xs text-iron-600">Nenhuma ferramenta encontrada.</p>
                </div>
              ) : (
                ferramentasFiltradas.map(f => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-iron-800/30 border border-iron-800/50">
                    {/* Foto ou ícone */}
                    <div className="w-9 h-9 rounded-lg bg-iron-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {f.foto
                        ? <img src={`/api/uploads/${f.foto}`} alt="" className="w-full h-full object-cover" />
                        : <Wrench size={16} className="text-iron-600" strokeWidth={1} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-iron-100 truncate">{f.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {f.codigo && (
                          <span className="font-mono text-[10px] text-iron-500 bg-iron-800 px-1.5 py-0.5 rounded">
                            {f.codigo}
                          </span>
                        )}
                        {f.localizacao && (
                          <span className="text-[10px] text-iron-600 truncate">{f.localizacao}</span>
                        )}
                      </div>
                    </div>
                    <StatusBadge estado={f.estado} />
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}