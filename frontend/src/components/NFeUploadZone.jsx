import { useState, useRef, useCallback } from 'react'
import {
  Upload, FileText, CheckCircle2, AlertTriangle,
  XCircle, X, ChevronDown, ChevronUp, Loader2
} from 'lucide-react'
import { formatarChaveNFe, extrairInfoChave } from '../utils/nfe'

export default function NFeUploadZone({ onParsed, onFile, valorInformado = 0, qtdInformada = 1, apiParsear }) {
  const [arrastando, setArrastando]   = useState(false)
  const [arquivo,    setArquivo]      = useState(null)
  const [dados,      setDados]        = useState(null)
  const [loading,    setLoading]      = useState(false)
  const [mostrarProd,setMostrarProd]  = useState(false)
  const inputRef = useRef()

  const processar = useCallback(async (file) => {
    if (!file?.name.endsWith('.xml')) {
      alert('Selecione um arquivo .xml de NF-e')
      return
    }
    setArquivo(file)
    onFile?.(file)
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('xml', file)
      fd.append('valor_informado',      String(valorInformado))
      fd.append('quantidade_informada', String(qtdInformada))
      const resultado = await apiParsear(fd)
      setDados(resultado)
      onParsed?.(resultado)
    } catch (e) {
      alert(`Erro ao processar XML: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [valorInformado, qtdInformada, apiParsear, onFile, onParsed])

  const onDrop = (e) => {
    e.preventDefault()
    setArrastando(false)
    const file = e.dataTransfer.files[0]
    if (file) processar(file)
  }

  const limpar = () => {
    setArquivo(null)
    setDados(null)
    onFile?.(null)
    onParsed?.(null)
  }

  if (!arquivo) {
    return (
      <div
        onDragOver={e => { e.preventDefault(); setArrastando(true) }}
        onDragLeave={() => setArrastando(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          arrastando
            ? 'border-amber-500/60 bg-amber-500/5'
            : 'border-iron-700/60 hover:border-iron-600/60 hover:bg-iron-800/20'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xml"
          className="hidden"
          onChange={e => e.target.files[0] && processar(e.target.files[0])}
        />
        <Upload size={28} className={`mx-auto mb-3 ${arrastando ? 'text-amber-400' : 'text-iron-500'}`} strokeWidth={1.5} />
        <p className="text-sm font-medium text-iron-300">
          {arrastando ? 'Solte o arquivo aqui' : 'Arraste o XML da NF-e ou clique para selecionar'}
        </p>
        <p className="text-xs text-iron-600 mt-1">Apenas arquivos .xml de NF-e (padrão SEFAZ)</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header do arquivo */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-iron-800/40 border border-iron-700/50">
        <FileText size={18} className="text-amber-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-iron-200 truncate">{arquivo.name}</p>
          <p className="text-xs text-iron-500">{(arquivo.size / 1024).toFixed(1)} KB</p>
        </div>
        {loading
          ? <Loader2 size={16} className="text-amber-400 animate-spin flex-shrink-0" />
          : <button onClick={limpar} className="text-iron-500 hover:text-iron-300 flex-shrink-0"><X size={16} /></button>}
      </div>

      {loading && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-iron-800/30">
          <Loader2 size={14} className="text-amber-400 animate-spin" />
          <p className="text-xs text-iron-400">Processando XML…</p>
        </div>
      )}

      {dados && !loading && (
        <>
          {/* Status geral */}
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${
            dados.valida
              ? 'bg-emerald-900/20 border-emerald-800/40'
              : dados.erros?.length > 0
                ? 'bg-red-900/20 border-red-800/40'
                : 'bg-amber-900/20 border-amber-800/40'
          }`}>
            {dados.valida
              ? <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
              : dados.erros?.length > 0
                ? <XCircle size={16} className="text-red-400 flex-shrink-0" />
                : <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />}
            <p className="text-sm font-medium">
              {dados.valida
                ? 'NF-e validada com sucesso'
                : dados.erros?.length > 0
                  ? `${dados.erros.length} erro(s) encontrado(s)`
                  : `${dados.avisos?.length} aviso(s) — verifique antes de salvar`}
            </p>
          </div>

          {/* Erros bloqueantes */}
          {dados.erros?.length > 0 && (
            <div className="space-y-1.5">
              {dados.erros.map((e, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-red-900/20 border border-red-800/30">
                  <XCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{e}</p>
                </div>
              ))}
            </div>
          )}

          {/* Avisos não bloqueantes */}
          {dados.avisos?.length > 0 && (
            <div className="space-y-1.5">
              {dados.avisos.map((a, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-900/20 border border-amber-800/30">
                  <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">{a}</p>
                </div>
              ))}
            </div>
          )}

          {/* Dados extraídos */}
          {(dados.razao_social || dados.chave) && (
            <div className="rounded-xl border border-iron-700/50 overflow-hidden">
              <div className="bg-iron-800/40 px-4 py-2.5 border-b border-iron-700/40">
                <p className="text-xs font-semibold text-iron-400 uppercase tracking-wider">Dados extraídos do XML</p>
              </div>
              <div className="p-4 space-y-3">
                {/* Emitente */}
                {dados.razao_social && (
                  <div>
                    <p className="text-[10px] text-iron-500 uppercase tracking-wide mb-1">Fornecedor</p>
                    <p className="text-sm font-medium text-iron-200">{dados.razao_social}</p>
                    {dados.cnpj_emitente && (
                      <p className="text-xs text-iron-500 font-mono mt-0.5">{dados.cnpj_emitente}</p>
                    )}
                  </div>
                )}

                {/* Identificação */}
                <div className="grid grid-cols-3 gap-3">
                  {dados.numero && (
                    <div>
                      <p className="text-[10px] text-iron-500 uppercase tracking-wide">Número</p>
                      <p className="text-sm text-iron-300 font-mono">{dados.numero}</p>
                    </div>
                  )}
                  {dados.serie && (
                    <div>
                      <p className="text-[10px] text-iron-500 uppercase tracking-wide">Série</p>
                      <p className="text-sm text-iron-300 font-mono">{dados.serie}</p>
                    </div>
                  )}
                  {dados.data_emissao && (
                    <div>
                      <p className="text-[10px] text-iron-500 uppercase tracking-wide">Emissão</p>
                      <p className="text-sm text-iron-300">
                        {new Date(dados.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Valores */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-iron-500 uppercase tracking-wide">Valor total NF-e</p>
                    <p className="text-sm font-mono text-amber-400">R$ {dados.valor_total_nf?.toFixed(2) ?? '—'}</p>
                  </div>
                  {dados.valor_desconto > 0 && (
                    <div>
                      <p className="text-[10px] text-iron-500 uppercase tracking-wide">Desconto</p>
                      <p className="text-sm font-mono text-emerald-400">- R$ {dados.valor_desconto?.toFixed(2)}</p>
                    </div>
                  )}
                </div>

                {/* Chave */}
                {dados.chave && (
                  <div>
                    <p className="text-[10px] text-iron-500 uppercase tracking-wide mb-1">Chave de acesso</p>
                    <p className="text-[10px] font-mono text-iron-400 break-all leading-relaxed">
                      {formatarChaveNFe(dados.chave)}
                    </p>
                  </div>
                )}

                {/* Produtos */}
                {dados.produtos?.length > 0 && (
                  <div>
                    <button
                      onClick={() => setMostrarProd(v => !v)}
                      className="flex items-center gap-1.5 text-[10px] text-iron-400 hover:text-iron-200 transition-colors"
                    >
                      {mostrarProd ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {dados.produtos.length} produto(s) na nota
                    </button>
                    {mostrarProd && (
                      <div className="mt-2 space-y-1.5">
                        {dados.produtos.map((p, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-iron-800/40">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-iron-200 truncate">{p.descricao}</p>
                              <p className="text-[10px] text-iron-500 font-mono mt-0.5">
                                {p.quantidade} {p.unidade} × R$ {p.valor_unit?.toFixed(2)} = R$ {p.valor_total?.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}