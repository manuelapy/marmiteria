import {
  CATEGORIAS, estado, excluirPreco, excluirProduto, precoAtual, precosDe, produto,
  registrarPreco, salvarProduto, type Produto,
} from '../db'
import { custoReferencia, variacaoPreco } from '../calc'
import {
  $, $$, abrirSheet, brl, dadosForm, definirTopo, deIso, erro, esc, fecharSheet, hoje, n, num, qtd, toast,
} from '../ui'

const porRef = (p: Produto) => (p.unidade === 'un' ? 'por unidade' : `por 100 ${p.unidade}`)

function pilulaVariacao(id: string) {
  const v = variacaoPreco(id)
  if (v == null || Math.abs(v) < 0.005) return ''
  return `<span class="pilula ${v > 0 ? 'sobe' : 'desce'}">${v > 0 ? '▲' : '▼'} ${num(Math.abs(v) * 100, 1)}%</span>`
}

// ---------- lista ----------

export function telaProdutos(app: HTMLElement) {
  definirTopo({
    titulo: 'Produtos',
    aba: 'produtos',
    acao: `<button class="btn-icone cheio" id="novo" aria-label="Novo produto">+</button>`,
  })
  $('#novo').onclick = () => formProduto()

  if (!estado.produtos.length) {
    app.innerHTML = `<div class="vazio"><span class="emoji">🥕</span>Cadastre os produtos que você costuma comprar,
      com preço e informação nutricional.<br><br><button class="btn" id="novo2">Cadastrar primeiro produto</button></div>`
    $('#novo2', app).onclick = () => formProduto()
    return
  }

  app.innerHTML = `<input class="busca" type="search" id="busca" placeholder="Buscar produto…" aria-label="Buscar produto"><div id="grupos"></div>`
  const desenhar = (termo = '') => {
    const t = termo.toLowerCase()
    const filtrados = estado.produtos.filter((p) => p.nome.toLowerCase().includes(t))
    const grupos = new Map<string, Produto[]>()
    for (const p of filtrados) {
      const c = p.categoria || 'Outros'
      grupos.set(c, [...(grupos.get(c) ?? []), p])
    }
    $('#grupos', app).innerHTML = [...grupos.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cat, ps]) => `
        <div class="secao">${esc(cat)}</div>
        <ul class="lista">${ps.map((p) => {
          const preco = precoAtual(p.id)
          return `<li><a class="linha" href="#/produtos/${p.id}">
            <div class="corpo"><div class="nome">${esc(p.nome)}</div>
              <div class="sub">${qtd(p.embalagem, p.unidade)} · ${num(p.kcal)} kcal · ${num(p.prot, 1)} g prot ${porRef(p)}</div></div>
            <div class="valor">${preco ? brl(preco.preco) : '<span class="pilula alerta">sem preço</span>'}
              <small>${preco ? `${brl(custoReferencia(p.id))} ${p.unidade === 'un' ? '/un' : `/100${p.unidade}`}` : ''} ${pilulaVariacao(p.id)}</small></div>
            <span class="chevron">›</span></a></li>`
        }).join('')}</ul>`)
      .join('') || '<div class="vazio">Nenhum produto encontrado.</div>'
  }
  desenhar()
  $<HTMLInputElement>('#busca', app).oninput = (ev) => desenhar((ev.target as HTMLInputElement).value)
}

// ---------- formulário (novo/editar) ----------

