from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, Boolean, Date
from sqlalchemy.orm import relationship
from datetime import datetime, date, timedelta
from database import Base


class Igreja(Base):
    __tablename__ = "igrejas"

    id           = Column(Integer, primary_key=True, index=True)
    nome         = Column(String(200), nullable=False)
    endereco     = Column(String(300), nullable=True)
    responsavel  = Column(String(150), nullable=True)
    telefone     = Column(String(50),  nullable=True)
    ativo        = Column(Boolean, default=True)
    criado_em    = Column(DateTime, default=datetime.utcnow)

    ferramentas  = relationship("Ferramenta", back_populates="igreja")
    extintores   = relationship("Extintor",   back_populates="igreja")


class Extintor(Base):
    __tablename__ = "extintores"
 
    id                = Column(Integer, primary_key=True, index=True)
    patrimonio        = Column(String(50),  nullable=False, unique=True, index=True)
    tipo              = Column(String(50),  nullable=False)   # ABC | CO2 | Água | PQS
    capacidade        = Column(String(30),  nullable=True)
    localizacao       = Column(String(200), nullable=True)
    data_validade     = Column(Date,        nullable=True)
    data_ultima_carga = Column(Date,        nullable=True)
    observacoes       = Column(Text,        nullable=True)
    ativo             = Column(Boolean, default=True)
    igreja_id         = Column(Integer, ForeignKey("igrejas.id"), nullable=True)
    criado_em         = Column(DateTime, default=datetime.utcnow)
    atualizado_em     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
 
    igreja = relationship("Igreja", back_populates="extintores", lazy="select")
 
    @property
    def status_validade(self) -> str:
        if not self.data_validade:
            return "sem_validade"
        hoje = date.today()
        if self.data_validade < hoje:
            return "vencido"
        if self.data_validade <= hoje + timedelta(days=30):
            return "vence_30d"
        return "ok"
 
    @property
    def dias_para_vencer(self):
        if not self.data_validade:
            return None
        return (self.data_validade - date.today()).days
 


class Usuario(Base):
    __tablename__ = "usuarios"

    id          = Column(Integer, primary_key=True, index=True)
    nome        = Column(String(150), nullable=False)
    email       = Column(String(200), nullable=False, unique=True, index=True)
    senha_hash  = Column(String(300), nullable=False)
    perfil      = Column(String(20),  default="operador")
    setor       = Column(String(100), nullable=True)
    nivel_setor = Column(String(20),  default="membro")
    ativo       = Column(Boolean, default=True)
    criado_em   = Column(DateTime, default=datetime.utcnow)

    solicitacoes = relationship("Solicitacao", back_populates="usuario", lazy="dynamic")
    reservas     = relationship("Reserva",     back_populates="usuario", lazy="dynamic")


class Categoria(Base):
    __tablename__ = "categorias"

    id        = Column(Integer, primary_key=True, index=True)
    nome      = Column(String(100), nullable=False, unique=True)
    cor       = Column(String(20),  default="#6366f1")
    icone     = Column(String(50),  default="wrench")
    descricao = Column(String(200), nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)

    ferramentas = relationship("Ferramenta", back_populates="categoria")


class Responsavel(Base):
    __tablename__ = "responsaveis"

    id        = Column(Integer, primary_key=True, index=True)
    nome      = Column(String(150), nullable=False)
    contato   = Column(String(150))
    setor     = Column(String(100), nullable=True)
    cargo     = Column(String(100), nullable=True)
    ativo     = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)

    emprestimos = relationship("Emprestimo", back_populates="responsavel")


class EmpresaManutencao(Base):
    __tablename__ = "empresas_manutencao"

    id           = Column(Integer, primary_key=True, index=True)
    nome         = Column(String(200), nullable=False)
    telefone     = Column(String(50),  nullable=True)
    email        = Column(String(200), nullable=True)
    endereco     = Column(String(300), nullable=True)
    tipo_servico = Column(String(200), nullable=True)
    observacoes  = Column(Text, nullable=True)
    ativa        = Column(Boolean, default=True)
    criado_em    = Column(DateTime, default=datetime.utcnow)

    manutencoes = relationship("Manutencao", back_populates="empresa")


class Ferramenta(Base):
    __tablename__ = "ferramentas"

    id            = Column(Integer, primary_key=True, index=True)
    codigo        = Column(String(20),  unique=True, nullable=True, index=True)
    nome          = Column(String(150), nullable=False)
    descricao     = Column(Text)
    numero_serie  = Column(String(100))
    localizacao   = Column(String(150))
    estado        = Column(String(50),  default="disponivel")
    foto          = Column(String(300))
    categoria_id  = Column(Integer, ForeignKey("categorias.id"), nullable=True)
    igreja_id     = Column(Integer, ForeignKey("igrejas.id"),    nullable=True)  # ← NOVO
    criado_em     = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    categoria   = relationship("Categoria",       back_populates="ferramentas")
    igreja      = relationship("Igreja",          back_populates="ferramentas")
    emprestimos = relationship("Emprestimo",       back_populates="ferramenta")
    reservas    = relationship("Reserva",          back_populates="ferramenta")
    manutencoes = relationship("Manutencao",       back_populates="ferramenta")
    compras     = relationship("CompraFerramenta", back_populates="ferramenta")

