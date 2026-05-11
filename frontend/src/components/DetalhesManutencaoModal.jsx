import { useState } from 'react'
import {
  X, Wrench, Building2, Calendar, DollarSign,
  ArrowRight, CheckCircle2, XCircle, Clock, Package
} from 'lucide-react'
import { useApi } from '../hooks/useApi'
import toast from 'react-hot-toast'
import StatusManutencaoBadge from './StatusManutencaoBadge'

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const PROXIMO_CONFIG = {
  em_manutencao: { label: 'Registrar envio',      cls: 'btn-primary',  icon: ArrowRight   },
  concluida:     { label: 'Marcar como concluída', cls: 'btn-primary',  icon: CheckCircle2 },
  cancelada:     { label: 'Cancelar',              cls: 'btn-danger',   icon: XCircle      },
}

const TIMELINE_ESTADOS = [
  { key: 'aguardando_envio', label: 'Aguardando envio' },
  { key: 'em_manutencao',   label: 'Em manutenção'    },
  { key: 'concluida',       label: 'Concluída'         },
]

function Timeline({ statusAtual }) {
  const idx = TIMELINE_ESTADOS.findIndex(e => e.key === statusAtual)
  const cancelada = statusAtual === 'cancelada'

  return (
    <div className="flex items-center gap-0">
      {TIMELINE_ESTADOS.map((estado, i) => {
        const passado  = i < idx
        const atual    = i === idx && !cancelada
        const futuro   = i > idx

        return (
          <div key={estado.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                cancelada ? 'border-iron-700 bg-iron-800 text-iron-600' :
                passado   ? 'border-emerald-500 bg-emerald-500 text-iron-950' :
                atual     ? 'border-amber-500 bg-amber-500 text-iron-950' :
                            'border-iron-700 bg-iron-800/60 text-iron-600'
              }`}>
                {passado ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className={`text-[10px] whitespace-nowrap ${
                cancelada ? 'text-iron-600' :
                passado   ? 'text-emerald-400' :
                atual     ? 'text-amber-400' :
                            'text-iron-600'
              }`}>{estado.label}</span>
            </div>
            {i < TIMELINE_ESTADOS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 ${passado && !cancelada ? 'bg-emerald-500' : 'bg-iron-800'}`} />
            )}
          </div>
        )
      })}
      {cancelada && (
        <div className="ml-3 flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-red-900/50 border-2 border-red-700 flex items-center justify-center">
            <XCircle size={14} className="text-red-400" />
          </div>
          <span className="text-[10px] text-red-400">Cancelada</span>
        </div>
      )}
    </div>
  )
}