export function formProduto(p?: Produto, aoSalvar?: (p: Produto) => void) {
  const u = p?.unidade ?? 'g'
  const d = abrirSheet(p ? 'Editar produto' : 'Novo produto', `
    <form id="f-prod">
      <div class="campo"><label for="nome">Nome</label>
        <input id="nome" name="nome" required value="${esc(p?.nome)}" placeholder="Ex: Peito de frango"></div>
      <div class="grade-2">
        <div class="campo"><label for="categoria">Categoria</label>
          <input id="categoria" name="categoria" list="cats" value="${esc(p?.categoria ?? '')}" placeholder="Proteínas">
          <datalist id="cats">${CATEGORIAS.map((c) => `<option value="${c}">`).join('')}</datalist></div>
        <div class="campo"><label for="unidade">Medida</label>
          <select id="unidade" name="unidade">
            <option value="g" ${u === 'g' ? 'selected' : ''}>Gramas (g)</option>
            <option value="ml" ${u === 'ml' ? 'selected' : ''}>Mililitros (ml)</option>
            <option value="un" ${u === 'un' ? 'selected' : ''}>Unidade</option>
          </select></div>
      </div>
      <div class="campo"><label for="embalagem">Tamanho da embalagem (<span class="u">${u}</span>)</label>
        <input id="embalagem" name="embalagem" inputmode="decimal" required value="${p?.embalagem ?? ''}" placeholder="Ex: 1000"></div>
      ${p ? '' : `
      <div class="grade-2">
        <div class="campo"><label for="preco">Preço da embalagem (R$)</label>
          <input id="preco" name="preco" inputmode="decimal" placeholder="Ex: 21,90"></div>
        <div class="campo"><label for="mercado">Mercado</label>
          <input id="mercado" name="mercado" placeholder="Opcional"></div>
      </div>`}
      <div class="rotulo" style="margin-bottom:6px">Informação nutricional <span class="ref">${u === 'un' ? 'por unidade' : `por 100 ${u}`}</span></div>
      <div class="grade-4">
        <div class="campo"><label for="kcal">kcal</label><input id="kcal" name="kcal" inputmode="decimal" value="${p?.kcal ?? ''}"></div>
        <div class="campo"><label for="prot">Prot (g)</label><input id="prot" name="prot" inputmode="decimal" value="${p?.prot ?? ''}"></div>
        <div class="campo"><label for="carb">Carb (g)</label><input id="carb" name="carb" inputmode="decimal" value="${p?.carb ?? ''}"></div>
        <div class="campo"><label for="gord">Gord (g)</label><input id="gord" name="gord" inputmode="decimal" value="${p?.gord ?? ''}"></div>
      </div>
      <button class="btn bloco" type="submit">Salvar</button>
    </form>`)

  const sel = $<HTMLSelectElement>('#unidade', d)
  sel.onchange = () => {
    $('.u', d).textContent = sel.value
    $('.ref', d).textContent = sel.value === 'un' ? 'por unidade' : `por 100 ${sel.value}`
  }

  const form = $<HTMLFormElement>('#f-prod', d)
  form.onsubmit = async (ev) => {
    ev.preventDefault()
    const f = dadosForm(form)
    const embalagem = n(f.embalagem)
    if (embalagem <= 0) return toast('Informe o tamanho da embalagem.')
    try {
      const salvo = await salvarProduto({
        nome: f.nome.trim(),
        categoria: f.categoria.trim() || null,
        unidade: f.unidade as Produto['unidade'],
        embalagem,
        kcal: n(f.kcal), prot: n(f.prot), carb: n(f.carb), gord: n(f.gord),
      }, p?.id)
      if (!p && f.preco) await registrarPreco({ produto_id: salvo.id, preco: n(f.preco), data: hoje(), mercado: f.mercado?.trim() || null })
      fecharSheet()
      toast('Produto salvo.')
      if (aoSalvar) aoSalvar(salvo)
      else window.dispatchEvent(new HashChangeEvent('hashchange'))
    } catch (e) { erro(e) }
  }
}

// ---------- detalhe + histórico de preços ----------

