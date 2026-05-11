import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from PIL import Image
import io

import models
import schemas
from database import get_db

router = APIRouter(prefix="/ferramentas", tags=["Ferramentas"])

UPLOAD_DIR     = "uploads"
MAX_IMAGE_SIZE = (800, 800)
ALLOWED_TYPES  = {"image/jpeg", "image/png", "image/webp"}


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


@router.get("/", response_model=List[schemas.FerramentaOut])
def listar_ferramentas(
    busca:        Optional[str] = Query(None),
    categoria_id: Optional[int] = Query(None),
    estado:       Optional[str] = Query(None),
    igreja_id:    Optional[int] = Query(None),
    skip:  int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(models.Ferramenta)
    if busca:        q = q.filter(models.Ferramenta.nome.ilike(f"%{busca}%"))
    if categoria_id: q = q.filter(models.Ferramenta.categoria_id == categoria_id)
    if estado:       q = q.filter(models.Ferramenta.estado == estado)
    if igreja_id:    q = q.filter(models.Ferramenta.igreja_id == igreja_id)
    return q.order_by(models.Ferramenta.nome).offset(skip).limit(limit).all()


@router.get("/{id}", response_model=schemas.FerramentaOut)
def obter_ferramenta(id: int, db: Session = Depends(get_db)):
    f = db.query(models.Ferramenta).filter(models.Ferramenta.id == id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Ferramenta não encontrada.")
    return f


@router.post("/", response_model=schemas.FerramentaOut, status_code=201)
def criar_ferramenta(ferramenta: schemas.FerramentaCreate, db: Session = Depends(get_db)):
    nova = models.Ferramenta(**ferramenta.model_dump())
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