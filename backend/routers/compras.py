import os
import uuid
import json
import re
from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

import models
from database import get_db
from routers.auth import get_usuario_atual, require_admin
from utils.nfe_parser import (
    parse_nfe_xml, validar_chave_nfe, validar_cnpj,
    validar_nfe_para_compra, formatar_cnpj, DadosNFe
)

router = APIRouter(prefix="/compras", tags=["Compras de Ferramentas"])

UPLOAD_NF_DIR = "uploads/notas_fiscais"
os.makedirs(UPLOAD_NF_DIR, exist_ok=True)


# ── Schemas simples (Form data não usa Pydantic direto) ────
class CompraCreate(BaseModel):
    ferramenta_id:  int
    fornecedor:     str
    local_compra:   Optional[str]  = None
    valor:          float
    quantidade:     int            = 1
    data_compra:    str            # "YYYY-MM-DD"
    garantia_meses: Optional[int]  = None
    observacoes:    Optional[str]  = None
    nota_fiscal_id: Optional[int]  = None


def _salvar_arquivo(upload: UploadFile, subdir: str, extensao: str) -> str:
    """Salva arquivo e retorna o caminho relativo."""
    os.makedirs(subdir, exist_ok=True)
    nome = f"{uuid.uuid4().hex}.{extensao}"
    caminho = os.path.join(subdir, nome)
    conteudo = upload.file.read()
    with open(caminho, "wb") as f:
        f.write(conteudo)
    return caminho


def _serializar_nota(nf: models.NotaFiscal) -> dict:
    return {
        "id":              nf.id,
        "numero":          nf.numero,
        "serie":           nf.serie,
        "chave_nfe":       nf.chave_nfe,
        "cnpj_fornecedor": nf.cnpj_fornecedor,
        "razao_social":    nf.razao_social,
        "valor_total":     nf.valor_total,
        "data_emissao":    nf.data_emissao.isoformat() if nf.data_emissao else None,
        "xml_path":        nf.xml_path,
        "pdf_path":        nf.pdf_path,
        "validada":        nf.validada,
        "inconsistencias": json.loads(nf.inconsistencias) if nf.inconsistencias else [],
        "criado_em":       nf.criado_em.isoformat(),
        "total_compras":   len(nf.compras) if nf.compras else 0,
    }


def _serializar_compra(c: models.CompraFerramenta) -> dict:
    return {
        "id":              c.id,
        "ferramenta_id":   c.ferramenta_id,
        "ferramenta_nome": c.ferramenta.nome   if c.ferramenta else "",
        "ferramenta_codigo":c.ferramenta.codigo if c.ferramenta else "",
        "nota_fiscal_id":  c.nota_fiscal_id,
        "nota_numero":     c.nota_fiscal.numero if c.nota_fiscal else None,
        "nota_chave":      c.nota_fiscal.chave_nfe if c.nota_fiscal else None,
        "fornecedor":      c.fornecedor,
        "local_compra":    c.local_compra,
        "valor":           c.valor,
        "quantidade":      c.quantidade,
        "data_compra":     c.data_compra.isoformat() if c.data_compra else None,
        "garantia_meses":  c.garantia_meses,
        "garantia_ate":    c.garantia_ate.isoformat() if c.garantia_ate else None,
        "observacoes":     c.observacoes,
        "criado_em":       c.criado_em.isoformat(),
    }


# ═══════════════════════════════════════════════════════════
# ROTAS — NOTAS FISCAIS
# ═══════════════════════════════════════════════════════════

@router.post("/nfe/parse")
async def parsear_xml(
    xml: UploadFile = File(...),
    valor_informado:     float = Form(0),
    quantidade_informada:int   = Form(1),
    _=Depends(get_usuario_atual),
):
    """
    Recebe um XML de NF-e, faz o parse e retorna os dados extraídos
    + resultado das validações. NÃO salva nada — apenas analisa.
    """
    if not xml.filename.endswith(".xml"):
        raise HTTPException(status_code=400, detail="Envie um arquivo .xml de NF-e.")

    conteudo = await xml.read()
    dados = parse_nfe_xml(conteudo)
    erros, avisos = validar_nfe_para_compra(dados, valor_informado, quantidade_informada)

    return {
        "chave":            dados.chave,
        "numero":           dados.numero,
        "serie":            dados.serie,
        "data_emissao":     dados.data_emissao.isoformat() if dados.data_emissao else None,
        "cnpj_emitente":    dados.cnpj_emitente,
        "razao_social":     dados.razao_social,
        "nome_fantasia":    dados.nome_fantasia,
        "endereco_emitente":dados.endereco_emitente,
        "municipio_emitente":dados.municipio_emitente,
        "uf_emitente":      dados.uf_emitente,
        "cnpj_destinatario":dados.cnpj_destinatario,
        "valor_produtos":   dados.valor_produtos,
        "valor_frete":      dados.valor_frete,
        "valor_desconto":   dados.valor_desconto,
        "valor_total_nf":   dados.valor_total_nf,
        "produtos":         [
            {
                "codigo":     p.codigo,
                "descricao":  p.descricao,
                "quantidade": p.quantidade,
                "valor_unit": p.valor_unit,
                "valor_total":p.valor_total,
                "unidade":    p.unidade,
                "ncm":        p.ncm,
            }
            for p in dados.produtos
        ],
        "erros":    erros,
        "avisos":   avisos,
        "valida":   len(erros) == 0,
    }


