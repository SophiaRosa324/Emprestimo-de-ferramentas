from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date


# ── Igreja ─────────────────────────────────────────────────
class IgrejaBase(BaseModel):
    nome:        str
    endereco:    Optional[str]  = None
    responsavel: Optional[str]  = None
    telefone:    Optional[str]  = None
    ativo:       Optional[bool] = True
 
class IgrejaCreate(IgrejaBase):
    pass
 
class IgrejaUpdate(BaseModel):
    nome:        Optional[str]  = None
    endereco:    Optional[str]  = None
    responsavel: Optional[str]  = None
    telefone:    Optional[str]  = None
    ativo:       Optional[bool] = None
 
class IgrejaOut(IgrejaBase):
    id:        int
    criado_em: datetime
    class Config:
        from_attributes = True
        
# ── Extintor ───────────────────────────────────────────────
class ExtintorBase(BaseModel):
    patrimonio:        str
    tipo:              str
    capacidade:        Optional[str]  = None
    localizacao:       Optional[str]  = None
    data_validade:     Optional[date] = None
    data_ultima_carga: Optional[date] = None
    observacoes:       Optional[str]  = None
    ativo:             Optional[bool] = True
    igreja_id:         Optional[int]  = None
 
class ExtintorCreate(ExtintorBase):
    pass
 
class ExtintorUpdate(BaseModel):
    patrimonio:        Optional[str]  = None
    tipo:              Optional[str]  = None
    capacidade:        Optional[str]  = None
    localizacao:       Optional[str]  = None
    data_validade:     Optional[date] = None
    data_ultima_carga: Optional[date] = None
    observacoes:       Optional[str]  = None
    ativo:             Optional[bool] = None
    igreja_id:         Optional[int]  = None
 
class ExtintorOut(ExtintorBase):
    id:             int
    criado_em:      datetime
    atualizado_em:  datetime
    igreja:         Optional[IgrejaOut] = None
    status_validade:Optional[str]       = None
    dias_para_vencer:Optional[int]      = None
    class Config:
        from_attributes = True


# ── Categoria ──────────────────────────────────────────────
class CategoriaBase(BaseModel):
    nome:     str
    cor:      Optional[str] = "#6366f1"
    icone:    Optional[str] = "wrench"
    descricao:Optional[str] = None

class CategoriaCreate(CategoriaBase):
    pass

class CategoriaOut(CategoriaBase):
    id: int
    criado_em: datetime
    class Config:
        from_attributes = True


# ── Responsavel ────────────────────────────────────────────
class ResponsavelBase(BaseModel):
    nome:    str
    contato: Optional[str] = None
    setor:   Optional[str] = None
    cargo:   Optional[str] = None
    ativo:   Optional[bool] = True

class ResponsavelCreate(ResponsavelBase):
    pass

class ResponsavelUpdate(ResponsavelBase):
    nome: Optional[str] = None

class ResponsavelOut(ResponsavelBase):
    id: int
    criado_em: datetime
    class Config:
        from_attributes = True


# ── Ferramenta ─────────────────────────────────────────────
class FerramentaBase(BaseModel):
    nome:         str
    descricao:    Optional[str] = None
    numero_serie: Optional[str] = None
    localizacao:  Optional[str] = None
    estado:       Optional[str] = "disponivel"
    categoria_id: Optional[int] = None
    igreja_id:    Optional[int] = None   # ← NOVO

class FerramentaCreate(FerramentaBase):
    pass

class FerramentaUpdate(FerramentaBase):
    nome: Optional[str] = None

class FerramentaOut(FerramentaBase):
    id:            int
    codigo:        Optional[str] = None
    foto:          Optional[str] = None
    criado_em:     datetime
    atualizado_em: datetime
    categoria:     Optional[CategoriaOut] = None
    igreja:        Optional[IgrejaOut]    = None   # ← NOVO
    class Config:
        from_attributes = True


# ── Emprestimo ─────────────────────────────────────────────
class EmprestimoBase(BaseModel):
    ferramenta_id:        int
    responsavel_id:       int
    data_retorno_prevista:Optional[datetime] = None
    observacoes:          Optional[str]      = None

class EmprestimoCreate(EmprestimoBase):
    pass

class DevolucaoUpdate(BaseModel):
    observacoes: Optional[str] = None

class EmprestimoOut(EmprestimoBase):
    id:                int
    data_saida:        datetime
    data_retorno_real: Optional[datetime] = None
    devolvida:         bool
    ferramenta:        Optional[FerramentaOut]  = None
    responsavel:       Optional[ResponsavelOut] = None
    class Config:
        from_attributes = True