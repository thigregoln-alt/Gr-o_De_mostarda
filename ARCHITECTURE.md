# Grão de Mostarda Personalizados — Notas de Arquitetura

Este documento explica, com toda a honestidade, **o que já funciona** neste protótipo e **o que precisa de um backend** para se tornar a loja real. Serve também como guia para quem for continuar o desenvolvimento (por exemplo, numa stack Umbraco/.NET, como referido pelo cliente).

> **Atualização — auditoria funcional.** A pedido do cliente, os avisos "isto é uma demonstração" foram removidos do site visível (banner do topo, rodapé, selos "Demonstração" nos produtos/avaliações, caixas de aviso no checkout) para que o protótipo tenha a aparência de um site real e profissional. Isso **não significa que essas limitações deixaram de existir** — apenas deixaram de estar escritas na interface. A lista honesta e completa do que é real vs. simulado continua abaixo, e foi entregue também como resposta escrita ao pedido de auditoria do cliente (ver a mensagem que acompanhou esta entrega). Duas peças de lógica foram corrigidas/reforçadas nesta auditoria:
> - **"Mais vendidos"** agora soma também as encomendas reais criadas nesta sessão (guardadas em `localStorage`), não só o histórico simulado — e só conta encomendas com estado `"concluída"`. A página `/admin` tem um botão "Marcar como concluída" para testar isto ao vivo.
> - **"Melhores avaliados"** passou a ter uma função própria, `computeTopRatedProducts()`, com média ponderada (Bayesian average), em vez de não existir enquanto lógica nenhuma.

## 1. O que é este protótipo

Um site estático (HTML + CSS + JavaScript puro, sem frameworks, sem build step) com:

- `index.html` — estrutura da página, cabeçalho, rodapé, drawers, modais.
- `app.js` — todos os dados de demonstração e toda a lógica (router, carrinho, formulários, cálculo de mais vendidos, favoritos, avaliações, newsletter).
- `assets/` — logótipo oficial (`logo.webp`/`logo.png`) e os dois panfletos oficiais fornecidos pelo cliente, usados como material de marca real.

Não há servidor, base de dados, autenticação nem chamadas de rede a serviços externos (à exceção do carregamento de tipos de letra do Google Fonts). **Tudo o que funciona, funciona inteiramente no navegador do utilizador.**

## 2. Funciona de verdade neste protótipo (sem backend)

| Funcionalidade | Como funciona |
|---|---|
| Navegação / router | Router baseado em `hash` (`#/loja`, `#/produto/:slug`, etc.), sem reload de página. |
| Catálogo, filtros, pesquisa, categorias | 100% client-side sobre o array `PRODUCTS`. |
| Carrinho | Adiciona/remove/atualiza quantidade, respeita o stock de cada produto, calcula subtotal. |
| Favoritos | Guardados em memória durante a sessão (`state.favorites`). |
| Formulário de checkout | Validação HTML5 + JS, gera número de encomenda, mostra resumo, mostra página de confirmação. |
| Envio da encomenda para a loja | Usa um link `mailto:` para abrir um rascunho de email **já preenchido** dirigido a `ateliergraodemostarda176@gmail.com` — funciona sem servidor, mas depende do cliente de email do utilizador e não garante entrega automática. |
| Newsletter | Validação real de formato de email, deteção de duplicados, consentimento obrigatório — guardado em `localStorage` (chave `gm_newsletter_demo`), claramente marcado como demonstração. |
| "Mais vendidos" | **Cálculo real**, não um valor fixo: a função `computeBestSellers(periodDays)` agrega unidades vendidas a partir de um histórico de encomendas (`ORDERS_DEMO`, gerado para simular ~95 dias de vendas) e devolve os produtos mais vendidos no período escolhido (30 dias por defeito). Basta substituir `ORDERS_DEMO` por encomendas reais vindas da base de dados para a função continuar a funcionar sem alterações. |
| Encomendas especiais | Mesmo mecanismo de `mailto:` + geração de referência. |
| Avaliações | Dados fixos claramente marcados "Demonstração", com filtro por estrelas, ordenação e cálculo real da média. |
| WhatsApp / Instagram / Email | Ligações reais e funcionais, fornecidas pelo cliente. |
| Responsividade | Testado em desktop, tablet e mobile (menu, carrinho, formulários, grelhas). |

## 3. Precisa de backend — não está e não pode estar realmente implementado num site estático

Está tudo assinalado no código com o comentário `REQUER BACKEND` e, na interface, com a etiqueta **"Demonstração"** ou uma caixa de aviso (`.arch-note`).

