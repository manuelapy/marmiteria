import { estado, itensDe, marmita, precoAtual, precosDe, produto, type Produto, type Refeicao } from './db'

export interface Nutri { kcal: number; prot: number; carb: number; gord: number }

export const nutriZero = (): Nutri => ({ kcal: 0, prot: 0, carb: 0, gord: 0 })

const soma = (a: Nutri, b: Nutri): Nutri => ({
  kcal: a.kcal + b.kcal, prot: a.prot + b.prot, carb: a.carb + b.carb, gord: a.gord + b.gord,
})

const escala = (a: Nutri, f: number): Nutri => ({ kcal: a.kcal * f, prot: a.prot * f, carb: a.carb * f, gord: a.gord * f })

/** Nutrientes são cadastrados por 100 g/ml, ou por unidade quando unidade = 'un'. */
export function nutriDe(p: Produto, quantidade: number): Nutri {
  const f = p.unidade === 'un' ? quantidade : quantidade / 100
  return escala(p, f)
}

/** Custo por g/ml/un com base no preço mais recente. */
export function custoUnitario(produtoId: string): number | null {
  const p = produto(produtoId)
  const preco = precoAtual(produtoId)
  if (!p || !preco) return null
  return preco.preco / p.embalagem
}

/** R$ por 100 g/ml (ou por unidade). */
export function custoReferencia(produtoId: string): number | null {
  const u = custoUnitario(produtoId)
  const p = produto(produtoId)
  if (u == null || !p) return null
  return p.unidade === 'un' ? u : u * 100
}

export function custoItem(produtoId: string, quantidade: number): number | null {
  const u = custoUnitario(produtoId)
  return u == null ? null : u * quantidade
}

export interface ResumoMarmita {
  custoTotal: number
  custoPorcao: number
  nutriTotal: Nutri
  nutriPorcao: Nutri
  pesoPorcao: number
  semPreco: string[]
}

export function resumoMarmita(marmitaId: string): ResumoMarmita {
  const m = marmita(marmitaId)
  const porcoes = m?.porcoes || 1
  let custoTotal = 0
  let nutriTotal = nutriZero()
  let peso = 0
  const semPreco: string[] = []
  for (const it of itensDe(marmitaId)) {
    const p = produto(it.produto_id)
    if (!p) continue
    const c = custoItem(p.id, it.quantidade)
    if (c == null) semPreco.push(p.nome)
    else custoTotal += c
    nutriTotal = soma(nutriTotal, nutriDe(p, it.quantidade))
    if (p.unidade !== 'un') peso += it.quantidade
  }
  return {
    custoTotal,
    custoPorcao: custoTotal / porcoes,
    nutriTotal,
    nutriPorcao: escala(nutriTotal, 1 / porcoes),
    pesoPorcao: peso / porcoes,
    semPreco,
  }
}

export function custoRefeicao(r: Refeicao) {
  return resumoMarmita(r.marmita_id).custoPorcao * r.porcoes
}

export function nutriRefeicao(r: Refeicao) {
  return escala(resumoMarmita(r.marmita_id).nutriPorcao, r.porcoes)
}

export interface ItemCompra {
  produto: Produto
  quantidade: number
  embalagens: number
  custo: number | null
}

/**
 * Consolida os ingredientes de todas as refeições do período.
 * Cada refeição consome (porções da refeição / porções da receita) da receita.
 */
export function listaDeCompras(refeicoes: Refeicao[]): ItemCompra[] {
  const total = new Map<string, number>()
  for (const r of refeicoes) {
    const m = marmita(r.marmita_id)
    if (!m) continue
    const fracao = r.porcoes / (m.porcoes || 1)
    for (const it of itensDe(m.id)) total.set(it.produto_id, (total.get(it.produto_id) ?? 0) + it.quantidade * fracao)
  }
  return [...total.entries()]
    .map(([id, quantidade]) => {
      const p = produto(id)!
      const embalagens = Math.ceil(quantidade / p.embalagem - 1e-9)
      const preco = precoAtual(id)
      return { produto: p, quantidade, embalagens, custo: preco ? embalagens * preco.preco : null }
    })
    .filter((i) => i.produto)
    .sort((a, b) => (a.produto.categoria ?? '').localeCompare(b.produto.categoria ?? '') || a.produto.nome.localeCompare(b.produto.nome))
}

/** Variação entre o preço mais recente e o anterior, em fração (0.1 = +10%). */
export function variacaoPreco(produtoId: string): number | null {
  const [atual, anterior] = precosDe(produtoId)
  if (!atual || !anterior || anterior.preco === 0) return null
  return atual.preco / anterior.preco - 1
}

export const produtosSemPreco = () => estado.produtos.filter((p) => !precoAtual(p.id))

export const somaNutri = soma
