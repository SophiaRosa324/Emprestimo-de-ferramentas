"""
Parser de NF-e (Nota Fiscal Eletrônica) - Padrão SEFAZ Brasil
Suporta NF-e v3.10 e v4.00
"""
import re
import xml.etree.ElementTree as ET
from datetime import date, datetime
from typing import Optional
from dataclasses import dataclass, field


# ── Namespaces NF-e ────────────────────────────────────────
NS = {
    "nfe":  "http://www.portalfiscal.inf.br/nfe",
    "nfe4": "http://www.portalfiscal.inf.br/nfe",
}

def _ns(tag: str) -> str:
    """Retorna tag com namespace NF-e."""
    return f"{{http://www.portalfiscal.inf.br/nfe}}{tag}"


@dataclass
class ProdutoNFe:
    codigo:      str
    descricao:   str
    ncm:         str = ""
    cfop:        str = ""
    unidade:     str = ""
    quantidade:  float = 0.0
    valor_unit:  float = 0.0
    valor_total: float = 0.0


@dataclass
class DadosNFe:
    # Identificação
    chave:         str = ""
    numero:        str = ""
    serie:         str = ""
    data_emissao:  Optional[date] = None

    # Emitente (fornecedor)
    cnpj_emitente:       str = ""
    razao_social:        str = ""
    nome_fantasia:       str = ""
    endereco_emitente:   str = ""
    municipio_emitente:  str = ""
    uf_emitente:         str = ""

    # Destinatário
    cnpj_destinatario: str = ""
    nome_destinatario: str = ""

    # Totais
    valor_produtos:   float = 0.0
    valor_frete:      float = 0.0
    valor_desconto:   float = 0.0
    valor_total_nf:   float = 0.0

    # Produtos
    produtos: list = field(default_factory=list)

    # Erros / avisos
    erros:      list = field(default_factory=list)
    avisos:     list = field(default_factory=list)
    valida:     bool = False


# ── Validação CNPJ ─────────────────────────────────────────
def validar_cnpj(cnpj: str) -> bool:
    """Valida CNPJ pelo algoritmo oficial da Receita Federal."""
    cnpj = re.sub(r"\D", "", cnpj)
    if len(cnpj) != 14:
        return False
    if cnpj == cnpj[0] * 14:
        return False

    def calc_digito(cnpj: str, pesos: list[int]) -> int:
        total = sum(int(d) * p for d, p in zip(cnpj, pesos))
        resto = total % 11
        return 0 if resto < 2 else 11 - resto

    pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

    d1 = calc_digito(cnpj[:12], pesos1)
    d2 = calc_digito(cnpj[:13], pesos2)
    return cnpj[-2:] == f"{d1}{d2}"


def formatar_cnpj(cnpj: str) -> str:
    cnpj = re.sub(r"\D", "", cnpj)
    if len(cnpj) == 14:
        return f"{cnpj[:2]}.{cnpj[2:5]}.{cnpj[5:8]}/{cnpj[8:12]}-{cnpj[12:]}"
    return cnpj


# ── Validação chave NF-e ───────────────────────────────────
def validar_chave_nfe(chave: str) -> tuple[bool, str]:
    """
    Valida chave de acesso NF-e de 44 dígitos.
    Retorna (valida, motivo_se_invalida).
    Estrutura: cUF(2) + AAMM(4) + CNPJ(14) + mod(2) + serie(3) + nNF(9) + tpEmis(1) + cNF(8) + cDV(1)
    """
    chave = re.sub(r"\D", "", chave)
    if len(chave) != 44:
        return False, f"Chave deve ter 44 dígitos numéricos (encontrado: {len(chave)})"

    # Valida dígito verificador (módulo 11)
    pesos = list(range(2, 10)) * 6  # ciclo de 2 a 9
    pesos = pesos[:43]
    total = sum(int(d) * p for d, p in zip(reversed(chave[:43]), pesos))
    resto = total % 11
    dv_calculado = 0 if resto < 2 else 11 - resto
    dv_informado = int(chave[-1])

    if dv_calculado != dv_informado:
        return False, f"Dígito verificador inválido (esperado: {dv_calculado}, informado: {dv_informado})"

    # Valida cUF (código UF) — UFs válidas: 11-53
    cuf = int(chave[:2])
    ufs_validas = {11,12,13,14,15,16,17,21,22,23,24,25,26,27,28,29,31,32,33,35,41,42,43,50,51,52,53}
    if cuf not in ufs_validas:
        return False, f"Código UF inválido: {cuf}"

    # Valida modelo (55=NF-e, 65=NFC-e)
    modelo = chave[20:22]
    if modelo not in ("55", "65"):
        return False, f"Modelo de documento inválido: {modelo} (esperado 55 ou 65)"

    return True, ""


