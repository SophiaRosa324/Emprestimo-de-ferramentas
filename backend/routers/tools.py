import os
import uuid
import re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from PIL import Image
import io

import models
import schemas
from database import get_db

router = APIRouter(prefix="/ferramentas", tags=["Ferramentas"])

UPLOAD_DIR    = "uploads"
MAX_IMAGE_SIZE= (800, 800)
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


# ── Geração de código único ────────────────────────────────
def _gerar_prefixo(nome: str) -> str:
    """
    Extrai as 3 primeiras letras significativas do nome.
    'Furadeira Bosch' → 'FUR'
    'Chave de Fenda'  → 'CHA'
    """
    palavras = [p for p in nome.upper().split() if p not in {"DE", "DA", "DO", "A", "O", "E"}]
    if not palavras:
        return "FER"
    return re.sub(r'[^A-Z]', '', palavras[0])[:3].ljust(3, 'X')

def _proximo_codigo(db: Session, prefixo: str) -> str:
    """
    Busca o maior número existente para o prefixo e incrementa.
    FUR-001, FUR-002, etc.
    """
    like = f"{prefixo}-%"
    existentes = (
        db.query(models.Ferramenta.codigo)
        .filter(models.Ferramenta.codigo.like(like))
        .all()
    )
    numeros = []
    for (cod,) in existentes:
        try:
            numeros.append(int(cod.split("-")[-1]))
        except (ValueError, IndexError):
            pass
    proximo = (max(numeros) + 1) if numeros else 1
    return f"{prefixo}-{proximo:03d}"

def gerar_codigo(db: Session, nome: str) -> str:
    prefixo = _gerar_prefixo(nome)
    return _proximo_codigo(db, prefixo)


# ── Upload de foto ─────────────────────────────────────────
def _save_foto(file: UploadFile) -> str:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de imagem não suportado. Use JPEG, PNG ou WebP.")
    data = file.file.read()
    img  = Image.open(io.BytesIO(data))
    img.thumbnail(MAX_IMAGE_SIZE)
    ext      = file.filename.rsplit(".", 1)[-1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    img.save(os.path.join(UPLOAD_DIR, filename))
    return filename


# ── Rotas ──────────────────────────────────────────────────
@router.get("/", response_model=List[schemas.FerramentaOut])
def listar_ferramentas(
    busca:        Optional[str] = Query(None),
    categoria_id: Optional[int] = Query(None),
    estado:       Optional[str] = Query(None),
    codigo:       Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(models.Ferramenta)
    if busca:        q = q.filter(models.Ferramenta.nome.ilike(f"%{busca}%"))
    if categoria_id: q = q.filter(models.Ferramenta.categoria_id == categoria_id)
    if estado:       q = q.filter(models.Ferramenta.estado == estado)
    if codigo:       q = q.filter(models.Ferramenta.codigo.ilike(f"%{codigo}%"))
    return q.order_by(models.Ferramenta.codigo).offset(skip).limit(limit).all()


@router.get("/{id}", response_model=schemas.FerramentaOut)
def obter_ferramenta(id: int, db: Session = Depends(get_db)):
    f = db.query(models.Ferramenta).filter(models.Ferramenta.id == id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Ferramenta não encontrada.")
    return f


@router.post("/", response_model=schemas.FerramentaOut, status_code=201)
def criar_ferramenta(ferramenta: schemas.FerramentaCreate, db: Session = Depends(get_db)):
    nova = models.Ferramenta(**ferramenta.model_dump())
    nova.codigo = gerar_codigo(db, ferramenta.nome)   # ← gera código automático
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return nova


@router.put("/{id}", response_model=schemas.FerramentaOut)
def atualizar_ferramenta(id: int, dados: schemas.FerramentaUpdate, db: Session = Depends(get_db)):
    f = db.query(models.Ferramenta).filter(models.Ferramenta.id == id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Ferramenta não encontrada.")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(f, campo, valor)
    db.commit()
    db.refresh(f)
    return f


@router.delete("/{id}", status_code=204)
def deletar_ferramenta(id: int, db: Session = Depends(get_db)):
    f = db.query(models.Ferramenta).filter(models.Ferramenta.id == id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Ferramenta não encontrada.")
    if f.foto:
        try:
            os.remove(os.path.join(UPLOAD_DIR, f.foto))
        except FileNotFoundError:
            pass
    db.delete(f)
    db.commit()


@router.post("/{id}/foto", response_model=schemas.FerramentaOut)
def upload_foto(id: int, foto: UploadFile = File(...), db: Session = Depends(get_db)):
    f = db.query(models.Ferramenta).filter(models.Ferramenta.id == id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Ferramenta não encontrada.")
    if f.foto:
        try:
            os.remove(os.path.join(UPLOAD_DIR, f.foto))
        except FileNotFoundError:
            pass
    f.foto = _save_foto(foto)
    db.commit()
    db.refresh(f)
    return f