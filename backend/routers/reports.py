from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import Optional
import io
import openpyxl
from typing import cast

from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.worksheet import Worksheet
from openpyxl.utils import get_column_letter

import models
from database import get_db
from routers.auth import get_usuario_atual

router = APIRouter(prefix="/relatorios", tags=["Relatórios"])


# ─────────────────────────────────────────────────────────────
# RESUMO
# ─────────────────────────────────────────────────────────────
@router.get("/resumo")
def resumo(
    db: Session = Depends(get_db),
    _=Depends(get_usuario_atual)
):
    total = db.query(func.count(models.Ferramenta.id)).scalar() or 0

    disponiveis = (
        db.query(func.count(models.Ferramenta.id))
        .filter(models.Ferramenta.estado == "disponivel")
        .scalar()
        or 0
    )

    emprestadas = (
        db.query(func.count(models.Ferramenta.id))
        .filter(models.Ferramenta.estado == "emprestada")
        .scalar()
        or 0
    )

    manutencao = (
        db.query(func.count(models.Ferramenta.id))
        .filter(models.Ferramenta.estado == "manutencao")
        .scalar()
        or 0
    )

    emp_abertos = (
        db.query(func.count(models.Emprestimo.id))
        .filter(models.Emprestimo.devolvida == False)
        .scalar()
        or 0
    )

    por_categoria = (
        db.query(
            models.Categoria.nome,
            func.count(models.Ferramenta.id)
        )
        .join(
            models.Ferramenta,
            models.Ferramenta.categoria_id == models.Categoria.id,
            isouter=True
        )
        .group_by(models.Categoria.id)
        .all()
    )

    return {
        "total_ferramentas": total,
        "disponiveis": disponiveis,
        "emprestadas": emprestadas,
        "em_manutencao": manutencao,
        "emprestimos_abertos": emp_abertos,
        "por_categoria": [
            {
                "categoria": str(nome or ""),
                "total": int(qtd or 0)
            }
            for nome, qtd in por_categoria
        ]
    }


# ─────────────────────────────────────────────────────────────
# FERRAMENTAS MAIS USADAS
# ─────────────────────────────────────────────────────────────
@router.get("/mais-usadas")
def mais_usadas(
    categoria_id: Optional[int] = Query(None),
    data_inicio: Optional[datetime] = Query(None),
    data_fim: Optional[datetime] = Query(None),
    limit: int = 10,
    db: Session = Depends(get_db),
    _=Depends(get_usuario_atual),
):
    q = (
        db.query(
            models.Ferramenta.nome,
            models.Ferramenta.id,
            func.count(models.Emprestimo.id).label("usos")
        )
        .join(
            models.Emprestimo,
            models.Emprestimo.ferramenta_id == models.Ferramenta.id
        )
    )

    if categoria_id is not None:
        q = q.filter(models.Ferramenta.categoria_id == categoria_id)

    if data_inicio is not None:
        q = q.filter(models.Emprestimo.data_saida >= data_inicio)

    if data_fim is not None:
        q = q.filter(models.Emprestimo.data_saida <= data_fim)

    rows = (
        q.group_by(models.Ferramenta.id)
        .order_by(func.count(models.Emprestimo.id).desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "ferramenta": str(nome or ""),
            "id": int(fid),
            "usos": int(usos)
        }
        for nome, fid, usos in rows
    ]


# ─────────────────────────────────────────────────────────────
# EMPRÉSTIMOS ATRASADOS
# ─────────────────────────────────────────────────────────────
@router.get("/atrasados")
def atrasados(
    setor: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_usuario_atual),
):
    hoje = datetime.utcnow()

    emprestimos = (
        db.query(models.Emprestimo)
        .filter(models.Emprestimo.devolvida == False)
        .filter(models.Emprestimo.data_retorno_prevista < hoje)
        .filter(models.Emprestimo.data_retorno_prevista.isnot(None))
        .all()
    )

    return [
        {
            "id": cast(int, e.id),
            "ferramenta": str(e.ferramenta.nome if e.ferramenta else ""),
            "responsavel": str(e.responsavel.nome if e.responsavel else ""),
            "data_saida": e.data_saida,
            "data_retorno_prevista": e.data_retorno_prevista,
            "dias_atraso": (
                hoje - e.data_retorno_prevista
            ).days,
        }
        for e in emprestimos
    ]


