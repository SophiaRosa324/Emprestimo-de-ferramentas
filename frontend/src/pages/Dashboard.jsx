import { useEffect, useState } from 'react'
import {
  Wrench, CheckCircle, ArrowLeftRight, AlertTriangle, TrendingUp,
  CalendarRange, ClipboardList, AlertCircle, Clock, BarChart2
} from 'lucide-react'
import { useApi } from '../hooks/useApi'
import toast from 'react-hot-toast'

function StatCard({ icon: Icon, label, value, color, sub, delay = '0ms' }) {
  return (
    <div className="card p-5 flex items-center gap-4 animate-slide-up" style={{ animationDelay: delay }}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={22} strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-2xl font-display text-iron-100">{value ?? '—'}</p>
        <p className="text-xs text-iron-500 uppercase tracking-wider mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-iron-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function AlertBanner({ type, children }) {
  const cfg = {
    error:   'bg-red-900/20 border-red-800/50 text-red-300',
    warning: 'bg-amber-900/20 border-amber-800/50 text-amber-300',
    info:    'bg-blue-900/20 border-blue-800/50 text-blue-300',
  }[type] || 'bg-iron-800/40 border-iron-700/50 text-iron-300'

  const Icon = type === 'error' ? AlertTriangle : AlertCircle

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${cfg}`}>
      <Icon size={16} className="flex-shrink-0 mt-0.5" />
      <p className="text-sm">{children}</p>
    </div>
  )
}

function BarChart({ data, colorFn }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-2 h-24">
      {data.map(({ label, value }, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[9px] text-iron-500 font-mono">{value}</span>
          <div
            className="w-full rounded-t-lg transition-all duration-700"
            style={{ height: `${Math.max((value / max) * 72, 4)}px`, background: colorFn ? colorFn(i) : '#f59e0b' }}
          />
          <span className="text-[9px] text-iron-600 truncate w-full text-center">{label}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const api = useApi()
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.obterDashboard()
      .then(setDados)
      .catch(() => toast.error('Erro ao carregar dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 bg-iron-800 rounded-xl animate-pulse mb-8" />
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-iron-800/60 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  const d = dados || {}

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl text-iron-100">Dashboard</h1>
        <p className="text-iron-500 text-sm mt-1">Visão geral em tempo real</p>
      </div>

      {/* Alertas ativos */}
      {((d.atrasados?.length > 0) || (d.vence_hoje?.length > 0) || (d.reservas_hoje?.length > 0)) && (
        <div className="space-y-2 animate-slide-up">
          {d.atrasados?.length > 0 && (
            <AlertBanner type="error">
              <strong>{d.atrasados.length} empréstimo(s) atrasado(s):</strong>{' '}
              {d.atrasados.map(e => `${e.ferramenta} (${e.dias_atraso}d)`).join(' · ')}
            </AlertBanner>
          )}
          {d.vence_hoje?.length > 0 && (
            <AlertBanner type="warning">
              <strong>{d.vence_hoje.length} empréstimo(s) vencem hoje:</strong>{' '}
              {d.vence_hoje.map(e => e.ferramenta).join(' · ')}
            </AlertBanner>
          )}
          {d.reservas_hoje?.length > 0 && (
            <AlertBanner type="info">
              <strong>{d.reservas_hoje.length} reserva(s) iniciam hoje:</strong>{' '}
              {d.reservas_hoje.map(r => `${r.ferramenta} → ${r.usuario}`).join(' · ')}
            </AlertBanner>
          )}
        </div>
      )}

      {/* Cards principais */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard icon={Wrench}         label="Total"                value={d.total_ferramentas}    color="bg-iron-800 text-iron-300"            delay="0ms"   />
        <StatCard icon={CheckCircle}    label="Disponíveis"          value={d.disponiveis}           color="bg-emerald-900/50 text-emerald-400"   delay="50ms"  />
        <StatCard icon={ArrowLeftRight} label="Emprestadas"          value={d.emprestadas}           color="bg-amber-900/50 text-amber-400"       delay="100ms" />
        <StatCard icon={AlertTriangle}  label="Atrasadas"            value={d.atrasados?.length ?? 0} color="bg-red-900/50 text-red-400"          delay="150ms" sub={d.atrasados?.length > 0 ? 'Requer atenção' : undefined} />
        <StatCard icon={CalendarRange}  label="Reservas Ativas"      value={d.reservas_ativas}       color="bg-blue-900/50 text-blue-400"         delay="200ms" />
        <StatCard icon={ClipboardList}  label="Solic. Pendentes"     value={d.solicitacoes_pendentes} color="bg-purple-900/50 text-purple-400"    delay="250ms" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Empréstimos por mês */}
        {d.emp_por_mes?.length > 0 && (
          <div className="card p-5 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={14} className="text-amber-400" />
              <h3 className="text-xs font-semibold text-iron-400 uppercase tracking-wider">Empréstimos / mês</h3>
            </div>
            <BarChart
              data={d.emp_por_mes.map(m => ({ label: m.label, value: m.total }))}
              colorFn={() => '#f59e0b'}
            />
          </div>
        )}

        {/* Por categoria */}
        {d.por_categoria?.length > 0 && (
          <div className="card p-5 animate-slide-up" style={{ animationDelay: '350ms' }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-amber-400" />
              <h3 className="text-xs font-semibold text-iron-400 uppercase tracking-wider">Por categoria</h3>
            </div>
            <div className="space-y-2.5">
              {d.por_categoria.sort((a, b) => b.total - a.total).slice(0, 5).map(({ categoria, cor, total }) => {
                const pct = d.total_ferramentas > 0 ? (total / d.total_ferramentas) * 100 : 0
                return (
                  <div key={categoria}>
                    <div className="flex justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: cor || '#f59e0b' }} />
                        <span className="text-xs text-iron-300">{categoria}</span>
                      </div>
                      <span className="text-xs font-mono text-iron-500">{total}</span>
                    </div>
                    <div className="h-1.5 bg-iron-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: cor || '#f59e0b' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Ferramentas mais usadas */}
        {d.mais_usadas?.length > 0 && (
          <div className="card p-5 animate-slide-up" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center gap-2 mb-4">
              <Wrench size={14} className="text-amber-400" />
              <h3 className="text-xs font-semibold text-iron-400 uppercase tracking-wider">Mais usadas</h3>
            </div>
            <div className="space-y-2">
              {d.mais_usadas.map(({ ferramenta, usos }, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-lg bg-iron-800 flex items-center justify-center text-[10px] font-mono text-iron-500 flex-shrink-0">{i + 1}</span>
                  <p className="flex-1 text-xs text-iron-300 truncate">{ferramenta}</p>
                  <span className="text-xs font-mono text-amber-500">{usos}x</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detalhes atrasados */}
      {d.atrasados?.length > 0 && (
        <div className="card p-5 animate-slide-up" style={{ animationDelay: '450ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={14} className="text-red-400" />
            <h3 className="text-xs font-semibold text-iron-400 uppercase tracking-wider">Devoluções atrasadas</h3>
          </div>
          <div className="space-y-2">
            {d.atrasados.map(e => (
              <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-900/10 border border-red-800/30">
                <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-iron-200 truncate">{e.ferramenta}</p>
                  <p className="text-xs text-iron-500">{e.responsavel}</p>
                </div>
                <span className="text-xs text-red-400 font-mono flex-shrink-0">+{e.dias_atraso}d</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}