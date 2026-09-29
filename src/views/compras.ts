import { cardapioEntre } from '../db'
import { listaDeCompras, type ItemCompra } from '../calc'
import { $, $$, brl, deIso, definirTopo, esc, hoje, intervaloMes, qtd, somaDias, toast } from '../ui'

const chaveMarcados = (de: string, ate: string) => `marmitaria:compras:${de}:${ate}`

function lerMarcados(chave: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(chave) ?? '[]')) } catch { return new Set() }
}

function salvarMarcados(chave: string, s: Set<string>) {
  try { localStorage.setItem(chave, JSON.stringify([...s])) } catch { /* sem armazenamento local */ }
}

function periodos() {
  const h = hoje()
  const d = deIso(h)
  const seg = somaDias(h, -((d.getDay() + 6) % 7))
  const mes = intervaloMes(h.slice(0, 7))
  const proxMes = intervaloMes(somaDias(mes.fim, 1).slice(0, 7))
  return [
    { nome: 'Próx. 7 dias', de: h, ate: somaDias(h, 6) },
    { nome: 'Esta semana', de: seg, ate: somaDias(seg, 6) },
    { nome: 'Próx. semana', de: somaDias(seg, 7), ate: somaDias(seg, 13) },
    { nome: 'Este mês', de: mes.inicio, ate: mes.fim },
    { nome: 'Próx. mês', de: proxMes.inicio, ate: proxMes.fim },
  ]
}

function textoLista(itens: ItemCompra[], de: string, ate: string) {
  const fmt = (s: string) => deIso(s).toLocaleDateString('pt-BR')
  return [`🛒 Compras ${fmt(de)} a ${fmt(ate)}`, '',
    ...itens.map((i) => `☐ ${i.produto.nome} — ${i.embalagens}× ${qtd(i.produto.embalagem, i.produto.unidade)}${i.custo != null ? ` (${brl(i.custo)})` : ''}`),
    '', `Total estimado: ${brl(itens.reduce((s, i) => s + (i.custo ?? 0), 0))}`].join('\n')
}

export async function telaCompras(app: HTMLElement, _p: string[], query: URLSearchParams) {
  definirTopo({
    titulo: 'Compras',
    aba: 'compras',
    acao: `<button class="btn-icone texto" id="copiar">Copiar</button>`,
  })
  const ps = periodos()
  const de = query.get('de') ?? ps[0].de
  const ate = query.get('ate') ?? ps[0].ate

  const refeicoes = await cardapioEntre(de, ate)
  const itens = listaDeCompras(refeicoes)
  const chave = chaveMarcados(de, ate)
  const marcados = lerMarcados(chave)
  const total = itens.reduce((s, i) => s + (i.custo ?? 0), 0)
  const semPreco = itens.filter((i) => i.custo == null).length

  let categoria = ''
  const linhas = itens.map((i) => {
    const cat = i.produto.categoria || 'Outros'
    const cab = cat !== categoria ? `</ul><div class="secao">${esc(cat)}</div><ul class="lista">` : ''
    categoria = cat
    const feito = marcados.has(i.produto.id)
    return `${cab}<li><label class="item-compra ${feito ? 'feito' : ''}">
      <input type="checkbox" data-id="${i.produto.id}" ${feito ? 'checked' : ''}>
      <div class="corpo" style="flex:1"><div class="nome">${esc(i.produto.nome)}</div>
        <div class="sub" style="font-size:13px;color:var(--texto-2)">Precisa de ${qtd(i.quantidade, i.produto.unidade)} → ${i.embalagens}× ${qtd(i.produto.embalagem, i.produto.unidade)}</div></div>
      <div class="valor" style="font-weight:700">${i.custo != null ? brl(i.custo) : '<span class="pilula alerta">sem preço</span>'}</div>
    </label></li>`
  }).join('')

  app.innerHTML = `
    <div class="segmentado">${ps.map((p) =>
      `<a class="btn peq ${p.de === de && p.ate === ate ? '' : 'sec'}" href="#/compras?de=${p.de}&ate=${p.ate}">${p.nome}</a>`).join('')}</div>
    <div class="grade-2">
      <div class="campo"><label for="de">De</label><input type="date" id="de" value="${de}"></div>
      <div class="campo"><label for="ate">Até</label><input type="date" id="ate" value="${ate}"></div>
    </div>
    <div class="card destaque">
      <div><div class="rotulo">Total estimado</div><div class="grande">${brl(total)}</div></div>
      <div style="text-align:right"><b>${refeicoes.length}</b> refeições<br><span style="font-size:13px;color:var(--texto-2)">${itens.length} itens</span></div>
    </div>
    ${semPreco ? `<p><span class="pilula alerta">${semPreco} item(ns) sem preço não entram no total</span></p>` : ''}
    ${itens.length
      ? `<ul class="lista" style="display:none">${linhas}</ul>`
      : `<div class="vazio"><span class="emoji">🛒</span>Nenhuma refeição planejada nesse período.<br><br>
         <a class="btn" href="#/cardapio">Ir para o cardápio</a></div>`}
    <p class="sub" style="font-size:12px;color:var(--texto-2);margin-top:16px">A quantidade é arredondada para embalagens inteiras. O custo usa o último preço registrado.</p>`

  const ir = () => {
    const d = $<HTMLInputElement>('#de', app).value
    const a = $<HTMLInputElement>('#ate', app).value
    if (d && a && d <= a) location.hash = `#/compras?de=${d}&ate=${a}`
  }
  $('#de', app).onchange = ir
  $('#ate', app).onchange = ir

  $$<HTMLInputElement>('[data-id]', app).forEach((cb) => (cb.onchange = () => {
    cb.checked ? marcados.add(cb.dataset.id!) : marcados.delete(cb.dataset.id!)
    cb.closest('.item-compra')!.classList.toggle('feito', cb.checked)
    salvarMarcados(chave, marcados)
  }))

  $('#copiar').onclick = async () => {
    if (!itens.length) return toast('Lista vazia.')
    try { await navigator.clipboard.writeText(textoLista(itens, de, ate)); toast('Lista copiada!') }
    catch { toast('Não foi possível copiar.') }
  }
}
