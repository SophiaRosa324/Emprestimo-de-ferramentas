from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

import models
import schemas
from database import get_db

router = APIRouter(prefix="/emprestimos", tags=["Empréstimos"])


@router.get("/", response_model=List[schemas.EmprestimoOut])
def listar_emprestimos(
    devolvida:      Optional[bool] = Query(None),
    ferramenta_id:  Optional[int]  = Query(None),
    responsavel_id: Optional[int]  = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(models.Emprestimo)
    if devolvida is not None: q = q.filter(models.Emprestimo.devolvida == devolvida)
    if ferramenta_id:  q = q.filter(models.Emprestimo.ferramenta_id  == ferramenta_id)
    if responsavel_id: q = q.filter(models.Emprestimo.responsavel_id == responsavel_id)
    return q.order_by(models.Emprestimo.data_saida.desc()).offset(skip).limit(limit).all()


@router.get("/{id}", response_model=schemas.EmprestimoOut)
def obter_emprestimo(id: int, db: Session = Depends(get_db)):
    e = db.query(models.Emprestimo).filter(models.Emprestimo.id == id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado.")
    return e


@router.post("/", response_model=schemas.EmprestimoOut, status_code=201)
def registrar_emprestimo(dados: schemas.EmprestimoCreate, db: Session = Depends(get_db)):
    ferramenta = db.query(models.Ferramenta).filter(models.Ferramenta.id == dados.ferramenta_id).first()
    if not ferramenta:
        raise HTTPException(status_code=404, detail="Ferramenta não encontrada.")
    if ferramenta.estado != "disponivel":
        raise HTTPException(
            status_code=400,
            detail=f"Ferramenta '{ferramenta.nome}' ({ferramenta.codigo}) não está disponível. Estado: {ferramenta.estado}."
        )
    responsavel = db.query(models.Responsavel).filter(models.Responsavel.id == dados.responsavel_id).first()
    if not responsavel:
        raise HTTPException(status_code=404, detail="Responsável não encontrado.")
    if responsavel.ativo is False:
        raise HTTPException(status_code=400, detail="Responsável inativo.")

    emprestimo = models.Emprestimo(**dados.model_dump())
    ferramenta.estado = "emprestada"
    db.add(emprestimo)
    db.commit()
    db.refresh(emprestimo)
    return emprestimo


@router.patch("/{id}/devolver", response_model=schemas.EmprestimoOut)
def registrar_devolucao(id: int, dados: schemas.DevolucaoUpdate, db: Session = Depends(get_db)):
    emprestimo = db.query(models.Emprestimo).filter(models.Emprestimo.id == id).first()
    if not emprestimo:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado.")
    if emprestimo.devolvida:
        raise HTTPException(status_code=400, detail="Este empréstimo já foi devolvido.")

    emprestimo.devolvida         = True
    emprestimo.data_retorno_real = datetime.utcnow()
    if dados.observacoes:
        emprestimo.observacoes = dados.observacoes

    emprestimo.ferramenta.estado = "disponivel"
    db.commit()
    db.refresh(emprestimo)
    return emprestimo