### 3.1 Envio automático de email (encomendas e contacto)
Atualmente usamos `mailto:` (abre o email do utilizador). Em produção é necessário:
- Uma API de backend (ex.: endpoint `/api/orders`) que recebe os dados do formulário.
- Um serviço de envio de email transacional (Resend, Brevo, SendGrid, Amazon SES, etc.) chamado **a partir do servidor**, nunca do frontend — para não expor chaves de API.
- Um template de email para o responsável da loja e outro de confirmação para o cliente.

### 3.2 Base de dados de encomendas
Neste protótipo, as encomendas ficam em `localStorage` (apenas no browser de quem testa). É necessário:
- Uma base de dados real (SQL Server/PostgreSQL, por exemplo, se for Umbraco/.NET) com tabelas de Encomendas, Itens de Encomenda, Clientes.
- Um identificador de encomenda gerado pelo servidor (não pelo cliente).

### 3.3 Newsletter real
A subscrição é validada e guardada localmente, mas para ser uma newsletter real falta:
- Uma API de backend que grava o subscritor na base de dados (ou diretamente num serviço como Brevo/Mailchimp via API).
- Confirmação de subscrição por email (double opt-in), recomendada por RGPD.
- Página/endpoint de cancelamento de subscrição (unsubscribe).

### 3.4 Notificações a subscritores (novo produto, stock reposto, promoção)
Requer:
- Um painel de administração com o botão "Notificar subscritores" por produto.
- Um job de backend que envia a campanha através do serviço de email escolhido.

### 3.5 Email de reengajamento aos 60 dias
Esta é a funcionalidade mais claramente "impossível sem backend" pedida na especificação, e está documentada, não fingida:
- É necessário guardar, por subscritor: `lastVisit`, `consent`, `unsubscribed`, `lastReengagementEmailSent` (os campos já existem no registo de demonstração da newsletter, para servir de modelo de dados).
- É necessário um **cron job / tarefa agendada no servidor** (ex.: um Azure Function/Job agendado, ou um scheduled task do Umbraco) que corre periodicamente (ex.: uma vez por dia), verifica todos os subscritores com consentimento ativo, calcula `hoje - lastVisit >= 60 dias`, confirma que `lastReengagementEmailSent` não aconteceu recentemente, envia o email através do serviço de email, e atualiza `lastReengagementEmailSent`.
- **Nunca enviar a quem cancelou a subscrição** — o filtro por `unsubscribed === false` é obrigatório.
- Um site estático não tem como "correr sozinho" ao fim de 60 dias — isto tem de viver no servidor.

### 3.6 Área de administração
A página `/admin` incluída é uma **maquete visual** (sem autenticação, sem dados reais protegidos) que mostra o que a administração deverá poder fazer. Para ser real, precisa de:
- Autenticação (login/password, idealmente com 2FA) e controlo de acesso.
- CRUD de produtos, encomendas, avaliações (moderação), FAQ, páginas de Ajuda e Projetos ligado à base de dados.
- Armazenamento de imagens (ex.: Azure Blob Storage, S3, ou o media picker do Umbraco) em vez das imagens de demonstração geradas por SVG.

### 3.7 Fotografias reais dos produtos
Todas as imagens de produto neste protótipo são **geradas localmente** (SVG com o nome do produto e a etiqueta "Imagem de demonstração") — propositadamente, para nunca mostrar uma fotografia errada ou de outro produto como se fosse real. Quando existirem fotografias reais, basta substituir o array `images` de cada produto em `PRODUCTS` (em `app.js`) pelos caminhos/URLs das fotografias reais.

### 3.8 Segurança — o que já está implementado no frontend, e o que continua a exigir um backend

**Implementado nesta entrega (auditoria de segurança):**
- `escapeHtml(str)` (`app.js`) — escapa `& < > " '` antes de qualquer valor com origem em
  input do utilizador (pesquisa, nome do cliente, etc.) ser inserido via `innerHTML`. Corrigidos
  três pontos que refletiam texto sem escape: o campo de pesquisa da loja (`pageLoja`), o primeiro
  nome do cliente na página de confirmação de encomenda (`pageConfirmacao`), e o nome do cliente na
  tabela de encomendas do `/admin` (lido de `localStorage`, por isso era um XSS armazenado).
- `sanitizeText(str, maxLen)` — remove caracteres de controlo e limita o comprimento de todo o
  texto vindo de formulários (checkout, encomendas especiais, contacto, newsletter) antes de
  guardar ou incluir no corpo do email `mailto:`.
- Todos os campos de formulário têm `maxlength` e validação específica por campo (email, telefone
  e código postal portugueses, nome completo), com mensagens de erro concretas — não genéricas —
  mostradas junto ao campo (`validateForm`/`setFieldError`).