# ─────────────────────────────────────────────────────────────
# USO POR SETOR
# ─────────────────────────────────────────────────────────────
@router.get("/uso-por-setor")
def uso_por_setor(
    data_inicio: Optional[datetime] = Query(None),
    data_fim: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_usuario_atual),
):
    q = (
        db.query(
            models.Usuario.setor,
            func.count(models.Solicitacao.id).label("total")
        )
        .join(
            models.Solicitacao,
            models.Solicitacao.usuario_id == models.Usuario.id
        )
    )

    if data_inicio is not None:
        q = q.filter(models.Solicitacao.criado_em >= data_inicio)

    if data_fim is not None:
        q = q.filter(models.Solicitacao.criado_em <= data_fim)

    rows = q.group_by(models.Usuario.setor).all()

    return [
        {
            "setor": str(setor or "sem setor"),
            "total": int(total)
        }
        for setor, total in rows
    ]


# ─────────────────────────────────────────────────────────────
# SOLICITAÇÕES PENDENTES
# ─────────────────────────────────────────────────────────────
@router.get("/solicitacoes-pendentes")
def solicitacoes_pendentes(
    setor: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_usuario_atual),
):
    q = (
        db.query(models.Solicitacao)
        .filter(models.Solicitacao.status == "pendente")
    )

    if setor:
        q = q.filter(models.Solicitacao.setor == setor)

    rows = q.order_by(models.Solicitacao.criado_em).all()

    return [
        {
            "id": cast(int, r.id),
            "item_nome": str(r.item_nome or ""),
            "tipo": str(r.tipo or ""),
            "setor": str(r.setor or ""),
            "usuario": str(r.usuario.nome if r.usuario else ""),
            "criado_em": r.criado_em,
        }
        for r in rows
    ]


# ─────────────────────────────────────────────────────────────
# RESERVAS ATIVAS
# ─────────────────────────────────────────────────────────────
@router.get("/reservas-ativas")
def reservas_ativas(
    db: Session = Depends(get_db),
    _=Depends(get_usuario_atual)
):
    rows = (
        db.query(models.Reserva)
        .filter(models.Reserva.status == "ativa")
        .all()
    )

    return [
        {
            "id": cast(int, r.id),
            "ferramenta": str(r.ferramenta.nome if r.ferramenta else ""),
            "usuario": str(r.usuario.nome if r.usuario else ""),
            "data_inicio": r.data_inicio,
            "data_fim": r.data_fim,
        }
        for r in rows
    ]


# ─────────────────────────────────────────────────────────────
# EXPORTAR FERRAMENTAS
# ─────────────────────────────────────────────────────────────
@router.get("/exportar/ferramentas")
def exportar_ferramentas(
    categoria_id: Optional[int] = Query(None),
    estado: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_usuario_atual),
):
    q = db.query(models.Ferramenta)

    if categoria_id is not None:
        q = q.filter(models.Ferramenta.categoria_id == categoria_id)

    if estado:
        q = q.filter(models.Ferramenta.estado == estado)

    ferramentas = q.order_by(models.Ferramenta.nome).all()

    wb = openpyxl.Workbook()

    ws = wb.active
    assert isinstance(ws, Worksheet)

    ws.title = "Ferramentas"

    hfill = PatternFill(
        start_color="4F46E5",
        end_color="4F46E5",
        fill_type="solid"
    )

    hfont = Font(color="FFFFFF", bold=True)

    headers = [
        "ID",
        "Nome",
        "Descrição",
        "Nº Série",
        "Localização",
        "Estado",
        "Categoria",
        "Valor (R$)",
        "Cadastrado em",
    ]

    for c, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=c, value=str(h))
        cell.fill = hfill
        cell.font = hfont
        cell.alignment = Alignment(horizontal="center")

    estado_map = {
        "disponivel": "Disponível",
        "emprestada": "Emprestada",
        "manutencao": "Manutenção",
    }

    for row, f in enumerate(ferramentas, 2):

        estado_valor = str(f.estado or "")

        ws.cell(row=row, column=1, value=cast(int, f.id))
        ws.cell(row=row, column=2, value=str(f.nome or ""))
        ws.cell(row=row, column=3, value=str(f.descricao or ""))
        ws.cell(row=row, column=4, value=str(f.numero_serie or ""))
        ws.cell(row=row, column=5, value=str(f.localizacao or ""))

        ws.cell(
            row=row,
            column=6,
            value=str(estado_map.get(estado_valor, estado_valor))
        )

        ws.cell(
            row=row,
            column=7,
            value=str(f.categoria.nome if f.categoria else "")
        )

        ws.cell(
            row=row,
            column=8,
            value=cast(float, f.valor) if f.valor is not None else ""
        )

        ws.cell(
            row=row,
            column=9,
            value=(
                f.criado_em.strftime("%d/%m/%Y")
                if f.criado_em is not None
                else ""
            )
        )

    for col in ws.iter_cols():
        column_index = col[0].column
        if column_index is None:
            continue
        column = get_column_letter(column_index)

        max_length = max(
            len(str(cell.value or ""))
            for cell in col
        )

        ws.column_dimensions[column].width = min(max_length + 4, 40)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition":
            f"attachment; filename=ferramentas_{datetime.now().strftime('%Y%m%d')}.xlsx"
        }
    )