export function telaProduto(app: HTMLElement, [id]: string[]) {
  const p = produto(id)
  if (!p) { location.hash = '#/produtos'; return }
  definirTopo({
    titulo: p.nome,
    voltar: '#/produtos',
    aba: 'produtos',
    acao: `<button class="btn-icone texto" id="editar">Editar</button>`,
  })
  $('#editar').onclick = () => formProduto(p)

  const historico = precosDe(id)
  const atual = historico[0]
  const precosNum = historico.map((h) => h.preco)
  const menor = precosNum.length ? Math.min(...precosNum) : null
  const maior = precosNum.length ? Math.max(...precosNum) : null

  app.innerHTML = `
    <div class="card">
      <div class="destaque">
        <div><div class="rotulo">Preço atual</div><div class="grande">${brl(atual?.preco)}</div></div>
        <div style="text-align:right">${pilulaVariacao(id)}<div class="sub" style="color:var(--texto-2);font-size:13px;margin-top:4px">
          ${atual ? `${brl(custoReferencia(id))} ${p.unidade === 'un' ? 'por un' : `por 100 ${p.unidade}`}` : 'sem preço'}</div></div>
      </div>
      <div class="sub" style="color:var(--texto-2);font-size:13px;margin-top:6px">
        Embalagem de ${qtd(p.embalagem, p.unidade)}${p.categoria ? ` · ${esc(p.categoria)}` : ''}
        ${historico.length > 1 ? `<br>Menor: ${brl(menor)} · Maior: ${brl(maior)}` : ''}</div>
      <div class="totais">
        <div><b>${num(p.kcal)}</b><span>kcal</span></div>
        <div><b>${num(p.prot, 1)}</b><span>prot (g)</span></div>
        <div><b>${num(p.carb, 1)}</b><span>carb (g)</span></div>
        <div><b>${num(p.gord, 1)}</b><span>gord (g)</span></div>
      </div>
      <div class="sub" style="color:var(--texto-2);font-size:12px;margin-top:6px;text-align:center">${porRef(p)}</div>
    </div>

    <div class="secao">Registrar preço</div>
    <form class="card" id="f-preco">
      <div class="grade-2">
        <div class="campo"><label for="preco">Preço (R$)</label><input id="preco" name="preco" inputmode="decimal" required placeholder="0,00"></div>
        <div class="campo"><label for="data">Data</label><input id="data" name="data" type="date" value="${hoje()}" required></div>
      </div>
      <div class="campo"><label for="mercado">Mercado</label><input id="mercado" name="mercado" placeholder="Opcional" value="${esc(atual?.mercado ?? '')}"></div>
      <button class="btn bloco" type="submit">Adicionar ao histórico</button>
    </form>

    <div class="secao">Histórico (${historico.length})</div>
    ${historico.length ? `<ul class="lista">${historico.map((h, i) => {
      const ant = historico[i + 1]
      const v = ant && ant.preco ? h.preco / ant.preco - 1 : null
      return `<li class="linha">
        <div class="corpo"><div class="nome">${brl(h.preco)}
          ${v != null && Math.abs(v) >= 0.005 ? `<span class="pilula ${v > 0 ? 'sobe' : 'desce'}">${v > 0 ? '+' : ''}${num(v * 100, 1)}%</span>` : ''}</div>
          <div class="sub">${deIso(h.data).toLocaleDateString('pt-BR')}${h.mercado ? ` · ${esc(h.mercado)}` : ''}</div></div>
        <button class="btn-icone texto" data-del="${h.id}" aria-label="Excluir preço" style="color:var(--texto-2)">✕</button>
      </li>`
    }).join('')}</ul>` : '<div class="vazio">Nenhum preço registrado.</div>'}

    <button class="btn perigo bloco" id="excluir" style="margin-top:28px">Excluir produto</button>`

  const form = $<HTMLFormElement>('#f-preco', app)
  form.onsubmit = async (ev) => {
    ev.preventDefault()
    const f = dadosForm(form)
    try {
      await registrarPreco({ produto_id: id, preco: n(f.preco), data: f.data, mercado: f.mercado.trim() || null })
      toast('Preço registrado.')
      telaProduto(app, [id])
    } catch (e) { erro(e) }
  }
  $$<HTMLButtonElement>('[data-del]', app).forEach((b) => (b.onclick = async () => {
    if (!confirm('Excluir este preço do histórico?')) return
    try { await excluirPreco(b.dataset.del!); telaProduto(app, [id]) } catch (e) { erro(e) }
  }))
  $('#excluir', app).onclick = async () => {
    if (!confirm(`Excluir "${p.nome}" e todo o histórico de preços?`)) return
    try { await excluirProduto(id); toast('Produto excluído.'); location.hash = '#/produtos' } catch (e) { erro(e) }
  }
}
