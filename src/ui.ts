export const $ = <T extends HTMLElement = HTMLElement>(sel: string, raiz: ParentNode = document) =>
  raiz.querySelector(sel) as T

export const $$ = <T extends HTMLElement = HTMLElement>(sel: string, raiz: ParentNode = document) =>
  Array.from(raiz.querySelectorAll(sel)) as T[]

export function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )
}

const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const brl = (n: number | null | undefined) => (n == null || isNaN(n) ? '—' : fmtBRL.format(n))
export const num = (n: number, casas = 0) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas })

export function qtd(valor: number, unidade: string): string {
  if (unidade === 'un') return `${num(valor, 1)} un`
  if (valor >= 1000) return `${num(valor / 1000, 2)} ${unidade === 'g' ? 'kg' : 'L'}`
  return `${num(valor)} ${unidade}`
}

export function toast(msg: string) {
  const el = $('#toast')
  el.textContent = msg
  el.classList.add('visivel')
  clearTimeout((el as any)._t)
  ;(el as any)._t = setTimeout(() => el.classList.remove('visivel'), 2600)
}

export function erro(e: unknown) {
  const msg = (e as any)?.message ?? String(e)
  console.error(e)
  if (/foreign key|violates/i.test(msg)) toast('Não dá pra excluir: está em uso em alguma marmita.')
  else toast(`Erro: ${msg}`)
}

/** Abre um bottom sheet. Retorna o elemento do dialog para ligar eventos. */
export function abrirSheet(titulo: string, html: string): HTMLDialogElement {
  const d = $<HTMLDialogElement>('#sheet')
  d.innerHTML = `
    <div class="sheet-alca"></div>
    <div class="sheet-topo">
      <h2>${esc(titulo)}</h2>
      <button class="btn-icone texto" data-fechar>Fechar</button>
    </div>
    ${html}`
  $('[data-fechar]', d).onclick = () => d.close()
  d.onclick = (ev) => { if (ev.target === d) d.close() }
  if (!d.open) d.showModal()
  return d
}

export const fecharSheet = () => $<HTMLDialogElement>('#sheet').close()

export function dadosForm(form: HTMLFormElement): Record<string, string> {
  return Object.fromEntries(new FormData(form) as any)
}

export const n = (v: string | undefined) => {
  const x = parseFloat(String(v ?? '').replace(',', '.'))
  return isNaN(x) ? 0 : x
}

// ---------- datas (sempre em horário local, formato ISO yyyy-mm-dd) ----------

export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const deIso = (s: string) => {
  const [a, m, d] = s.split('-').map(Number)
  return new Date(a, m - 1, d)
}

export const hoje = () => iso(new Date())

export function somaDias(s: string, dias: number) {
  const d = deIso(s)
  d.setDate(d.getDate() + dias)
  return iso(d)
}

export function intervaloMes(mes: string) {
  const [a, m] = mes.split('-').map(Number)
  return { inicio: iso(new Date(a, m - 1, 1)), fim: iso(new Date(a, m, 0)) }
}

export const nomeMes = (mes: string) => {
  const t = deIso(mes + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export const dataCurta = (s: string) =>
  deIso(s).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })

export interface Topo {
  titulo: string
  voltar?: string
  acao?: string
  aba?: string
}

export function definirTopo({ titulo, voltar, acao = '', aba }: Topo) {
  $('#titulo').textContent = titulo
  document.title = titulo === 'Marmitaria' ? titulo : `${titulo} · Marmitaria`
  const btn = $<HTMLButtonElement>('#voltar')
  btn.hidden = !voltar
  btn.onclick = () => (location.hash = voltar ?? '#/')
  $('#acao').innerHTML = acao
  $$('#abas a').forEach((a) => a.classList.toggle('ativa', a.dataset.aba === aba))
}

