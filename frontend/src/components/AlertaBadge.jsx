// ============================================================
// COMPONENTE AlertaBadge — use dentro de Emprestimos.jsx
// ============================================================
//
// 1. Adicione os imports no topo do Emprestimos.jsx:
//    import { getStatusEmprestimo, ALERTA_CONFIG } from '../utils/alertas'
//    import AlertaBadge from '../components/AlertaBadge'
//
// 2. No card de cada empréstimo NÃO devolvido, adicione:
//    {!e.devolvida && (
//      <AlertaBadge dataDevolucao={e.data_retorno_prevista} />
//    )}
// ============================================================

import { getStatusEmprestimo, ALERTA_CONFIG } from '../utils/alertas'

export default function AlertaBadge({ dataDevolucao }) {
  const status = getStatusEmprestimo(dataDevolucao)
  const cfg = ALERTA_CONFIG[status]

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}