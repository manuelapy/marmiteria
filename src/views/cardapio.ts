import {
  adicionarRefeicoes, cardapioEntre, estado, marmita, REFEICOES, removerRefeicao,
  type Refeicao, type TipoRefeicao,
} from '../db'
import { custoRefeicao, nutriRefeicao, nutriZero, somaNutri } from '../calc'
import {
  $, $$, abrirSheet, brl, dadosForm, dataCurta, definirTopo, deIso, erro, esc, fecharSheet, hoje, intervaloMes,
  iso, n, nomeMes, num, somaDias, toast,
} from '../ui'

const ORDEM: TipoRefeicao[] = ['cafe', 'almoco', 'lanche', 'jantar']
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function mudarMes(mes: string, delta: number) {
  const d = deIso(mes + '-01')
  d.setMonth(d.getMonth() + delta)
  return iso(d).slice(0, 7)
}

const opcoesMarmitas = () =>
  estado.marmitas.map((m) => `<option value="${m.id}">${esc(m.nome)}</option>`).join('')

const opcoesRefeicao = (sel: TipoRefeicao = 'almoco') =>
  ORDEM.map((r) => `<option value="${r}" ${r === sel ? 'selected' : ''}>${REFEICOES[r]}</option>`).join('')

export async function telaCardapio(app: HTMLElement, _p: string[], query: URLSearchParams) {
  const mes = query.get('m') ?? hoje().slice(0, 7)
  definirTopo({
    titulo: 'Cardápio',
    aba: 'cardapio',
    acao: `<button class="btn-icone texto" id="lote">Preencher</button>`,
  })

  const { inicio, fim } = intervaloMes(mes)
  const refeicoes = await cardapioEntre(inicio, fim)
  const porDia = new Map<string, Refeicao[]>()
  for (const r of refeicoes) porDia.set(r.data, [...(porDia.get(r.data) ?? []), r])

  const total = refeicoes.reduce((s, r) => s + custoRefeicao(r), 0)
  const primeiro = deIso(inicio)
  const nDias = deIso(fim).getDate()
  const celulas: string[] = []
  for (let i = 0; i < primeiro.getDay(); i++) celulas.push('<div class="dia fora"></div>')
  for (let d = 1; d <= nDias; d++) {
    const data = `${mes}-${String(d).padStart(2, '0')}`
    const rs = (porDia.get(data) ?? []).sort((a, b) => ORDEM.indexOf(a.refeicao) - ORDEM.indexOf(b.refeicao))
    const custo = rs.reduce((s, r) => s + custoRefeicao(r), 0)
    celulas.push(`<button class="dia ${data === hoje() ? 'hoje' : ''}" data-dia="${data}" aria-label="${dataCurta(data)}, ${rs.length} refeições">
      <span class="n">${d}</span>
      <span class="pontos">${rs.map((r) => `<i class="${r.refeicao}"></i>`).join('')}</span>
      ${rs.length ? `<span class="c">${brl(custo).replace('R$', '').trim()}</span>` : ''}
    </button>`)
  }

  app.innerHTML = `
    <div class="mes-nav">
      <button class="btn-icone" id="ant" aria-label="Mês anterior">‹</button>
      <h2>${nomeMes(mes)}</h2>
      <button class="btn-icone" id="prox" aria-label="Próximo mês">›</button>
    </div>
    <div class="cal">${DIAS_SEMANA.map((d) => `<div class="dow">${d}</div>`).join('')}${celulas.join('')}</div>
    <div class="legenda">${ORDEM.map((r) => `<span><i class="${r}"></i>${REFEICOES[r]}</span>`).join('')}</div>
    <div class="card destaque">
      <div><div class="rotulo">Total planejado</div><div class="grande">${brl(total)}</div></div>
      <div style="text-align:right"><b>${refeicoes.length}</b> refeições<br>
        <span style="color:var(--texto-2);font-size:13px">${brl(refeicoes.length ? total / refeicoes.length : null)} em média</span></div>
    </div>
    <a class="btn sec bloco" style="margin-top:12px" href="#/compras?de=${inicio}&ate=${fim}">🛒 Lista de compras do mês</a>`

  const recarregar = () => telaCardapio(app, [], new URLSearchParams({ m: mes }))
  $('#ant', app).onclick = () => (location.hash = `#/cardapio?m=${mudarMes(mes, -1)}`)
  $('#prox', app).onclick = () => (location.hash = `#/cardapio?m=${mudarMes(mes, 1)}`)
  $('#lote').onclick = () => formLote(mes, recarregar)
  $$<HTMLButtonElement>('[data-dia]', app).forEach((b) =>
    (b.onclick = () => sheetDia(b.dataset.dia!, porDia.get(b.dataset.dia!) ?? [], recarregar)))
}

function exigeMarmitas() {
  if (estado.marmitas.length) return true
  toast('Crie uma marmita primeiro.')
  location.hash = '#/marmitas'
  return false
}

