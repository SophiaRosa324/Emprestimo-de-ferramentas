import { useEffect, useState, useCallback } from 'react'
import { Plus, RotateCcw, ArrowLeftRight, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApi } from "../hooks/useApi";
import Modal from '../components/Modal'

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Emprestimos() {
  const api = useApi();
  const [emprestimos, setEmprestimos] = useState([])
  const [ferramentas, setFerramentas] = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [filtro, setFiltro] = useState('false') // 'false' = em aberto, 'true' = devolvidas, '' = todas
  const [modal, setModal] = useState(false)
  const [devolverModal, setDevolverModal] = useState(null)
  const [obs, setObs] = useState('')
  const [form, setForm] = useState({ ferramenta_id: '', responsavel_id: '', data_retorno_prevista: '', observacoes: '' })
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const params = filtro !== '' ? { devolvida: filtro } : {}
      const [e, f, r] = await Promise.all([
        api.listarEmprestimos(params),
        api.listarFerramentas({ estado: 'disponivel' }),
        api.listarResponsaveis(),
      ])
      setEmprestimos(e)
      setFerramentas(f)
      setResponsaveis(r)
    } catch { toast.error('Erro ao carregar empréstimos') }
    finally { setLoading(false) }
  }, [filtro])

  useEffect(() => { carregar() }, [carregar])

  const registrar = async () => {
    if (!form.ferramenta_id || !form.responsavel_id) return toast.error('Selecione a ferramenta e o responsável.')
    try {
      await api.registrarEmprestimo({
        ferramenta_id: parseInt(form.ferramenta_id),
        responsavel_id: parseInt(form.responsavel_id),
        data_retorno_prevista: form.data_retorno_prevista || null,
        observacoes: form.observacoes || null,
      })
      toast.success('Empréstimo registrado!')
      setModal(false)
      setForm({ ferramenta_id: '', responsavel_id: '', data_retorno_prevista: '', observacoes: '' })
      carregar()
    } catch (e) { toast.error(e.message) }
  }

  const devolver = async () => {
    try {
      await api.registrarDevolucao(devolverModal.id, { observacoes: obs || null })
      toast.success('Devolução registrada!')
      setDevolverModal(null)
      setObs('')
      carregar()
    } catch (e) { toast.error(e.message) }
  }

  const FILTROS = [
    { value: 'false', label: 'Em aberto' },
    { value: 'true',  label: 'Devolvidas' },
    { value: '',      label: 'Todas' },
  ]

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-iron-100">Empréstimos</h1>
          <p className="text-iron-500 text-sm mt-1">{emprestimos.length} registro(s)</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus size={16} /> Registrar saída
        </button>
      </div>

      {/* Filtro tabs */}
      <div className="flex gap-1 bg-iron-900/60 border border-iron-800/60 rounded-xl p-1 w-fit">
        {FILTROS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFiltro(value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filtro === value ? 'bg-amber-500 text-iron-950' : 'text-iron-400 hover:text-iron-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-iron-500 text-sm text-center py-16">Carregando…</div>
      ) : emprestimos.length === 0 ? (
        <div className="text-center py-24 space-y-3">
          <ArrowLeftRight size={40} className="text-iron-700 mx-auto" strokeWidth={1} />
          <p className="text-iron-500">Nenhum empréstimo encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {emprestimos.map((e, i) => (
            <div key={e.id} className="card p-5 flex items-center gap-5 animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${e.devolvida ? 'bg-emerald-900/40' : 'bg-amber-900/40'}`}>
                {e.devolvida
                  ? <CheckCircle2 size={18} className="text-emerald-400" />
                  : <ArrowLeftRight size={18} className="text-amber-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-iron-100 text-sm">{e.ferramenta?.nome ?? '—'}</p>
                <p className="text-xs text-iron-500 mt-0.5">
                  {e.responsavel?.nome ?? '—'} · Saída: {fmt(e.data_saida)}
                  {e.data_retorno_prevista && <> · Prev: {fmt(e.data_retorno_prevista)}</>}
                </p>
                {e.data_retorno_real && (
                  <p className="text-xs text-emerald-500 mt-0.5">Devolvida em {fmt(e.data_retorno_real)}</p>
                )}
                {e.observacoes && (
                  <p className="text-xs text-iron-600 mt-1 italic truncate">{e.observacoes}</p>
                )}
              </div>
              {!e.devolvida && (
                <button className="btn-ghost text-xs gap-1.5 flex-shrink-0" onClick={() => setDevolverModal(e)}>
                  <RotateCcw size={13} /> Devolver
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal novo empréstimo */}
      {modal && (
        <Modal title="Registrar saída" onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Ferramenta *</label>
              <select className="input" value={form.ferramenta_id} onChange={e => setForm(f => ({ ...f, ferramenta_id: e.target.value }))}>
                <option value="">Selecione…</option>
                {ferramentas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Responsável *</label>
              <select className="input" value={form.responsavel_id} onChange={e => setForm(f => ({ ...f, responsavel_id: e.target.value }))}>
                <option value="">Selecione…</option>
                {responsaveis.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Retorno previsto</label>
              <input type="datetime-local" className="input" value={form.data_retorno_prevista} onChange={e => setForm(f => ({ ...f, data_retorno_prevista: e.target.value }))} />
            </div>
            <div>
              <label className="label">Observações</label>
              <textarea className="input resize-none" rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Finalidade, local de uso…" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button className="btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={registrar}>Confirmar saída</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal devolução */}
      {devolverModal && (
        <Modal title="Registrar devolução" onClose={() => setDevolverModal(null)} width="max-w-sm">
          <div className="space-y-4">
            <p className="text-sm text-iron-300">
              Devolvendo: <span className="text-iron-100 font-medium">{devolverModal.ferramenta?.nome}</span>
            </p>
            <div>
              <label className="label">Observações (opcional)</label>
              <textarea className="input resize-none" rows={2} value={obs} onChange={e => setObs(e.target.value)} placeholder="Condição da ferramenta, problemas…" />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setDevolverModal(null)}>Cancelar</button>
              <button className="btn-primary" onClick={devolver}><RotateCcw size={14} /> Confirmar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
