import {
  adicionarItem, atualizarItem, duplicarMarmita, estado, excluirMarmita, itensDe, marmita, produto,
  removerItem, salvarMarmita,
} from '../db'
import { custoItem, nutriDe, resumoMarmita } from '../calc'
import { $, $$, abrirSheet, brl, dadosForm, definirTopo, erro, esc, fecharSheet, n, num, toast } from '../ui'
import { formProduto } from './produtos'

// ---------- lista ----------

export function telaMarmitas(app: HTMLElement) {
  definirTopo({
    titulo: 'Marmitas',
    aba: 'marmitas',
    acao: `<button class="btn-icone cheio" id="nova" aria-label="Nova marmita">+</button>`,
  })
  $('#nova').onclick = () => formMarmita()

  if (!estado.marmitas.length) {
    app.innerHTML = `<div class="vazio"><span class="emoji">🍱</span>Monte suas receitas de marmita a partir dos produtos cadastrados.
      <br><br><button class="btn" id="nova2">Criar primeira marmita</button></div>`
    $('#nova2', app).onclick = () => formMarmita()
    return
  }

  const cards = estado.marmitas.map((m) => ({ m, r: resumoMarmita(m.id) }))
    .sort((a, b) => a.r.custoPorcao - b.r.custoPorcao)

  app.innerHTML = `<p class="sub" style="color:var(--texto-2);margin:0 0 10px;font-size:14px">Ordenadas da mais barata para a mais cara, por porção.</p>
    <ul class="lista">${cards.map(({ m, r }) => `
      <li><a class="linha" href="#/marmitas/${m.id}">
        <div class="corpo"><div class="nome">${esc(m.nome)}</div>
          <div class="sub">${m.porcoes} porç${m.porcoes > 1 ? 'ões' : 'ão'} · ${num(r.nutriPorcao.kcal)} kcal · ${num(r.nutriPorcao.prot)} g prot
          ${r.semPreco.length ? ' · <span class="pilula alerta">preço incompleto</span>' : ''}</div></div>
        <div class="valor">${brl(r.custoPorcao)}<small>por porção</small></div>
        <span class="chevron">›</span></a></li>`).join('')}
    </ul>`
}

function formMarmita(id?: string) {
  const m = id ? marmita(id) : undefined
  const d = abrirSheet(m ? 'Editar marmita' : 'Nova marmita', `
    <form id="f-marm">
      <div class="campo"><label for="nome">Nome</label>
        <input id="nome" name="nome" required value="${esc(m?.nome)}" placeholder="Ex: Frango com batata e salada"></div>
      <div class="campo"><label for="porcoes">Rende quantas porções?</label>
        <input id="porcoes" name="porcoes" type="number" min="1" step="1" inputmode="numeric" required value="${m?.porcoes ?? 5}"></div>
      <div class="campo"><label for="preparo">Modo de preparo (opcional)</label>
        <textarea id="preparo" name="preparo">${esc(m?.preparo ?? '')}</textarea></div>
      <button class="btn bloco" type="submit">${m ? 'Salvar' : 'Criar e adicionar ingredientes'}</button>
    </form>`)
  const form = $<HTMLFormElement>('#f-marm', d)
  form.onsubmit = async (ev) => {
    ev.preventDefault()
    const f = dadosForm(form)
    try {
      const salva = await salvarMarmita({ nome: f.nome.trim(), porcoes: Math.max(1, Math.round(n(f.porcoes))), preparo: f.preparo.trim() || null }, id)
      fecharSheet()
      if (location.hash === `#/marmitas/${salva.id}`) window.dispatchEvent(new HashChangeEvent('hashchange'))
      else location.hash = `#/marmitas/${salva.id}`
    } catch (e) { erro(e) }
  }
}

// ---------- editor ----------

