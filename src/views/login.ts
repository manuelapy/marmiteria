import { supabase } from '../supabase'
import { $, dadosForm, definirTopo, toast } from '../ui'

export function telaLogin(app: HTMLElement) {
  definirTopo({ titulo: '' })
  app.innerHTML = `
    <div class="login">
      <div class="logo">🍱</div>
      <h2>Marmitaria</h2>
      <p>Coma bem, gaste pouco.</p>
      <form class="card" id="f-login">
        <div class="campo"><label for="email">E-mail</label>
          <input id="email" name="email" type="email" autocomplete="email" required></div>
        <div class="campo"><label for="senha">Senha</label>
          <input id="senha" name="senha" type="password" autocomplete="current-password" minlength="6" required></div>
        <button class="btn bloco" type="submit">Entrar</button>
        <button class="btn sec bloco" type="button" id="criar" style="margin-top:8px">Criar conta</button>
      </form>
    </div>`

  const form = $<HTMLFormElement>('#f-login', app)
  form.onsubmit = async (ev) => {
    ev.preventDefault()
    const { email, senha } = dadosForm(form)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) toast(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
  }
  $('#criar', app).onclick = async () => {
    if (!form.reportValidity()) return
    const { email, senha } = dadosForm(form)
    const { data, error } = await supabase.auth.signUp({ email, password: senha })
    if (error) return toast(error.message)
    if (!data.session) toast('Conta criada! Confirme pelo link enviado ao seu e-mail.')
  }
}
