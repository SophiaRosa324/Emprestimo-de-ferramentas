import { useEffect, useState, useCallback } from 'react'
import { Plus, ClipboardList, Clock, CheckCircle2, XCircle, PackageCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import SearchSelect from '../components/SearchSelect'

const STATUS_CONFIG = {
  pendente:  { cls: 'bg-amber-900/50 text-amber-400 border border-amber-800/50',        label: 'Pendente'  },
  aprovado:  { cls: 'bg-blue-900/50 text-blue-400 border border-blue-800/50',           label: 'Aprovado'  },
  recusado:  { cls: 'bg-red-900/50 text-red-400 border border-red-800/50',              label: 'Recusado'  },
  concluido: { cls: 'bg-emerald-900/50 text-emerald-400 border border-emerald-800/50',  label: 'Concluído' },
}

function StatusSol({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pendente
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
}

function fmt(d) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function Solicitacoes() {
  const api = useApi()
  const { usuario } = useAuth()
  const [solicitacoes, setSolicitacoes]   = useState([])
  const [ferramentas,  setFerramentas]    = useState([])
  const [filtroStatus, setFiltroStatus]   = useState('')
  const [modal,        setModal]          = useState(false)
  const [form,         setForm]           = useState({ tipo: 'ferramenta', item_nome: '', item_id: null, descricao: '' })
  const [loading,      setLoading]        = useState(true)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filtroStatus) params.status = filtroStatus
      const [sols, ferrs] = await Promise.all([
        api.listarSolicitacoes(params),
        api.listarFerramentas(),
      ])
      setSolicitacoes(sols)
      setFerramentas(ferrs)
    } catch { toast.error('Erro ao carregar solicitações') }
    finally { setLoading(false) }
  }, [filtroStatus])

  useEffect(() => { carregar() }, [carregar])

  // Opções para o SearchSelect — mostra disponibilidade
  const ferramentaOptions = ferramentas.map(f => ({
    value: f.id,
    label: f.nome,
    sublabel: f.estado === 'disponivel' ? '● Disponível' : f.estado === 'emprestada' ? '○ Emprestada' : '○ Manutenção',
  }))

  const handleFerramentaSelect = (id) => {
    const f = ferramentas.find(x => x.id === id)
    setForm(prev => ({ ...prev, item_id: id, item_nome: f ? f.nome : '' }))
  }

  const criar = async () => {
    if (!form.item_nome.trim()) return toast.error('Informe o item.')
    try {
      await api.criarSolicitacao({ tipo: form.tipo, item_nome: form.item_nome, descricao: form.descricao })
      toast.success('Solicitação enviada!')
      setModal(false)
      setForm({ tipo: 'ferramenta', item_nome: '', item_id: null, descricao: '' })
      carregar()
    } catch (e) { toast.error(e.message) }
  }

  const TABS = [
    { value: '',          label: 'Todas'      },
    { value: 'pendente',  label: 'Pendentes'  },
    { value: 'aprovado',  label: 'Aprovadas'  },
    { value: 'concluido', label: 'Concluídas' },
  ]

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-iron-100">Solicitações</h1>
          <p className="text-iron-500 text-sm mt-1">
            {usuario?.setor ? `Setor: ${usuario.setor}` : 'Suas solicitações'}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus size={16} /> Nova solicitação
        </button>
      </div>

      <div className="flex gap-1 bg-iron-900/60 border border-iron-800/60 rounded-xl p-1 w-fit">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFiltroStatus(value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filtroStatus === value ? 'bg-amber-500 text-iron-950' : 'text-iron-400 hover:text-iron-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-iron-500 text-sm text-center py-16">Carregando…</div>
      ) : solicitacoes.length === 0 ? (
        <div className="text-center py-24 space-y-3">
          <ClipboardList size={40} className="text-iron-700 mx-auto" strokeWidth={1} />
          <p className="text-iron-500">Nenhuma solicitação encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {solicitacoes.map((s, i) => (
            <div key={s.id} className="card p-5 flex items-center gap-4 animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.tipo === 'ferramenta' ? 'bg-amber-900/40' : 'bg-blue-900/40'}`}>
                <ClipboardList size={18} className={s.tipo === 'ferramenta' ? 'text-amber-400' : 'text-blue-400'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-iron-100 text-sm">{s.item_nome}</p>
                  <span className="text-[10px] bg-iron-800 text-iron-500 px-2 py-0.5 rounded-full capitalize">{s.tipo}</span>
                  <StatusSol status={s.status} />
                </div>
                <p className="text-xs text-iron-500 mt-1">{s.usuario_nome} · {s.setor} · {fmt(s.criado_em)}</p>
                {s.descricao && <p className="text-xs text-iron-600 mt-1 italic truncate">{s.descricao}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title="Nova solicitação" onClose={() => setModal(false)} width="max-w-md">
          <div className="space-y-4">
            <div>
              <label className="label">Tipo</label>
              <div className="flex gap-2">
                {['ferramenta', 'compra'].map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, tipo: t, item_nome: '', item_id: null }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all capitalize ${
                      form.tipo === t
                        ? 'bg-amber-500 text-iron-950 border-amber-500'
                        : 'bg-iron-800/60 text-iron-400 border-iron-700/60 hover:text-iron-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* ComboBox para ferramenta, input livre para compra */}
            {form.tipo === 'ferramenta' ? (
              <div>
                <label className="label">Ferramenta *</label>
                <SearchSelect
                  options={ferramentaOptions}
                  value={form.item_id}
                  onChange={handleFerramentaSelect}
                  placeholder="Buscar ferramenta…"
                />
                {form.item_id && ferramentas.find(f => f.id === form.item_id)?.estado !== 'disponivel' && (
                  <p className="text-xs text-amber-400 mt-1.5">⚠ Esta ferramenta não está disponível no momento.</p>
                )}
              </div>
            ) : (
              <div>
                <label className="label">Item *</label>
                <input
                  className="input"
                  value={form.item_nome}
                  onChange={e => setForm(f => ({ ...f, item_nome: e.target.value }))}
                  placeholder="Ex: Luvas de proteção tamanho G"
                  autoFocus
                />
              </div>
            )}

            <div>
              <label className="label">Justificativa</label>
              <textarea
                className="input resize-none"
                rows={3}
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva o motivo da solicitação…"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button className="btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={criar}>Enviar solicitação</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}