# ── Parser XML ─────────────────────────────────────────────
def parse_nfe_xml(xml_content: bytes) -> DadosNFe:
    """
    Faz o parse completo de um XML NF-e e retorna DadosNFe.
    Suporta XML com e sem declaração de namespace.
    """
    dados = DadosNFe()

    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as e:
        dados.erros.append(f"XML inválido: {e}")
        return dados

    # Localiza o elemento <infNFe> (pode estar dentro de <nfeProc> ou direto)
    inf_nfe = (
        root.find(f".//{_ns('infNFe')}") or
        root.find(".//infNFe")
    )
    if inf_nfe is None:
        dados.erros.append("Elemento <infNFe> não encontrado. Verifique se é um XML de NF-e válido.")
        return dados

    def txt(elem, path: str) -> str:
        """Busca texto em subelemento, tenta com e sem namespace."""
        node = elem.find(f".//{_ns(path)}") or elem.find(f".//{path}")
        return (node.text or "").strip() if node is not None else ""

    def flt(elem, path: str) -> float:
        v = txt(elem, path)
        try:
            return float(v)
        except (ValueError, TypeError):
            return 0.0

    # ── Chave de acesso ────────────────────────────────────
    chave_raw = inf_nfe.get("Id", "")
    if chave_raw.startswith("NFe"):
        chave_raw = chave_raw[3:]
    dados.chave = re.sub(r"\D", "", chave_raw)

    # ── Identificação ──────────────────────────────────────
    ide = inf_nfe.find(_ns("ide")) or inf_nfe.find("ide")
    if ide is not None:
        dados.numero = txt(ide, "nNF")
        dados.serie  = txt(ide, "serie")
        dh_emi_raw   = txt(ide, "dhEmi") or txt(ide, "dEmi")
        if dh_emi_raw:
            try:
                # Suporta "2024-01-15" e "2024-01-15T10:30:00-03:00"
                dados.data_emissao = datetime.fromisoformat(dh_emi_raw[:10]).date()
            except ValueError:
                dados.avisos.append(f"Data de emissão em formato desconhecido: {dh_emi_raw}")

    # ── Emitente ───────────────────────────────────────────
    emit = inf_nfe.find(_ns("emit")) or inf_nfe.find("emit")
    if emit is not None:
        cnpj_raw = txt(emit, "CNPJ")
        dados.cnpj_emitente  = formatar_cnpj(cnpj_raw)
        dados.razao_social   = txt(emit, "xNome")
        dados.nome_fantasia  = txt(emit, "xFant")

        ender = emit.find(_ns("enderEmit")) or emit.find("enderEmit")
        if ender is not None:
            logradouro = txt(ender, "xLgr")
            numero_end = txt(ender, "nro")
            dados.endereco_emitente  = f"{logradouro}, {numero_end}".strip(", ")
            dados.municipio_emitente = txt(ender, "xMun")
            dados.uf_emitente        = txt(ender, "UF")

    # ── Destinatário ───────────────────────────────────────
    dest = inf_nfe.find(_ns("dest")) or inf_nfe.find("dest")
    if dest is not None:
        dados.cnpj_destinatario = formatar_cnpj(txt(dest, "CNPJ"))
        dados.nome_destinatario = txt(dest, "xNome")

    # ── Produtos ───────────────────────────────────────────
    for det in inf_nfe.findall(f".//{_ns('det')}") or inf_nfe.findall(".//det"):
        prod = det.find(_ns("prod")) or det.find("prod")
        if prod is not None:
            dados.produtos.append(ProdutoNFe(
                codigo     = txt(prod, "cProd"),
                descricao  = txt(prod, "xProd"),
                ncm        = txt(prod, "NCM"),
                cfop       = txt(prod, "CFOP"),
                unidade    = txt(prod, "uCom"),
                quantidade = flt(prod, "qCom"),
                valor_unit = flt(prod, "vUnCom"),
                valor_total= flt(prod, "vProd"),
            ))

    # ── Totais ─────────────────────────────────────────────
    total = inf_nfe.find(f".//{_ns('ICMSTot')}") or inf_nfe.find(".//ICMSTot")
    if total is not None:
        dados.valor_produtos  = flt(total, "vProd")
        dados.valor_frete     = flt(total, "vFrete")
        dados.valor_desconto  = flt(total, "vDesc")
        dados.valor_total_nf  = flt(total, "vNF")

    dados.valida = len(dados.erros) == 0
    return dados


# ── Validação completa para registro de compra ─────────────
def validar_nfe_para_compra(
    dados: DadosNFe,
    valor_informado: float,
    quantidade_informada: int,
) -> tuple[list[str], list[str]]:
    """
    Retorna (erros_bloqueantes, avisos_nao_bloqueantes) para registro de compra.
    """
    erros, avisos = list(dados.erros), list(dados.avisos)

    # Validações bloqueantes
    if not dados.chave:
        erros.append("Chave NF-e não encontrada no XML.")

    if dados.chave:
        ok, motivo = validar_chave_nfe(dados.chave)
        if not ok:
            erros.append(f"Chave NF-e inválida: {motivo}")

    if dados.cnpj_emitente:
        cnpj_limpo = re.sub(r"\D", "", dados.cnpj_emitente)
        if not validar_cnpj(cnpj_limpo):
            erros.append(f"CNPJ do fornecedor inválido: {dados.cnpj_emitente}")

    if not dados.data_emissao:
        erros.append("Data de emissão não encontrada no XML.")

    if not dados.razao_social:
        erros.append("Razão social do emitente não encontrada.")

    if dados.valor_total_nf <= 0:
        erros.append("Valor total da NF-e é zero ou negativo.")

    # Avisos não bloqueantes
    if abs(dados.valor_total_nf - valor_informado) > 0.05:
        avisos.append(
            f"Valor informado (R$ {valor_informado:.2f}) difere do valor na NF-e "
            f"(R$ {dados.valor_total_nf:.2f}). Diferença: R$ {abs(dados.valor_total_nf - valor_informado):.2f}"
        )

    total_qtd_nfe = sum(int(p.quantidade) for p in dados.produtos)
    if dados.produtos and total_qtd_nfe != quantidade_informada:
        avisos.append(
            f"Quantidade informada ({quantidade_informada}) difere da quantidade total "
            f"na NF-e ({total_qtd_nfe})."
        )

    return erros, avisos