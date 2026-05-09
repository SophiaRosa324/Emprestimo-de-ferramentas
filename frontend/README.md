# 🎨 ToolVault — Frontend

Interface React + Tailwind para o sistema de gestão de ferramentas.

---

## ⚙️ Configuração

```bash
# Entre na pasta do frontend
cd frontend

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse: **http://localhost:5173**

> O frontend assume que o backend está rodando em `http://localhost:8000`.
> As chamadas `/api/*` são redirecionadas automaticamente via proxy Vite.

---

## 📦 Build para produção

```bash
npm run build
# Arquivos gerados em: dist/
```

---

## 🗂️ Estrutura

```
src/
├── components/
│   ├── Sidebar.jsx       # Navegação lateral
│   ├── Modal.jsx         # Modal reutilizável
│   └── StatusBadge.jsx   # Badge de estado da ferramenta
├── pages/
│   ├── Dashboard.jsx     # Resumo geral com gráficos
│   ├── Ferramentas.jsx   # CRUD + upload de foto
│   ├── Emprestimos.jsx   # Controle de saída/devolução
│   ├── Responsaveis.jsx  # Cadastro de responsáveis
│   ├── Categorias.jsx    # Gerenciar categorias
│   └── Relatorios.jsx    # Exportação Excel
├── services/
│   └── api.js            # Todas as chamadas à API
├── App.jsx               # Roteamento principal
├── main.jsx
└── index.css             # Design tokens e classes utilitárias
```

---

## 🎨 Design

- **Tema:** Dark industrial — fundo carvão com acento âmbar
- **Fontes:** DM Serif Display (títulos) + DM Sans (corpo)
- **Animações:** Fade-in e slide-up suaves em todas as páginas
