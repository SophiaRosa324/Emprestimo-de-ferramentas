import { useEffect, useState } from 'react'
import { Plus, Building2, Trash2, Pencil, Phone, Mail, MapPin, Wrench } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApi } from '../hooks/useApi'
import Modal from '../components/Modal'

export default function EmpresasManutencao() {
  const api = useApi()
  const [empresas,  setEmpresas]  = useState([])
  const [modal,     setModal]     = useState(false)
  const [editando,  setEditando]  = useState(null)
  const [form, setForm] = useState({ nome:'', telefone:'', email:'', endereco:'', tipo_servico:'', observacoes:'' })

  const carregar = () => api.listarEmpresasManutencao().then(setEmpresas).catch(() => toast.error('Erro ao carregar'))
  useEffect(() => { carregar() }, [])

  const abrirCriar = () => {
    setForm({ nome:'', telefone:'', email:'', endereco:'', tipo_servico:'', observacoes:'' })
    setEditando(null)
    setModal(true)
  }

  const abrirEditar = (e) => {
    setForm({ nome: e.nome, telefone: e.telefone||'', email: e.email||'', endereco: e.endereco||'', tipo_servico: e.tipo_servico||'', observacoes: e.observacoes||'' })
    setEditando(e)
    setModal(true)
  }

  const salvar = async () => {
    if (!form.nome.trim()) return toast.error('Nome é obrigatório')
    try {
      if (editando) {
        await api.atualizarEmpresaManutencao(editando.id, form)
        toast.success('Empresa atualizada!')
      } else {
        await api.criarEmpresaManutencao(form)
        toast.success('Empresa cadastrada!')
      }
      setModal(false)
      carregar()
    } catch (e) { toast.error(e.message) }
  }

  const deletar = async (e) => {
    if (!confirm(`Excluir "${e.nome}"?`)) return
    try { await api.deletarEmpresaManutencao(e.id); toast.success('Removida.'); carregar() }
    catch (err) { toast.error(err.message) }
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-iron-100">Empresas de Manutenção</h1>
          <p className="text-iron-500 text-sm mt-1">{empresas.length} empresa(s) cadastrada(s)</p>
        </div>
        <button className="btn-primary" onClick={abrirCriar}><Plus size={16} /> Nova empresa</button>
      </div>

      {empresas.length === 0 ? (
        <div className="text-center py-24 space-y-3">
          <Building2 size={40} className="text-iron-700 mx-auto" strokeWidth={1} />
          <p className="text-iron-500">Nenhuma empresa cadastrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {empresas.map((e, i) => (
            <div key={e.id} className="card p-5 space-y-3 group animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-iron-800/60 border border-iron-700/50 flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} className="text-iron-400" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-iron-100 truncate">{e.nome}</p>
                    {e.tipo_servico && (
                      <p className="text-xs text-iron-500 mt-0.5 truncate">{e.tipo_servico}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button className="btn-ghost p-1.5 rounded-lg" onClick={() => abrirEditar(e)}><Pencil size={13} /></button>
                  <button className="btn-danger p-1.5 rounded-lg" onClick={() => deletar(e)}><Trash2 size={13} /></button>
                </div>
              </div>

              <div className="space-y-1.5">
                {e.telefone && (
                  <div className="flex items-center gap-2 text-xs text-iron-500">
                    <Phone size={11} className="flex-shrink-0" />{e.telefone}
                  </div>
                )}
                {e.email && (
                  <div className="flex items-center gap-2 text-xs text-iron-500">
                    <Mail size={11} className="flex-shrink-0" />{e.email}
                  </div>
                )}
                {e.endereco && (
                  <div className="flex items-center gap-2 text-xs text-iron-500">
                    <MapPin size={11} className="flex-shrink-0" />{e.endereco}
                  </div>
                )}
              </div>

              {e.total_servicos > 0 && (
                <div className="flex items-center gap-1.5 pt-1 border-t border-iron-800/40">
                  <Wrench size={11} className="text-amber-400" />
                  <span className="text-xs text-amber-500">{e.total_servicos} serviço(s) registrado(s)</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={editando ? 'Editar empresa' : 'Nova empresa'} onClose={() => setModal(false)} width="max-w-md">
          <div className="space-y-4">
            <div>
              <label className="label">Nome *</label>
              <input className="input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Razão social ou nome fantasia" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Telefone</label>
                <input className="input" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-0000" />
              </div>
              <div>
                <label className="label">E-mail</label>
                <input className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contato@empresa.com" />
              </div>
            </div>
            <div>
              <label className="label">Endereço</label>
              <input className="input" value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} placeholder="Rua, número, cidade" />
            </div>
            <div>
              <label className="label">Tipos de serviço</label>
              <input className="input" value={form.tipo_servico} onChange={e => setForm(f => ({ ...f, tipo_servico: e.target.value }))} placeholder="Ex: elétrica, hidráulica, mecânica" />
            </div>
            <div>
              <label className="label">Observações</label>
              <textarea className="input resize-none" rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Informações adicionais…" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button className="btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={salvar}>Salvar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}