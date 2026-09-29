import { cardapioEntre, estado, marmita, precosDe } from '../db'
import { custoRefeicao, nutriRefeicao, nutriZero, produtosSemPreco, somaNutri, variacaoPreco } from '../calc'
import { brl, deIso, definirTopo, esc, hoje, intervaloMes, iso, nomeMes, num } from '../ui'

function mudarMes(mes: string, delta: number) {
  const d = deIso(mes + '-01')
  d.setMonth(d.getMonth() + delta)
  return iso(d).slice(0, 7)
}

export async function telaResumo(app: HTMLElement, _p: string[], query: URLSearchParams) {
  const mes = query.get('m') ?? hoje().slice(0, 7)
  definirTopo({ titulo: 'Resumo', voltar: '#/', aba: 'inicio' })

  const { inicio, fim } = intervaloMes(mes)
  const ant = intervaloMes(mudarMes(mes, -1))
  const [refs, refsAnt] = await Promise.all([cardapioEntre(inicio, fim), cardapioEntre(ant.inicio, ant.fim)])

  const total = refs.reduce((s, r) => s + custoRefeicao(r), 0)
  const totalAnt = refsAnt.reduce((s, r) => s + custoRefeicao(r), 0)
  const dias = new Set(refs.map((r) => r.data)).size
  const nutri = refs.reduce((s, r) => somaNutri(s, nutriRefeicao(r)), nutriZero())

  const porMarmita = new Map<string, { vezes: number; custo: number }>()
  for (const r of refs) {
    const x = porMarmita.get(r.marmita_id) ?? { vezes: 0, custo: 0 }
    x.vezes += r.porcoes
    x.custo += custoRefeicao(r)
    porMarmita.set(r.marmita_id, x)
  }
  const ranking = [...porMarmita.entries()].sort((a, b) => b[1].custo - a[1].custo)

  const variacoes = estado.produtos
    .map((p) => ({ p, v: variacaoPreco(p.id), h: precosDe(p.id) }))
    .filter((x) => x.v != null && Math.abs(x.v) >= 0.005)
    .sort((a, b) => Math.abs(b.v!) - Math.abs(a.v!))
    .slice(0, 8)
  const semPreco = produtosSemPreco()
  const diff = totalAnt ? total / totalAnt - 1 : null

  app.innerHTML = `
    <div class="mes-nav">
      <a class="btn-icone" href="#/resumo?m=${mudarMes(mes, -1)}" aria-label="Mês anterior">‹</a>
      <h2>${nomeMes(mes)}</h2>
      <a class="btn-icone" href="#/resumo?m=${mudarMes(mes, 1)}" aria-label="Próximo mês">›</a>
    </div>

    <div class="stats">
      <div class="stat"><div class="v">${brl(total)}</div><div class="r">gasto planejado</div></div>
      <div class="stat"><div class="v">${brl(refs.length ? total / refs.length : null)}</div><div class="r">por refeição</div></div>
      <div class="stat"><div class="v">${brl(dias ? total / dias : null)}</div><div class="r">por dia planejado</div></div>
    </div>
    ${diff != null ? `<p style="margin:-6px 0 12px;font-size:14px;color:var(--texto-2)">
      <span class="pilula ${diff > 0 ? 'sobe' : 'desce'}">${diff > 0 ? '▲' : '▼'} ${num(Math.abs(diff) * 100, 1)}%</span>
      em relação a ${nomeMes(mudarMes(mes, -1))} (${brl(totalAnt)})</p>` : ''}

    <div class="secao">Média diária (dias com refeições planejadas)</div>
    <div class="card">
      <div class="totais" style="margin-top:0">
        <div><b>${dias ? num(nutri.kcal / dias) : '—'}</b><span>kcal</span></div>
        <div><b>${dias ? num(nutri.prot / dias) : '—'}</b><span>prot (g)</span></div>
        <div><b>${dias ? num(nutri.carb / dias) : '—'}</b><span>carb (g)</span></div>
        <div><b>${dias ? num(nutri.gord / dias) : '—'}</b><span>gord (g)</span></div>
      </div>
      <p style="margin:8px 0 0;font-size:12px;color:var(--texto-2)">Só conta o que está no cardápio — lanches e itens fora dele não entram.</p>
    </div>

    <div class="secao">Onde vai o dinheiro</div>
    ${ranking.length ? `<div class="card">${ranking.map(([id, x]) => `
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(marmita(id)?.nome ?? '—')}</b><span>${brl(x.custo)}</span></div>
        <div style="font-size:12px;color:var(--texto-2)">${num(x.vezes, 1)} porções</div>
        <div class="barra"><i style="width:${total ? (x.custo / total) * 100 : 0}%"></i></div>
      </div>`).join('')}</div>` : '<div class="vazio">Nada planejado neste mês.</div>'}

    <div class="secao">Variação de preços</div>
    ${variacoes.length ? `<ul class="lista">${variacoes.map(({ p, v, h }) => `
      <li><a class="linha" href="#/produtos/${p.id}">
        <div class="corpo"><div class="nome">${esc(p.nome)}</div>
          <div class="sub">${brl(h[1].preco)} → ${brl(h[0].preco)}</div></div>
        <span class="pilula ${v! > 0 ? 'sobe' : 'desce'}">${v! > 0 ? '▲' : '▼'} ${num(Math.abs(v!) * 100, 1)}%</span>
      </a></li>`).join('')}</ul>`
      : '<div class="vazio">Registre preços mais de uma vez para ver a variação.</div>'}

    ${semPreco.length ? `<div class="secao">Sem preço</div>
      <div class="card">${semPreco.map((p) => `<a href="#/produtos/${p.id}">${esc(p.nome)}</a>`).join(' · ')}</div>` : ''}`

}
