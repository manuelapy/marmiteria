# Briefing — Marmitaria

> Cadastrar produtos (preço e nutrientes), montar marmitas, planejar o cardápio do mês e gerar a lista de compras, comendo bem e gastando pouco.

## Back-end
- Persistência de dados: sim — produtos, histórico de preços, receitas/marmitas, cardápio mensal, listas de compras
- Autenticação: sim — login por e-mail (magic link ou senha)
- Offline: não
- Notificações push: não
- Multiusuário/sincronização: não (uso individual; sincroniza celular ↔ PC via nuvem)
- Recomendação técnica: Supabase (Postgres + Auth + Row Level Security por `user_id`)

### Modelo de dados (inicial)
- `produtos` — nome, categoria, unidade (g/ml/un), tamanho da embalagem, kcal/prot/carb/gord por 100 g
- `precos` — produto_id, preço, data, mercado → histórico; preço atual = último registro
- `marmitas` — nome, nº de porções, modo de preparo (opcional)
- `marmita_itens` — marmita_id, produto_id, quantidade
- `cardapio` — data, refeição (almoço/jantar/lanche), marmita_id
- Lista de compras: gerada (view/função) a partir do cardápio do período × itens − (opcional) estoque

## Front-end
- Stack sugerida: Vite + TypeScript + supabase-js, sem framework pesado (escolha da Claude); deploy na Vercel
- Nº de telas principais: 6 — Início (menu), Produtos, Marmitas, Cardápio mensal, Lista de compras, Resumo/dashboard
- Comportamento de instalação (PWA): manifest + ícone + service worker mínimo (só para instalar; sem cache offline); abre em tela cheia

## Design
- Direção visual: aconchegante — tons quentes (terracota, creme, verde-oliva), cantos arredondados, cara de cozinha
- Paleta/logo: a sugerir
- Modo escuro: automático (segue o sistema)

## UX/UI
- Ação principal do usuário: tela inicial com cards grandes de atalho (Cardápio, Marmitas, Produtos, Compras, Resumo)
- Profundidade do fluxo até a ação principal: 1 toque a partir do início
- Dispositivo prioritário: celular (iPhone), mobile-first
- Cálculos automáticos: custo por porção, R$/100 g, macros por marmita, custo do mês

## Próximos passos sugeridos
- Criar projeto Supabase e aplicar o schema com RLS
- Montar wireframe da tela inicial e da tela de montar marmita
- Configurar Vite + PWA e publicar primeira versão na Vercel
