import { supabase } from '../supabase'
import { cardapioEntre, estado } from '../db'
import { custoRefeicao, produtosSemPreco } from '../calc'
import { $, brl, definirTopo, hoje, intervaloMes } from '../ui'

export async function telaInicio(app: HTMLElement) {
  definirTopo({ titulo: 'Marmitaria', aba: 'inicio' })
  const mes = hoje().slice(0, 7)
  const { inicio, fim } = intervaloMes(mes)
  const refeicoes = await cardapioEntre(inicio, fim)
  const gasto = refeicoes.reduce((s, r) => s + custoRefeicao(r), 0)
  const hojeRefs = refeicoes.filter((r) => r.data === hoje()).length
  const semPreco = produtosSemPreco().length
  const hora = new Date().getHours()
  const saud = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  app.innerHTML = `
    <div class="saudacao">
      <h2>${saud}!</h2>
      <p>${hojeRefs ? `${hojeRefs} refeição(ões) planejada(s) para hoje.` : 'Nada planejado para hoje ainda.'}</p>
    </div>
    <div class="stats">
      <div class="stat"><div class="v">${brl(gasto)}</div><div class="r">planejado no mês</div></div>
      <div class="stat"><div class="v">${refeicoes.length}</div><div class="r">refeições no mês</div></div>
      <div class="stat"><div class="v">${brl(refeicoes.length ? gasto / refeicoes.length : null)}</div><div class="r">média por refeição</div></div>
    </div>
    <div class="atalhos">
      <a class="atalho a1" href="#/cardapio"><span class="ic">📅</span><span><b>Cardápio</b><small>Planejar o mês</small></span></a>
      <a class="atalho a2" href="#/marmitas"><span class="ic">🍱</span><span><b>Marmitas</b><small>${estado.marmitas.length} receitas</small></span></a>
      <a class="atalho a3" href="#/produtos"><span class="ic">🥕</span><span><b>Produtos</b><small>${estado.produtos.length} cadastrados</small></span></a>
      <a class="atalho a4" href="#/compras"><span class="ic">🛒</span><span><b>Compras</b><small>Gerar lista</small></span></a>
      <a class="atalho a5" href="#/resumo"><span class="ic">📊</span><span style="margin-left:14px"><b>Resumo</b><small>Gastos, macros e preços</small></span></a>
    </div>
    ${semPreco ? `<p style="margin-top:16px"><span class="pilula alerta">${semPreco} produto(s) sem preço</span></p>` : ''}
    <button class="link-sair" id="sair">Sair da conta</button>`

  $('#sair', app).onclick = () => supabase.auth.signOut()
}