- `readJSON(key, fallback)` — todas as leituras de `localStorage` (`gm_orders_demo`,
  `gm_special_orders_demo`, `gm_newsletter_demo`) passam por esta função, com `try/catch` e
  validação de que o resultado é um array. `isValidOrderShape()` descarta silenciosamente qualquer
  encomenda gravada em `localStorage` cuja forma não bata certo (sem `id`, sem `items`, quantidades
  não numéricas/negativas) — protege "Mais vendidos" e o `/admin` contra um valor editado à mão nas
  DevTools sem quebrar o resto do carrinho/histórico.
- `Object.freeze(PRODUCTS)` + `Object.freeze()` de cada produto e do respetivo array `images` —
  impede reatribuir `PRODUCTS[i].price`/`stock` a partir da consola do browser em runtime.
- O carrinho (`state.cart`) guarda apenas `{ id, qty }` — nunca um preço. `cartTotal()`,
  `renderCart()` e `submitOrder()` recalculam sempre o preço a partir de `PRODUCTS.find(...)` no
  momento de mostrar/enviar. Não há preço "solto" em memória, `localStorage` ou no DOM para alguém
  adulterar.
- Sem `eval()`, `new Function()` nem `setTimeout`/`setInterval` com uma string em nenhum ponto do
  código (auditado manualmente).

**Continua a ser uma limitação real, sem solução possível sem backend** (ver `SHOP`/checkout):
Mesmo com tudo isto, este é um site 100% frontend — qualquer pessoa com conhecimento técnico pode
abrir as DevTools e alterar o valor de `qty` de um item, ou o total mostrado no ecrã, antes de
premir "Enviar encomenda", porque o pedido final é montado no próprio browser. Isto **não
compromete a loja**: o pagamento é sempre confirmado manualmente pela loja (MBWay/transferência)
antes do envio do produto, nunca processado automaticamente a partir do que aparece no ecrã do
cliente — por isso o email gerado por `submitOrder()` inclui agora explicitamente a linha "valores
a confirmar pela loja antes do envio". Uma proteção definitiva (impossível de contornar do lado do
cliente) só existe com um backend que recebe `{ id, qty }` por item e recalcula o preço e o total
a partir da base de dados do servidor antes de aceitar a encomenda — nunca confiando num total
enviado pelo browser.

## 4. Onde tudo isto vive no código

- `SHOP` (topo de `app.js`) — dados oficiais de contacto (WhatsApp, email, Instagram). Fonte única de verdade; qualquer alteração de contacto só precisa de ser feita aqui.
- `PRODUCTS` — catálogo de demonstração, já com as 9 categorias exatas pedidas.
- `ORDERS_DEMO` / `computeBestSellers()` — histórico simulado e cálculo real de mais vendidos.
- `REVIEWS_DEMO` — avaliações de demonstração.
- `FAQ_DATA` / `HELP_PAGES` — conteúdo fácil de editar/estender.
- `submitOrder()` / `submitSpecialOrder()` — pontos de integração onde entraria a chamada a uma API real (`fetch('/api/orders', ...)`), assinalados com comentários `REQUER BACKEND`.
- `escapeHtml()` / `sanitizeText()` / `readJSON()` / `validateForm()` (topo de `app.js`, junto aos
  outros helpers) — utilitários de segurança partilhados por todas as páginas com formulários ou
  texto de utilizador. Ver secção 3.8.

## 5. Prioridades cumpridas nesta entrega

1. Identidade visual da Grão de Mostarda — logótipo real, paleta castanho/mostarda/laranja/bege, sem cores fora da marca.
2. Qualidade visual — tipografia, espaçamento, animações discretas, hover states, estados vazios/erro/sucesso.
3. Experiência do utilizador — navegação clara, mobile testado.
4. Loja e produtos — 9 categorias exatas, 19 produtos de demonstração coerentes com a categoria.
5. Carrinho e encomenda — funcional, com stock, formulário completo e confirmação.
6. WhatsApp — botão flutuante, drawer, rodapé, confirmação de encomenda — todos ligados ao número real.
7. Newsletter — validação real, arquitetura pronta para ligação a serviço de email.
8. Notificações — estrutura de dados pronta, envio real por implementar em backend.
9. Projetos — Grão de Mostarda (completo) e Ministério Bíblico (estrutura pronta, sem inventar conteúdo).
10. Avaliações — estrutura completa (filtros, média, "ver mais"), dados marcados como demonstração.
11. Administração — maquete de leitura, pronta para ligação a dados reais.
12. Escalabilidade — categorias, produtos, FAQ e páginas de ajuda organizados em dados, fáceis de expandir sem reescrever a estrutura.
