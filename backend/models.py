from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id         = Column(Integer, primary_key=True, index=True)
    nome       = Column(String(150), nullable=False)
    email      = Column(String(200), nullable=False, unique=True, index=True)
    senha_hash = Column(String(300), nullable=False)
    perfil     = Column(String(20), default="operador")   # admin | operador | encarregado
    setor      = Column(String(100), nullable=True)
    nivel_setor= Column(String(20), default="membro")     # membro | encarregado | administrador
    ativo      = Column(Boolean, default=True)
    criado_em  = Column(DateTime, default=datetime.utcnow)

    solicitacoes = relationship("Solicitacao", back_populates="usuario", lazy="dynamic")
    reservas     = relationship("Reserva",     back_populates="usuario", lazy="dynamic")


class Categoria(Base):
    __tablename__ = "categorias"

    id        = Column(Integer, primary_key=True, index=True)
    nome      = Column(String(100), nullable=False, unique=True)
    cor       = Column(String(20), default="#6366f1")
    icone     = Column(String(50), default="wrench")
    descricao = Column(String(200), nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)

    ferramentas = relationship("Ferramenta", back_populates="categoria")


class Responsavel(Base):
    __tablename__ = "responsaveis"

    id        = Column(Integer, primary_key=True, index=True)
    nome      = Column(String(150), nullable=False)
    contato   = Column(String(150))
    setor     = Column(String(100), nullable=True)   # ← NOVO
    cargo     = Column(String(100), nullable=True)   # ← NOVO
    ativo     = Column(Boolean, default=True)        # ← NOVO
    criado_em = Column(DateTime, default=datetime.utcnow)

    emprestimos = relationship("Emprestimo", back_populates="responsavel")


class Ferramenta(Base):
    __tablename__ = "ferramentas"

    id           = Column(Integer, primary_key=True, index=True)
    codigo       = Column(String(20), unique=True, nullable=True, index=True)  # ← NOVO ex: FUR-001
    nome         = Column(String(150), nullable=False)
    descricao    = Column(Text)
    numero_serie = Column(String(100))
    localizacao  = Column(String(150))
    estado       = Column(String(50), default="disponivel")  # disponivel | emprestada | manutencao | reservada
    foto         = Column(String(300))
    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=True)
    criado_em    = Column(DateTime, default=datetime.utcnow)
    atualizado_em= Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    categoria   = relationship("Categoria", back_populates="ferramentas")
    emprestimos = relationship("Emprestimo", back_populates="ferramenta")
    reservas    = relationship("Reserva",    back_populates="ferramenta")


class Emprestimo(Base):
    __tablename__ = "emprestimos"

    id                   = Column(Integer, primary_key=True, index=True)
    ferramenta_id        = Column(Integer, ForeignKey("ferramentas.id"), nullable=False)
    responsavel_id       = Column(Integer, ForeignKey("responsaveis.id"), nullable=False)
    data_saida           = Column(DateTime, default=datetime.utcnow)
    data_retorno_prevista= Column(DateTime, nullable=True)
    data_retorno_real    = Column(DateTime, nullable=True)
    observacoes          = Column(Text)
    devolvida            = Column(Boolean, default=False)

    ferramenta  = relationship("Ferramenta",  back_populates="emprestimos")
    responsavel = relationship("Responsavel", back_populates="emprestimos")


class Solicitacao(Base):
    __tablename__ = "solicitacoes"

    id           = Column(Integer, primary_key=True, index=True)
    usuario_id   = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    setor        = Column(String(100), nullable=False)
    tipo         = Column(String(20),  nullable=False)     # ferramenta | compra
    item_nome    = Column(String(200), nullable=False)
    descricao    = Column(Text)
    status       = Column(String(20), default="pendente")  # pendente | aprovado | recusado | concluido
    criado_em    = Column(DateTime, default=datetime.utcnow)
    atualizado_em= Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    usuario = relationship("Usuario", back_populates="solicitacoes")


class Reserva(Base):
    __tablename__ = "reservas"

    id           = Column(Integer, primary_key=True, index=True)
    ferramenta_id= Column(Integer, ForeignKey("ferramentas.id"), nullable=False)
    usuario_id   = Column(Integer, ForeignKey("usuarios.id"),    nullable=False)
    data_inicio  = Column(DateTime, nullable=False)
    data_fim     = Column(DateTime, nullable=False)
    status       = Column(String(20), default="ativa")     # ativa | cancelada | concluida
    criado_em    = Column(DateTime, default=datetime.utcnow)

    ferramenta = relationship("Ferramenta", back_populates="reservas")
    usuario    = relationship("Usuario",    back_populates="reservas")