/**
 * Utilitários NF-e para o frontend
 * Validação e formatação de CNPJ e chave NF-e
 */

export function formatarCNPJ(cnpj) {
  const nums = cnpj.replace(/\D/g, '')
  if (nums.length !== 14) return cnpj
  return `${nums.slice(0,2)}.${nums.slice(2,5)}.${nums.slice(5,8)}/${nums.slice(8,12)}-${nums.slice(12)}`
}

export function validarCNPJ(cnpj) {
  const nums = cnpj.replace(/\D/g, '')
  if (nums.length !== 14) return false
  if (/^(\d)\1+$/.test(nums)) return false

  const calc = (n, pesos) =>
    pesos.reduce((acc, p, i) => acc + parseInt(n[i]) * p, 0)

  const resto = (total) => {
    const r = total % 11
    return r < 2 ? 0 : 11 - r
  }

  const p1 = [5,4,3,2,9,8,7,6,5,4,3,2]
  const p2 = [6,5,4,3,2,9,8,7,6,5,4,3,2]
  const d1 = resto(calc(nums, p1))
  const d2 = resto(calc(nums.slice(0,13), p2))
  return nums.slice(12) === `${d1}${d2}`
}

export function validarChaveNFe(chave) {
  const nums = chave.replace(/\D/g, '')
  if (nums.length !== 44) return { ok: false, motivo: `Deve ter 44 dígitos (encontrado: ${nums.length})` }

  // Dígito verificador módulo 11
  const pesos = Array.from({ length: 43 }, (_, i) => (i % 8) + 2)
  const reversed = nums.slice(0, 43).split('').reverse()
  const total = reversed.reduce((acc, d, i) => acc + parseInt(d) * pesos[i], 0)
  const resto = total % 11
  const dvCalc = resto < 2 ? 0 : 11 - resto
  if (dvCalc !== parseInt(nums[43])) {
    return { ok: false, motivo: `Dígito verificador inválido (esperado: ${dvCalc})` }
  }

  return { ok: true, motivo: '' }
}

export function formatarChaveNFe(chave) {
  const nums = chave.replace(/\D/g, '')
  if (nums.length !== 44) return chave
  // Grupos de 4 dígitos para legibilidade
  return nums.match(/.{1,4}/g)?.join(' ') || chave
}

export function extrairInfoChave(chave) {
  const nums = chave.replace(/\D/g, '')
  if (nums.length !== 44) return null
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const aamm = nums.slice(2, 6)
  const mes  = parseInt(aamm.slice(2)) - 1
  return {
    uf:     nums.slice(0, 2),
    ano:    '20' + aamm.slice(0, 2),
    mes:    meses[mes] ?? aamm.slice(2),
    cnpj:   formatarCNPJ(nums.slice(6, 20)),
    modelo: nums.slice(20, 22) === '55' ? 'NF-e' : nums.slice(20, 22) === '65' ? 'NFC-e' : nums.slice(20, 22),
    serie:  nums.slice(22, 25),
    numero: nums.slice(25, 34).replace(/^0+/, ''),
  }
}