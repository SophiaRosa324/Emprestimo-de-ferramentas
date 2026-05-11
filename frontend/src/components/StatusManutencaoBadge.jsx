
const CONFIG = {
  aguardando_envio: { cls: 'bg-iron-800/60 text-iron-400 border-iron-700/50',     label: 'Ag. envio'    },
  em_manutencao:    { cls: 'bg-amber-900/50 text-amber-400 border-amber-800/50',  label: 'Em manutenção'},
  concluida:        { cls: 'bg-emerald-900/50 text-emerald-400 border-emerald-800/50', label: 'Concluída'},
  cancelada:        { cls: 'bg-red-900/50 text-red-400 border-red-800/50',        label: 'Cancelada'    },
}

export default function StatusManutencaoBadge({ status }) {
  const cfg = CONFIG[status] || { cls: 'bg-iron-800 text-iron-400 border-iron-700', label: status }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}