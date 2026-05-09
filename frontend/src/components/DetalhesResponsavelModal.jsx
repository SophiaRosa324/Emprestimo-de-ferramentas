import { useEffect, useState } from 'react'
import {
  X, Wrench, AlertTriangle, CheckCircle2, Clock,
  Phone, Building2, Briefcase, CalendarDays, Hash
} from 'lucide-react'
import { useApi } from '../hooks/useApi'
import toast from 'react-hot-toast'

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function EmprestimoRow({ emp, tipo }) {
  const cor =
    tipo === 'atrasado' ? 'border-red-800/40 bg-red-900/10' :
    tipo === 'ativo'    ? 'border-amber-800/30 bg-amber-900/10' :
                          'border-iron-800/40 bg-iron-800/20'

  const IconComp =
    tipo === 'atrasado' ? AlertTriangle :
    tipo === 'ativo'    ? Clock :
                          CheckCircle2

  const iconCor =
    tipo === 'atrasado' ? 'text-red-400' :
    tipo === 'ativo'    ? 'text-amber-400' :
                          'text-emerald-400'

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${cor}`}>
      <IconComp size={14} className={`${iconCor} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-iron-200 truncate">{emp.ferramenta_nome}</p>
          {emp.ferramenta_codigo && (
            <span className="font-mono text-[10px] text-iron-500 bg-iron-800 px-1.5 py-0.5 rounded">
              {emp.ferramenta_codigo}
            </span>
          )}
        </div>
        <p className="text-[10px] text-iron-500 mt-0.5">
          Saída: {fmt(emp.data_saida)}
          {emp.data_retorno_prevista ? ` · Prev: ${fmt(emp.data_retorno_prevista)}` : ''}
          {emp.data_retorno_real    ? ` · Dev: ${fmt(emp.data_retorno_real)}`      : ''}
        </p>
      </div>
      {tipo === 'atrasado' && emp.dias_atraso > 0 && (
        <span className="text-[10px] text-red-400 font-mono flex-shrink-0">+{emp.dias_atraso}d</span>
      )}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-3 p-6">
      <div className="flex gap-4">
        <div className="w-14 h-14 rounded-2xl bg-iron-800 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-5 w-40 bg-iron-800 rounded animate-pulse" />
          <div className="h-3 w-56 bg-iron-800 rounded animate-pulse" />
        </div>
      </div>
      {[1,2,3,4].map(i => <div key={i} className="h-12 bg-iron-800/60 rounded-xl animate-pulse" />)}
    </div>
  )
}

export default function DetalhesResponsavelModal({ responsavelId, onClose }) {
  const api    = useApi()
  const [dados, setDados]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [aba, setAba]       = useState('ativos') // ativos | historico | atrasados

  useEffect(() => {
    api.detalhesResponsavel(responsavelId)
      .then(setDados)
      .catch(() => toast.error('Erro ao carregar detalhes'))
      .finally(() => setLoading(false))
  }, [responsavelId])

  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const abaLista = dados
    ? { ativos: dados.ativos, historico: dados.historico, atrasados: dados.atrasados }[aba] || []
    : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-iron-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl card overflow-hidden shadow-2xl shadow-black/60 animate-scale-in flex flex-col max-h-[90vh]">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-center gap-4 p-6 border-b border-iron-800/60 flex-shrink-0">
          {loading ? (
            <div className="w-12 h-12 rounded-2xl bg-iron-800 animate-pulse flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center text-xl font-display text-amber-400 flex-shrink-0">
              {dados?.nome?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {loading
              ? <div className="h-5 w-36 bg-iron-800 rounded animate-pulse" />
              : <h2 className="font-display text-xl text-iron-100">{dados?.nome}</h2>}
            {!loading && dados && (
              <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-iron-500">
                {dados.contato  && <span className="flex items-center gap-1"><Phone size={10} />{dados.contato}</span>}
                {dados.setor    && <span className="flex items-center gap-1"><Building2 size={10} className="capitalize" />{dados.setor}</span>}
                {dados.cargo    && <span className="flex items-center gap-1"><Briefcase size={10} />{dados.cargo}</span>}
                {dados.criado_em && <span className="flex items-center gap-1"><CalendarDays size={10} />desde {fmt(dados.criado_em)}</span>}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${dados.ativo !== false ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'}`}>
                  {dados.ativo !== false ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="btn-ghost p-2 rounded-xl flex-shrink-0"><X size={16} /></button>
        </div>

        {loading ? <Skeleton /> : (
          <>
            {/* ── Stats ─────────────────────────────────── */}
            <div className="grid grid-cols-4 gap-px bg-iron-800/40 flex-shrink-0">
              {[
                { label: 'Total',    value: dados.total_emprestimos,    color: 'text-iron-200' },
                { label: 'Ativos',   value: dados.emprestimos_ativos,   color: 'text-amber-400' },
                { label: 'Histórico',value: dados.emprestimos_historico, color: 'text-iron-400' },
                { label: 'Atrasados',value: dados.total_atrasados,      color: 'text-red-400'  },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-iron-900/60 py-3 text-center">
                  <p className={`text-xl font-display ${color}`}>{value}</p>
                  <p className="text-[10px] text-iron-600 uppercase tracking-wide mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* ── Tabs ──────────────────────────────────── */}
            <div className="flex gap-1 p-3 border-b border-iron-800/60 flex-shrink-0">
              {[
                { key: 'ativos',    label: 'Em aberto', count: dados.emprestimos_ativos   },
                { key: 'atrasados', label: 'Atrasados', count: dados.total_atrasados      },
                { key: 'historico', label: 'Histórico', count: dados.emprestimos_historico},
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setAba(key)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    aba === key ? 'bg-amber-500 text-iron-950' : 'text-iron-400 hover:text-iron-200'
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${aba === key ? 'bg-iron-950/30' : 'bg-iron-800 text-iron-500'}`}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Lista ─────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {abaLista.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Wrench size={32} className="text-iron-700" strokeWidth={1} />
                  <p className="text-xs text-iron-600">Nenhum empréstimo nesta lista.</p>
                </div>
              ) : (
                abaLista.map(emp => (
                  <EmprestimoRow key={emp.id} emp={emp} tipo={aba === 'historico' ? 'historico' : aba === 'atrasados' ? 'atrasado' : 'ativo'} />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}