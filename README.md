# Marmitaria

PWA para planejar marmitas, cardápio mensal e lista de compras gastando pouco.

- **Produtos**: preço da embalagem (com histórico e variação), nutrientes por 100 g/ml ou por unidade
- **Marmitas**: receitas com rendimento em porções; custo e macros por porção calculados automaticamente
- **Cardápio**: calendário mensal por refeição (café, almoço, lanche, jantar), com preenchimento em lote
- **Compras**: lista consolidada do período, arredondada para embalagens inteiras, com total estimado
- **Resumo**: gasto do mês, média diária de macros, onde vai o dinheiro, variação de preços

Stack: Vite + TypeScript (sem framework) + Supabase (Postgres, Auth, RLS). Deploy na Vercel.

## Setup

1. Crie um projeto no [Supabase](https://supabase.com) e rode `supabase/migrations/001_schema.sql` no SQL Editor.
2. Em *Authentication → Sign In / Providers → Email*, desative **Confirm email** (uso individual; evita o link de confirmação abrir fora do app instalado).
3. Copie `.env.example` para `.env` e preencha com a URL e a chave pública (*Project Settings → API*).
4. Rode:

```bash
npm install
npm run dev
```

## Deploy (Vercel)

```bash
npm run build   # gera dist/
```

Na Vercel: importe o repositório, framework **Vite**, e cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em *Environment Variables*.

Para instalar no iPhone: abra no Safari → Compartilhar → **Adicionar à Tela de Início**.

## Estrutura

```
src/
  main.ts        roteador (hash) e sessão
  supabase.ts    cliente
  db.ts          tipos, cache em memória e CRUD
  calc.ts        custos, macros, lista de compras, variação de preço
  ui.ts          helpers (formatação, datas, sheet, toast)
  views/         uma tela por arquivo
public/          manifest, service worker mínimo, ícones
supabase/        migrations
```

## Regras de cálculo

- Custo unitário = último preço ÷ tamanho da embalagem
- Custo da porção = soma dos ingredientes ÷ porções da receita
- Lista de compras: para cada refeição, soma `quantidade × (porções da refeição ÷ porções da receita)`, depois arredonda para embalagens inteiras
- Marcações da lista de compras ficam só no aparelho (localStorage)
