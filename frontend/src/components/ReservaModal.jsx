// ============================================================
// COMPONENTE ReservaModal — adicione junto dos outros imports
// no arquivo frontend/src/pages/Ferramentas.jsx
// ============================================================
//
// 1. Adicione este import no topo do Ferramentas.jsx:
//    import ReservaModal from '../components/ReservaModal'
//
// 2. Adicione o estado no componente Ferramentas:
//    const [reservaFerramenta, setReservaFerramenta] = useState(null)
//
// 3. No card de cada ferramenta, adicione o botão (após o btn de editar):
//    {f.estado === 'disponivel' && (
//      <button
//        className="btn-ghost p-1.5 rounded-lg"
//        onClick={() => setReservaFerramenta(f)}
//        title="Reservar"
//      >
//        <CalendarRange size={13} />
//      </button>
//    )}
//
// 4. Adicione o import do ícone no topo:
//    import { ..., CalendarRange } from 'lucide-react'
//
// 5. Adicione o modal no JSX (antes do fechamento do return):
//    {reservaFerramenta && (
//      <ReservaModal
//        ferramenta={reservaFerramenta}
//        onClose={() => setReservaFerramenta(null)}
//        onSuccess={() => { setReservaFerramenta(null); carregar() }}
//      />
//    )}
// ============================================================

import { useState } from 'react'
import { CalendarRange } from 'lucide-react'
import toast from 'react-hot-toast'
import { useApi } from '../hooks/useApi'
import Modal from './Modal'

export default function ReservaModal({ ferramenta, onClose, onSuccess }) {
  const api = useApi()
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [saving, setSaving] = useState(false)

  const reservar = async () => {
    if (!dataInicio || !dataFim) return toast.error('Preencha as datas.')
    if (new Date(dataInicio) >= new Date(dataFim)) return toast.error('Data de início deve ser anterior ao fim.')
    setSaving(true)
    try {
      await api.criarReserva({
        ferramenta_id: ferramenta.id,
        data_inicio: new Date(dataInicio).toISOString(),
        data_fim: new Date(dataFim).toISOString(),
      })
      toast.success('Reserva criada!')
      onSuccess()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Reservar: ${ferramenta.nome}`} onClose={onClose} width="max-w-sm">
      <div className="space-y-4">
        <div>
          <label className="label">Data de início</label>
          <input
            type="datetime-local"
            className="input"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Data de devolução</label>
          <input
            type="datetime-local"
            className="input"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
          />
        </div>
        <p className="text-xs text-iron-600">
          O sistema verificará automaticamente conflitos com outras reservas.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={reservar} disabled={saving}>
            <CalendarRange size={14} />
            {saving ? 'Reservando…' : 'Confirmar reserva'}
          </button>
        </div>
      </div>
    </Modal>
  )
}