@router.post("/nfe/upload", status_code=201)
async def registrar_nota_fiscal(
    xml:                 Optional[UploadFile] = File(None),
    pdf:                 Optional[UploadFile] = File(None),
    chave_manual:        str   = Form(""),
    numero_manual:       str   = Form(""),
    cnpj_manual:         str   = Form(""),
    razao_social_manual: str   = Form(""),
    valor_manual:        float = Form(0),
    data_emissao_manual: str   = Form(""),
    db: Session = Depends(get_db),
    _=Depends(get_usuario_atual),
):
    """
    Registra uma Nota Fiscal. Se XML enviado: extrai dados automaticamente.
    Caso contrário: usa dados manuais.
    Impede nota duplicada pela chave NF-e.
    """
    dados_xml: Optional[DadosNFe] = None
    xml_path = None
    pdf_path = None
    erros_finais = []
    avisos_finais = []

    # ── Processa XML se enviado ────────────────────────────
    if xml and xml.filename:
        if not xml.filename.endswith(".xml"):
            raise HTTPException(status_code=400, detail="Arquivo XML deve ter extensão .xml")
        conteudo = await xml.read()
        dados_xml = parse_nfe_xml(conteudo)
        xml.file.seek(0)
        xml_path = _salvar_arquivo(xml, UPLOAD_NF_DIR, "xml")
        erros_finais, avisos_finais = validar_nfe_para_compra(dados_xml, valor_manual, 1)

    # ── Resolve campos finais (XML > manual) ───────────────
    chave        = (dados_xml.chave       if dados_xml else "") or re.sub(r"\D","",chave_manual)
    numero       = (dados_xml.numero      if dados_xml else "") or numero_manual
    cnpj         = (dados_xml.cnpj_emitente if dados_xml else "") or formatar_cnpj(cnpj_manual)
    razao_social = (dados_xml.razao_social  if dados_xml else "") or razao_social_manual
    valor_total  = (dados_xml.valor_total_nf if dados_xml and dados_xml.valor_total_nf else valor_manual)
    data_emissao_str = (dados_xml.data_emissao.isoformat() if dados_xml and dados_xml.data_emissao else data_emissao_manual)

    # ── Validações bloqueantes ─────────────────────────────
    if not chave:
        raise HTTPException(status_code=400, detail="Chave NF-e é obrigatória.")

    chave_ok, motivo = validar_chave_nfe(chave)
    if not chave_ok:
        raise HTTPException(status_code=422, detail=f"Chave NF-e inválida: {motivo}")

    if cnpj:
        cnpj_limpo = re.sub(r"\D","", cnpj)
        if not validar_cnpj(cnpj_limpo):
            raise HTTPException(status_code=422, detail=f"CNPJ do fornecedor inválido: {cnpj}")

    # ── Duplicidade ────────────────────────────────────────
    existente = db.query(models.NotaFiscal).filter(models.NotaFiscal.chave_nfe == chave).first()
    if existente:
        raise HTTPException(
            status_code=409,
            detail=f"Nota fiscal com chave {chave[:10]}… já cadastrada (ID {existente.id})."
        )

    # ── Processa PDF ───────────────────────────────────────
    if pdf and pdf.filename:
        if not pdf.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Arquivo PDF deve ter extensão .pdf")
        pdf_path = _salvar_arquivo(pdf, UPLOAD_NF_DIR, "pdf")

    # ── Salva nota ─────────────────────────────────────────
    try:
        data_emissao_obj = date.fromisoformat(data_emissao_str) if data_emissao_str else None
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Data de emissão inválida: {data_emissao_str}")

    nf = models.NotaFiscal(
        numero          = numero or "S/N",
        chave_nfe       = chave,
        cnpj_fornecedor = cnpj,
        razao_social    = razao_social or "Não informado",
        valor_total     = valor_total,
        data_emissao    = data_emissao_obj,
        xml_path        = xml_path,
        pdf_path        = pdf_path,
        validada        = len(erros_finais) == 0,
        inconsistencias = json.dumps(avisos_finais) if avisos_finais else None,
    )
    db.add(nf)
    db.commit()
    db.refresh(nf)

    resultado = _serializar_nota(nf)
    resultado["avisos"]  = avisos_finais
    resultado["extraido_do_xml"] = dados_xml is not None
    return resultado


