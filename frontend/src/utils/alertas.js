/**
 * Retorna o status de alerta de um empréstimo com base na data de retorno prevista.
 * @param {string|Date|null} dataDevolucao
 * @returns {"atrasado"|"vence_hoje"|"normal"|"sem_prazo"}
 */
export function getStatusEmprestimo(dataDevolucao) {
  if (!dataDevolucao) return "sem_prazo"

  const hoje = new Date()
  const devolucao = new Date(dataDevolucao)

  if (devolucao < hoje) return "atrasado"

  const diffDias = (devolucao - hoje) / (1000 * 60 * 60 * 24)
  if (diffDias <= 1) return "vence_hoje"

  return "normal"
}

/**
 * Retorna classe CSS + label para o status de alerta.
 */
export const ALERTA_CONFIG = {
  atrasado:   { cls: "bg-red-900/50 text-red-400 border border-red-800/50",     label: "Atrasado",    dot: "bg-red-400"     },
  vence_hoje: { cls: "bg-amber-900/50 text-amber-400 border border-amber-800/50", label: "Vence hoje",  dot: "bg-amber-400"   },
  normal:     { cls: "bg-emerald-900/50 text-emerald-400 border border-emerald-800/50", label: "No prazo", dot: "bg-emerald-400" },
  sem_prazo:  { cls: "bg-iron-800 text-iron-500",                                label: "Sem prazo",   dot: "bg-iron-600"    },
}