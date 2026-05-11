import { useEffect, useState, useCallback } from 'react'
import { Plus, Wrench, Search, X, BarChart2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApi } from '../hooks/useApi'
import Modal from '../components/Modal'
import StatusManutencaoBadge from '../components/StatusManutencaoBadge'
import DetalhesManutencaoModal from '../components/DetalhesManutencaoModal'

const STATUS_TABS = [
  { value: '',                label: 'Todas'         },
  { value: 'aguardando_envio',label: 'Ag. envio'     },
  { value: 'em_manutencao',   label: 'Em manutenção' },
  { value: 'concluida',       label: 'Concluídas'    },
  { value: 'cancelada',       label: 'Canceladas'    },
]

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function Manutencao() {
  const api = useApi()

  const [manutencoes, setManutencoes]   = useState([])
  const [ferramentas, setFerramentas]   = useState([])
  const [empresas,    setEmpresas]      = useState([])
  const [stats,       setStats]         = useState(null)
  const [filtroStatus,setFiltroStatus]  = useState('')
  const [busca,       setBusca]         = useState('')
  const [detalhes,    setDetalhes]      = useState(null)
  const [modal,       setModal]         = useState(false)
  const [loading,     setLoading]       = useState(true)

  const [form, setForm] = useState({
    ferramenta_id: '',
    empresa_id: '',
    problema: '',
    descricao_servico: '',
    data_envio: '',
    data_retorno_prev: '',
    valor: '',
    observacoes: '',
  })

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filtroStatus) params.status = filtroStatus
      const [m, f, e, s] = await Promise.all([
        api.listarManutencoes(params),
        api.listarFerramentas(),
        api.listarEmpresasManutencao(),
        api.resumoManutencao(),
      ])
      setManutencoes(m)
      setFerramentas(f)
      setEmpresas(e)
      setStats(s)
    } catch { toast.error('Erro ao carregar manutenções') }
    finally { setLoading(false) }
  }, [filtroStatus])

  useEffect(() => { carregar() }, [carregar])

  const criar = async () => {
    if (!form.ferramenta_id) return toast.error('Selecione a ferramenta.')
    if (!form.problema.trim()) return toast.error('Descreva o problema.')
    try {
      await api.criarManutencao({
        ferramenta_id:     parseInt(form.ferramenta_id),
        empresa_id:        form.empresa_id ? parseInt(form.empresa_id) : null,
        problema:          form.problema,
        descricao_servico: form.descricao_servico || null,
        data_envio:        form.data_envio        ? new Date(form.data_envio).toISOString()        : null,
        data_retorno_prev: form.data_retorno_prev ? new Date(form.data_retorno_prev).toISOString() : null,
        valor:             form.valor ? parseFloat(form.valor) : null,
        observacoes:       form.observacoes || null,
      })
      toast.success('Manutenção registrada!')
      setModal(false)
      setForm({ ferramenta_id:'', empresa_id:'', problema:'', descricao_servico:'', data_envio:'', data_retorno_prev:'', valor:'', observacoes:'' })
      carregar()
    } catch (e) { toast.error(e.message) }
  }

  const filtradas = manutencoes.filter(m =>
    !busca ||
    m.ferramenta_nome.toLowerCase().includes(busca.toLowerCase()) ||
    (m.ferramenta_codigo || '').toLowerCase().includes(busca.toLowerCase()) ||
    m.problema.toLowerCase().includes(busca.toLowerCase())
  )

  const ferramentasDisp = ferramentas.filter(f => f.estado === 'disponivel' || f.estado === 'manutencao')

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-iron-100">Manutenção</h1>
          <p className="text-iron-500 text-sm mt-1">{manutencoes.length} registro(s)</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={carregar}><RefreshCw size={15} /></button>
          <button className="btn-primary" onClick={() => setModal(true)}><Plus size={16} /> Nova manutenção</button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Ag. envio',     value: stats.por_status?.aguardando_envio ?? 0, color: 'bg-iron-800/60 text-iron-300'           },
            { label: 'Em manutenção', value: stats.por_status?.em_manutencao    ?? 0, color: 'bg-amber-900/40 text-amber-400'         },
            { label: 'Concluídas',    value: stats.por_status?.concluida        ?? 0, color: 'bg-emerald-900/40 text-emerald-400'     },
            { label: 'Custo total',   value: `R$ ${stats.custo_total?.toFixed(2) ?? '0,00'}`, color: 'bg-iron-800/60 text-iron-300'  },
          ].map(({ label, value, color }) => (
            <div key={label} className={`card p-4 flex flex-col gap-1`}>
              <p className={`text-xl font-display ${color.split(' ')[1]}`}>{value}</p>
              <p className="text-xs text-iron-500 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-1 bg-iron-900/60 border border-iron-800/60 rounded-xl p-1">
          {STATUS_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFiltroStatus(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filtroStatus === value ? 'bg-amber-500 text-iron-950' : 'text-iron-400 hover:text-iron-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-iron-500" />
          <input className="input pl-9 text-sm" placeholder="Buscar ferramenta, código ou problema…"
            value={busca} onChange={e => setBusca(e.target.value)} />
          {busca && <button className="absolute right-3 top-1/2 -translate-y-1/2 text-iron-500" onClick={() => setBusca('')}><X size={13} /></button>}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-iron-800/40 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-24 space-y-3">
          <Wrench size={40} className="text-iron-700 mx-auto" strokeWidth={1} />
          <p className="text-iron-500">Nenhuma manutenção encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((m, i) => (
            <div
              key={m.id}
              onClick={() => setDetalhes(m)}
              className="card p-5 flex items-center gap-4 cursor-pointer group hover:border-amber-500/30 hover:bg-iron-800/30 transition-all animate-slide-up"
              style={{ animationDelay: `${i * 25}ms` }}
            >
              {/* Ícone estado */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                m.status === 'em_manutencao'   ? 'bg-amber-900/40'   :
                m.status === 'concluida'       ? 'bg-emerald-900/40' :
                m.status === 'cancelada'       ? 'bg-red-900/40'     :
                'bg-iron-800/60'
              }`}>
                <Wrench size={18} className={
                  m.status === 'em_manutencao'   ? 'text-amber-400'   :
                  m.status === 'concluida'       ? 'text-emerald-400' :
                  m.status === 'cancelada'       ? 'text-red-400'     :
                  'text-iron-500'
                } strokeWidth={1.5} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-iron-100 text-sm truncate group-hover:text-amber-300 transition-colors">
                    {m.ferramenta_nome}
                  </p>
                  {m.ferramenta_codigo && (
                    <span className="font-mono text-[10px] bg-iron-800 text-iron-500 px-1.5 py-0.5 rounded flex-shrink-0">
                      {m.ferramenta_codigo}
                    </span>
                  )}
                  <StatusManutencaoBadge status={m.status} />
                </div>
                <p className="text-xs text-iron-500 mt-1 truncate">{m.problema}</p>
                <div className="flex items-center gap-3 mt-1">
                  {m.empresa_nome && <span className="text-[10px] text-iron-600">{m.empresa_nome}</span>}
                  {m.data_envio   && <span className="text-[10px] text-iron-600">Envio: {fmt(m.data_envio)}</span>}
                  {m.data_retorno_prev && <span className="text-[10px] text-iron-600">Prev: {fmt(m.data_retorno_prev)}</span>}
                  {m.valor        && <span className="text-[10px] text-amber-500 font-mono">R$ {m.valor.toFixed(2)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal nova manutenção */}
      {modal && (
        <Modal title="Nova manutenção" onClose={() => setModal(false)} width="max-w-lg">
          <div className="space-y-4">
            <div>
              <label className="label">Ferramenta *</label>
              <select className="input" value={form.ferramenta_id} onChange={e => setForm(f => ({ ...f, ferramenta_id: e.target.value }))}>
                <option value="">Selecione…</option>
                {ferramentasDisp.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.codigo ? `[${f.codigo}] ` : ''}{f.nome} — {f.estado === 'disponivel' ? 'disponível' : 'já em manutenção'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Problema *</label>
              <input className="input" value={form.problema}
                onChange={e => setForm(f => ({ ...f, problema: e.target.value }))}
                placeholder="Descreva o problema encontrado…" />
            </div>
            <div>
              <label className="label">Empresa de manutenção</label>
              <select className="input" value={form.empresa_id} onChange={e => setForm(f => ({ ...f, empresa_id: e.target.value }))}>
                <option value="">Selecionar empresa (opcional)</option>
                {empresas.filter(e => e.ativa !== false).map(e => (
                  <option key={e.id} value={e.id}>{e.nome}{e.tipo_servico ? ` — ${e.tipo_servico}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Data de envio</label>
                <input type="date" className="input" value={form.data_envio}
                  onChange={e => setForm(f => ({ ...f, data_envio: e.target.value }))} />
              </div>
              <div>
                <label className="label">Retorno previsto</label>
                <input type="date" className="input" value={form.data_retorno_prev}
                  onChange={e => setForm(f => ({ ...f, data_retorno_prev: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Observações</label>
              <textarea className="input resize-none" rows={2} value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder="Informações adicionais…" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button className="btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={criar}>Registrar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal detalhes */}
      {detalhes && (
        <DetalhesManutencaoModal
          manutencao={detalhes}
          onClose={() => setDetalhes(null)}
          onUpdate={() => { setDetalhes(null); carregar() }}
        />
      )}
    </div>
  )
}