# ─────────────────────────────────────────────────────────────
# EXPORTAR EMPRÉSTIMOS
# ─────────────────────────────────────────────────────────────
@router.get("/exportar/emprestimos")
def exportar_emprestimos(
    devolvida: Optional[bool] = Query(None),
    data_inicio: Optional[datetime] = Query(None),
    data_fim: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_usuario_atual),
):
    q = db.query(models.Emprestimo)

    if devolvida is not None:
        q = q.filter(models.Emprestimo.devolvida == devolvida)

    if data_inicio is not None:
        q = q.filter(models.Emprestimo.data_saida >= data_inicio)

    if data_fim is not None:
        q = q.filter(models.Emprestimo.data_saida <= data_fim)

    emprestimos = (
        q.order_by(models.Emprestimo.data_saida.desc())
        .all()
    )

    wb = openpyxl.Workbook()

    ws = wb.active
    assert isinstance(ws, Worksheet)

    ws.title = "Empréstimos"

    hfill = PatternFill(
        start_color="0F766E",
        end_color="0F766E",
        fill_type="solid"
    )

    hfont = Font(color="FFFFFF", bold=True)

    headers = [
        "ID",
        "Ferramenta",
        "Responsável",
        "Saída",
        "Retorno previsto",
        "Retorno real",
        "Status",
        "Observações",
    ]

    for c, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=c, value=str(h))
        cell.fill = hfill
        cell.font = hfont
        cell.alignment = Alignment(horizontal="center")

    for row, e in enumerate(emprestimos, 2):

        ws.cell(row=row, column=1, value=cast(int, e.id))

        ws.cell(
            row=row,
            column=2,
            value=str(e.ferramenta.nome if e.ferramenta else "")
        )

        ws.cell(
            row=row,
            column=3,
            value=str(e.responsavel.nome if e.responsavel else "")
        )

        ws.cell(
            row=row,
            column=4,
            value=(
                e.data_saida.strftime("%d/%m/%Y %H:%M")
                if e.data_saida is not None
                else ""
            )
        )

        ws.cell(
            row=row,
            column=5,
            value=(
                e.data_retorno_prevista.strftime("%d/%m/%Y")
                if e.data_retorno_prevista is not None
                else ""
            )
        )

        ws.cell(
            row=row,
            column=6,
            value=(
                e.data_retorno_real.strftime("%d/%m/%Y %H:%M")
                if e.data_retorno_real is not None
                else ""
            )
        )

        ws.cell(
            row=row,
            column=7,
            value=(
                "Devolvida"
                if bool(e.devolvida)
                else "Em aberto"
            )
        )

        ws.cell(
            row=row,
            column=8,
            value=str(e.observacoes or "")
        )

    for col in ws.iter_cols():

        first_cell = col[0]
        if first_cell.column is None:
            continue

        column = get_column_letter(first_cell.column)

        max_length = max(
            len(str(cell.value or ""))
            for cell in col
        )

        ws.column_dimensions[column].width = min(max_length + 4, 40)

    buf = io.BytesIO()

    wb.save(buf)

    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition":
            f"attachment; filename=emprestimos_{datetime.now().strftime('%Y%m%d')}.xlsx"
        }
    )