import { useEffect, useState } from 'react'
import { Plus, Tag, Trash2, Pencil, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApi } from '../hooks/useApi'
import Modal from '../components/Modal'
import DetalhesCategoriaModal from '../components/DetalhesCategoriaModal'

const CORES = ['#F59E0B','#3B82F6','#EF4444','#10B981','#8B5CF6','#EC4899','#F97316','#06B6D4','#84CC16','#6366f1']

const ICONES = [
  { value: 'wrench',       label: '🔧 Chave'        },
  { value: 'zap',          label: '⚡ Elétrica'     },
  { value: 'scissors',     label: '✂️ Corte'        },
  { value: 'ruler',        label: '📏 Medição'      },
  { value: 'drill',        label: '🔩 Perfuração'   },
  { value: 'hammer',       label: '🔨 Fixação'      },
  { value: 'thermometer',  label: '🌡️ Medição'      },
  { value: 'package',      label: '📦 Geral'        },
]

export default function Categorias() {
  const api = useApi()
  const [categorias, setCategorias] = useState([])
  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [detalhes,   setDetalhes]   = useState(null)
  const [form, setForm] = useState({ nome: '', cor: CORES[0], icone: 'wrench', descricao: '' })

  const carregar = () => api.listarCategorias().then(setCategorias).catch(() => toast.error('Erro ao carregar'))
  useEffect(() => { carregar() }, [])

  const abrirCriar = () => {
    setForm({ nome: '', cor: CORES[0], icone: 'wrench', descricao: '' })
    setEditando(null)
    setModal(true)
  }

  const abrirEditar = (c, e) => {
    e.stopPropagation()
    setForm({ nome: c.nome, cor: c.cor || CORES[0], icone: c.icone || 'wrench', descricao: c.descricao || '' })
    setEditando(c)
    setModal(true)
  }

  const salvar = async () => {
    if (!form.nome.trim()) return toast.error('Nome é obrigatório')
    try {
      if (editando) {
        await api.atualizarCategoria(editando.id, form)
        toast.success('Categoria atualizada!')
      } else {
        await api.criarCategoria(form)
        toast.success('Categoria criada!')
      }
      setModal(false)
      carregar()
    } catch (e) { toast.error(e.message) }
  }

  const deletar = async (c, e) => {
    e.stopPropagation()
    if (!confirm(`Excluir "${c.nome}"?`)) return
    try { await api.deletarCategoria(c.id); toast.success('Removida.'); carregar() }
    catch (e) { toast.error(e.message) }
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-iron-100">Categorias</h1>
          <p className="text-iron-500 text-sm mt-1">{categorias.length} categorias cadastradas</p>
        </div>
        <button className="btn-primary" onClick={abrirCriar}><Plus size={16} /> Nova</button>
      </div>

      {categorias.length === 0 ? (
        <div className="text-center py-24 space-y-3">
          <Tag size={40} className="text-iron-700 mx-auto" strokeWidth={1} />
          <p className="text-iron-500">Nenhuma categoria ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {categorias.map((c, i) => (
            <div
              key={c.id}
              onClick={() => setDetalhes(c.id)}
              className="card p-4 flex items-center gap-3 group cursor-pointer hover:border-opacity-60 transition-all animate-slide-up"
              style={{ animationDelay: `${i * 40}ms`, '--hover-color': c.cor }}
            >
              <div
                className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: c.cor + '33', border: `1px solid ${c.cor}55` }}
              >
                <div className="w-4 h-4 rounded-full" style={{ background: c.cor }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-iron-200 truncate group-hover:text-iron-100 transition-colors">{c.nome}</p>
                {c.descricao && <p className="text-[10px] text-iron-600 truncate mt-0.5">{c.descricao}</p>}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="btn-ghost p-1.5 rounded-lg" onClick={(e) => abrirEditar(c, e)}><Pencil size={12} /></button>
                <button className="btn-danger p-1.5 rounded-lg" onClick={(e) => deletar(c, e)}><Tag size={12} /></button>
              </div>
              <ChevronRight size={14} className="text-iron-700 group-hover:text-iron-400 transition-colors flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <Modal title={editando ? 'Editar categoria' : 'Nova categoria'} onClose={() => setModal(false)} width="max-w-sm">
          <div className="space-y-4">
            <div>
              <label className="label">Nome *</label>
              <input className="input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Elétrica" autoFocus />
            </div>
            <div>
              <label className="label">Descrição</label>
              <input className="input" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Breve descrição opcional" />
            </div>
            <div>
              <label className="label">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {CORES.map(cor => (
                  <button
                    key={cor}
                    onClick={() => setForm(f => ({ ...f, cor }))}
                    className={`w-8 h-8 rounded-lg transition-all ${form.cor === cor ? 'ring-2 ring-offset-2 ring-offset-iron-900 ring-white scale-110' : 'hover:scale-105'}`}
                    style={{ background: cor }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button className="btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={salvar}>Salvar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal detalhes */}
      {detalhes && (
        <DetalhesCategoriaModal
          categoriaId={detalhes}
          onClose={() => setDetalhes(null)}
        />
      )}
    </div>
  )
}