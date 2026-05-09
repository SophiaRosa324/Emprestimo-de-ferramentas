import { useEffect, useState } from 'react'
import { X, Wrench, ClipboardList, CalendarRange, AlertTriangle, CheckCircle2, Clock, User } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import toast from 'react-hot-toast'

const NIVEL_LABELS = { membro: 'Membro', encarregado: 'Encarregado', administrador: 'Administrador' }
const NIVEL_CLS   = { membro: 'bg-iron-800 text-iron-400', encarregado: 'bg-amber-900/50 text-amber-400', administrador: 'bg-purple-900/50 text-purple-400' }

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' })
}

function Section({ icon: Icon, title, count, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-amber-400" />
        <h3 className="text-xs font-semibold text-iron-400 uppercase tracking-wider">{title}</h3>
        {count != null && <span className="ml-auto text-xs bg-iron-800 text-iron-500 px-2 py-0.5 rounded-full">{count}</span>}
      </div>
      {children}
    </div>
  )
}

export default function DetalhesResponsavel({ usuarioId, onClose }) {
  const api = useApi()
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.detalhesUsuario(usuarioId)
      .then(setDados)
      .catch(() => toast.error('Erro ao carregar detalhes'))
      .finally(() => setLoading(false))
  }, [usuarioId])

  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-iron-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl card p-0 animate-scale-in shadow-2xl shadow-black/60 overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-4 p-6 border-b border-iron-800/60 flex-shrink-0">
          {loading || !dados ? (
            <div className="w-12 h-12 rounded-2xl bg-iron-800 animate-pulse" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-iron-700 flex items-center justify-center text-lg font-display text-iron-300 flex-shrink-0">
              {dados.nome[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="h-5 w-40 bg-iron-800 rounded animate-pulse mb-1" />
            ) : (
              <>
                <h2 className="font-display text-xl text-iron-100">{dados?.nome}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {dados?.setor && <span className="text-xs border border-iron-700 text-iron-500 px-2 py-0.5 rounded-full">{dados.setor}</span>}
                  {dados?.nivel_setor && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${NIVEL_CLS[dados.nivel_setor] || 'bg-iron-800 text-iron-400'}`}>
                      {NIVEL_LABELS[dados.nivel_setor] || dados.nivel_setor}
                    </span>
                  )}
                  {dados?.perfil && <span className="text-xs bg-iron-800 text-iron-500 px-2 py-0.5 rounded-full capitalize">{dados.perfil}</span>}
                </div>
              </>
            )}
          </div>
          <button onClick={onClose} className="btn-ghost p-2 rounded-xl flex-shrink-0"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-iron-800/60 rounded-xl animate-pulse" />)}
            </div>
          ) : !dados ? (
            <p className="text-iron-500 text-center py-8">Erro ao carregar dados.</p>
          ) : (
            <>
              {/* Stats rápidos */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Empréstimos', value: dados.emprestimos?.length ?? 0, icon: Wrench, color: 'text-amber-400' },
                  { label: 'Atrasados',   value: dados.ferramentas_atrasadas ?? 0, icon: AlertTriangle, color: 'text-red-400' },
                  { label: 'Reservas',    value: dados.reservas_ativas?.length ?? 0, icon: CalendarRange, color: 'text-blue-400' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-iron-800/40 rounded-xl p-3 text-center">
                    <Icon size={18} className={`${color} mx-auto mb-1`} strokeWidth={1.5} />
                    <p className="text-xl font-display text-iron-100">{value}</p>
                    <p className="text-[10px] text-iron-500 uppercase tracking-wide">{label}</p>
                  </div>
                ))}
              </div>

              {/* Histórico empréstimos */}
              <Section icon={Wrench} title="Histórico de Empréstimos" count={dados.emprestimos?.length}>
                {dados.emprestimos?.length === 0 ? (
                  <p className="text-xs text-iron-600 py-2">Nenhum empréstimo registrado.</p>
                ) : (
                  <div className="space-y-2">
                    {dados.emprestimos.map(e => (
                      <div key={e.id} className={`flex items-center gap-3 p-3 rounded-xl border ${e.atrasado ? 'bg-red-900/10 border-red-800/30' : 'bg-iron-800/30 border-iron-800/40'}`}>
                        {e.devolvida
                          ? <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                          : e.atrasado
                            ? <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                            : <Clock size={14} className="text-amber-400 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-iron-200 truncate">{e.ferramenta}</p>
                          <p className="text-[10px] text-iron-500">Saída: {fmt(e.data_saida)}{e.data_retorno_prevista ? ` · Prev: ${fmt(e.data_retorno_prevista)}` : ''}</p>
                        </div>
                        {e.atrasado && <span className="text-[10px] text-red-400 flex-shrink-0">Atrasado</span>}
                        {e.devolvida && <span className="text-[10px] text-emerald-500 flex-shrink-0">Devolvido</span>}
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* Solicitações */}
              <Section icon={ClipboardList} title="Solicitações" count={dados.solicitacoes?.length}>
                {dados.solicitacoes?.length === 0 ? (
                  <p className="text-xs text-iron-600 py-2">Nenhuma solicitação.</p>
                ) : (
                  <div className="space-y-2">
                    {dados.solicitacoes.map(s => (
                      <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-iron-800/30 border border-iron-800/40">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-iron-200 truncate">{s.item_nome}</p>
                          <p className="text-[10px] text-iron-500 capitalize">{s.tipo} · {fmt(s.criado_em)}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          s.status === 'pendente'  ? 'bg-amber-900/40 text-amber-400 border-amber-800/40' :
                          s.status === 'aprovado'  ? 'bg-blue-900/40 text-blue-400 border-blue-800/40' :
                          s.status === 'concluido' ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800/40' :
                          'bg-red-900/40 text-red-400 border-red-800/40'
                        } capitalize`}>{s.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* Reservas ativas */}
              <Section icon={CalendarRange} title="Reservas Ativas" count={dados.reservas_ativas?.length}>
                {dados.reservas_ativas?.length === 0 ? (
                  <p className="text-xs text-iron-600 py-2">Nenhuma reserva ativa.</p>
                ) : (
                  <div className="space-y-2">
                    {dados.reservas_ativas.map(r => (
                      <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-blue-900/10 border border-blue-800/30">
                        <CalendarRange size={14} className="text-blue-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-iron-200 truncate">{r.ferramenta}</p>
                          <p className="text-[10px] text-iron-500">{fmt(r.data_inicio)} → {fmt(r.data_fim)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </>
          )}
        </div>

        {/* Footer */}
        {dados && (
          <div className="px-6 py-4 border-t border-iron-800/60 flex-shrink-0">
            <p className="text-xs text-iron-600">Cadastrado em {fmt(dados.criado_em)} · {dados.email}</p>
          </div>
        )}
      </div>
    </div>
  )
}