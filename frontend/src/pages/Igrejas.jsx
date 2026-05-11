// src/pages/Igrejas.jsx

import { useEffect, useState, useCallback } from 'react'
import {
  Plus,
  Search,
  Church,
  Pencil,
  Trash2,
  Phone,
  MapPin,
  User,
  ShieldAlert,
  Wrench,
} from 'lucide-react'

import toast from 'react-hot-toast'
import { useApi } from '../hooks/useApi'
import Modal from '../components/Modal'

function IgrejaForm({ inicial = {}, onSave, onCancel }) {
  const [form, setForm] = useState({
    nome: '',
    endereco: '',
    responsavel: '',
    telefone: '',
    ativo: true,
    ...inicial,
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!form.nome.trim()) {
      return toast.error('Nome obrigatório')
    }

    setSaving(true)

    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Nome *</label>
        <input
          className="input"
          value={form.nome}
          onChange={e => set('nome', e.target.value)}
        />
      </div>

      <div>
        <label className="label">Endereço</label>
        <input
          className="input"
          value={form.endereco}
          onChange={e => set('endereco', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Responsável</label>
          <input
            className="input"
            value={form.responsavel}
            onChange={e => set('responsavel', e.target.value)}
          />
        </div>

        <div>
          <label className="label">Telefone</label>
          <input
            className="input"
            value={form.telefone}
            onChange={e => set('telefone', e.target.value)}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-iron-300">
        <input
          type="checkbox"
          checked={form.ativo}
          onChange={e => set('ativo', e.target.checked)}
        />
        Igreja ativa
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-ghost" onClick={onCancel}>
          Cancelar
        </button>

        <button
          className="btn-primary"
          onClick={submit}
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

export default function Igrejas() {
  const api = useApi()

  const [igrejas, setIgrejas] = useState([])
  const [stats, setStats] = useState([])

  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  const carregar = useCallback(async () => {
    setLoading(true)

    try {
      const [igs, st] = await Promise.all([
        api.listarIgrejas({
          busca: busca || undefined,
        }),
        api.resumoIgrejas(),
      ])

      setIgrejas(igs)
      setStats(st)
    } catch {
      toast.error('Erro ao carregar igrejas')
    } finally {
      setLoading(false)
    }
  }, [busca])

  useEffect(() => {
    carregar()
  }, [carregar])

  const salvar = async data => {
    if (modal === 'criar') {
      await api.criarIgreja(data)
      toast.success('Igreja criada!')
    } else {
      await api.atualizarIgreja(modal.id, data)
      toast.success('Igreja atualizada!')
    }

    setModal(null)
    carregar()
  }

  const deletar = async ig => {
    if (!confirm(`Excluir "${ig.nome}"?`)) return

    try {
      await api.deletarIgreja(ig.id)
      toast.success('Igreja removida')
      carregar()
    } catch (e) {
      toast.error(e.message || 'Erro ao remover')
    }
  }

  const statById = id =>
    stats.find(s => s.id === id)

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-iron-100">
            Igrejas
          </h1>

          <p className="text-iron-500 text-sm mt-1">
            {igrejas.length} igrejas cadastradas
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => setModal('criar')}
        >
          <Plus size={16} />
          Nova igreja
        </button>
      </div>

      <div className="relative max-w-md">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-iron-500"
        />

        <input
          className="input pl-9"
          placeholder="Buscar igreja..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-24 text-iron-500">
          Carregando...
        </div>
      ) : igrejas.length === 0 ? (
        <div className="text-center py-24 space-y-3">
          <Church
            size={44}
            className="mx-auto text-iron-700"
            strokeWidth={1}
          />

          <p className="text-iron-500">
            Nenhuma igreja encontrada.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {igrejas.map(ig => {
            const st = statById(ig.id)

            return (
              <div
                key={ig.id}
                className="card p-5 space-y-4"
              >
                <div className="flex justify-between gap-4">
                  <div className="flex gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                      <Church
                        className="text-blue-400"
                        size={24}
                      />
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-iron-100 truncate">
                        {ig.nome}
                      </h2>

                      {ig.endereco && (
                        <p className="text-sm text-iron-500 mt-1 flex items-center gap-1">
                          <MapPin size={13} />
                          {ig.endereco}
                        </p>
                      )}

                      {ig.responsavel && (
                        <p className="text-sm text-iron-500 mt-1 flex items-center gap-1">
                          <User size={13} />
                          {ig.responsavel}
                        </p>
                      )}

                      {ig.telefone && (
                        <p className="text-sm text-iron-500 mt-1 flex items-center gap-1">
                          <Phone size={13} />
                          {ig.telefone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      className="btn-ghost p-2 rounded-lg"
                      onClick={() => setModal(ig)}
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      className="btn-danger p-2 rounded-lg"
                      onClick={() => deletar(ig)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {st && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                    <div className="rounded-xl bg-iron-900 p-3">
                      <p className="text-xs text-iron-500">
                        Ferramentas
                      </p>

                      <p className="text-xl font-bold text-iron-100 mt-1 flex items-center gap-2">
                        <Wrench size={16} />
                        {st.total_ferramentas}
                      </p>
                    </div>

                    <div className="rounded-xl bg-iron-900 p-3">
                      <p className="text-xs text-iron-500">
                        Extintores
                      </p>

                      <p className="text-xl font-bold text-iron-100 mt-1">
                        {st.total_extintores}
                      </p>
                    </div>

                    <div className="rounded-xl bg-red-500/10 p-3">
                      <p className="text-xs text-red-300">
                        Vencidos
                      </p>

                      <p className="text-xl font-bold text-red-400 mt-1 flex items-center gap-2">
                        <ShieldAlert size={16} />
                        {st.extintores_stats?.vencidos || 0}
                      </p>
                    </div>

                    <div className="rounded-xl bg-yellow-500/10 p-3">
                      <p className="text-xs text-yellow-300">
                        Vence 30d
                      </p>

                      <p className="text-xl font-bold text-yellow-400 mt-1">
                        {st.extintores_stats?.vence_30d || 0}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <Modal
          title={
            modal === 'criar'
              ? 'Nova igreja'
              : 'Editar igreja'
          }
          onClose={() => setModal(null)}
          width="max-w-xl"
        >
          <IgrejaForm
            inicial={modal !== 'criar' ? modal : {}}
            onSave={salvar}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  )
}