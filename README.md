# 🔧 Sistema de Cadastro de Ferramentas — Backend

API REST construída com **FastAPI + SQLite + SQLAlchemy**.

---

## ⚙️ Configuração (primeira vez)

```bash
# 1. Entre na pasta do backend
cd backend

# 2. Crie e ative o ambiente virtual
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

# 3. Instale as dependências
pip install -r requirements.txt

# 4. (Opcional) Popule o banco com dados de exemplo
python seed.py

# 5. Inicie o servidor
uvicorn main:app --reload
```

A API estará disponível em: **http://localhost:8000**

---

## 📖 Documentação interativa

| URL | Descrição |
|-----|-----------|
| http://localhost:8000/docs | Swagger UI — teste as rotas pelo navegador |
| http://localhost:8000/redoc | ReDoc — documentação mais legível |

---

## 🗂️ Rotas disponíveis

### Ferramentas
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/ferramentas/` | Listar (com busca, filtro por categoria/estado) |
| GET | `/ferramentas/{id}` | Obter uma ferramenta |
| POST | `/ferramentas/` | Criar ferramenta |
| PUT | `/ferramentas/{id}` | Atualizar ferramenta |
| DELETE | `/ferramentas/{id}` | Excluir ferramenta |
| POST | `/ferramentas/{id}/foto` | Upload de foto (JPEG/PNG/WebP) |

### Empréstimos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/emprestimos/` | Listar empréstimos (filtrar por status) |
| POST | `/emprestimos/` | Registrar saída de ferramenta |
| PATCH | `/emprestimos/{id}/devolver` | Registrar devolução |

### Categorias e Responsáveis
| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST/DELETE | `/categorias/` | CRUD de categorias |
| GET/POST/DELETE | `/responsaveis/` | CRUD de responsáveis |

### Relatórios
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/relatorios/resumo` | Dashboard com totais por estado e categoria |
| GET | `/relatorios/exportar/ferramentas` | Download Excel de ferramentas |
| GET | `/relatorios/exportar/emprestimos` | Download Excel de empréstimos |

---

## 📁 Estrutura do projeto

```
backend/
├── main.py          # App principal, CORS, rotas
├── database.py      # Conexão SQLite
├── models.py        # Tabelas (SQLAlchemy)
├── schemas.py       # Validação (Pydantic)
├── seed.py          # Dados de exemplo
├── requirements.txt
├── uploads/         # Fotos das ferramentas (gerado automaticamente)
└── routers/
    ├── tools.py     # CRUD de ferramentas + upload de foto
    ├── loans.py     # Empréstimos e responsáveis
    ├── reports.py   # Resumo e exportação Excel
    └── categories.py
```

---

## 🗄️ Banco de dados

O arquivo `ferramentas.db` é criado automaticamente na primeira execução. Para resetar, basta apagá-lo e rodar `python seed.py` novamente.

**Estados possíveis de uma ferramenta:** `disponivel` | `emprestada` | `manutencao`

## FRONTEND

npm install
cd frontend
npm run dev

## ADICIONAR DEPOIS:
DETALHES DOS RESPONSAVEIS
ARRUMAR CATEGORIA
ADICIONAR NIVEIS DE SETORES
DETALHES EM TUDO HAHAHHAHHAHHAHAHAHAHHAAHHAHAHAHAH