class Emprestimo(Base):
    __tablename__ = "emprestimos"

    id                    = Column(Integer, primary_key=True, index=True)
    ferramenta_id         = Column(Integer, ForeignKey("ferramentas.id"),  nullable=False)
    responsavel_id        = Column(Integer, ForeignKey("responsaveis.id"), nullable=False)
    data_saida            = Column(DateTime, default=datetime.utcnow)
    data_retorno_prevista = Column(DateTime, nullable=True)
    data_retorno_real     = Column(DateTime, nullable=True)
    observacoes           = Column(Text)
    devolvida             = Column(Boolean, default=False)

    ferramenta  = relationship("Ferramenta",  back_populates="emprestimos")
    responsavel = relationship("Responsavel", back_populates="emprestimos")

class Manutencao(Base):
    __tablename__ = "manutencoes"

    id                = Column(Integer, primary_key=True, index=True)
    ferramenta_id     = Column(Integer, ForeignKey("ferramentas.id"),         nullable=False)
    empresa_id        = Column(Integer, ForeignKey("empresas_manutencao.id"), nullable=True)
    problema          = Column(String(300), nullable=False)
    descricao_servico = Column(Text,        nullable=True)
    data_envio        = Column(DateTime,    nullable=True)
    data_retorno_prev = Column(DateTime,    nullable=True)
    data_retorno_real = Column(DateTime,    nullable=True)
    valor             = Column(Float,       nullable=True)
    status            = Column(String(30),  default="aguardando_envio")
    observacoes       = Column(Text,        nullable=True)
    criado_em         = Column(DateTime,    default=datetime.utcnow)
    atualizado_em     = Column(DateTime,    default=datetime.utcnow, onupdate=datetime.utcnow)

    ferramenta = relationship("Ferramenta",        back_populates="manutencoes")
    empresa    = relationship("EmpresaManutencao", back_populates="manutencoes")


class Solicitacao(Base):
    __tablename__ = "solicitacoes"

    id            = Column(Integer, primary_key=True, index=True)
    usuario_id    = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    setor         = Column(String(100), nullable=False)
    tipo          = Column(String(20),  nullable=False)
    item_nome     = Column(String(200), nullable=False)
    descricao     = Column(Text)
    status        = Column(String(20),  default="pendente")
    criado_em     = Column(DateTime,    default=datetime.utcnow)
    atualizado_em = Column(DateTime,    default=datetime.utcnow, onupdate=datetime.utcnow)

    usuario = relationship("Usuario", back_populates="solicitacoes")


class Reserva(Base):
    __tablename__ = "reservas"

    id            = Column(Integer, primary_key=True, index=True)
    ferramenta_id = Column(Integer, ForeignKey("ferramentas.id"), nullable=False)
    usuario_id    = Column(Integer, ForeignKey("usuarios.id"),    nullable=False)
    data_inicio   = Column(DateTime, nullable=False)
    data_fim      = Column(DateTime, nullable=False)
    status        = Column(String(20), default="ativa")
    criado_em     = Column(DateTime,   default=datetime.utcnow)

    ferramenta = relationship("Ferramenta", back_populates="reservas")
    usuario    = relationship("Usuario",    back_populates="reservas")
    
class NotaFiscal(Base):
    __tablename__ = "notas_fiscais"

    id = Column(Integer, primary_key=True, index=True)

    chave = Column(String, nullable=True)
    numero = Column(String, nullable=True)

    cnpj_emitente = Column(String, nullable=True)
    razao_social = Column(String, nullable=True)
    validada = Column(Boolean, default=False)
    valor_total = Column(Float, nullable=True)

    data_emissao = Column(Date, nullable=True)

    xml_path = Column(String, nullable=True)
    pdf_path = Column(String, nullable=True)

    criada_em = Column(DateTime, default=datetime.utcnow)

    # RELACIONAMENTO
    compras = relationship("CompraFerramenta", back_populates="nota_fiscal")


class CompraFerramenta(Base):
    __tablename__ = "compras_ferramentas"

    id = Column(Integer, primary_key=True, index=True)

    ferramenta_id = Column(
        Integer,
        ForeignKey("ferramentas.id")
    )

    nota_fiscal_id = Column(
        Integer,
        ForeignKey("notas_fiscais.id"),
        nullable=True
    )

    fornecedor = Column(String, nullable=False)

    local_compra = Column(String, nullable=True)

    valor = Column(Float, nullable=False)

    quantidade = Column(Integer, default=1)

    data_compra = Column(Date)

    garantia_meses = Column(Integer, nullable=True)

    garantia_ate = Column(Date, nullable=True)

    observacoes = Column(Text, nullable=True)

    criado_em = Column(DateTime, default=datetime.utcnow)

    ferramenta = relationship(
        "Ferramenta",
        back_populates="compras"
    )

    nota_fiscal = relationship(
        "NotaFiscal",
        back_populates="compras"
    )