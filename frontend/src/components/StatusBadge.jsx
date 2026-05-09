const MAP = {
  disponivel:  { cls: 'badge-disponivel',  label: 'Disponível'  },
  emprestada:  { cls: 'badge-emprestada',  label: 'Emprestada'  },
  manutencao:  { cls: 'badge-manutencao',  label: 'Manutenção'  },
}

export default function StatusBadge({ estado }) {
  const { cls, label } = MAP[estado] || { cls: 'badge bg-iron-800 text-iron-400', label: estado }
  return <span className={cls}>{label}</span>
}
