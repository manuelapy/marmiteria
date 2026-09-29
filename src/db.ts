import { supabase } from './supabase'

export type Unidade = 'g' | 'ml' | 'un'
export type TipoRefeicao = 'cafe' | 'almoco' | 'lanche' | 'jantar'

export interface Produto {
  id: string
  nome: string
  categoria: string | null
  unidade: Unidade
  embalagem: number
  kcal: number
  prot: number
  carb: number
  gord: number
}

export interface Preco {
  id: string
  produto_id: string
  preco: number
  data: string
  mercado: string | null
  criado_em: string
}

export interface ItemMarmita {
  id: string
  marmita_id: string
  produto_id: string
  quantidade: number
}

export interface Marmita {
  id: string
  nome: string
  porcoes: number
  preparo: string | null
}

export interface Refeicao {
  id: string
  data: string
  refeicao: TipoRefeicao
  marmita_id: string
  porcoes: number
}

export const REFEICOES: Record<TipoRefeicao, string> = {
  cafe: 'Café da manhã',
  almoco: 'Almoço',
  lanche: 'Lanche',
  jantar: 'Jantar',
}

export const CATEGORIAS = ['Proteínas', 'Carboidratos', 'Leguminosas', 'Hortifruti', 'Laticínios', 'Temperos', 'Doces', 'Outros']

/** Cache em memória dos dados "de cadastro" (pequenos). O cardápio é buscado por período. */
export const estado = {
  produtos: [] as Produto[],
  precos: [] as Preco[],
  marmitas: [] as Marmita[],
  itens: [] as ItemMarmita[],
  carregado: false,
}

async function ok<T>(p: PromiseLike<{ data: T; error: any }>): Promise<T> {
  const { data, error } = await p
  if (error) throw error
  return data
}

const numerico = <T extends object>(obj: T, campos: (keyof T)[]) => {
  for (const c of campos) (obj as any)[c] = Number((obj as any)[c])
  return obj
}

export async function carregarTudo() {
  const [produtos, precos, marmitas, itens] = await Promise.all([
    ok(supabase.from('produtos').select('*').order('nome')),
    ok(supabase.from('precos').select('*').order('data', { ascending: false }).order('criado_em', { ascending: false })),
    ok(supabase.from('marmitas').select('*').order('nome')),
    ok(supabase.from('marmita_itens').select('*')),
  ])
  estado.produtos = (produtos as Produto[]).map((p) => numerico(p, ['embalagem', 'kcal', 'prot', 'carb', 'gord']))
  estado.precos = (precos as Preco[]).map((p) => numerico(p, ['preco']))
  estado.marmitas = marmitas as Marmita[]
  estado.itens = (itens as ItemMarmita[]).map((i) => numerico(i, ['quantidade']))
  estado.carregado = true
}

export const garantirCarregado = () => (estado.carregado ? Promise.resolve() : carregarTudo())

// ---------- consultas no cache ----------

export const produto = (id: string) => estado.produtos.find((p) => p.id === id)
export const marmita = (id: string) => estado.marmitas.find((m) => m.id === id)
export const itensDe = (marmitaId: string) => estado.itens.filter((i) => i.marmita_id === marmitaId)
/** Histórico do mais recente para o mais antigo. */
export const precosDe = (produtoId: string) => estado.precos.filter((p) => p.produto_id === produtoId)
export const precoAtual = (produtoId: string) => precosDe(produtoId)[0]

// ---------- produtos ----------

export async function salvarProduto(dados: Partial<Produto>, id?: string) {
  const q = id
    ? supabase.from('produtos').update(dados).eq('id', id).select().single()
    : supabase.from('produtos').insert(dados).select().single()
  const salvo = await ok(q) as Produto
  await carregarTudo()
  return salvo
}

export async function excluirProduto(id: string) {
  await ok(supabase.from('produtos').delete().eq('id', id))
  await carregarTudo()
}

export async function registrarPreco(dados: { produto_id: string; preco: number; data: string; mercado: string | null }) {
  await ok(supabase.from('precos').insert(dados))
  await carregarTudo()
}

export async function excluirPreco(id: string) {
  await ok(supabase.from('precos').delete().eq('id', id))
  await carregarTudo()
}

// ---------- marmitas ----------

export async function salvarMarmita(dados: Partial<Marmita>, id?: string) {
  const q = id
    ? supabase.from('marmitas').update(dados).eq('id', id).select().single()
    : supabase.from('marmitas').insert(dados).select().single()
  const salva = await ok(q) as Marmita
  await carregarTudo()
  return salva
}

export async function excluirMarmita(id: string) {
  await ok(supabase.from('marmitas').delete().eq('id', id))
  await carregarTudo()
}

export async function duplicarMarmita(id: string) {
  const m = marmita(id)!
  const nova = await ok(
    supabase.from('marmitas').insert({ nome: `${m.nome} (cópia)`, porcoes: m.porcoes, preparo: m.preparo }).select().single(),
  ) as Marmita
  const itens = itensDe(id).map(({ produto_id, quantidade }) => ({ marmita_id: nova.id, produto_id, quantidade }))
  if (itens.length) await ok(supabase.from('marmita_itens').insert(itens))
  await carregarTudo()
  return nova
}

export async function adicionarItem(marmita_id: string, produto_id: string, quantidade: number) {
  await ok(supabase.from('marmita_itens').insert({ marmita_id, produto_id, quantidade }))
  await carregarTudo()
}

export async function atualizarItem(id: string, quantidade: number) {
  await ok(supabase.from('marmita_itens').update({ quantidade }).eq('id', id))
  const item = estado.itens.find((i) => i.id === id)
  if (item) item.quantidade = quantidade
}

export async function removerItem(id: string) {
  await ok(supabase.from('marmita_itens').delete().eq('id', id))
  estado.itens = estado.itens.filter((i) => i.id !== id)
}

// ---------- cardápio ----------

export async function cardapioEntre(inicio: string, fim: string): Promise<Refeicao[]> {
  const linhas = await ok(
    supabase.from('cardapio').select('*').gte('data', inicio).lte('data', fim).order('data'),
  ) as Refeicao[]
  return linhas.map((r) => numerico(r, ['porcoes']))
}

export async function adicionarRefeicoes(linhas: Omit<Refeicao, 'id'>[]) {
  if (linhas.length) await ok(supabase.from('cardapio').insert(linhas))
}

export async function removerRefeicao(id: string) {
  await ok(supabase.from('cardapio').delete().eq('id', id))
}
