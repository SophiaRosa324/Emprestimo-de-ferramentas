from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, Boolean, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


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
    tipo_servico = Column(String(200), nullable=True)   # ex: "elétrica, hidráulica"
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
    criado_em     = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    categoria   = relationship("Categoria",  back_populates="ferramentas")
    emprestimos = relationship("Emprestimo", back_populates="ferramenta")
    reservas    = relationship("Reserva",    back_populates="ferramenta")
    manutencoes = relationship("Manutencao", back_populates="ferramenta")


class Emprestimo(Base):
    __tablename__ = "emprestimos"

    id                    = Column(Integer, primary_key=True, index=True)
    ferramenta_id         = Column(Integer, ForeignKey("ferramentas.id"), nullable=False)
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

    id                  = Column(Integer, primary_key=True, index=True)
    ferramenta_id       = Column(Integer, ForeignKey("ferramentas.id"),        nullable=False)
    empresa_id          = Column(Integer, ForeignKey("empresas_manutencao.id"), nullable=True)
    problema            = Column(String(300), nullable=False)
    descricao_servico   = Column(Text,        nullable=True)
    data_envio          = Column(DateTime,    nullable=True)
    data_retorno_prev   = Column(DateTime,    nullable=True)   # previsão de retorno
    data_retorno_real   = Column(DateTime,    nullable=True)   # retorno efetivo
    valor               = Column(Float,       nullable=True)
    status              = Column(String(30),  default="aguardando_envio")
    # aguardando_envio | em_manutencao | concluida | cancelada
    observacoes         = Column(Text,        nullable=True)
    criado_em           = Column(DateTime,    default=datetime.utcnow)
    atualizado_em       = Column(DateTime,    default=datetime.utcnow, onupdate=datetime.utcnow)

    ferramenta = relationship("Ferramenta",       back_populates="manutencoes")
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
    