export default function DetalhesManutencaoModal({ manutencao, onClose, onUpdate }) {
  const api = useApi()
  const [avancarModal, setAvancarModal] = useState(null)  // null | 'em_manutencao' | 'concluida' | 'cancelada'
  const [avancarForm, setAvancarForm] = useState({
    descricao_servico: '',
    valor: '',
    data_retorno_real: '',
    observacoes: '',
  })
  const [saving, setSaving] = useState(false)

  const m = manutencao

  const confirmarAvanco = async () => {
    setSaving(true)
    try {
      await api.avancarStatusManutencao(m.id, {
        novo_status:       avancarModal,
        descricao_servico: avancarForm.descricao_servico || undefined,
        valor:             avancarForm.valor ? parseFloat(avancarForm.valor) : undefined,
        data_retorno_real: avancarForm.data_retorno_real ? new Date(avancarForm.data_retorno_real).toISOString() : undefined,
        observacoes:       avancarForm.observacoes || undefined,
      })
      toast.success('Status atualizado!')
      setAvancarModal(null)
      onUpdate()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-iron-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl card overflow-hidden shadow-2xl shadow-black/60 animate-scale-in flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center gap-4 p-5 border-b border-iron-800/60 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-amber-900/30 border border-amber-800/40 flex items-center justify-center flex-shrink-0">
            <Wrench size={18} className="text-amber-400" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg text-iron-100 truncate">{m.ferramenta_nome}</h2>
              {m.ferramenta_codigo && (
                <span className="font-mono text-[10px] bg-iron-800 text-iron-500 px-1.5 py-0.5 rounded flex-shrink-0">
                  {m.ferramenta_codigo}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <StatusManutencaoBadge status={m.status} />
              <span className="text-xs text-iron-600">#{m.id}</span>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-2 rounded-xl flex-shrink-0"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Timeline */}
          <div className="px-6 py-4 border-b border-iron-800/40">
            <Timeline statusAtual={m.status} />
          </div>

          {/* Detalhes */}
          <div className="p-5 space-y-4">
            {/* Info principal */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-iron-800/30 rounded-xl p-3">
                <p className="text-[10px] text-iron-500 uppercase tracking-wide mb-1">Problema</p>
                <p className="text-sm text-iron-200">{m.problema}</p>
              </div>
              {m.empresa_nome && (
                <div className="bg-iron-800/30 rounded-xl p-3">
                  <p className="text-[10px] text-iron-500 uppercase tracking-wide mb-1">Empresa</p>
                  <div className="flex items-center gap-1.5">
                    <Building2 size={12} className="text-iron-500 flex-shrink-0" />
                    <p className="text-sm text-iron-200 truncate">{m.empresa_nome}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Datas e valor */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-iron-800/30 rounded-xl p-3">
                <p className="text-[10px] text-iron-500 uppercase tracking-wide mb-1">Envio</p>
                <p className="text-sm text-iron-300">{fmt(m.data_envio)}</p>
              </div>
              <div className="bg-iron-800/30 rounded-xl p-3">
                <p className="text-[10px] text-iron-500 uppercase tracking-wide mb-1">Prev. retorno</p>
                <p className="text-sm text-iron-300">{fmt(m.data_retorno_prev)}</p>
              </div>
              <div className="bg-iron-800/30 rounded-xl p-3">
                <p className="text-[10px] text-iron-500 uppercase tracking-wide mb-1">Custo</p>
                <p className={`text-sm font-mono ${m.valor ? 'text-amber-400' : 'text-iron-600'}`}>
                  {m.valor ? `R$ ${m.valor.toFixed(2)}` : '—'}
                </p>
              </div>
            </div>

            {/* Descrição do serviço */}
            {m.descricao_servico && (
              <div className="bg-iron-800/30 rounded-xl p-3">
                <p className="text-[10px] text-iron-500 uppercase tracking-wide mb-1">Descrição do serviço</p>
                <p className="text-sm text-iron-300">{m.descricao_servico}</p>
              </div>
            )}

            {/* Retorno real */}
            {m.data_retorno_real && (
              <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-xl p-3">
                <p className="text-[10px] text-emerald-500 uppercase tracking-wide mb-1">Retorno efetivo</p>
                <p className="text-sm text-emerald-300">{fmt(m.data_retorno_real)}</p>
              </div>
            )}

            {/* Observações */}
            {m.observacoes && (
              <div className="bg-iron-800/20 rounded-xl p-3">
                <p className="text-[10px] text-iron-500 uppercase tracking-wide mb-1">Observações</p>
                <p className="text-xs text-iron-400 italic">{m.observacoes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Ações de avanço de status */}
        {m.proximos_status?.length > 0 && !avancarModal && (
          <div className="p-5 border-t border-iron-800/60 flex gap-2 flex-shrink-0">
            {m.proximos_status.map(prox => {
              const cfg = PROXIMO_CONFIG[prox]
              if (!cfg) return null
              const Icon = cfg.icon
              return (
                <button key={prox} className={`${cfg.cls} flex-1 justify-center text-sm`} onClick={() => setAvancarModal(prox)}>
                  <Icon size={14} /> {cfg.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Form de avanço inline */}
        {avancarModal && (
          <div className="p-5 border-t border-iron-800/60 space-y-3 bg-iron-900/40 flex-shrink-0">
            <p className="text-sm font-medium text-iron-200">
              {avancarModal === 'em_manutencao' ? 'Confirmar envio para manutenção' :
               avancarModal === 'concluida'     ? 'Registrar conclusão' :
               'Confirmar cancelamento'}
            </p>

            {avancarModal === 'concluida' && (
              <>
                <div>
                  <label className="label">Descrição do serviço realizado</label>
                  <textarea className="input resize-none text-sm" rows={2}
                    value={avancarForm.descricao_servico}
                    onChange={e => setAvancarForm(f => ({ ...f, descricao_servico: e.target.value }))}
                    placeholder="Descreva o que foi feito…" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Custo (R$)</label>
                    <input type="number" step="0.01" className="input text-sm"
                      value={avancarForm.valor}
                      onChange={e => setAvancarForm(f => ({ ...f, valor: e.target.value }))}
                      placeholder="0,00" />
                  </div>
                  <div>
                    <label className="label">Data de retorno</label>
                    <input type="date" className="input text-sm"
                      value={avancarForm.data_retorno_real}
                      onChange={e => setAvancarForm(f => ({ ...f, data_retorno_real: e.target.value }))} />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="label">Observações {avancarModal === 'cancelada' ? '*' : '(opcional)'}</label>
              <input className="input text-sm"
                value={avancarForm.observacoes}
                onChange={e => setAvancarForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder={avancarModal === 'cancelada' ? 'Motivo do cancelamento…' : 'Observações opcionais…'} />
            </div>

            <div className="flex gap-2">
              <button className="btn-ghost flex-1 justify-center text-sm" onClick={() => setAvancarModal(null)}>Voltar</button>
              <button
                className={`flex-1 justify-center text-sm ${avancarModal === 'cancelada' ? 'btn-danger' : 'btn-primary'}`}
                onClick={confirmarAvanco}
                disabled={saving}
              >
                {saving ? 'Salvando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}