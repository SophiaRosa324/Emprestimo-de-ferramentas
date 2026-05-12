import { useEffect, useState } from 'react'
import { Users, ShieldCheck, Shield, Trash2, UserCheck, UserX, Pencil, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import DetalhesResponsavel from '../components/Detalhesresponsavel'

const NIVEL_LABELS = { membro: 'Membro', encarregado: 'Encarregado', administrador: 'Administrador' }
const NIVEL_CLS    = {
  membro:        'bg-iron-800 text-iron-400 border-iron-700/50',
  encarregado:   'bg-amber-900/40 text-amber-400 border-amber-800/40',
  administrador: 'bg-purple-900/40 text-purple-400 border-purple-800/40',
}

function fmt(d) { return new Date(d).toLocaleDateString('pt-BR') }

export default function Usuarios() {
  const api = useApi()
  const { usuario: me, isAdmin } = useAuth()
  const [usuarios,    setUsuarios]    = useState([])
  const [editando,    setEditando]    = useState(null)
  const [detalhes,    setDetalhes]    = useState(null)
  const [editForm,    setEditForm]    = useState({ setor: '', perfil: '', nivel_setor: '' })

  const carregar = () => api.listarUsuarios().then(setUsuarios).catch(() => toast.error('Erro ao carregar'))
  useEffect(() => { carregar() }, [])

  const toggleAtivo = async (u) => {
    try {
      const r = await api.toggleUsuarioAtivo(u.id)
      toast.success(r.ativo ? 'Usuário ativado.' : 'Usuário desativado.')
      carregar()
    } catch (e) { toast.error(e.message) }
  }

  const deletar = async (u) => {
    if (!confirm(`Excluir "${u.nome}" permanentemente?`)) return
    try { await api.deletarUsuario(u.id); toast.success('Usuário removido.'); carregar() }
    catch (e) { toast.error(e.message) }
  }

  const abrirEditar = (u) => {
    setEditForm({ setor: u.setor || '', perfil: u.perfil || 'operador', nivel_setor: u.nivel_setor || 'membro' })
    setEditando(u)
  }

  const salvarEdicao = async () => {
    try {
      await api.atualizarUsuario(editando.id, editForm)
      toast.success('Usuário atualizado!')
      setEditando(null)
      carregar()
    } catch (e) { toast.error(e.message) }
  }

  const initials = (nome) => nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()

  // Agrupar por setor
  const setores = [...new Set(usuarios.map(u => u.setor || 'Sem setor'))].sort()

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl text-iron-100">Usuários</h1>
        <p className="text-iron-500 text-sm mt-1">{usuarios.length} usuário(s) cadastrado(s)</p>
      </div>

      {setores.map(setor => {
        const membros = usuarios.filter(u => (u.setor || 'Sem setor') === setor)
        return (
          <div key={setor}>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xs font-semibold text-iron-500 uppercase tracking-wider">{setor}</h2>
              <div className="flex-1 h-px bg-iron-800/60" />
              <span className="text-[10px] text-iron-600">{membros.length}</span>
            </div>
            <div className="space-y-2">
              {membros.map((u, i) => (
                <div
                  key={u.id}
                  className={`card px-5 py-4 flex items-center gap-4 group animate-slide-up ${!u.ativo ? 'opacity-50' : ''}`}
                  style={{ animationDelay: `${i * 25}ms` }}
                >
                  <div className="w-9 h-9 rounded-full bg-iron-700 flex items-center justify-center text-sm font-medium text-iron-300 flex-shrink-0">
                    {initials(u.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-iron-100">{u.nome}</p>
                      {u.perfil === 'admin'
                        ? <ShieldCheck size={13} className="text-amber-400" />
                        : <Shield size={13} className="text-iron-600" />}
                      {u.id === me?.id && (
                        <span className="text-[10px] bg-iron-800 text-iron-500 px-2 py-0.5 rounded-full">você</span>
                      )}
                      {u.nivel_setor && u.nivel_setor !== 'membro' && (
                        <span className={`badge border text-[10px] ${NIVEL_CLS[u.nivel_setor] || ''}`}>
                          {NIVEL_LABELS[u.nivel_setor] || u.nivel_setor}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-iron-500 mt-0.5 truncate">
                      {u.email} · {u.perfil} · desde {fmt(u.criado_em)}
                    </p>
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="btn-ghost p-1.5 rounded-lg" onClick={() => setDetalhes(u.id)} title="Ver detalhes">
                      <Eye size={14} />
                    </button>
                    {isAdmin && u.id !== me?.id && (
                      <>
                        <button className="btn-ghost p-1.5 rounded-lg" onClick={() => abrirEditar(u)} title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button className="btn-ghost p-1.5 rounded-lg" onClick={() => toggleAtivo(u)} title={u.ativo ? 'Desativar' : 'Ativar'}>
                          {u.ativo ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                        <button className="btn-danger p-1.5 rounded-lg" onClick={() => deletar(u)} title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Modal de edição */}
      {editando && (
        <Modal title={`Editar: ${editando.nome}`} onClose={() => setEditando(null)} width="max-w-sm">
          <div className="space-y-4">
            <div>
              <label className="label">Setor</label>
              <input className="input" value={editForm.setor} onChange={e => setEditForm(f => ({ ...f, setor: e.target.value }))} placeholder="Ex: limpeza, manutenção…" />
            </div>
            <div>
              <label className="label">Perfil global</label>
              <select className="input" value={editForm.perfil} onChange={e => setEditForm(f => ({ ...f, perfil: e.target.value }))}>
                <option value="operador">Operador</option>
                <option value="encarregado">Encarregado</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="label">Nível no setor</label>
              <select className="input" value={editForm.nivel_setor} onChange={e => setEditForm(f => ({ ...f, nivel_setor: e.target.value }))}>
                <option value="membro">Membro</option>
                <option value="encarregado">Encarregado</option>
                <option value="administrador">Administrador</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button className="btn-ghost" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn-primary" onClick={salvarEdicao}>Salvar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de detalhes */}
      {detalhes && (
        <DetalhesResponsavel
          usuarioId={detalhes}
          onClose={() => setDetalhes(null)}
        />
      )}
    </div>
  )
}