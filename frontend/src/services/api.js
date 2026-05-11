export function makeApi(authFetch) {
  return {
    // ── Ferramentas ──────────────────────────────────────
    listarFerramentas: (params = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''))
      return authFetch(`/ferramentas/?${q}`)
    },
    obterFerramenta:    (id)       => authFetch(`/ferramentas/${id}`),
    criarFerramenta:    (data)     => authFetch('/ferramentas/', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }),
    atualizarFerramenta:(id, data) => authFetch(`/ferramentas/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }),
    deletarFerramenta:  (id)       => authFetch(`/ferramentas/${id}`, { method:'DELETE' }),
    uploadFoto: (id, file) => {
      const fd = new FormData(); fd.append('foto', file)
      return authFetch(`/ferramentas/${id}/foto`, { method:'POST', body:fd })
    },

    // ── Categorias ───────────────────────────────────────
    listarCategorias: (params = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''))
      return authFetch(`/categorias/?${q}`)
    },
    criarCategoria:    (data)     => authFetch('/categorias/', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }),
    atualizarCategoria:(id, data) => authFetch(`/categorias/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }),
    deletarCategoria:  (id)       => authFetch(`/categorias/${id}`, { method:'DELETE' }),
    detalhesCategoria: (id)       => authFetch(`/categorias/${id}/detalhes`),

    // ── Responsáveis ─────────────────────────────────────
    listarResponsaveis: (params = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''))
      return authFetch(`/responsaveis/?${q}`)
    },
    criarResponsavel:    (data)     => authFetch('/responsaveis/', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }),
    atualizarResponsavel:(id, data) => authFetch(`/responsaveis/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }),
    deletarResponsavel:  (id)       => authFetch(`/responsaveis/${id}`, { method:'DELETE' }),
    detalhesResponsavel: (id)       => authFetch(`/responsaveis/${id}/detalhes`),

    // ── Empréstimos ──────────────────────────────────────
    listarEmprestimos: (params = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''))
      return authFetch(`/emprestimos/?${q}`)
    },
    registrarEmprestimo: (data)        => authFetch('/emprestimos/', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }),
    registrarDevolucao:  (id, data={}) => authFetch(`/emprestimos/${id}/devolver`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }),

    // ── Manutenção ───────────────────────────────────────
    listarManutencoes: (params = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''))
      return authFetch(`/manutencao/?${q}`)
    },
    obterManutencao:          (id)       => authFetch(`/manutencao/${id}`),
    criarManutencao:          (data)     => authFetch('/manutencao/', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }),
    atualizarManutencao:      (id, data) => authFetch(`/manutencao/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }),
    avancarStatusManutencao:  (id, data) => authFetch(`/manutencao/${id}/status`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }),
    deletarManutencao:        (id)       => authFetch(`/manutencao/${id}`, { method:'DELETE' }),
    resumoManutencao:         ()         => authFetch('/manutencao/resumo/stats'),
    historicoManutencaoFerramenta: (fId) => authFetch(`/manutencao/ferramenta/${fId}/historico`),

    // ── Empresas de manutenção ───────────────────────────
    listarEmpresasManutencao: (params = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''))
      return authFetch(`/empresas-manutencao/?${q}`)
    },
    obterEmpresaManutencao:   (id)       => authFetch(`/empresas-manutencao/${id}`),
    criarEmpresaManutencao:   (data)     => authFetch('/empresas-manutencao/', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }),
    atualizarEmpresaManutencao:(id, data)=> authFetch(`/empresas-manutencao/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }),
    deletarEmpresaManutencao: (id)       => authFetch(`/empresas-manutencao/${id}`, { method:'DELETE' }),

    // ── Solicitações ─────────────────────────────────────
    listarSolicitacoes: (params = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''))
      return authFetch(`/solicitacoes/?${q}`)
    },
    criarSolicitacao:    (data)       => authFetch('/solicitacoes/', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }),
    atualizarSolicitacao:(id, status) => authFetch(`/solicitacoes/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status }) }),

    // ── Reservas ─────────────────────────────────────────
    listarReservas: (params = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''))
      return authFetch(`/reservas/?${q}`)
    },
    criarReserva:   (data) => authFetch('/reservas/', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }),
    cancelarReserva:(id)   => authFetch(`/reservas/${id}`, { method:'DELETE' }),

    // ── Dashboard ─────────────────────────────────────────
    obterDashboard: () => authFetch('/dashboard/'),
    obterResumo:    () => authFetch('/relatorios/resumo'),

    // ── Relatórios ────────────────────────────────────────
    relatorioMaisUsadas:     (p={}) => { const q = new URLSearchParams(Object.entries(p).filter(([,v])=>v!=null&&v!=='')); return authFetch(`/relatorios/mais-usadas?${q}`) },
    relatorioAtrasados:      (p={}) => { const q = new URLSearchParams(Object.entries(p).filter(([,v])=>v!=null&&v!=='')); return authFetch(`/relatorios/atrasados?${q}`) },
    relatorioUsoPorSetor:    (p={}) => { const q = new URLSearchParams(Object.entries(p).filter(([,v])=>v!=null&&v!=='')); return authFetch(`/relatorios/uso-por-setor?${q}`) },
    relatorioSolPendentes:   (p={}) => { const q = new URLSearchParams(Object.entries(p).filter(([,v])=>v!=null&&v!=='')); return authFetch(`/relatorios/solicitacoes-pendentes?${q}`) },
    relatorioReservasAtivas: ()     => authFetch('/relatorios/reservas-ativas'),
    exportarFerramentas:     (p={}) => { const q = new URLSearchParams(Object.entries(p).filter(([,v])=>v!=null&&v!=='')); return `/api/relatorios/exportar/ferramentas?${q}` },
    exportarEmprestimos:     (p={}) => { const q = new URLSearchParams(Object.entries(p).filter(([,v])=>v!=null&&v!=='')); return `/api/relatorios/exportar/emprestimos?${q}` },

    // ── Usuários ──────────────────────────────────────────
    listarUsuarios:     ()         => authFetch('/auth/usuarios'),
    detalhesUsuario:    (id)       => authFetch(`/auth/usuarios/${id}/detalhes`),
    atualizarUsuario:   (id, data) => authFetch(`/auth/usuarios/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }),
    toggleUsuarioAtivo: (id)       => authFetch(`/auth/usuarios/${id}/ativo`, { method:'PATCH' }),
    deletarUsuario:     (id)       => authFetch(`/auth/usuarios/${id}`, { method:'DELETE' }),
  }
}