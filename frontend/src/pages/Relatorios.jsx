import { useEffect, useState } from 'react'
import {
  Download, BarChart2, Wrench, ArrowLeftRight, AlertTriangle,
  CalendarRange, ClipboardList, Users, Filter, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'

function ReportCard({ icon: Icon, title, desc, color, children, onExport, loading }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
            <Icon size={16} strokeWidth={1.75} />
          </div>
          <div>
            <p className="font-medium text-iron-100 text-sm">{title}</p>
            <p className="text-xs text-iron-500">{desc}</p>
          </div>
        </div>
        {onExport && (
          <button className="btn-ghost text-xs gap-1.5" onClick={onExport}>
            <Download size={13} /> Excel
          </button>
        )}
      </div>
      {loading
        ? <div className="h-24 bg-iron-800/40 rounded-xl animate-pulse" />
        : children}
    </div>
  )
}

function TableRows({ rows, cols }) {
  if (!rows?.length) return <p className="text-xs text-iron-600 py-2 text-center">Nenhum dado.</p>
  return (
    <div className="overflow-auto rounded-xl border border-iron-800/60">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-iron-800/60">
            {cols.map(c => <th key={c.key} className="px-3 py-2 text-left text-iron-400 font-medium whitespace-nowrap">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-iron-800/40 hover:bg-iron-800/20 transition-colors">
              {cols.map(c => (
                <td key={c.key} className="px-3 py-2 text-iron-300 whitespace-nowrap">
                  {c.render ? c.render(row) : (row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

export default function Relatorios() {
  const api = useApi()
  const { authFetchRaw } = useAuth()
  // Filtros globais
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim,    setDataFim]    = useState('')
  const [setor,      setSetor]      = useState('')

  // Dados
  const [maisUsadas,     setMaisUsadas]     = useState([])
  const [atrasados,      setAtrasados]      = useState([])
  const [usoPorSetor,    setUsoPorSetor]    = useState([])
  const [solPendentes,   setSolPendentes]   = useState([])
  const [reservasAtivas, setReservasAtivas] = useState([])

  const [loading, setLoading] = useState({})

  const load = async (key, fn) => {
    setLoading(l => ({ ...l, [key]: true }))
    try { return await fn() }
    catch { toast.error(`Erro ao carregar ${key}`) }
    finally { setLoading(l => ({ ...l, [key]: false })) }
  }

  const carregar = () => {
    const params = {}
    if (dataInicio) params.data_inicio = new Date(dataInicio).toISOString()
    if (dataFim)    params.data_fim    = new Date(dataFim).toISOString()

    load('maisUsadas',     () => api.relatorioMaisUsadas(params)).then(r => r && setMaisUsadas(r))
    load('atrasados',      () => api.relatorioAtrasados(setor ? {setor} : {})).then(r => r && setAtrasados(r))
    load('usoPorSetor',    () => api.relatorioUsoPorSetor(params)).then(r => r && setUsoPorSetor(r))
    load('solPendentes',   () => api.relatorioSolPendentes(setor ? {setor} : {})).then(r => r && setSolPendentes(r))
    load('reservasAtivas', () => api.relatorioReservasAtivas()).then(r => r && setReservasAtivas(r))
  }

  useEffect(() => { carregar() }, [])

const exportar = async (url) => {
  try {
    const path = url.replace('/api', '')

    const response = await authFetchRaw(path)

    if (!response.ok) {
      throw new Error('Erro ao baixar arquivo')
    }

    const blob = await response.blob()

    const downloadUrl = window.URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = downloadUrl

    const disposition = response.headers.get('Content-Disposition')

    let filename = 'relatorio.xlsx'

    if (disposition?.includes('filename=')) {
      filename = disposition
        .split('filename=')[1]
        .replace(/"/g, '')
    }

    a.download = filename

    document.body.appendChild(a)
    a.click()
    a.remove()

    window.URL.revokeObjectURL(downloadUrl)

    toast.success('Download iniciado!')
  } catch (err) {
    console.error(err)
    toast.error(err.message || 'Erro ao exportar')
  }
}

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl text-iron-100">Relatórios</h1>
        <p className="text-iron-500 text-sm mt-1">Análise e exportação de dados</p>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <Filter size={15} className="text-iron-500 mt-5" />
        <div>
          <label className="label">Data início</label>
          <input type="date" className="input w-40" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
        </div>
        <div>
          <label className="label">Data fim</label>
          <input type="date" className="input w-40" value={dataFim} onChange={e => setDataFim(e.target.value)} />
        </div>
        <div>
          <label className="label">Setor</label>
          <input className="input w-36" placeholder="Ex: limpeza" value={setor} onChange={e => setSetor(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={carregar}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Ferramentas mais usadas */}
        <ReportCard
          icon={Wrench} color="bg-amber-900/40 text-amber-400"
          title="Ferramentas mais usadas" desc="Ranking por número de empréstimos"
          onExport={() => exportar(api.exportarFerramentas())}
          loading={loading.maisUsadas}
        >
          <TableRows
            rows={maisUsadas}
            cols={[
              { key: 'ferramenta', label: 'Ferramenta' },
              { key: 'usos',       label: 'Usos', render: r => <span className="font-mono text-amber-400">{r.usos}x</span> },
            ]}
          />
        </ReportCard>

        {/* Empréstimos atrasados */}
        <ReportCard
          icon={AlertTriangle} color="bg-red-900/40 text-red-400"
          title="Empréstimos atrasados" desc="Devoluções em atraso"
          onExport={() => exportar(api.exportarEmprestimos({ devolvida: false }))}
          loading={loading.atrasados}
        >
          <TableRows
            rows={atrasados}
            cols={[
              { key: 'ferramenta',  label: 'Ferramenta' },
              { key: 'responsavel', label: 'Responsável' },
              { key: 'dias_atraso', label: 'Atraso', render: r => <span className="font-mono text-red-400">+{r.dias_atraso}d</span> },
            ]}
          />
        </ReportCard>

        {/* Uso por setor */}
        <ReportCard
          icon={Users} color="bg-teal-900/40 text-teal-400"
          title="Solicitações por setor" desc="Volume de solicitações por área"
          loading={loading.usoPorSetor}
        >
          {usoPorSetor.length === 0
            ? <p className="text-xs text-iron-600 py-2 text-center">Nenhum dado.</p>
            : (
              <div className="space-y-2">
                {usoPorSetor.sort((a,b) => b.total - a.total).map(({ setor: s, total }) => {
                  const max = Math.max(...usoPorSetor.map(x => x.total), 1)
                  return (
                    <div key={s}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-iron-300 capitalize">{s}</span>
                        <span className="text-xs font-mono text-iron-500">{total}</span>
                      </div>
                      <div className="h-1.5 bg-iron-800 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(total/max)*100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }
        </ReportCard>

        {/* Solicitações pendentes */}
        <ReportCard
          icon={ClipboardList} color="bg-purple-900/40 text-purple-400"
          title="Solicitações pendentes" desc="Aguardando aprovação"
          loading={loading.solPendentes}
        >
          <TableRows
            rows={solPendentes}
            cols={[
              { key: 'item_nome', label: 'Item' },
              { key: 'setor',     label: 'Setor' },
              { key: 'usuario',   label: 'Usuário' },
              { key: 'criado_em', label: 'Data', render: r => fmt(r.criado_em) },
            ]}
          />
        </ReportCard>

        {/* Reservas ativas */}
        <ReportCard
          icon={CalendarRange} color="bg-blue-900/40 text-blue-400"
          title="Reservas ativas" desc="Reservas em vigor"
          loading={loading.reservasAtivas}
        >
          <TableRows
            rows={reservasAtivas}
            cols={[
              { key: 'ferramenta', label: 'Ferramenta' },
              { key: 'usuario',    label: 'Usuário' },
              { key: 'data_inicio',label: 'Início', render: r => fmt(r.data_inicio) },
              { key: 'data_fim',   label: 'Fim',    render: r => fmt(r.data_fim) },
            ]}
          />
        </ReportCard>

        {/* Exportação rápida */}
        <ReportCard
          icon={Download} color="bg-iron-700 text-iron-300"
          title="Exportação rápida" desc="Baixe os dados completos em Excel"
          loading={false}
        >
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-primary justify-center text-xs" onClick={() => exportar(api.exportarFerramentas())}>
              <Download size={12} /> Ferramentas
            </button>
            <button className="btn-primary justify-center text-xs" onClick={() => exportar(api.exportarEmprestimos())}>
              <Download size={12} /> Empréstimos
            </button>
          </div>
        </ReportCard>
      </div>
    </div>
  )
}