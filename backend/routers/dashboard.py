from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, timedelta

import models
from database import get_db
from routers.auth import get_usuario_atual

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/")
def dashboard(
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(get_usuario_atual),
):
    hoje = datetime.utcnow()

    # ── Ferramentas ────────────────────────────────────────
    total = db.query(func.count(models.Ferramenta.id)).scalar()
    disponiveis = db.query(func.count(models.Ferramenta.id)).filter(models.Ferramenta.estado == "disponivel").scalar()
    emprestadas = db.query(func.count(models.Ferramenta.id)).filter(models.Ferramenta.estado == "emprestada").scalar()
    manutencao  = db.query(func.count(models.Ferramenta.id)).filter(models.Ferramenta.estado == "manutencao").scalar()

    # ── Empréstimos ────────────────────────────────────────
    emp_abertos = db.query(models.Emprestimo).filter(models.Emprestimo.devolvida == False).all()
    atrasados   = [e for e in emp_abertos if e.data_retorno_prevista and e.data_retorno_prevista < hoje]
    vence_hoje  = [e for e in emp_abertos if e.data_retorno_prevista and
                   hoje <= e.data_retorno_prevista <= hoje + timedelta(hours=24)]

    # ── Reservas ──────────────────────────────────────────
    reservas_ativas = db.query(func.count(models.Reserva.id)).filter(models.Reserva.status == "ativa").scalar()
    reservas_hoje   = db.query(models.Reserva).filter(
        models.Reserva.status == "ativa",
        models.Reserva.data_inicio >= hoje.replace(hour=0, minute=0, second=0),
        models.Reserva.data_inicio <= hoje.replace(hour=23, minute=59, second=59),
    ).all()

    # ── Solicitações ───────────────────────────────────────
    sol_pendentes = db.query(func.count(models.Solicitacao.id)).filter(models.Solicitacao.status == "pendente").scalar()

    # ── Por categoria ──────────────────────────────────────
    por_categoria = (
        db.query(models.Categoria.nome, models.Categoria.cor, func.count(models.Ferramenta.id))
        .join(models.Ferramenta, models.Ferramenta.categoria_id == models.Categoria.id, isouter=True)
        .group_by(models.Categoria.id)
        .all()
    )

    # ── Por setor (empréstimos) ────────────────────────────
    todos_emp = db.query(models.Emprestimo).join(models.Responsavel).all()
    setor_map: dict[str, int] = {}
    for e in todos_emp:
        s = e.responsavel.contato or "outros"
        setor_map[s] = setor_map.get(s, 0) + 1

    # ── Empréstimos por mês (últimos 6) ───────────────────
    seis_meses = hoje - timedelta(days=180)
    emp_mes_raw = (
        db.query(
            extract("year",  models.Emprestimo.data_saida).label("ano"),
            extract("month", models.Emprestimo.data_saida).label("mes"),
            func.count(models.Emprestimo.id).label("total"),
        )
        .filter(models.Emprestimo.data_saida >= seis_meses)
        .group_by("ano", "mes")
        .order_by("ano", "mes")
        .all()
    )
    MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
    emp_por_mes = [
        {"label": f"{MESES[int(r.mes)-1]}/{int(r.ano)}", "total": r.total}
        for r in emp_mes_raw
    ]

    # ── Ferramentas mais usadas ────────────────────────────
    mais_usadas = (
        db.query(models.Ferramenta.nome, func.count(models.Emprestimo.id).label("usos"))
        .join(models.Emprestimo, models.Emprestimo.ferramenta_id == models.Ferramenta.id)
        .group_by(models.Ferramenta.id)
        .order_by(func.count(models.Emprestimo.id).desc())
        .limit(5)
        .all()
    )

    return {
        # Cards principais
        "total_ferramentas": total,
        "disponiveis": disponiveis,
        "emprestadas": emprestadas,
        "em_manutencao": manutencao,
        "reservas_ativas": reservas_ativas,
        "solicitacoes_pendentes": sol_pendentes,

        # Alertas
        "atrasados": [
            {
                "id": e.id,
                "ferramenta": e.ferramenta.nome if e.ferramenta else "",
                "responsavel": e.responsavel.nome if e.responsavel else "",
                "data_retorno_prevista": e.data_retorno_prevista,
                "dias_atraso": (hoje - e.data_retorno_prevista).days,
            }
            for e in atrasados
        ],
        "vence_hoje": [
            {
                "id": e.id,
                "ferramenta": e.ferramenta.nome if e.ferramenta else "",
                "responsavel": e.responsavel.nome if e.responsavel else "",
                "data_retorno_prevista": e.data_retorno_prevista,
            }
            for e in vence_hoje
        ],
        "reservas_hoje": [
            {
                "id": r.id,
                "ferramenta": r.ferramenta.nome if r.ferramenta else "",
                "usuario": r.usuario.nome if r.usuario else "",
                "data_inicio": r.data_inicio,
                "data_fim": r.data_fim,
            }
            for r in reservas_hoje
        ],

        # Gráficos
        "por_categoria": [
            {"categoria": nome, "cor": cor, "total": qtd}
            for nome, cor, qtd in por_categoria
        ],
        "emp_por_mes": emp_por_mes,
        "mais_usadas": [{"ferramenta": nome, "usos": usos} for nome, usos in mais_usadas],
    }