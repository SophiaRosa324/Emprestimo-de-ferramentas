import { useEffect, useState, useCallback, useRef } from 'react'
import { Plus, Search, Wrench, X, Pencil, Trash2, Camera } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApi } from '../hooks/useApi'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'

const ESTADOS = ['disponivel', 'emprestada', 'manutencao']
const ESTADO_LABELS = { disponivel: 'Disponível', emprestada: 'Emprestada', manutencao: 'Manutenção' }

function FotoUpload({ preview, onChange }) {
  const inputRef = useRef()
  return (
    <div
      className="relative w-24 h-24 rounded-2xl bg-iron-800 border-2 border-dashed border-iron-700 hover:border-amber-500/60 flex items-center justify-center cursor-pointer overflow-hidden transition-all group"
      onClick={() => inputRef.current?.click()}
      title="Clique para adicionar foto"
    >
      {preview
        ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
        : <Wrench size={24} className="text-iron-600 group-hover:text-iron-400 transition-colors" strokeWidth={1} />}
      <div className="absolute inset-0 bg-iron-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
        <Camera size={20} className="text-iron-200" />
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => onChange(e.target.files[0])}
      />
    </div>
  )
}

function FerramentaForm({ inicial = {}, categorias, onSave, onCancel }) {
  const [form, setForm] = useState({
    nome: '', descricao: '', numero_serie: '', localizacao: '',
    estado: 'disponivel', categoria_id: '', ...inicial,
  })
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(inicial.foto ? `/api/uploads/${inicial.foto}` : null)
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFoto = (file) => {
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const submit = async () => {
    if (!form.nome.trim()) return toast.error('Nome é obrigatório')
    setSaving(true)
    try {
      const payload = {
        ...form,
        categoria_id: form.categoria_id ? parseInt(form.categoria_id) : null,
      }
      await onSave(payload, fotoFile)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Foto no topo do form */}
      <div className="flex items-center gap-4">
        <FotoUpload preview={fotoPreview} onChange={handleFoto} />
        <div className="flex-1">
          <label className="label">Nome *</label>
          <input className="input" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Furadeira Bosch 750W" autoFocus />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Nº de série</label>
          <input className="input" value={form.numero_serie} onChange={e => set('numero_serie', e.target.value)} placeholder="BSH-2024-001" />
        </div>
        <div>
          <label className="label">Localização</label>
          <input className="input" value={form.localizacao} onChange={e => set('localizacao', e.target.value)} placeholder="Armário A1" />
        </div>
        <div>
          <label className="label">Categoria</label>
          <select className="input" value={form.categoria_id} onChange={e => set('categoria_id', e.target.value)}>
            <option value="">Sem categoria</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Estado</label>
          <select className="input" value={form.estado} onChange={e => set('estado', e.target.value)}>
            {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABELS[e]}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">Descrição</label>
          <textarea className="input resize-none" rows={2} value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Detalhes adicionais..." />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn-primary" onClick={submit} disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

export default function Ferramentas() {
  const api = useApi()
  const [ferramentas, setFerramentas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [busca, setBusca] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [f, c] = await Promise.all([
        api.listarFerramentas({ busca: busca || undefined, estado: filtroEstado || undefined, categoria_id: filtroCategoria || undefined }),
        api.listarCategorias(),
      ])
      setFerramentas(f)
      setCategorias(c)
    } catch { toast.error('Erro ao carregar ferramentas') }
    finally { setLoading(false) }
  }, [busca, filtroEstado, filtroCategoria])

  useEffect(() => { carregar() }, [carregar])

  const salvar = async (data, fotoFile) => {
    let ferramenta
    if (!modal || modal === 'criar') {
      ferramenta = await api.criarFerramenta(data)
      toast.success('Ferramenta criada!')
    } else {
      ferramenta = await api.atualizarFerramenta(modal.id, data)
      toast.success('Ferramenta atualizada!')
    }
    if (fotoFile) {
      await api.uploadFoto(ferramenta.id, fotoFile)
    }
    setModal(null)
    carregar()
  }

  const deletar = async (f) => {
    if (!confirm(`Excluir "${f.nome}"?`)) return
    await api.deletarFerramenta(f.id)
    toast.success('Ferramenta excluída.')
    carregar()
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-iron-100">Ferramentas</h1>
          <p className="text-iron-500 text-sm mt-1">{ferramentas.length} itens encontrados</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('criar')}>
          <Plus size={16} /> Nova ferramenta
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-iron-500" />
          <input className="input pl-9" placeholder="Buscar ferramenta…" value={busca} onChange={e => setBusca(e.target.value)} />
          {busca && <button className="absolute right-3 top-1/2 -translate-y-1/2 text-iron-500 hover:text-iron-300" onClick={() => setBusca('')}><X size={14} /></button>}
        </div>
        <select className="input w-40" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos os estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABELS[e]}</option>)}
        </select>
        <select className="input w-44" value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-iron-500 text-sm text-center py-16">Carregando…</div>
      ) : ferramentas.length === 0 ? (
        <div className="text-center py-24 space-y-3">
          <Wrench size={40} className="text-iron-700 mx-auto" strokeWidth={1} />
          <p className="text-iron-500">Nenhuma ferramenta encontrada.</p>
          <button className="btn-primary mx-auto" onClick={() => setModal('criar')}><Plus size={14} /> Adicionar</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ferramentas.map((f, i) => (
            <div key={f.id} className="card p-5 flex gap-4 group animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
              {/* Foto clicável para trocar */}
              <div
                className="w-16 h-16 rounded-xl bg-iron-800 flex-shrink-0 overflow-hidden flex items-center justify-center relative cursor-pointer"
                onClick={() => setModal(f)}
                title="Editar ferramenta"
              >
                {f.foto
                  ? <img src={`/api/uploads/${f.foto}`} alt={f.nome} className="w-full h-full object-cover" />
                  : <Wrench size={22} className="text-iron-600" strokeWidth={1} />}
                <div className="absolute inset-0 bg-iron-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera size={14} className="text-iron-200" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-iron-100 text-sm truncate">{f.nome}</p>
                  <StatusBadge estado={f.estado} />
                </div>
                <p className="text-xs text-iron-500 mt-1 truncate">{f.localizacao || 'Sem localização'}</p>
                {f.categoria && (
                  <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-iron-800 text-iron-400">
                    {f.categoria.nome}
                  </span>
                )}
                {f.valor && <p className="text-xs text-amber-500 font-mono mt-1.5">R$ {f.valor.toFixed(2)}</p>}
              </div>

              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="btn-ghost p-1.5 rounded-lg" onClick={() => setModal(f)}><Pencil size={13} /></button>
                <button className="btn-danger p-1.5 rounded-lg" onClick={() => deletar(f)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          title={modal === 'criar' ? 'Nova ferramenta' : 'Editar ferramenta'}
          onClose={() => setModal(null)}
          width="max-w-xl"
        >
          <FerramentaForm
            inicial={modal !== 'criar' ? modal : {}}
            categorias={categorias}
            onSave={salvar}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  )
}
