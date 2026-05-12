# seed.py

from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session

from database import SessionLocal, engine, Base
from models import (
    Igreja,
    Extintor,
    Usuario,
    Categoria,
    Responsavel,
    EmpresaManutencao,
    Ferramenta,
    Emprestimo,
    Manutencao,
    Solicitacao,
    Reserva,
)

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_senha(senha: str):
    return pwd_context.hash(senha)


def seed():
    db: Session = SessionLocal()
    if db.query(Ferramenta).first():
     print("Banco já populado.")
     return
 
    print("Criando igrejas...")

    igrejas = [
        Igreja(
            nome="Igreja Central",
            endereco="Rua das Flores, 120",
            responsavel="Pr. Marcos Silva",
            telefone="(15) 99999-1111"
        ),
        Igreja(
            nome="Igreja Nova Esperança",
            endereco="Av. Brasil, 500",
            responsavel="Pr. João Pedro",
            telefone="(15) 98888-2222"
        ),
        Igreja(
            nome="Igreja Vida Plena",
            endereco="Rua da Paz, 78",
            responsavel="Pra. Ana Clara",
            telefone="(15) 97777-3333"
        ),
    ]

    db.add_all(igrejas)
    db.commit()

    print("Criando usuários...")

    usuarios = [
        Usuario(
            nome="Administrador",
            email="admin@admin.com",
            senha_hash=hash_senha("admin123"),
            perfil="admin",
            setor="TI",
            nivel_setor="lider"
        ),
        Usuario(
            nome="Carlos Souza",
            email="carlos@igreja.com",
            senha_hash=hash_senha("123456"),
            perfil="operador",
            setor="Patrimônio",
            nivel_setor="membro"
        ),
        Usuario(
            nome="Fernanda Lima",
            email="fernanda@igreja.com",
            senha_hash=hash_senha("123456"),
            perfil="operador",
            setor="Manutenção",
            nivel_setor="lider"
        ),
    ]

    db.add_all(usuarios)
    db.commit()

    print("Criando categorias...")

    categorias = [
        Categoria(
            nome="Ferramentas Elétricas",
            cor="#f59e0b",
            icone="zap",
            descricao="Ferramentas elétricas em geral"
        ),
        Categoria(
            nome="Ferramentas Manuais",
            cor="#3b82f6",
            icone="hammer",
            descricao="Ferramentas manuais"
        ),
        Categoria(
            nome="Limpeza",
            cor="#10b981",
            icone="spray-can",
            descricao="Equipamentos de limpeza"
        ),
        Categoria(
            nome="Jardinagem",
            cor="#22c55e",
            icone="trees",
            descricao="Ferramentas de jardinagem"
        ),
    ]

    db.add_all(categorias)
    db.commit()

    print("Criando responsáveis...")

    responsaveis = [
        Responsavel(
            nome="José Almeida",
            contato="jose@igreja.com",
            setor="Patrimônio",
            cargo="Supervisor"
        ),
        Responsavel(
            nome="Lucas Ferreira",
            contato="lucas@igreja.com",
            setor="Manutenção",
            cargo="Técnico"
        ),
        Responsavel(
            nome="Paulo Henrique",
            contato="paulo@igreja.com",
            setor="Obras",
            cargo="Coordenador"
        ),
    ]

    db.add_all(responsaveis)
    db.commit()

    print("Criando empresas de manutenção...")

    empresas = [
        EmpresaManutencao(
            nome="Tech Manutenção Industrial",
            telefone="(15) 4002-8922",
            email="contato@techmanutencao.com",
            endereco="Sorocaba/SP",
            tipo_servico="Ferramentas elétricas"
        ),
        EmpresaManutencao(
            nome="ExtinFire Segurança",
            telefone="(15) 3333-4444",
            email="suporte@extinfire.com",
            endereco="Votorantim/SP",
            tipo_servico="Recarga de extintores"
        ),
    ]

    db.add_all(empresas)
    db.commit()

    print("Criando ferramentas...")

    ferramentas = [
        Ferramenta(
            codigo="FER001",
            nome="Furadeira Bosch",
            descricao="Furadeira de impacto 750W",
            numero_serie="BSH-8821",
            localizacao="Sala de ferramentas",
            estado="disponivel",
            categoria_id=categorias[0].id,
            igreja_id=igrejas[0].id
        ),
        Ferramenta(
            codigo="FER002",
            nome="Parafusadeira Makita",
            descricao="Parafusadeira profissional",
            numero_serie="MK-7788",
            localizacao="Almoxarifado",
            estado="emprestado",
            categoria_id=categorias[0].id,
            igreja_id=igrejas[0].id
        ),
        Ferramenta(
            codigo="FER003",
            nome="Martelo Tramontina",
            descricao="Martelo de aço",
            numero_serie="TRM-1122",
            localizacao="Oficina",
            estado="disponivel",
            categoria_id=categorias[1].id,
            igreja_id=igrejas[1].id
        ),
        Ferramenta(
            codigo="FER004",
            nome="Roçadeira Stihl",
            descricao="Roçadeira para jardim",
            numero_serie="STH-9988",
            localizacao="Área externa",
            estado="manutencao",
            categoria_id=categorias[3].id,
            igreja_id=igrejas[2].id
        ),
        Ferramenta(
            codigo="FER005",
            nome="Lavadora WAP",
            descricao="Lavadora de alta pressão",
            numero_serie="WAP-5544",
            localizacao="Depósito",
            estado="disponivel",
            categoria_id=categorias[2].id,
            igreja_id=igrejas[1].id
        ),
    ]

    db.add_all(ferramentas)
    db.commit()

    print("Criando extintores...")

    extintores = [
        Extintor(
            patrimonio="EXT001",
            tipo="ABC",
            capacidade="6kg",
            localizacao="Entrada principal",
            data_validade=date.today() + timedelta(days=365),
            data_ultima_carga=date.today() - timedelta(days=120),
            igreja_id=igrejas[0].id
        ),
        Extintor(
            patrimonio="EXT002",
            tipo="CO2",
            capacidade="4kg",
            localizacao="Sala de som",
            data_validade=date.today() + timedelta(days=250),
            data_ultima_carga=date.today() - timedelta(days=90),
            igreja_id=igrejas[1].id
        ),
        Extintor(
            patrimonio="EXT003",
            tipo="Água",
            capacidade="10L",
            localizacao="Cozinha",
            data_validade=date.today() + timedelta(days=180),
            data_ultima_carga=date.today() - timedelta(days=60),
            igreja_id=igrejas[2].id
        ),
    ]

    db.add_all(extintores)
    db.commit()

    print("Criando empréstimos...")

    emprestimos = [
        Emprestimo(
            ferramenta_id=ferramentas[1].id,
            responsavel_id=responsaveis[0].id,
            data_saida=datetime.utcnow() - timedelta(days=2),
            data_retorno_prevista=datetime.utcnow() + timedelta(days=5),
            observacoes="Uso em manutenção elétrica",
            devolvida=False
        ),
    ]

    db.add_all(emprestimos)
    db.commit()

    print("Criando manutenções...")

    manutencoes = [
        Manutencao(
            ferramenta_id=ferramentas[3].id,
            empresa_id=empresas[0].id,
            problema="Motor falhando",
            descricao_servico="Troca de peças internas",
            data_envio=datetime.utcnow() - timedelta(days=3),
            data_retorno_prev=datetime.utcnow() + timedelta(days=7),
            valor=450.00,
            status="em_manutencao",
            observacoes="Aguardando peças"
        ),
    ]

    db.add_all(manutencoes)
    db.commit()

    print("Criando solicitações...")

    solicitacoes = [
        Solicitacao(
            usuario_id=usuarios[1].id,
            setor="Patrimônio",
            tipo="compra",
            item_nome="Escada de alumínio",
            descricao="Necessária para manutenção do templo",
            status="pendente"
        ),
        Solicitacao(
            usuario_id=usuarios[2].id,
            setor="Manutenção",
            tipo="manutencao",
            item_nome="Furadeira Bosch",
            descricao="Equipamento apresentando superaquecimento",
            status="aprovada"
        ),
    ]

    db.add_all(solicitacoes)
    db.commit()

    print("Criando reservas...")

    reservas = [
        Reserva(
            ferramenta_id=ferramentas[0].id,
            usuario_id=usuarios[1].id,
            data_inicio=datetime.utcnow() + timedelta(days=1),
            data_fim=datetime.utcnow() + timedelta(days=2),
            status="ativa"
        ),
    ]

    db.add_all(reservas)
    db.commit()

    print("Seed finalizada com sucesso!")


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    seed()