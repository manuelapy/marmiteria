import './style.css'
import { configurado, supabase } from './supabase'
import { carregarTudo, estado } from './db'
import { $, definirTopo, erro } from './ui'
import { telaLogin } from './views/login'
import { telaInicio } from './views/inicio'
import { telaProdutos, telaProduto } from './views/produtos'
import { telaMarmitas, telaMarmita } from './views/marmitas'
import { telaCardapio } from './views/cardapio'
import { telaCompras } from './views/compras'
import { telaResumo } from './views/resumo'

type Tela = (app: HTMLElement, params: string[], query: URLSearchParams) => Promise<void> | void

const rotas: [RegExp, Tela][] = [
  [/^\/?$/, telaInicio],
  [/^\/produtos$/, telaProdutos],
  [/^\/produtos\/([\w-]+)$/, telaProduto],
  [/^\/marmitas$/, telaMarmitas],
  [/^\/marmitas\/([\w-]+)$/, telaMarmita],
  [/^\/cardapio$/, telaCardapio],
  [/^\/compras$/, telaCompras],
  [/^\/resumo$/, telaResumo],
]

let logado = false

export async function render() {
  const app = $('#app')
  if (!configurado) {
    definirTopo({ titulo: 'Marmitaria' })
    app.innerHTML = `<div class="card"><b>Configuração pendente.</b><p>Crie o arquivo <code>.env</code> com
      <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> (veja o README).</p></div>`
    return
  }
  $('#abas').hidden = !logado
  if (!logado) return telaLogin(app)

  const [caminho, qs = ''] = location.hash.replace(/^#/, '').split('?')
  for (const [re, tela] of rotas) {
    const m = caminho.match(re)
    if (m) {
      try {
        if (!estado.carregado) {
          app.innerHTML = '<div class="vazio">Carregando…</div>'
          await carregarTudo()
        }
        await tela(app, m.slice(1), new URLSearchParams(qs))
        window.scrollTo(0, 0)
      } catch (e) {
        erro(e)
      }
      return
    }
  }
  location.hash = '#/'
}

window.addEventListener('hashchange', render)

if (configurado) {
  supabase.auth.onAuthStateChange((_evento, sessao) => {
    const agora = Boolean(sessao)
    if (agora === logado) return
    logado = agora
    estado.carregado = false
    render()
  })
  supabase.auth.getSession().then(({ data }) => {
    logado = Boolean(data.session)
    render()
  })
} else {
  render()
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js')
}
