import { useEffect, useState } from 'react'
import { Plus, Users, Trash2, Pencil, ChevronRight, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApi } from '../hooks/useApi'
import Modal from '../components/Modal'
import DetalhesResponsavelModal from '../components/DetalhesResponsavelModal'

export default function Responsaveis() {
  const api = useApi()
  const [responsaveis, setResponsaveis] = useState([])
  const [modal,        setModal]        = useState(false)
  const [editando,     setEditando]     = useState(null)
  const [detalhes,     setDetalhes]     = useState(null)
  const [busca,        setBusca]        = useState('')
  const [form, setForm] = useState({ nome: '', contato: '', setor: '', cargo: '' })

  const carregar = () => api.listarResponsaveis().then(setResponsaveis).catch(() => toast.error('Erro ao carregar'))
  useEffect(() => { carregar() }, [])

  const abrirCriar = () => {
    setForm({ nome: '', contato: '', setor: '', cargo: '' })
    setEditando(null)
    setModal(true)
  }

  const abrirEditar = (r, e) => {
    e.stopPropagation()
    setForm({ nome: r.nome, contato: r.contato || '', setor: r.setor || '', cargo: r.cargo || '' })
    setEditando(r)
    setModal(true)
  }

  const salvar = async () => {
    if (!form.nome.trim()) return toast.error('Nome é obrigatório')
    try {
      if (editando) {
        await api.atualizarResponsavel(editando.id, form)
        toast.success('Responsável atualizado!')
      } else {
        await api.criarResponsavel(form)
        toast.success('Responsável criado!')
      }
      setModal(false)
      carregar()
    } catch (e) { toast.error(e.message) }
  }

  const deletar = async (r, e) => {
    e.stopPropagation()
    if (!confirm(`Remover "${r.nome}"?`)) return
    try { await api.deletarResponsavel(r.id); toast.success('Removido.'); carregar() }
    catch (e) { toast.error(e.message) }
  }

  const initials = (nome) => nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()

  const filtrados = responsaveis.filter(r =>
    !busca || r.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (r.setor || '').toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-iron-100">Responsáveis</h1>
          <p className="text-iron-500 text-sm mt-1">{responsaveis.length} cadastrados</p>
        </div>
        <button className="btn-primary" onClick={abrirCriar}><Plus size={16} /> Novo</button>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-iron-500" />
        <input
          className="input pl-9"
          placeholder="Buscar por nome ou setor…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-24 space-y-3">
          <Users size={40} className="text-iron-700 mx-auto" strokeWidth={1} />
          <p className="text-iron-500">Nenhum responsável encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map((r, i) => (
            <div
              key={r.id}
              onClick={() => setDetalhes(r.id)}
              className="card px-5 py-4 flex items-center gap-4 group cursor-pointer hover:border-amber-500/30 hover:bg-iron-800/40 transition-all animate-slide-up"
              style={{ animationDelay: `${i * 25}ms` }}
            >
              <div className="w-9 h-9 rounded-full bg-iron-700 flex items-center justify-center text-sm font-medium text-iron-300 flex-shrink-0 group-hover:bg-amber-900/40 group-hover:text-amber-400 transition-colors">
                {initials(r.nome)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-iron-100 group-hover:text-amber-300 transition-colors">{r.nome}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {r.contato && <p className="text-xs text-iron-500 truncate">{r.contato}</p>}
                  {r.setor   && <span className="text-[10px] border border-iron-700/60 text-iron-500 px-2 py-0.5 rounded-full capitalize">{r.setor}</span>}
                  {r.cargo   && <span className="text-[10px] text-iron-600">{r.cargo}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="btn-ghost p-1.5 rounded-lg" onClick={(e) => abrirEditar(r, e)}><Pencil size={13} /></button>
                <button className="btn-danger p-1.5 rounded-lg" onClick={(e) => deletar(r, e)}><Trash2 size={13} /></button>
              </div>
              <ChevronRight size={14} className="text-iron-700 group-hover:text-amber-500 transition-colors flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <Modal title={editando ? 'Editar responsável' : 'Novo responsável'} onClose={() => setModal(false)} width="max-w-sm">
          <div className="space-y-4">
            <div>
              <label className="label">Nome *</label>
              <input className="input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="João Silva" autoFocus />
            </div>
            <div>
              <label className="label">Contato</label>
              <input className="input" value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} placeholder="email ou telefone" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Setor</label>
                <input className="input" value={form.setor} onChange={e => setForm(f => ({ ...f, setor: e.target.value }))} placeholder="Ex: manutenção" />
              </div>
              <div>
                <label className="label">Cargo</label>
                <input className="input" value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} placeholder="Ex: técnico" />
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
        <DetalhesResponsavelModal
          responsavelId={detalhes}
          onClose={() => setDetalhes(null)}
        />
      )}
    </div>
  )
}