import { useEffect, useState, useCallback } from 'react'
import { ShieldCheck, CheckCircle2, XCircle, PackageCheck, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

function fmt(d) {
  return new Date(d).toLocaleDateString('pt-BR')
}

const STATUS_ACOES = {
  pendente:  ['aprovado', 'recusado'],
  aprovado:  ['concluido', 'recusado'],
  recusado:  [],
  concluido: [],
}

const ACAO_CONFIG = {
  aprovado:  { label: 'Aprovar',   cls: 'btn-primary text-xs py-1 px-3'  },
  recusado:  { label: 'Recusar',   cls: 'btn-danger text-xs py-1 px-3'   },
  concluido: { label: 'Concluir',  cls: 'btn-ghost border border-emerald-800/60 text-emerald-400 text-xs py-1 px-3' },
}

export default function Aprovacoes() {
  const api = useApi()
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [solicitacoes, setSolicitacoes] = useState([])
  const [filtroStatus, setFiltroStatus] = useState('pendente')
  const [filtroSetor, setFiltroSetor] = useState('')
  const [loading, setLoading] = useState(true)

  // Redireciona se não for admin/encarregado
  useEffect(() => {
    if (usuario && !['admin', 'encarregado'].includes(usuario.perfil)) {
      navigate('/')
    }
  }, [usuario])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filtroStatus) params.status = filtroStatus
      if (filtroSetor) params.setor = filtroSetor
      setSolicitacoes(await api.listarSolicitacoes(params))
    } catch { toast.error('Erro ao carregar') }
    finally { setLoading(false) }
  }, [filtroStatus, filtroSetor])

  useEffect(() => { carregar() }, [carregar])

  const atualizar = async (id, status) => {
    try {
      await api.atualizarSolicitacao(id, status)
      toast.success(`Solicitação ${status}!`)
      carregar()
    } catch (e) { toast.error(e.message) }
  }

  const setores = [...new Set(solicitacoes.map(s => s.setor))].filter(Boolean)

  const TABS = [
    { value: 'pendente',  label: 'Pendentes'  },
    { value: 'aprovado',  label: 'Aprovadas'  },
    { value: 'recusado',  label: 'Recusadas'  },
    { value: 'concluido', label: 'Concluídas' },
    { value: '',          label: 'Todas'      },
  ]

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-900/40 flex items-center justify-center">
          <ShieldCheck size={20} className="text-amber-400" />
        </div>
        <div>
          <h1 className="font-display text-3xl text-iron-100">Aprovações</h1>
          <p className="text-iron-500 text-sm mt-0.5">Gerencie solicitações de todos os setores</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-1 bg-iron-900/60 border border-iron-800/60 rounded-xl p-1">
          {TABS.map(({ value, label }) => (
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
        {setores.length > 0 && (
          <select className="input w-44 text-xs" value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)}>
            <option value="">Todos os setores</option>
            {setores.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="text-iron-500 text-sm text-center py-16">Carregando…</div>
      ) : solicitacoes.length === 0 ? (
        <div className="text-center py-24">
          <CheckCircle2 size={40} className="text-iron-700 mx-auto mb-3" strokeWidth={1} />
          <p className="text-iron-500">Nenhuma solicitação neste filtro.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {solicitacoes.map((s, i) => {
            const acoes = STATUS_ACOES[s.status] || []
            return (
              <div key={s.id} className="card p-5 flex items-center gap-4 animate-slide-up" style={{ animationDelay: `${i * 25}ms` }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-iron-100 text-sm">{s.item_nome}</p>
                    <span className="text-[10px] bg-iron-800 text-iron-500 px-2 py-0.5 rounded-full capitalize">{s.tipo}</span>
                    <span className="text-[10px] border border-iron-700 text-iron-500 px-2 py-0.5 rounded-full">{s.setor}</span>
                  </div>
                  <p className="text-xs text-iron-500 mt-1">
                    {s.usuario_nome} · {fmt(s.criado_em)}
                  </p>
                  {s.descricao && <p className="text-xs text-iron-600 mt-1 italic">{s.descricao}</p>}
                </div>

                {/* Ações */}
                {acoes.length > 0 && (
                  <div className="flex gap-2 flex-shrink-0">
                    {acoes.map(acao => (
                      <button
                        key={acao}
                        onClick={() => atualizar(s.id, acao)}
                        className={ACAO_CONFIG[acao].cls}
                      >
                        {ACAO_CONFIG[acao].label}
                      </button>
                    ))}
                  </div>
                )}
                {acoes.length === 0 && (
                  <span className="text-xs text-iron-600 capitalize">{s.status}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}