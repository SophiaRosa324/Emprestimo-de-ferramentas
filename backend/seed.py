from database import SessionLocal
import models
from routers.auth import hash_senha
from datetime import datetime, timedelta
import random


def seed():

    db = SessionLocal()

    try:

        # =====================================================
        # USUÁRIOS
        # =====================================================
        if db.query(models.Usuario).count() == 0:

            usuarios = [

                models.Usuario(
                    nome="Administrador Geral",
                    email="admin@admin.com",
                    senha_hash=hash_senha("123456"),
                    perfil="admin",
                    setor="geral",
                    nivel_setor="administrador",
                    ativo=True
                ),

                models.Usuario(
                    nome="João Silva",
                    email="joao@igreja.com",
                    senha_hash=hash_senha("123456"),
                    perfil="encarregado",
                    setor="manutencao",
                    nivel_setor="encarregado",
                    ativo=True
                ),

                models.Usuario(
                    nome="Maria Souza",
                    email="maria@igreja.com",
                    senha_hash=hash_senha("123456"),
                    perfil="operador",
                    setor="limpeza",
                    nivel_setor="membro",
                    ativo=True
                ),

                models.Usuario(
                    nome="Carlos Mendes",
                    email="carlos@igreja.com",
                    senha_hash=hash_senha("123456"),
                    perfil="operador",
                    setor="eletrica",
                    nivel_setor="membro",
                    ativo=True
                ),

                models.Usuario(
                    nome="Fernanda Lima",
                    email="fernanda@igreja.com",
                    senha_hash=hash_senha("123456"),
                    perfil="operador",
                    setor="jardinagem",
                    nivel_setor="membro",
                    ativo=True
                ),

                models.Usuario(
                    nome="Pedro Rocha",
                    email="pedro@igreja.com",
                    senha_hash=hash_senha("123456"),
                    perfil="encarregado",
                    setor="som",
                    nivel_setor="encarregado",
                    ativo=True
                ),

                models.Usuario(
                    nome="Ana Paula",
                    email="ana@igreja.com",
                    senha_hash=hash_senha("123456"),
                    perfil="operador",
                    setor="midia",
                    nivel_setor="membro",
                    ativo=True
                ),

                models.Usuario(
                    nome="Lucas Ribeiro",
                    email="lucas@igreja.com",
                    senha_hash=hash_senha("123456"),
                    perfil="operador",
                    setor="hidraulica",
                    nivel_setor="membro",
                    ativo=True
                ),
            ]

            db.add_all(usuarios)
            db.commit()

            print("✅ Usuários criados")

        usuarios = db.query(models.Usuario).all()

        # =====================================================
        # CATEGORIAS
        # =====================================================
        if db.query(models.Categoria).count() == 0:

            categorias = [

                models.Categoria(nome="Elétrica", cor="#f59e0b"),
                models.Categoria(nome="Construção", cor="#6366f1"),
                models.Categoria(nome="Limpeza", cor="#10b981"),
                models.Categoria(nome="Jardinagem", cor="#22c55e"),
                models.Categoria(nome="Hidráulica", cor="#06b6d4"),
                models.Categoria(nome="Som", cor="#8b5cf6"),
                models.Categoria(nome="Iluminação", cor="#f43f5e"),
                models.Categoria(nome="Pintura", cor="#ec4899"),
                models.Categoria(nome="Mídia", cor="#14b8a6"),
            ]

            db.add_all(categorias)
            db.commit()

            print("✅ Categorias criadas")

        categorias = db.query(models.Categoria).all()

        categoria_map = {c.nome: c.id for c in categorias}

        # =====================================================
        # FERRAMENTAS
        # =====================================================
        if db.query(models.Ferramenta).count() == 0:

            ferramentas = [

                # Elétrica
                models.Ferramenta(
                    nome="Furadeira Bosch",
                    descricao="Furadeira profissional 750W",
                    numero_serie="EL001",
                    localizacao="Sala Técnica",
                    estado="disponivel",
                  
                    categoria_id=categoria_map["Elétrica"]
                ),

                models.Ferramenta(
                    nome="Parafusadeira Makita",
                    descricao="Parafusadeira industrial",
                    numero_serie="EL002",
                    localizacao="Sala Técnica",
                    estado="emprestada",
              
                    categoria_id=categoria_map["Elétrica"]
                ),

                models.Ferramenta(
                    nome="Multímetro Digital",
                    descricao="Multímetro profissional",
                    numero_serie="EL003",
                    localizacao="Elétrica",
                    estado="disponivel",
                    
                    categoria_id=categoria_map["Elétrica"]
                ),

                # Construção
                models.Ferramenta(
                    nome="Martelo Tramontina",
                    descricao="Martelo profissional",
                    numero_serie="CO001",
                    localizacao="Oficina",
                    estado="disponivel",
                 
                    categoria_id=categoria_map["Construção"]
                ),

                models.Ferramenta(
                    nome="Escada Alumínio",
                    descricao="Escada 7 degraus",
                    numero_serie="CO002",
                    localizacao="Depósito",
                    estado="disponivel",
                   
                    categoria_id=categoria_map["Construção"]
                ),

                models.Ferramenta(
                    nome="Serra Mármore",
                    descricao="Serra elétrica",
                    numero_serie="CO003",
                    localizacao="Construção",
                    estado="manutencao",
                    
                    categoria_id=categoria_map["Construção"]
                ),

                # Limpeza
                models.Ferramenta(
                    nome="Lavadora WAP",
                    descricao="Lavadora de alta pressão",
                    numero_serie="LI001",
                    localizacao="Limpeza",
                    estado="manutencao",
                    
                    categoria_id=categoria_map["Limpeza"]
                ),

                models.Ferramenta(
                    nome="Vassoura Industrial",
                    descricao="Vassoura reforçada",
                    numero_serie="LI002",
                    localizacao="Depósito",
                    estado="disponivel",
                    
                    categoria_id=categoria_map["Limpeza"]
                ),

                # Jardinagem
                models.Ferramenta(
                    nome="Cortador de Grama",
                    descricao="Cortador elétrico",
                    numero_serie="JA001",
                    localizacao="Área Externa",
                    estado="emprestada",
                  
                    categoria_id=categoria_map["Jardinagem"]
                ),

                models.Ferramenta(
                    nome="Mangueira 30m",
                    descricao="Mangueira reforçada",
                    numero_serie="JA002",
                    localizacao="Jardim",
                    estado="disponivel",
                
                    categoria_id=categoria_map["Jardinagem"]
                ),

                # Som
                models.Ferramenta(
                    nome="Mesa de Som Yamaha",
                    descricao="Mesa 12 canais",
                    numero_serie="SO001",
                    localizacao="Auditório",
                    estado="disponivel",
                
                    categoria_id=categoria_map["Som"]
                ),

                models.Ferramenta(
                    nome="Microfone Sem Fio",
                    descricao="Microfone profissional",
                    numero_serie="SO002",
                    localizacao="Auditório",
                    estado="emprestada",
                
                    categoria_id=categoria_map["Som"]
                ),

                # Iluminação
                models.Ferramenta(
                    nome="Refletor LED",
                    descricao="Refletor 200W",
                    numero_serie="IL001",
                    localizacao="Palco",
                    estado="disponivel",
                  
                    categoria_id=categoria_map["Iluminação"]
                ),

                # Mídia
                models.Ferramenta(
                    nome="Câmera Canon",
                    descricao="Câmera DSLR",
                    numero_serie="MI001",
                    localizacao="Mídia",
                    estado="disponivel",
                 
                    categoria_id=categoria_map["Mídia"]
                ),
            ]

            db.add_all(ferramentas)
            db.commit()

            print("✅ Ferramentas criadas")

        ferramentas = db.query(models.Ferramenta).all()

        # =====================================================
        # RESPONSÁVEIS
        # =====================================================
        if db.query(models.Responsavel).count() == 0:

            responsaveis = [

                models.Responsavel(
                    nome="Carlos Técnico",
                    contato="manutencao"
                ),

                models.Responsavel(
                    nome="Equipe Limpeza",
                    contato="limpeza"
                ),

                models.Responsavel(
                    nome="Pedro Jardinagem",
                    contato="jardinagem"
                ),

                models.Responsavel(
                    nome="Ministério Louvor",
                    contato="som"
                ),

                models.Responsavel(
                    nome="Equipe Mídia",
                    contato="midia"
                ),
            ]

            db.add_all(responsaveis)
            db.commit()

            print("✅ Responsáveis criados")

        responsaveis = db.query(models.Responsavel).all()

        # =====================================================
        # EMPRÉSTIMOS
        # =====================================================
        if db.query(models.Emprestimo).count() == 0:

            emprestimos = []

            for i in range(20):

                ferramenta = random.choice(ferramentas)
                responsavel = random.choice(responsaveis)

                data_saida = datetime.utcnow() - timedelta(days=random.randint(1, 60))
                retorno = data_saida + timedelta(days=random.randint(1, 10))

                devolvida = random.choice([True, False])

                emprestimos.append(

                    models.Emprestimo(
                        ferramenta_id=ferramenta.id,
                        responsavel_id=responsavel.id,
                        data_saida=data_saida,
                        data_retorno_prevista=retorno,
                        observacoes=f"Uso interno #{i + 1}",
                        devolvida=devolvida
                    )

                )

            db.add_all(emprestimos)
            db.commit()

            print("✅ Empréstimos criados")

        # =====================================================
        # RESERVAS
        # =====================================================
        if db.query(models.Reserva).count() == 0:

            reservas = []

            for i in range(10):

                reservas.append(

                    models.Reserva(
                        ferramenta_id=random.choice(ferramentas).id,
                        usuario_id=random.choice(usuarios).id,
                        data_inicio=datetime.utcnow() + timedelta(days=random.randint(1, 7)),
                        data_fim=datetime.utcnow() + timedelta(days=random.randint(8, 15)),
                        status="ativa"
                    )

                )

            db.add_all(reservas)
            db.commit()

            print("✅ Reservas criadas")

        # =====================================================
        # SOLICITAÇÕES
        # =====================================================
        if hasattr(models, "Solicitacao"):

            if db.query(models.Solicitacao).count() == 0:

                solicitacoes = [

                    models.Solicitacao(
                        usuario_id=usuarios[1].id,
                        item_nome="Extensão Elétrica",
                        tipo="ferramenta",
                        status="pendente"
                    ),

                    models.Solicitacao(
                        usuario_id=usuarios[2].id,
                        item_nome="Refletor LED",
                        tipo="equipamento",
                        status="aprovada"
                    ),

                    models.Solicitacao(
                        usuario_id=usuarios[3].id,
                        item_nome="Caixa de Ferramentas",
                        tipo="ferramenta",
                        status="rejeitada"
                    ),

                    models.Solicitacao(
                        usuario_id=usuarios[4].id,
                        item_nome="Microfone Sem Fio",
                        tipo="equipamento",
                        status="pendente"
                    ),

                    models.Solicitacao(
                        usuario_id=usuarios[5].id,
                        item_nome="Escada Grande",
                        tipo="ferramenta",
                        status="aprovada"
                    ),
                ]

                db.add_all(solicitacoes)
                db.commit()

                print("✅ Solicitações criadas")

        print("\n🚀 Banco populado com sucesso!")

        print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print("LOGIN ADMIN")
        print("Email: admin@admin.com")
        print("Senha: 123456")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━")

    except Exception as e:
        print(f"\n❌ ERRO: {e}")

    finally:
        db.close()


if __name__ == "__main__":
    seed()