function sheetDia(data: string, rs: Refeicao[], recarregar: () => void) {
  const nutri = rs.reduce((s, r) => somaNutri(s, nutriRefeicao(r)), nutriZero())
  const custo = rs.reduce((s, r) => s + custoRefeicao(r), 0)
  const ordenadas = [...rs].sort((a, b) => ORDEM.indexOf(a.refeicao) - ORDEM.indexOf(b.refeicao))
  const d = abrirSheet(deIso(data).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }), `
    ${rs.length ? `
      <ul class="lista">${ordenadas.map((r) => `
        <li class="linha">
          <div class="corpo"><div class="sub">${REFEICOES[r.refeicao]}</div>
            <div class="nome">${esc(marmita(r.marmita_id)?.nome ?? '—')}${r.porcoes !== 1 ? ` × ${num(r.porcoes, 2)}` : ''}</div></div>
          <div class="valor">${brl(custoRefeicao(r))}<small>${num(nutriRefeicao(r).kcal)} kcal</small></div>
          <button class="btn-icone texto" data-rem="${r.id}" aria-label="Remover" style="color:var(--texto-2)">✕</button>
        </li>`).join('')}</ul>
      <div class="totais">
        <div><b>${brl(custo).replace('R$', '').trim()}</b><span>R$</span></div>
        <div><b>${num(nutri.kcal)}</b><span>kcal</span></div>
        <div><b>${num(nutri.prot)}</b><span>prot (g)</span></div>
        <div><b>${num(nutri.carb)}</b><span>carb (g)</span></div>
      </div>` : '<div class="vazio" style="padding:12px">Nada planejado neste dia.</div>'}
    <div class="secao">Adicionar</div>
    <form id="f-ref">
      <div class="campo"><label for="marmita">Marmita</label>
        <select id="marmita" name="marmita" required>${opcoesMarmitas()}</select></div>
      <div class="grade-2">
        <div class="campo"><label for="refeicao">Refeição</label>
          <select id="refeicao" name="refeicao">${opcoesRefeicao(rs.some((r) => r.refeicao === 'almoco') ? 'jantar' : 'almoco')}</select></div>
        <div class="campo"><label for="porcoes">Porções</label>
          <input id="porcoes" name="porcoes" inputmode="decimal" value="1"></div>
      </div>
      <button class="btn bloco" type="submit">Adicionar</button>
    </form>`)

  $$<HTMLButtonElement>('[data-rem]', d).forEach((b) => (b.onclick = async () => {
    try { await removerRefeicao(b.dataset.rem!); fecharSheet(); recarregar() } catch (e) { erro(e) }
  }))
  const form = $<HTMLFormElement>('#f-ref', d)
  form.onsubmit = async (ev) => {
    ev.preventDefault()
    if (!exigeMarmitas()) return fecharSheet()
    const f = dadosForm(form)
    try {
      await adicionarRefeicoes([{ data, refeicao: f.refeicao as TipoRefeicao, marmita_id: f.marmita, porcoes: n(f.porcoes) || 1 }])
      fecharSheet()
      recarregar()
    } catch (e) { erro(e) }
  }
}

function formLote(mes: string, recarregar: () => void) {
  if (!exigeMarmitas()) return
  const { inicio, fim } = intervaloMes(mes)
  const de = hoje() > inicio && hoje() <= fim ? hoje() : inicio
  const d = abrirSheet('Preencher em lote', `
    <form id="f-lote">
      <div class="campo"><label for="marmita">Marmita</label>
        <select id="marmita" name="marmita" required>${opcoesMarmitas()}</select></div>
      <div class="grade-2">
        <div class="campo"><label for="refeicao">Refeição</label>
          <select id="refeicao" name="refeicao">${opcoesRefeicao()}</select></div>
        <div class="campo"><label for="porcoes">Porções por dia</label>
          <input id="porcoes" name="porcoes" inputmode="decimal" value="1"></div>
      </div>
      <div class="grade-2">
        <div class="campo"><label for="de">De</label><input id="de" name="de" type="date" value="${de}" required></div>
        <div class="campo"><label for="ate">Até</label><input id="ate" name="ate" type="date" value="${somaDias(de, 4) > fim ? fim : somaDias(de, 4)}" required></div>
      </div>
      <div class="campo"><span class="rotulo">Dias da semana</span>
        <div class="chips">${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((nome, i) =>
          `<label><input type="checkbox" name="dow" value="${i}" ${i >= 1 && i <= 5 ? 'checked' : ''}><span>${nome}</span></label>`).join('')}</div>
      </div>
      <p id="previa" class="sub" style="color:var(--texto-2);font-size:14px"></p>
      <button class="btn bloco" type="submit">Adicionar ao cardápio</button>
    </form>`)

  const form = $<HTMLFormElement>('#f-lote', d)
  const datas = () => {
    const f = new FormData(form)
    const dows = new Set(f.getAll('dow').map(Number))
    const ini = String(f.get('de')), fimL = String(f.get('ate'))
    const lista: string[] = []
    for (let x = ini; x && fimL && x <= fimL && lista.length < 400; x = somaDias(x, 1))
      if (dows.has(deIso(x).getDay())) lista.push(x)
    return lista
  }
  const previa = () => ($('#previa', d).textContent = `${datas().length} dia(s) serão preenchidos.`)
  form.oninput = previa
  previa()

  form.onsubmit = async (ev) => {
    ev.preventDefault()
    const f = dadosForm(form)
    const lista = datas()
    if (!lista.length) return toast('Nenhum dia no intervalo.')
    try {
      await adicionarRefeicoes(lista.map((data) => ({
        data, refeicao: f.refeicao as TipoRefeicao, marmita_id: f.marmita, porcoes: n(f.porcoes) || 1,
      })))
      fecharSheet()
      toast(`${lista.length} refeição(ões) adicionadas.`)
      recarregar()
    } catch (e) { erro(e) }
  }
}
