import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Plus, ShoppingCart, FileText, CheckCircle2, AlertTriangle,
  XCircle, Trash2, ChevronDown, ChevronUp, RefreshCw, Upload
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import NFeUploadZone from '../components/NFeUploadZone'
import { formatarChaveNFe } from '../utils/nfe'

function fmt(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
}

function StatCard({ label, value, sub, color = 'text-iron-100' }) {
  return (
    <div className="card p-4">
      <p className={`text-2xl font-display ${color}`}>{value}</p>
      <p className="text-xs text-iron-500 uppercase tracking-wide mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-iron-600 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Etapas do wizard ───────────────────────────────────────
const ETAPAS = ['Ferramenta', 'Nota Fiscal', 'Dados da compra', 'Confirmar']

export default function FerramentasCompradas() {
  const api     = useApi()
  const { isAdmin } = useAuth()
  const [compras,     setCompras]    = useState([])
  const [ferramentas, setFerramentas]= useState([])
  const [stats,       setStats]      = useState(null)
  const [modal,       setModal]      = useState(false)
  const [loading,     setLoading]    = useState(true)
  const [expandida,   setExpandida]  = useState(null)

  // Wizard state
  const [etapa, setEtapa]     = useState(0)
  const [saving, setSaving]   = useState(false)

  const [selectedFerramenta, setSelectedFerramenta] = useState(null)
  const [dadosNFe, setDadosNFe]   = useState(null)  // dados do parse
  const [xmlFile,  setXmlFile]    = useState(null)
  const [pdfFile,  setPdfFile]    = useState(null)
  const [notaId,   setNotaId]     = useState(null)  // ID da nota salva

  const [formCompra, setFormCompra] = useState({
    fornecedor:     '',
    local_compra:   '',
    valor:          '',
    quantidade:     '1',
    data_compra:    '',
    garantia_meses: '',
    observacoes:    '',
  })

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [c, f, s] = await Promise.all([
        api.listarCompras(),
        api.listarFerramentas(),
        api.resumoCompras(),
      ])
      setCompras(c)
      setFerramentas(f)
      setStats(s)
    } catch (e) {
      console.error(e)
      toast.error(e.message)
    }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // Preenche campos do form quando NF-e é parseada
  const handleNFeParsed = (dados) => {
    setDadosNFe(dados)
    if (dados) {
      setFormCompra(f => ({
        ...f,
        fornecedor:  f.fornecedor  || dados.razao_social || '',
        valor:       f.valor       || (dados.valor_total_nf ? dados.valor_total_nf.toFixed(2) : ''),
        data_compra: f.data_compra || dados.data_emissao || '',
      }))
    }
  }

  const resetModal = () => {
    setEtapa(0)
    setSelectedFerramenta(null)
    setDadosNFe(null)
    setXmlFile(null)
    setPdfFile(null)
    setNotaId(null)
    setFormCompra({ fornecedor:'', local_compra:'', valor:'', quantidade:'1', data_compra:'', garantia_meses:'', observacoes:'' })
  }

  const salvarNota = async () => {
    if (!dadosNFe?.valida && dadosNFe?.erros?.length > 0) {
      toast.error('Corrija os erros da NF-e antes de continuar.')
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      if (xmlFile) fd.append('xml', xmlFile)
      if (pdfFile) fd.append('pdf', pdfFile)
      if (dadosNFe) {
        fd.append('chave_manual',        dadosNFe.chave || '')
        fd.append('numero_manual',       dadosNFe.numero || '')
        fd.append('cnpj_manual',         dadosNFe.cnpj_emitente || '')
        fd.append('razao_social_manual', dadosNFe.razao_social || '')
        fd.append('valor_manual',        String(dadosNFe.valor_total_nf || 0))
        fd.append('data_emissao_manual', dadosNFe.data_emissao || '')
      }
      const nota = await api.uploadNotaFiscal(fd)
      setNotaId(nota.id)
      setFormCompra(f => ({
        ...f,
        fornecedor:  f.fornecedor  || nota.razao_social || '',
        valor:       f.valor       || nota.valor_total?.toFixed(2)  || '',
        data_compra: f.data_compra || nota.data_emissao || '',
      }))
      toast.success('Nota fiscal registrada!')
      setEtapa(2)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const salvarCompra = async () => {
    if (!formCompra.fornecedor.trim()) return toast.error('Informe o fornecedor.')
    if (!formCompra.valor)             return toast.error('Informe o valor.')
    if (!formCompra.data_compra)       return toast.error('Informe a data da compra.')
    setSaving(true)
    try {
      await api.criarCompra({
        ferramenta_id:  selectedFerramenta.id,
        nota_fiscal_id: notaId || null,
        fornecedor:     formCompra.fornecedor,
        local_compra:   formCompra.local_compra || null,
        valor:          parseFloat(formCompra.valor),
        quantidade:     parseInt(formCompra.quantidade) || 1,
        data_compra:    formCompra.data_compra,
        garantia_meses: formCompra.garantia_meses ? parseInt(formCompra.garantia_meses) : null,
        observacoes:    formCompra.observacoes || null,
      })
      toast.success('Compra registrada!')
      setModal(false)
      resetModal()
      carregar()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const deletar = async (id) => {
    if (!confirm('Excluir esta compra?')) return
    try { await api.deletarCompra(id); toast.success('Removida.'); carregar() }
    catch (e) { toast.error(e.message) }
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center py-24">
        <XCircle size={40} className="text-iron-700 mx-auto mb-3" strokeWidth={1} />
        <p className="text-iron-500">Área restrita a administradores.</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-iron-100">Ferramentas Compradas</h1>
          <p className="text-iron-500 text-sm mt-1">Histórico de compras e notas fiscais</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={carregar}><RefreshCw size={15} /></button>
          <button className="btn-primary" onClick={() => { resetModal(); setModal(true) }}>
            <Plus size={16} /> Registrar compra
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total de compras"    value={stats.total_compras}   />
          <StatCard label="Valor total"         value={`R$ ${stats.valor_total?.toFixed(2) ?? '0,00'}`} color="text-amber-400" />
          <StatCard label="Notas fiscais"       value={`${stats.notas_validadas}/${stats.total_notas}`} sub="validadas/total" />
          <StatCard label="Garantias vencendo"  value={stats.garantias_vencendo_30d} sub="em 30 dias" color={stats.garantias_vencendo_30d > 0 ? 'text-amber-400' : 'text-iron-100'} />
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-iron-800/40 rounded-2xl animate-pulse" />)}
        </div>
      ) : compras.length === 0 ? (
        <div className="text-center py-24 space-y-3">
          <ShoppingCart size={40} className="text-iron-700 mx-auto" strokeWidth={1} />
          <p className="text-iron-500">Nenhuma compra registrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {compras.map((c, i) => (
            <div key={c.id} className="card overflow-hidden animate-slide-up" style={{ animationDelay: `${i * 25}ms` }}>
              <div
                className="flex items-center gap-4 p-5 cursor-pointer hover:bg-iron-800/20 transition-colors"
                onClick={() => setExpandida(expandida === c.id ? null : c.id)}
              >
                <div className="w-10 h-10 rounded-xl bg-iron-800/60 flex items-center justify-center flex-shrink-0">
                  <ShoppingCart size={16} className="text-iron-400" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-iron-100 text-sm">{c.ferramenta_nome}</p>
                    {c.ferramenta_codigo && (
                      <span className="font-mono text-[10px] bg-iron-800 text-iron-500 px-1.5 py-0.5 rounded">
                        {c.ferramenta_codigo}
                      </span>
                    )}
                    {c.nota_numero && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-900/30 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                        <FileText size={10} /> NF {c.nota_numero}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-iron-500 mt-0.5">
                    {c.fornecedor} · {fmt(c.data_compra)} · <span className="text-amber-500 font-mono">R$ {c.valor?.toFixed(2)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button className="btn-danger p-1.5 rounded-lg" onClick={e => { e.stopPropagation(); deletar(c.id) }}>
                    <Trash2 size={13} />
                  </button>
                  {expandida === c.id ? <ChevronUp size={14} className="text-iron-500" /> : <ChevronDown size={14} className="text-iron-500" />}
                </div>
              </div>

              {/* Expandido */}
              {expandida === c.id && (
                <div className="border-t border-iron-800/60 px-5 pb-5 pt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Local de compra',  value: c.local_compra },
                    { label: 'Quantidade',        value: c.quantidade },
                    { label: 'Garantia',          value: c.garantia_meses ? `${c.garantia_meses} meses` : null },
                    { label: 'Garantia até',      value: fmt(c.garantia_ate) },
                  ].filter(x => x.value).map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px] text-iron-500 uppercase tracking-wide">{label}</p>
                      <p className="text-sm text-iron-300 mt-0.5">{value}</p>
                    </div>
                  ))}
                  {c.nota_chave && (
                    <div className="col-span-2 md:col-span-4">
                      <p className="text-[10px] text-iron-500 uppercase tracking-wide mb-1">Chave NF-e</p>
                      <p className="text-[10px] font-mono text-iron-400">{formatarChaveNFe(c.nota_chave)}</p>
                    </div>
                  )}
                  {c.observacoes && (
                    <div className="col-span-2 md:col-span-4">
                      <p className="text-[10px] text-iron-500 uppercase tracking-wide mb-1">Observações</p>
                      <p className="text-xs text-iron-400 italic">{c.observacoes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Wizard de nova compra */}
      {modal && (
        <Modal title="Registrar compra" onClose={() => { setModal(false); resetModal() }} width="max-w-xl">
          {/* Stepper */}
          <div className="flex items-center mb-6">
            {ETAPAS.map((label, i) => (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    i < etapa  ? 'border-emerald-500 bg-emerald-500 text-iron-950' :
                    i === etapa? 'border-amber-500 bg-amber-500 text-iron-950' :
                                 'border-iron-700 bg-iron-800/60 text-iron-600'
                  }`}>
                    {i < etapa ? <CheckCircle2 size={14} /> : i + 1}
                  </div>
                  <span className={`text-[9px] whitespace-nowrap ${i === etapa ? 'text-amber-400' : i < etapa ? 'text-emerald-400' : 'text-iron-600'}`}>{label}</span>
                </div>
                {i < ETAPAS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < etapa ? 'bg-emerald-500' : 'bg-iron-800'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Etapa 0: Selecionar ferramenta */}
          {etapa === 0 && (
            <div className="space-y-4">
              <div>
                <label className="label">Ferramenta *</label>
                <select className="input" value={selectedFerramenta?.id || ''} onChange={e => {
                  const f = ferramentas.find(x => x.id === parseInt(e.target.value))
                  setSelectedFerramenta(f || null)
                }}>
                  <option value="">Selecione a ferramenta comprada…</option>
                  {ferramentas.map(f => (
                    <option key={f.id} value={f.id}>{f.codigo ? `[${f.codigo}] ` : ''}{f.nome}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end">
                <button className="btn-primary" disabled={!selectedFerramenta} onClick={() => setEtapa(1)}>
                  Próximo →
                </button>
              </div>
            </div>
          )}

          {/* Etapa 1: Nota Fiscal */}
          {etapa === 1 && (
            <div className="space-y-4">
              <NFeUploadZone
                onParsed={handleNFeParsed}
                onFile={setXmlFile}
                valorInformado={parseFloat(formCompra.valor) || 0}
                qtdInformada={parseInt(formCompra.quantidade) || 1}
                apiParsear={(fd) => api.parsearNFe(fd)}
              />

              {/* Upload PDF opcional */}
              <div>
                <label className="label">PDF da nota (opcional)</label>
                <label className="flex items-center gap-2 p-3 border border-dashed border-iron-700/60 rounded-xl cursor-pointer hover:border-iron-600 transition-colors">
                  <Upload size={14} className="text-iron-500" />
                  <span className="text-sm text-iron-500">{pdfFile ? pdfFile.name : 'Selecionar PDF…'}</span>
                  <input type="file" accept=".pdf" className="hidden" onChange={e => setPdfFile(e.target.files[0])} />
                </label>
              </div>

              <div className="flex justify-between">
                <button className="btn-ghost" onClick={() => setEtapa(0)}>← Voltar</button>
                <div className="flex gap-2">
                  <button className="btn-ghost text-sm" onClick={() => setEtapa(2)}>Pular (sem NF)</button>
                  <button
                    className="btn-primary"
                    onClick={salvarNota}
                    disabled={saving || (!xmlFile && !dadosNFe)}
                  >
                    {saving ? 'Salvando…' : 'Salvar nota →'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Etapa 2: Dados da compra */}
          {etapa === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="label">Fornecedor *</label>
                  <input className="input" value={formCompra.fornecedor}
                    onChange={e => setFormCompra(f => ({ ...f, fornecedor: e.target.value }))}
                    placeholder="Nome do fornecedor" />
                </div>
                <div>
                  <label className="label">Local de compra</label>
                  <input className="input" value={formCompra.local_compra}
                    onChange={e => setFormCompra(f => ({ ...f, local_compra: e.target.value }))}
                    placeholder="Loja, cidade…" />
                </div>
                <div>
                  <label className="label">Data da compra *</label>
                  <input type="date" className="input" value={formCompra.data_compra}
                    onChange={e => setFormCompra(f => ({ ...f, data_compra: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Valor total (R$) *</label>
                  <input type="number" step="0.01" className="input" value={formCompra.valor}
                    onChange={e => setFormCompra(f => ({ ...f, valor: e.target.value }))}
                    placeholder="0,00" />
                </div>
                <div>
                  <label className="label">Quantidade</label>
                  <input type="number" min="1" className="input" value={formCompra.quantidade}
                    onChange={e => setFormCompra(f => ({ ...f, quantidade: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Garantia (meses)</label>
                  <input type="number" min="0" className="input" value={formCompra.garantia_meses}
                    onChange={e => setFormCompra(f => ({ ...f, garantia_meses: e.target.value }))}
                    placeholder="Ex: 12" />
                </div>
                <div>
                  <label className="label">Observações</label>
                  <input className="input" value={formCompra.observacoes}
                    onChange={e => setFormCompra(f => ({ ...f, observacoes: e.target.value }))}
                    placeholder="Informações adicionais…" />
                </div>
              </div>
              <div className="flex justify-between">
                <button className="btn-ghost" onClick={() => setEtapa(1)}>← Voltar</button>
                <button className="btn-primary" onClick={() => setEtapa(3)}>Revisar →</button>
              </div>
            </div>
          )}

          {/* Etapa 3: Confirmar */}
          {etapa === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-iron-700/50 overflow-hidden">
                <div className="bg-iron-800/40 px-4 py-2.5">
                  <p className="text-xs font-semibold text-iron-400 uppercase tracking-wider">Resumo da compra</p>
                </div>
                <div className="p-4 space-y-2">
                  {[
                    { label: 'Ferramenta', value: `[${selectedFerramenta?.codigo}] ${selectedFerramenta?.nome}` },
                    { label: 'Fornecedor', value: formCompra.fornecedor },
                    { label: 'Valor',      value: `R$ ${parseFloat(formCompra.valor || 0).toFixed(2)}` },
                    { label: 'Data',       value: fmt(formCompra.data_compra) },
                    { label: 'Garantia',   value: formCompra.garantia_meses ? `${formCompra.garantia_meses} meses` : 'Sem garantia' },
                    { label: 'Nota fiscal',value: notaId ? `ID #${notaId}` : 'Sem nota fiscal' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-iron-500">{label}</span>
                      <span className="text-iron-200 text-right truncate max-w-48">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between">
                <button className="btn-ghost" onClick={() => setEtapa(2)}>← Voltar</button>
                <button className="btn-primary" onClick={salvarCompra} disabled={saving}>
                  {saving ? 'Salvando…' : <><CheckCircle2 size={15} /> Confirmar compra</>}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}