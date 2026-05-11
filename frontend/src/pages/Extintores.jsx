// src/pages/Extintores.jsx

import { useEffect, useState, useCallback } from 'react'
import {
  Plus,
  ShieldAlert,
  Search,
  Trash2,
  Pencil,
  Download,
} from 'lucide-react'

import toast from 'react-hot-toast'
import { useApi } from '../hooks/useApi'
import Modal from '../components/Modal'

function statusColor(status) {
  switch (status) {
    case 'vencido':
      return 'bg-red-500/10 text-red-400 border-red-500/20'

    case 'vence_30d':
      return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'

    case 'ok':
      return 'bg-green-500/10 text-green-400 border-green-500/20'

    default:
      return 'bg-iron-800 text-iron-300 border-iron-700'
  }
}

function statusLabel(status) {
  switch (status) {
    case 'vencido':
      return 'Vencido'

    case 'vence_30d':
      return 'Vence em 30d'

    case 'ok':
      return 'Em dia'

    default:
      return 'Sem validade'
  }
}

function ExtintorForm({
  inicial = {},
  igrejas,
  onSave,
  onCancel,
}) {
  const [form, setForm] = useState({
    patrimonio: '',
    tipo: '',
    capacidade: '',
    localizacao: '',
    igreja_id: '',
    data_validade: '',
    data_ultima_carga: '',
    observacoes: '',
    ativo: true,
    ...inicial,
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!form.patrimonio.trim()) {
      return toast.error('Patrimônio obrigatório')
    }

    setSaving(true)

    try {
      await onSave({
        ...form,
        igreja_id: form.igreja_id
          ? parseInt(form.igreja_id)
          : null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Patrimônio *</label>
          <input
            className="input"
            value={form.patrimonio}
            onChange={e => set('patrimonio', e.target.value)}
          />
        </div>

        <div>
          <label className="label">Tipo</label>
          <input
            className="input"
            value={form.tipo}
            onChange={e => set('tipo', e.target.value)}
          />
        </div>

        <div>
          <label className="label">Capacidade</label>
          <input
            className="input"
            value={form.capacidade}
            onChange={e => set('capacidade', e.target.value)}
          />
        </div>

        <div>
          <label className="label">Igreja</label>

          <select
            className="input"
            value={form.igreja_id}
            onChange={e => set('igreja_id', e.target.value)}
          >
            <option value="">Sem igreja</option>

            {igrejas.map(i => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="label">Localização</label>

          <input
            className="input"
            value={form.localizacao}
            onChange={e => set('localizacao', e.target.value)}
          />
        </div>

        <div>
          <label className="label">Data validade</label>

          <input
            type="date"
            className="input"
            value={form.data_validade || ''}
            onChange={e => set('data_validade', e.target.value)}
          />
        </div>

        <div>
          <label className="label">Última carga</label>

          <input
            type="date"
            className="input"
            value={form.data_ultima_carga || ''}
            onChange={e =>
              set('data_ultima_carga', e.target.value)
            }
          />
        </div>

        <div className="col-span-2">
          <label className="label">Observações</label>

          <textarea
            className="input resize-none"
            rows={3}
            value={form.observacoes}
            onChange={e => set('observacoes', e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onCancel}>
          Cancelar
        </button>

        <button
          className="btn-primary"
          disabled={saving}
          onClick={submit}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

export default function Extintores() {
  const api = useApi()

  const [extintores, setExtintores] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [igrejas, setIgrejas] = useState([])

  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('')
  const [igreja, setIgreja] = useState('')

  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  const carregar = useCallback(async () => {
    setLoading(true)

    try {
      const [exts, dash, igs] = await Promise.all([
        api.listarExtintores({
          busca: busca || undefined,
          status: status || undefined,
          igreja_id: igreja || undefined,
        }),

        api.dashboardExtintores({
          igreja_id: igreja || undefined,
        }),

        api.listarIgrejas(),
      ])

      setExtintores(exts)
      setDashboard(dash)
      setIgrejas(igs)
    } catch {
      toast.error('Erro ao carregar extintores')
    } finally {
      setLoading(false)
    }
  }, [busca, status, igreja])

  useEffect(() => {
    carregar()
  }, [carregar])

  const salvar = async data => {
    if (modal === 'criar') {
      await api.criarExtintor(data)
      toast.success('Extintor criado!')
    } else {
      await api.atualizarExtintor(modal.id, data)
      toast.success('Extintor atualizado!')
    }

    setModal(null)
    carregar()
  }

  const deletar = async e => {
    if (!confirm(`Excluir "${e.patrimonio}"?`)) return

    await api.deletarExtintor(e.id)

    toast.success('Extintor removido')
    carregar()
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-iron-100">
            Extintores
          </h1>

          <p className="text-iron-500 text-sm mt-1">
            Controle de validade e segurança
          </p>
        </div>

        <div className="flex gap-2">
          <a
            href={api.exportarExtintoresExcel({
              igreja_id: igreja || undefined,
            })}
            className="btn-ghost"
          >
            <Download size={15} />
            Exportar
          </a>

          <button
            className="btn-primary"
            onClick={() => setModal('criar')}
          >
            <Plus size={16} />
            Novo extintor
          </button>
        </div>
      </div>

      {dashboard && (
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          <div className="card p-4">
            <p className="text-sm text-iron-500">Total</p>

            <p className="text-3xl font-bold text-iron-100 mt-2">
              {dashboard.total}
            </p>
          </div>

          <div className="card p-4 bg-red-500/10 border-red-500/20">
            <p className="text-sm text-red-300">Vencidos</p>

            <p className="text-3xl font-bold text-red-400 mt-2">
              {dashboard.vencidos}
            </p>
          </div>

          <div className="card p-4 bg-yellow-500/10 border-yellow-500/20">
            <p className="text-sm text-yellow-300">
              Vence 30d
            </p>

            <p className="text-3xl font-bold text-yellow-400 mt-2">
              {dashboard.vence_30d}
            </p>
          </div>

          <div className="card p-4 bg-green-500/10 border-green-500/20">
            <p className="text-sm text-green-300">Em dia</p>

            <p className="text-3xl font-bold text-green-400 mt-2">
              {dashboard.ok}
            </p>
          </div>

          <div className="card p-4">
            <p className="text-sm text-iron-500">
              Sem validade
            </p>

            <p className="text-3xl font-bold text-iron-100 mt-2">
              {dashboard.sem_validade}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-iron-500"
          />

          <input
            className="input pl-9"
            placeholder="Buscar extintor..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        <select
          className="input w-52"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="">Todos status</option>

          <option value="ok">Em dia</option>

          <option value="vence_30d">
            Vence em 30 dias
          </option>

          <option value="vencido">Vencido</option>

          <option value="sem_validade">
            Sem validade
          </option>
        </select>

        <select
          className="input w-56"
          value={igreja}
          onChange={e => setIgreja(e.target.value)}
        >
          <option value="">Todas igrejas</option>

          {igrejas.map(i => (
            <option key={i.id} value={i.id}>
              {i.nome}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-24 text-iron-500">
          Carregando...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {extintores.map(e => (
            <div
              key={e.id}
              className={`card p-5 border ${statusColor(e.status_validade)}`}
            >
              <div className="flex justify-between gap-4">
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={18} />

                    <h2 className="font-semibold text-lg truncate">
                      {e.patrimonio}
                    </h2>
                  </div>

                  <p className="text-sm opacity-80">
                    {e.tipo}
                    {e.capacidade
                      ? ` • ${e.capacidade}`
                      : ''}
                  </p>

                  {e.localizacao && (
                    <p className="text-sm opacity-70">
                      📍 {e.localizacao}
                    </p>
                  )}

                  {e.igreja_nome && (
                    <p className="text-sm opacity-70">
                      ⛪ {e.igreja_nome}
                    </p>
                  )}

                  <div className="pt-2 flex flex-wrap gap-2">
                    <span
                      className={`px-2 py-1 rounded-lg border text-xs font-medium ${statusColor(e.status_validade)}`}
                    >
                      {statusLabel(e.status_validade)}
                    </span>

                    {e.dias_para_vencer != null && (
                      <span className="px-2 py-1 rounded-lg bg-iron-800 text-xs text-iron-300">
                        {e.dias_para_vencer} dias
                      </span>
                    )}
                  </div>

                  {e.data_validade && (
                    <p className="text-xs opacity-60 pt-1">
                      Validade:{' '}
                      {new Date(
                        e.data_validade
                      ).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    className="btn-ghost p-2 rounded-lg"
                    onClick={() => setModal(e)}
                  >
                    <Pencil size={14} />
                  </button>

                  <button
                    className="btn-danger p-2 rounded-lg"
                    onClick={() => deletar(e)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          title={
            modal === 'criar'
              ? 'Novo extintor'
              : 'Editar extintor'
          }
          onClose={() => setModal(null)}
          width="max-w-2xl"
        >
          <ExtintorForm
            inicial={modal !== 'criar' ? modal : {}}
            igrejas={igrejas}
            onSave={salvar}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  )
}