export function telaMarmita(app: HTMLElement, [id]: string[]) {
  const m = marmita(id)
  if (!m) { location.hash = '#/marmitas'; return }
  definirTopo({
    titulo: m.nome,
    voltar: '#/marmitas',
    aba: 'marmitas',
    acao: `<button class="btn-icone texto" id="editar">Editar</button>`,
  })
  $('#editar').onclick = () => formMarmita(id)

  const desenhar = () => {
    const r = resumoMarmita(id)
    const itens = itensDe(id)
    app.innerHTML = `
      <div class="card">
        <div class="destaque">
          <div><div class="rotulo">Custo por porção</div><div class="grande">${brl(r.custoPorcao)}</div></div>
          <div style="text-align:right"><div class="rotulo">Receita inteira</div><b>${brl(r.custoTotal)}</b>
            <div class="sub" style="font-size:13px;color:var(--texto-2)">${m.porcoes} porç${m.porcoes > 1 ? 'ões' : 'ão'}${r.pesoPorcao ? ` · ~${num(r.pesoPorcao)} g cada` : ''}</div></div>
        </div>
        <div class="totais">
          <div><b>${num(r.nutriPorcao.kcal)}</b><span>kcal</span></div>
          <div><b>${num(r.nutriPorcao.prot)}</b><span>prot (g)</span></div>
          <div><b>${num(r.nutriPorcao.carb)}</b><span>carb (g)</span></div>
          <div><b>${num(r.nutriPorcao.gord)}</b><span>gord (g)</span></div>
        </div>
        ${r.semPreco.length ? `<p style="margin:10px 0 0"><span class="pilula alerta">Sem preço: ${esc(r.semPreco.join(', '))}</span></p>` : ''}
      </div>

      <div class="secao">Ingredientes (receita inteira)</div>
      ${itens.length ? `<ul class="lista">${itens.map((it) => {
        const p = produto(it.produto_id)!
        const c = custoItem(p.id, it.quantidade)
        return `<li class="linha">
          <div class="corpo"><div class="nome">${esc(p.nome)}</div>
            <div class="sub">${brl(c)} · ${num(nutriDe(p, it.quantidade).kcal)} kcal</div></div>
          <input class="qtd-input" data-item="${it.id}" inputmode="decimal" value="${String(it.quantidade).replace('.', ',')}" aria-label="Quantidade de ${esc(p.nome)}">
          <span class="sub" style="width:22px">${p.unidade}</span>
          <button class="btn-icone texto" data-rem="${it.id}" aria-label="Remover ${esc(p.nome)}" style="color:var(--texto-2)">✕</button>
        </li>`
      }).join('')}</ul>` : '<div class="vazio">Nenhum ingrediente ainda.</div>'}

      <div class="acoes" style="margin-top:12px">
        <button class="btn" id="add">+ Ingrediente</button>
      </div>

      ${m.preparo ? `<div class="secao">Modo de preparo</div><div class="card" style="white-space:pre-wrap">${esc(m.preparo)}</div>` : ''}

      <div class="acoes" style="margin-top:28px">
        <button class="btn sec" id="duplicar">Duplicar</button>
        <button class="btn perigo" id="excluir">Excluir</button>
      </div>`

    $$<HTMLInputElement>('[data-item]', app).forEach((inp) => (inp.onchange = async () => {
      const v = n(inp.value)
      if (v <= 0) return toast('Quantidade deve ser maior que zero.')
      try { await atualizarItem(inp.dataset.item!, v); desenhar() } catch (e) { erro(e) }
    }))
    $$<HTMLButtonElement>('[data-rem]', app).forEach((b) => (b.onclick = async () => {
      try { await removerItem(b.dataset.rem!); desenhar() } catch (e) { erro(e) }
    }))
    $('#add', app).onclick = () => formIngrediente(id, desenhar)
    $('#duplicar', app).onclick = async () => {
      try { const nova = await duplicarMarmita(id); toast('Marmita duplicada.'); location.hash = `#/marmitas/${nova.id}` } catch (e) { erro(e) }
    }
    $('#excluir', app).onclick = async () => {
      if (!confirm(`Excluir "${m.nome}"? Ela também sai do cardápio.`)) return
      try { await excluirMarmita(id); toast('Marmita excluída.'); location.hash = '#/marmitas' } catch (e) { erro(e) }
    }
  }
  desenhar()
}

function formIngrediente(marmitaId: string, depois: () => void) {
  const usados = new Set(itensDe(marmitaId).map((i) => i.produto_id))
  const opcoes = estado.produtos.filter((p) => !usados.has(p.id))
  const d = abrirSheet('Adicionar ingrediente', `
    <form id="f-ing">
      <div class="campo"><label for="produto">Produto</label>
        <select id="produto" name="produto" required>
          <option value="">Escolha…</option>
          ${opcoes.map((p) => `<option value="${p.id}" data-u="${p.unidade}">${esc(p.nome)}</option>`).join('')}
        </select></div>
      <div class="campo"><label for="quantidade">Quantidade na receita inteira (<span class="u">g</span>)</label>
        <input id="quantidade" name="quantidade" inputmode="decimal" required placeholder="Ex: 500"></div>
      <button class="btn bloco" type="submit">Adicionar</button>
      <button class="btn sec bloco" type="button" id="novo-prod" style="margin-top:8px">Cadastrar produto novo</button>
    </form>`)
  const sel = $<HTMLSelectElement>('#produto', d)
  sel.onchange = () => ($('.u', d).textContent = sel.selectedOptions[0]?.dataset.u ?? 'g')
  $('#novo-prod', d).onclick = () =>
    formProduto(undefined, async (p) => {
      formIngrediente(marmitaId, depois)
      const s = $<HTMLSelectElement>('#produto')
      s.value = p.id
      s.dispatchEvent(new Event('change'))
    })
  const form = $<HTMLFormElement>('#f-ing', d)
  form.onsubmit = async (ev) => {
    ev.preventDefault()
    const f = dadosForm(form)
    const q = n(f.quantidade)
    if (q <= 0) return toast('Informe a quantidade.')
    try { await adicionarItem(marmitaId, f.produto, q); fecharSheet(); depois() } catch (e) { erro(e) }
  }
}