@router.get("/nfe/")
def listar_notas(
    skip: int = 0, limit: int = 50,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    notas = db.query(models.NotaFiscal).order_by(models.NotaFiscal.criado_em.desc()).offset(skip).limit(limit).all()
    return [_serializar_nota(nf) for nf in notas]


@router.get("/nfe/{id}")
def obter_nota(id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    nf = db.query(models.NotaFiscal).filter(models.NotaFiscal.id == id).first()
    if not nf:
        raise HTTPException(status_code=404, detail="Nota fiscal não encontrada.")
    return _serializar_nota(nf)


# ═══════════════════════════════════════════════════════════
# ROTAS — COMPRAS
# ═══════════════════════════════════════════════════════════

@router.post("/", status_code=201)
def criar_compra(dados: CompraCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    ferramenta = db.query(models.Ferramenta).filter(models.Ferramenta.id == dados.ferramenta_id).first()
    if not ferramenta:
        raise HTTPException(status_code=404, detail="Ferramenta não encontrada.")

    try:
        data_compra_obj = date.fromisoformat(dados.data_compra)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Data de compra inválida: {dados.data_compra}")

    # Calcula garantia
    garantia_ate = None
    if dados.garantia_meses and dados.garantia_meses > 0:
        garantia_ate = date(
            data_compra_obj.year + (data_compra_obj.month + dados.garantia_meses - 1) // 12,
            (data_compra_obj.month + dados.garantia_meses - 1) % 12 + 1,
            data_compra_obj.day,
        )

    compra = models.CompraFerramenta(
        ferramenta_id  = dados.ferramenta_id,
        nota_fiscal_id = dados.nota_fiscal_id,
        fornecedor     = dados.fornecedor,
        local_compra   = dados.local_compra,
        valor          = dados.valor,
        quantidade     = dados.quantidade,
        data_compra    = data_compra_obj,
        garantia_meses = dados.garantia_meses,
        garantia_ate   = garantia_ate,
        observacoes    = dados.observacoes,
    )
    db.add(compra)
    db.commit()
    db.refresh(compra)
    return _serializar_compra(compra)


@router.get("/")
def listar_compras(
    ferramenta_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    q = db.query(models.CompraFerramenta)
    if ferramenta_id:
        q = q.filter(models.CompraFerramenta.ferramenta_id == ferramenta_id)
    compras = q.order_by(models.CompraFerramenta.data_compra.desc()).offset(skip).limit(limit).all()
    return [_serializar_compra(c) for c in compras]


@router.get("/resumo/stats")
def resumo_compras(db: Session = Depends(get_db), _=Depends(require_admin)):
    total_compras   = db.query(func.count(models.CompraFerramenta.id)).scalar()
    valor_total     = db.query(func.sum(models.CompraFerramenta.valor)).scalar() or 0
    total_notas     = db.query(func.count(models.NotaFiscal.id)).scalar()
    notas_validadas = db.query(func.count(models.NotaFiscal.id)).filter(models.NotaFiscal.validada == True).scalar()

    # Garantias vencendo em 30 dias
    hoje = date.today()
    vencendo = db.query(func.count(models.CompraFerramenta.id)).filter(
        models.CompraFerramenta.garantia_ate >= hoje,
        models.CompraFerramenta.garantia_ate <= hoje + timedelta(days=30),
    ).scalar()

    # Por fornecedor
    por_fornecedor = (
        db.query(models.CompraFerramenta.fornecedor, func.count(models.CompraFerramenta.id).label("total"), func.sum(models.CompraFerramenta.valor).label("valor"))
        .group_by(models.CompraFerramenta.fornecedor)
        .order_by(func.sum(models.CompraFerramenta.valor).desc())
        .limit(5)
        .all()
    )

    return {
        "total_compras":   total_compras,
        "valor_total":     round(valor_total, 2),
        "total_notas":     total_notas,
        "notas_validadas": notas_validadas,
        "garantias_vencendo_30d": vencendo,
        "por_fornecedor": [
            {"fornecedor": f, "total": t, "valor": round(v or 0, 2)}
            for f, t, v in por_fornecedor
        ],
    }


@router.get("/{id}")
def obter_compra(id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    c = db.query(models.CompraFerramenta).filter(models.CompraFerramenta.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Compra não encontrada.")
    return _serializar_compra(c)


@router.delete("/{id}", status_code=204)
def deletar_compra(id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    c = db.query(models.CompraFerramenta).filter(models.CompraFerramenta.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Compra não encontrada.")
    db.delete(c)
    db.commit()