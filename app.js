/* =========================================================
   GRÃO DE MOSTARDA PERSONALIZADOS
   Protótipo de loja online (frontend estático)
   ---------------------------------------------------------
   IMPORTANTE — LEIA ISTO:
   Este ficheiro implementa TUDO o que é possível fazer sem
   um servidor: navegação, catálogo, carrinho, formulários,
   cálculo de "mais vendidos" a partir de encomendas, favoritos,
   avaliações (demo) e newsletter (demo, com validação real).

   As funcionalidades que OBRIGATORIAMENTE precisam de um
   backend (envio automático de email, base de dados de
   encomendas/newsletter, cron job dos 60 dias, autenticação
   de administrador) estão claramente assinaladas com o
   comentário "REQUER BACKEND" e documentadas em ARCHITECTURE.md.
   Onde possível, uso o link "mailto:" do navegador como
   substituto funcional (abre o cliente de email do utilizador
   já preenchido) até essa integração existir.
   ========================================================= */

/* ---------- Config oficial da loja ---------- */
const SHOP = {
  name: 'Grão de Mostarda Personalizados',
  whatsappUrl: 'https://wa.me/351925130518?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20os%20produtos.',
  whatsappUrlPayment: (orderId) => `https://wa.me/351925130518?text=${encodeURIComponent(`Olá! Acabei de finalizar a encomenda ${orderId} no site e gostaria de combinar o pagamento. 🙏`)}`,
  email: 'ateliergraodemostarda176@gmail.com',
  instagramUrl: 'https://www.instagram.com/ateliergraodemostarda?igsh=cHdpNmlrcmNja2Ix',
  instagramHandle: '@ateliergraodemostarda',
};

/* ---------- Helpers ---------- */
const $  = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const euro = n => n.toLocaleString('pt-PT',{style:'currency',currency:'EUR'});

/* ---------- Segurança: escaping, sanitização e leitura segura de localStorage ----------
   Qualquer valor que tenha origem em input do utilizador (pesquisa, formulários, parâmetros
   de rota) tem de passar por escapeHtml() antes de ser inserido num template que vai para
   innerHTML — nunca confiar que o navegador não vai executar HTML/JS escondido num nome,
   morada ou termo de pesquisa. */
function escapeHtml(str){
  return String(str==null?'':str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
/* Remove caracteres de controlo, apara espaços e limita o comprimento — aplicado a todo o
   texto vindo de formulários antes de guardar/usar (inclui o corpo dos emails mailto:). */
function sanitizeText(str, maxLen=500){
  return String(str==null?'':str).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,'').trim().slice(0,maxLen);
}
function isValidPhonePT(v){ return /^(\+351\s?)?9\d{8}$/.test(String(v||'').replace(/[\s-]/g,'')) || /^(\+351\s?)?[2-9]\d{8}$/.test(String(v||'').replace(/[\s-]/g,'')); }
function isValidPostalPT(v){ return /^\d{4}-\d{3}$/.test(String(v||'').trim()); }
/* Validação de formulários com mensagens específicas por campo (não genéricas) — usada em
   checkout, encomendas especiais e contacto. `rules` é { fieldName: { required, validate, msg } }. */
function setFieldError(form, name, msg){
  const input = form.querySelector(`[name="${name}"]`);
  const err = form.querySelector(`.field-error[data-for="${name}"]`);
  if(input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  if(err) err.textContent = msg || '';
  return !msg;
}
function validateForm(form, rules){
  const fd = new FormData(form);
  let firstInvalid = null, ok = true;
  const values = {};
  for(const name in rules){
    const raw = sanitizeText(fd.get(name), rules[name].maxLen || 500);
    values[name] = raw;
    let msg = '';
    if(rules[name].required && !raw) msg = rules[name].requiredMsg || 'Este campo é obrigatório.';
    else if(raw && rules[name].validate && !rules[name].validate(raw)) msg = rules[name].msg;
    if(!setFieldError(form, name, msg)){ ok = false; if(!firstInvalid) firstInvalid = form.querySelector(`[name="${name}"]`); }
  }
  if(firstInvalid) firstInvalid.focus();
  return { ok, values };
}
/* Leitura defensiva de localStorage: nunca confiar que o conteúdo está bem formado — pode ter
   sido editado manualmente nas DevTools. Devolve sempre o fallback em caso de erro ou forma
   inesperada (aqui: array). */
function readJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(raw==null) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(fallback) ? (Array.isArray(parsed) ? parsed : fallback) : parsed;
  }catch(e){ return fallback; }
}
const uid = (prefix) => `${prefix}-${Math.abs(hashStr(prefix+Object.keys(localStorage).length+document.title.length+performance.now())).toString(36).slice(0,4)}${(seqCounter++).toString(36)}`;
let seqCounter = 1000;
function hashStr(s){ s=String(s); let h=0; for(let i=0;i<s.length;i++){ h=(h<<5)-h+s.charCodeAt(i); h|=0; } return h; }

/* Deterministic "random" from a seed so demo data stays stable across reloads */
function seededRand(seed){ const x = Math.sin(seed*9301+49297)*233280; return x - Math.floor(x); }

/* ---------- Branded placeholder images (no external stock photos) ---------- */
const TONES = [
  ['#6B4123','#402615'], // brown
  ['#8a5a30','#6B4123'],
  ['#B4591C','#6B4123'],
  ['#6B4123','#2E1A0F'],
];
const CAT_ICON = {
  biblias:'i-book', 'reforma-biblia':'i-scroll', canecas:'i-mug', tshirts:'i-shirt',
  decoracao:'i-home', 'kit-pintura-infantil':'i-brush', 'porta-chaves':'i-key',
  'cadernos-a4':'i-scroll', 'cadernos-a5':'i-scroll'
};
const ICON_PATHS = {
  'i-book': 'M4 5c2-1 5-1 7 1 2-2 5-2 7-1v13c-2-1-5-1-7 1-2-2-5-2-7-1V5Z M11 6v13',
  'i-scroll': 'M6 4h11a2 2 0 0 1 2 2v13a1 1 0 0 1-1.5.9L15 18l-2.5 2-2.5-2-2.5 2-2.5-2V6a2 2 0 0 1 2-2Z M9 8h6 M9 12h6',
  'i-mug': 'M4 6h11v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V6Z M15 8h2a3 3 0 0 1 0 6h-2',
  'i-shirt': 'M8 4 4 7l2 3 2-1v11h8V9l2 1 2-3-4-3-2 2h-4L8 4Z',
  'i-home': 'M4 11 12 4l8 7 M6 10v9h12v-9',
  'i-brush': 'M7 17c-2 0-3-1-3-3 3 0 4-1 4-3l9-9 3 3-9 9c0 2-1 3-4 3Z',
  'i-key': 'M8 14a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M10.5 11.5 18 4l2 2-2 2 1.5 1.5L18 11l-1.5-1.5-2.5 2.5',
  'i-seed': 'M12 13c0-7 5-9 5-9s0 5-1.5 7C17 13 17 20 12 20s-5-7-3.5-9C7 9 7 4 7 4s5 2 5 9Z',
  'i-leaf': 'M4 20C4 12 9 5 20 4c1 11-6 16-14 16H4Z M4 20c3-3 6-6 8-10',
  'i-heart': 'M12 20.5s-8-5-8-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-8 11-8 11Z',
  'i-flower': 'M12 3c1.8 0 3 1.4 3 3.2S13.8 9 12 9s-3-1.4-3-2.8S10.2 3 12 3Zm0 12c1.8 0 3 1.4 3 3.2S13.8 21 12 21s-3-1.4-3-2.8S10.2 15 12 15ZM3 12c0-1.8 1.4-3 3.2-3S9 10.2 9 12s-1.4 3-2.8 3S3 13.8 3 12Zm12 0c0-1.8 1.4-3 3.2-3S21 10.2 21 12s-1.4 3-2.8 3-3.2-1.2-3.2-3Z',
};
function placeholderSVG(label, seed=0, iconKey='i-seed'){
  const t = TONES[Math.floor(seededRand(seed)*TONES.length)];
  const icon = ICON_PATHS[iconKey] || 'M12 5c-3 3-5 6-5 9a5 5 0 0 0 10 0c0-3-2-6-5-9Z';
  const rot = Math.floor(seededRand(seed+1)*360);
  const safe = label.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${t[0]}"/>
        <stop offset="100%" stop-color="${t[1]}"/>
      </linearGradient>
    </defs>
    <rect width="640" height="640" fill="url(#g)"/>
    <circle cx="${520+seededRand(seed+2)*40}" cy="90" r="180" fill="#E8B22B" opacity="0.14"/>
    <circle cx="60" cy="580" r="140" fill="#D9772E" opacity="0.14"/>
    <g transform="translate(320,250) rotate(${rot/12})">
      <g transform="translate(-30,-30) scale(2.6)" stroke="#F6D680" stroke-width="1.4" fill="none" opacity="0.9">
        <path d="${icon}"/>
      </g>
    </g>
    <text x="320" y="430" font-family="Georgia, serif" font-size="30" fill="#FBF2E4" text-anchor="middle" opacity="0.95">${safe}</text>
    <text x="320" y="466" font-family="monospace" font-size="14" letter-spacing="2" fill="#F6D680" text-anchor="middle" opacity="0.85">IMAGEM DE DEMONSTRAÇÃO</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
const PIMG = (name, seed, catSlug) => placeholderSVG(name, seed, CAT_ICON[catSlug] || 'i-book');

/* =========================================================
   DATA: CATEGORIES (exatamente as fornecidas pelo cliente)
   ========================================================= */
const CATEGORIES = [
  { slug:'biblias',              name:'Bíblias',                                   icon:'i-book'  },
  { slug:'reforma-biblia',       name:'Reforma de Bíblia',                         icon:'i-scroll'},
  { slug:'canecas',              name:'Canecas Personalizadas',                    icon:'i-mug'   },
  { slug:'tshirts',              name:'T-shirts Temas Cristão',                    icon:'i-shirt' },
  { slug:'decoracao',            name:'Decoração Cristã',                          icon:'i-home'  },
  { slug:'kit-pintura-infantil', name:'Kit Pintura Infantil',                      icon:'i-brush' },
  { slug:'porta-chaves',         name:'Porta-Chaves',                              icon:'i-key'   },
  { slug:'cadernos-a4',          name:'Cadernos Personalizados Devocional/Propósito A4', icon:'i-scroll' },
  { slug:'cadernos-a5',          name:'Cadernos Personalizados A5',                icon:'i-scroll'},
];
const catName = slug => (CATEGORIES.find(c=>c.slug===slug)||{}).name || slug;

/* =========================================================
   DATA: PRODUCTS (demonstração — substituir por catálogo real)
   ========================================================= */
const PRODUCTS = [
  { id:1, slug:'biblia-sagrada-capa-personalizada', name:'Bíblia Sagrada com Capa Personalizada', category:'biblias',
    price:39.9, stock:6, featured:true, bestSeller:true, personalizable:true, tags:['Mais pedido'],
    shortDesc:'Bíblia com capa gravada com nome e versículo à escolha.',
    longDesc:'Uma Bíblia Sagrada com capa personalizada — o nome e um versículo à escolha são gravados com cuidado na capa. Uma peça pensada para acompanhar o leitor todos os dias, e para ser guardada como recordação em batizados, crismas ou aniversários.',
    materials:'Capa em napa sintética ou couro ecológico, gravação a relevo/térmica conforme opção.',
    dimensions:'Disponível em tamanho padrão e bolso — a confirmar na encomenda.' },
  { id:2, slug:'biblia-jovem-ilustrada', name:'Bíblia de Estudo com Marcador Personalizado', category:'biblias',
    price:34.5, stock:4, personalizable:true, tags:[],
    shortDesc:'Bíblia de estudo entregue com marcador personalizado a condizer.',
    longDesc:'Bíblia de estudo acompanhada por um marcador de livro personalizado com o nome do dono. Ideal para quem está a começar (ou a aprofundar) o hábito de leitura diária.',
    materials:'Capa reforçada, papel bíblia fino, marcador em cartão emplastificado.',
    dimensions:'Tamanho padrão A5.' },

  { id:3, slug:'reforma-biblia-capa-couro', name:'Reforma de Bíblia — Capa em Couro Ecológico', category:'reforma-biblia',
    price:28.0, stock:5, featured:true, personalizable:true, tags:['Serviço'],
    shortDesc:'Damos nova vida à sua Bíblia com uma capa nova, resistente e personalizada.',
    longDesc:'Serviço de reforma: a sua Bíblia atual — muitas vezes cheia de anotações e memórias — recebe uma capa nova em couro ecológico, com o nome ou uma frase gravada. Ideal para Bíblias antigas ou de família que já não têm capa em bom estado.',
    materials:'Couro ecológico à escolha de cor, costura reforçada.',
    dimensions:'Serviço adaptado ao tamanho da Bíblia enviada pelo cliente.' },
  { id:4, slug:'reforma-biblia-restauro-completo', name:'Reforma de Bíblia — Restauro Completo', category:'reforma-biblia',
    price:42.0, stock:3, personalizable:true, tags:['Serviço'],
    shortDesc:'Restauro de lombada, folhas soltas e capa, com acabamento personalizado.',
    longDesc:'Para Bíblias mais desgastadas: reforço da lombada, colagem de folhas soltas e capa nova personalizada. Um serviço pensado para quem quer continuar a usar a mesma Bíblia de sempre, agora com mais alguns anos de vida.',
    materials:'Materiais de encadernação profissional, capa personalizável.',
    dimensions:'Avaliado caso a caso, mediante o estado da Bíblia.' },

  { id:5, slug:'caneca-graos-de-fe', name:'Caneca "Grãos de Fé"', category:'canecas',
    price:13.9, stock:12, featured:true, bestSeller:true, personalizable:true, tags:['Mais vendido'],
    shortDesc:'Caneca em cerâmica com "Se tiverdes fé do tamanho de um grão de mostarda" (Lc 17:6).',
    longDesc:'Caneca em cerâmica branca, com o versículo de Lucas 17:6 — a inspiração do nome da nossa marca — gravado com uma ilustração delicada de um pequeno grão. Pode ser personalizada com um nome ou data.',
    materials:'Cerâmica vitrificada, grau alimentar.',
    dimensions:'Capacidade 330ml.' },
  { id:6, slug:'caneca-casa-abencoada', name:'Caneca "Casa Abençoada"', category:'canecas',
    price:14.5, stock:0, personalizable:true, tags:[],
    shortDesc:'Caneca com frase "Casa Abençoada" e espaço para o nome da família.',
    longDesc:'Uma caneca pensada para presentear uma nova casa ou uma família — com a frase "Casa Abençoada" e espaço para incluir o(s) nome(s) escolhidos.',
    materials:'Cerâmica vitrificada, resistente a micro-ondas e máquina de lavar loiça.',
    dimensions:'Capacidade 330ml.' },
  { id:7, slug:'caneca-casal-devocional', name:'Caneca Dupla "Fé em Casal"', category:'canecas',
    price:24.9, stock:7, personalizable:true, tags:['Edição especial'],
    shortDesc:'Conjunto de duas canecas complementares, com nomes e data à escolha.',
    longDesc:'Pensado para casais — cada caneca traz metade de um versículo, que só fica completo quando as duas ficam lado a lado na prateleira.',
    materials:'Cerâmica vitrificada · caixa de apresentação incluída.',
    dimensions:'2 x 300ml.' },

  { id:8, slug:'tshirt-fe-inabalavel', name:'T-shirt "Fé Inabalável"', category:'tshirts',
    price:19.9, stock:10, featured:true, bestSeller:true, personalizable:true, sizes:['XS','S','M','L','XL','XXL'], tags:['Mais vendido'],
    shortDesc:'T-shirt em algodão com tipografia minimalista sobre um tema cristão.',
    longDesc:'T-shirt de corte unissexo em algodão, com estampagem duradoura. O texto "Fé Inabalável" aparece em letras finas no peito — para usar todos os dias, sem exageros.',
    materials:'100% algodão penteado, 180g/m².',
    dimensions:'Tamanhos disponíveis: XS a XXL.' },
  { id:9, slug:'tshirt-grao-de-mostarda', name:'T-shirt "Grão de Mostarda"', category:'tshirts',
    price:19.9, stock:9, personalizable:true, sizes:['S','M','L','XL'], tags:['Novo'],
    shortDesc:'T-shirt com a ilustração do grão de mostarda e a referência Lc 17.6 · Mt 17.20.',
    longDesc:'A peça que carrega o símbolo da nossa marca — o grão de mostarda — com a dupla referência bíblica Lucas 17:6 e Mateus 17:20 impressa discretamente na manga.',
    materials:'100% algodão, estampagem serigráfica.',
    dimensions:'Tamanhos disponíveis: S a XL.' },

  { id:10, slug:'placa-casa-abencoada-mdf', name:'Placa "Casa Abençoada" em MDF', category:'decoracao',
    price:21.5, stock:8, featured:true, personalizable:true, tags:[],
    shortDesc:'Placa decorativa em MDF pintada à mão, com nomes personalizáveis.',
    longDesc:'Uma peça pensada para a sala ou corredor, com espaço para incluir os nomes de cada membro da família por baixo da frase principal. Pintura feita à mão, por isso cada peça é única.',
    materials:'MDF pintado à mão, verniz protetor.',
    dimensions:'40cm x 25cm.' },
  { id:11, slug:'quadro-grao-de-mostarda', name:'Quadro "Grão de Mostarda" em Madeira', category:'decoracao',
    price:26.9, stock:5, personalizable:false, tags:['Mais pedido'],
    shortDesc:'Quadro em madeira gravado a laser com o versículo Lucas 17:6.',
    longDesc:'Gravado a laser em madeira maciça, este quadro traz o versículo que dá origem ao nome da nossa marca, numa composição simples e elegante para pendurar na entrada de casa.',
    materials:'Madeira maciça, verniz mate, sistema de suspensão incluído.',
    dimensions:'30cm x 20cm.' },

  { id:12, slug:'kit-pintura-arca-de-noe', name:'Kit Pintura Infantil "Arca de Noé"', category:'kit-pintura-infantil',
    price:12.9, stock:14, featured:true, bestSeller:true, personalizable:false, tags:['Mais vendido'],
    shortDesc:'Kit com peça em gesso/MDF, tintas e pincel para pintar em casa.',
    longDesc:'Um kit pensado para os mais novos: uma peça temática da Arca de Noé pronta a pintar, acompanhada de tintas e pincel. Ótimo para tardes em família ou atividades de catequese.',
    materials:'Peça em gesso cerâmico, tintas acrílicas atóxicas, pincel incluído.',
    dimensions:'Peça com cerca de 12cm.' },
  { id:13, slug:'kit-pintura-anjo-guardiao', name:'Kit Pintura Infantil "Anjo da Guarda"', category:'kit-pintura-infantil',
    price:12.9, stock:11, personalizable:false, tags:[],
    shortDesc:'Kit com figura de anjo pronta a pintar, tintas e pincel.',
    longDesc:'Uma figura de anjo da guarda em gesso, pronta a pintar, acompanhada de um pequeno cartão com uma oração simples para crianças.',
    materials:'Gesso cerâmico, tintas atóxicas, pincel incluído.',
    dimensions:'Peça com cerca de 10cm.' },

  { id:14, slug:'porta-chaves-fe-esperanca-amor', name:'Porta-Chaves "Fé, Esperança e Amor"', category:'porta-chaves',
    price:7.9, stock:20, featured:true, personalizable:true, tags:[],
    shortDesc:'Porta-chaves em madeira ou acrílico com frase e nome personalizável.',
    longDesc:'Um presente pequeno mas cheio de significado — porta-chaves com a frase "Fé, Esperança e Amor" (1 Coríntios 13:13) e espaço para um nome.',
    materials:'Madeira ou acrílico à escolha, argola resistente.',
    dimensions:'Aprox. 5cm x 4cm.' },
  { id:15, slug:'porta-chaves-grao-mostarda', name:'Porta-Chaves "Grão de Mostarda"', category:'porta-chaves',
    price:7.9, stock:18, personalizable:true, tags:['Novo'],
    shortDesc:'Porta-chaves com o símbolo do grão de mostarda gravado.',
    longDesc:'Uma pequena lembrança diária de que a fé, mesmo pequena como um grão de mostarda, pode mover montanhas.',
    materials:'Acrílico ou madeira, argola resistente.',
    dimensions:'Aprox. 5cm x 4cm.' },

  { id:16, slug:'caderno-devocional-a4', name:'Caderno Devocional Personalizado A4', category:'cadernos-a4',
    price:16.9, stock:9, featured:true, bestSeller:true, personalizable:true, tags:['Mais vendido'],
    shortDesc:'Caderno A4 com capa personalizada, para devocional e apontamentos de estudo.',
    longDesc:'Caderno A4 com capa personalizada com nome e frase/versículo à escolha, e miolo preparado para registo devocional diário — espaço para versículo, reflexão e oração.',
    materials:'Capa em tecido ou cartão rígido, miolo em papel 90g, elástico de fecho.',
    dimensions:'A4 · 120 páginas.' },
  { id:17, slug:'caderno-proposito-a4', name:'Caderno "Propósito" A4', category:'cadernos-a4',
    price:16.9, stock:6, personalizable:true, tags:[],
    shortDesc:'Caderno A4 personalizado para metas, orações e propósitos do ano.',
    longDesc:'Pensado para planear metas pessoais e espirituais ao longo do ano, com secções para orações, propósitos e gratidão.',
    materials:'Capa personalizável, miolo em papel reciclado 90g.',
    dimensions:'A4 · 120 páginas.' },

  { id:18, slug:'caderno-personalizado-a5', name:'Caderno Personalizado A5', category:'cadernos-a5',
    price:13.9, stock:13, featured:true, personalizable:true, tags:[],
    shortDesc:'Caderno A5 de capa personalizada, ideal para o dia a dia.',
    longDesc:'Um caderno A5 versátil, com capa personalizada com nome, frase ou versículo à escolha — para apontamentos, listas ou diário de gratidão.',
    materials:'Capa em tecido com espuma, miolo em papel 100g, elástico de fecho.',
    dimensions:'A5 · 160 páginas.' },
  { id:19, slug:'agenda-a5-caminho-de-fe', name:'Agenda A5 "Caminho de Fé" 26/27', category:'cadernos-a5',
    price:17.5, stock:4, personalizable:true, tags:['Edição especial'],
    shortDesc:'Agenda semanal A5 com um versículo diferente em cada mês.',
    longDesc:'Agenda de setembro a agosto, vista semanal, com uma pequena reflexão e versículo no início de cada mês.',
    materials:'Capa rígida personalizável, papel reciclado 90g.',
    dimensions:'A5 · Setembro 2026 a Agosto 2027.' },
];
// atribui imagens de demonstração coerentes com nome/categoria de cada produto
PRODUCTS.forEach((p,i)=>{
  p.demo = true;
  p.images = [ PIMG(p.name, p.id, p.category), PIMG(p.name+' — vista 2', p.id+50, p.category), PIMG(p.name+' — detalhe', p.id+90, p.category) ];
});
/* Impede alteração de preços/stock em runtime (ex.: a partir da consola do navegador).
   Isto NÃO substitui um backend — ver ARCHITECTURE.md — mas fecha o vetor mais óbvio de
   um utilizador reatribuir PRODUCTS[i].price antes de finalizar uma encomenda. */
PRODUCTS.forEach(p=>{ Object.freeze(p.images); Object.freeze(p); });
Object.freeze(PRODUCTS);

const relatedProducts = (product, n=4) =>
  PRODUCTS.filter(p=>p.category===product.category && p.id!==product.id).slice(0,n);

/* =========================================================
   DATA: HISTÓRICO DE ENCOMENDAS (demonstração)
   ---------------------------------------------------------
   Em produção, "Mais Vendidos" seria calculado no backend a
   partir da tabela real de encomendas concluídas. Aqui simulamos
   um histórico de encomendas dos últimos ~95 dias para que o
   cálculo (função computeBestSellers) seja uma função REAL,
   e não um valor fixo escrito à mão.
   ========================================================= */
function buildDemoOrderHistory(){
  const orders = [];
  const today = new Date('2026-08-10T12:00:00'); // data de referência do protótipo
  // pesos de popularidade por produto (só usados para GERAR a demonstração)
  const weight = {1:5,2:2,3:3,4:1,5:9,6:2,7:4,8:8,9:5,10:3,11:6,12:10,13:4,14:6,15:3,16:9,17:3,18:5,19:2};
  let orderNum = 1;
  for(let d=0; d<95; d++){
    const day = new Date(today); day.setDate(today.getDate()-d);
    const ordersToday = Math.floor(seededRand(d*3.1)*3); // 0-2 encomendas por dia
    for(let o=0;o<ordersToday;o++){
      const items = [];
      const nItems = 1+Math.floor(seededRand(d*7+o)*2);
      for(let k=0;k<nItems;k++){
        const roll = seededRand(d*13+o*5+k)*Object.values(weight).reduce((a,b)=>a+b,0);
        let acc=0, chosen=PRODUCTS[0].id;
        for(const pid in weight){ acc+=weight[pid]; if(roll<=acc){ chosen=Number(pid); break; } }
        const qty = 1+Math.floor(seededRand(d*17+o*3+k)*2);
        items.push({ productId: chosen, qty });
      }
      orders.push({ id:`GM-${String(1000+orderNum).slice(-4)}`, date: day.toISOString().slice(0,10), status:'concluída', items });
      orderNum++;
    }
  }
  return orders;
}
const ORDERS_DEMO = buildDemoOrderHistory();

/**
 * Calcula os produtos mais vendidos a partir de um histórico real de
 * encomendas — ORDERS_DEMO (histórico simulado) MAIS quaisquer
 * encomendas reais criadas nesta sessão (guardadas em localStorage,
 * chave "gm_orders_demo"). Só contam encomendas com status
 * "concluída" — uma encomenda "pendente de pagamento" ainda NÃO é
 * uma venda. Em produção, esta função ficaria praticamente igual —
 * só passaria a ler as encomendas da base de dados em vez destas
 * duas fontes locais.
 */
/* Uma entrada de encomenda só é válida para efeitos de cálculo se tiver a forma esperada —
   protege "Mais vendidos"/admin contra localStorage editado manualmente nas DevTools. */
function isValidOrderShape(o){
  return o && typeof o==='object' && typeof o.id==='string' && Array.isArray(o.items) &&
    o.items.every(it=>it && Number.isFinite(it.qty) && it.qty>0 && Number.isFinite(it.productId));
}
function getAllOrders(){
  const local = readJSON('gm_orders_demo', []).filter(isValidOrderShape);
  return [...ORDERS_DEMO, ...local];
}
function computeBestSellers(periodDays, limit=8){
  const today = new Date('2026-08-10T12:00:00');
  const cutoff = periodDays ? new Date(today.getTime() - periodDays*86400000) : null;
  const totals = {};
  getAllOrders().forEach(order=>{
    if(order.status!=='concluída') return;
    if(cutoff && new Date(order.date) < cutoff) return;
    order.items.forEach(it=>{ totals[it.productId] = (totals[it.productId]||0) + it.qty; });
  });
  return Object.entries(totals)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,limit)
    .map(([pid,qty])=>({ product: PRODUCTS.find(p=>p.id===Number(pid)), unitsSold: qty }))
    .filter(x=>x.product);
}
let bestSellerPeriod = 30; // 30 | 90 | null(total)

/**
 * Calcula os produtos "Melhores Avaliados" com uma média ponderada
 * (fórmula do tipo IMDB/Bayesian average), para que um produto com
 * poucas avaliações de 5 estrelas não ultrapasse automaticamente um
 * produto com muitas avaliações de 4.8. Considera: média do produto,
 * número de avaliações, e usa a média global como "prior".
 *   score = (v / (v+m)) * R  +  (m / (v+m)) * C
 *   v = nº de avaliações do produto · R = média do produto
 *   m = nº mínimo de avaliações para ganhar confiança total (aqui 5)
 *   C = média global de todas as avaliações (prior/base de referência)
 */
function computeTopRatedProducts(limit=6, minReviewsShown=1){
  const all = REVIEWS_DEMO;
  if(!all.length) return [];
  const C = all.reduce((s,r)=>s+r.rating,0) / all.length;
  const m = 5; // quanto maior, mais avaliações são precisas para um produto "ganhar confiança"
  const byProduct = {};
  all.forEach(r=>{
    if(!r.productId) return;
    (byProduct[r.productId] = byProduct[r.productId] || []).push(r);
  });
  return Object.entries(byProduct)
    .map(([pid, reviews])=>{
      const v = reviews.length;
      const R = reviews.reduce((s,r)=>s+r.rating,0) / v;
      const verifiedCount = reviews.filter(r=>r.verified).length;
      const score = (v/(v+m))*R + (m/(v+m))*C;
      return { product: PRODUCTS.find(p=>p.id===Number(pid)), reviewCount:v, avgRating:R, verifiedCount, score };
    })
    .filter(x=>x.product && x.reviewCount>=minReviewsShown)
    .sort((a,b)=>b.score-a.score)
    .slice(0,limit);
}

/* =========================================================
   DATA: REFLEXÕES / INSPIRAÇÃO
   (tema central: a parábola do grão de mostarda — Lc 17:6, Mt 17:20 —
   e temas de fé ligados diretamente ao artesanato da marca)
   ========================================================= */
const REFLECTIONS = [
  { id:1, title:'A Parábola do Grão de Mostarda', verse:'Lucas 17:6 · Mateus 17:20', icon:'i-seed', featured:true,
    short:'A história que dá nome à nossa marca — uma fé pequena, mas capaz de mover montanhas.',
    long:'"Se tiverdes fé do tamanho de um grão de mostarda, direis a esta amoreira: desarraiga-te e planta-te no mar; e ela vos obedecerá." O grão de mostarda é uma das menores sementes — mas cresce até se tornar uma árvore onde as aves fazem ninho. É este o espírito com que trabalhamos cada peça: começar pequeno, com cuidado, e confiar no propósito por trás de cada detalhe.' },
  { id:2, title:'Noé e a Arca', verse:'Génesis 6:14', icon:'i-boat',
    short:'Uma promessa cumprida através de décadas de trabalho paciente, tábua a tábua.',
    long:'Perante um mundo em desordem, Noé recebe instruções precisas para construir uma arca — e obedece, mesmo sem ver ainda a razão. Uma história sobre paciência artesanal: anos de trabalho manual guiados pela fé de que valia a pena continuar, até ao dia em que a chuva finalmente chegou.' },
  { id:3, title:'Davi e Golias', verse:'1 Samuel 17:45', icon:'i-shield',
    short:'Um jovem pastor, uma funda simples, e a coragem de enfrentar um gigante.',
    long:'Enquanto todo o exército hesita, um jovem pastor chamado Davi avança apenas com uma funda e cinco pedras lisas do rio. Uma metáfora usada há séculos para enfrentar aquilo que parece maior do que nós — com fé, não com tamanho.' },
  { id:4, title:'Daniel na Cova dos Leões', verse:'Daniel 6:22', icon:'i-lion',
    short:'Uma noite inteira rodeado de leões, e uma fé que não vacilou.',
    long:'Por se recusar a deixar de orar, Daniel é lançado a uma cova de leões famintos. Ao amanhecer, é encontrado ileso — uma história sobre integridade mantida mesmo quando o preço parece ser demasiado alto.' },
  { id:5, title:'Moisés e o Mar Vermelho', verse:'Êxodo 14:21-22', icon:'i-scroll',
    short:'Um caminho aberto no meio da água, no momento em que parecia não haver saída.',
    long:'Encurralado entre o exército egípcio e o mar, o povo de Israel vê as águas abrirem-se para deixar passagem em terra seca. Talvez a imagem mais icónica de libertação em toda a narrativa bíblica — o momento em que o impossível se torna caminho.' },
  { id:6, title:'Jesus e os Discípulos', verse:'Mateus 4:19', icon:'i-fish',
    short:'Um convite feito a pescadores comuns, à beira de um lago.',
    long:'"Sigam-me, e eu farei de vocês pescadores de homens" — com esta frase simples, Jesus chama os primeiros discípulos, homens comuns que largam as redes para seguir algo maior. Um lembrete de que grandes histórias começam, quase sempre, com pessoas do dia a dia.' },
  { id:7, title:'O Bom Pastor', verse:'João 10:11', icon:'i-staff',
    short:'Aquele que conhece cada ovelha pelo nome, e cuida de cada uma com atenção.',
    long:'"Eu sou o bom Pastor; o bom Pastor dá a sua vida pelas ovelhas." Uma imagem de cuidado individual, atento a cada detalhe — muito próxima da forma como gostamos de tratar cada encomenda: uma de cada vez, com atenção ao que a torna única.' },
  { id:8, title:'O Filho Pródigo', verse:'Lucas 15:20', icon:'i-heart',
    short:'Um regresso a casa recebido de braços abertos, sem uma palavra de reproche.',
    long:'"Quando ainda estava longe, viu-o seu pai, e foi movido de íntima compaixão, e correu, e lançou-se-lhe ao pescoço, e o beijou." Uma das imagens mais fortes de amor incondicional em toda a Bíblia — e uma inspiração recorrente nas nossas peças para "casa" e família.' },
  { id:9, title:'A Viúva e as Duas Moedas', verse:'Marcos 12:41-44', icon:'i-coin',
    short:'Duas moedas pequenas, oferecidas por inteiro — e reconhecidas como a maior oferta de todas.',
    long:'Enquanto outros depositavam grandes somas no tesouro do templo, uma viúva pobre deixa cair apenas duas pequenas moedas — tudo o que tinha para viver. Jesus chama os discípulos e diz que ela deu mais do que todos, porque deu do seu sustento, não do seu excesso. Uma história sobre o valor real de uma oferta: não o tamanho, mas o coração inteiro por trás dela — o mesmo espírito com que pensamos em cada peça pequena que sai das nossas mãos.' },
];

/* =========================================================
   DATA: INSPIRAÇÃO → PRODUTO
   (ligação entre um tema/frase de inspiração e uma categoria real da loja)
   ========================================================= */
const INSPIRATION_LINKS = [
  { phrase:'Fé que acompanha o dia a dia', cat:'canecas', seed:71 },
  { phrase:'Palavras que permanecem', cat:'cadernos-a5', seed:72 },
  { phrase:'Vista aquilo em que acredita', cat:'tshirts', seed:73 },
  { phrase:'Detalhes que transformam espaços', cat:'decoracao', seed:74 },
];

/* =========================================================
   DATA: GALERIA DE INSPIRAÇÃO
   (imagens geradas localmente — ver ARCHITECTURE.md — nunca fotografia real
   apresentada como se fosse de outro produto)
   ========================================================= */
const INSPIRATION_GALLERY = [
  { label:'Fé em cada detalhe', icon:'i-seed', seed:81 },
  { label:'Palavra viva', icon:'i-book', seed:82 },
  { label:'Feito à mão, com tempo', icon:'i-brush', seed:83 },
  { label:'Luz sobre o que importa', icon:'i-flower', seed:84 },
  { label:'Levar a Bíblia consigo', icon:'i-scroll', seed:85 },
  { label:'Casa, família e fé', icon:'i-heart', seed:86 },
  { label:'Crescer devagar', icon:'i-leaf', seed:87 },
  { label:'Um propósito por peça', icon:'i-mug', seed:88 },
];

/* =========================================================
   DATA: MOSAICO LIFESTYLE (secção da home — ver pageHome)
   Liga um "momento" do dia a dia a uma categoria real da loja.
   ========================================================= */
const LIFESTYLE_MOMENTS = [
  { label:'Manhã com propósito', sub:'Cadernos devocionais', cat:'cadernos-a4', icon:'i-scroll', seed:201 },
  { label:'Um brinde ao que importa', sub:'Canecas personalizadas', cat:'canecas', icon:'i-mug', seed:202 },
  { label:'Fé na parede de casa', sub:'Decoração cristã', cat:'decoracao', icon:'i-home', seed:203 },
];

/* =========================================================
   DATA: AVALIAÇÕES (DEMONSTRAÇÃO — substituir por avaliações reais e moderadas)
   ========================================================= */
const REVIEWS_DEMO = [
  { id:1, productId:5, name:'Cliente exemplo — C.M.', rating:5, product:'Caneca "Grãos de Fé"', date:'2026-07-28', verified:true, demo:true,
    text:'Encomendei para o aniversário da minha mãe e a personalização ficou linda. Entrega dentro do prazo combinado.' },
  { id:2, productId:16, name:'Cliente exemplo — R.P.', rating:5, product:'Caderno Devocional Personalizado A4', date:'2026-07-15', verified:true, demo:true,
    text:'O caderno tornou-se o meu companheiro de todas as manhãs. Muito bem feito e com um significado especial.' },
  { id:3, productId:10, name:'Cliente exemplo — I.C.', rating:4, product:'Placa "Casa Abençoada" em MDF', date:'2026-06-30', verified:true, demo:true,
    text:'Muito bonita, só demorou um pouco mais do que esperava — mas o resultado valeu a pena.' },
  { id:4, productId:8, name:'Cliente exemplo — T.M.', rating:5, product:'T-shirt "Fé Inabalável"', date:'2026-06-12', verified:false, demo:true,
    text:'Tornou-se a minha t-shirt preferida para o dia a dia. Simples, confortável, com um significado que gosto de levar comigo.' },
  { id:5, productId:12, name:'Cliente exemplo — S.A.', rating:5, product:'Kit Pintura Infantil "Arca de Noé"', date:'2026-05-22', verified:true, demo:true,
    text:'Os meus filhos adoraram pintar juntos numa tarde de domingo. Vamos repetir com outros kits.' },
  { id:6, productId:3, name:'Cliente exemplo — J.F.', rating:4, product:'Reforma de Bíblia — Capa em Couro Ecológico', date:'2026-05-02', verified:true, demo:true,
    text:'A Bíblia da minha avó ganhou uma segunda vida. Trabalho com muito cuidado.' },
  { id:7, productId:5, name:'Cliente exemplo — P.N.', rating:5, product:'Caneca "Grãos de Fé"', date:'2026-07-02', verified:true, demo:true,
    text:'Já é a segunda vez que encomendo. Qualidade consistente e chega sempre bem embalada.' },
  { id:8, productId:5, name:'Cliente exemplo — A.V.', rating:4, product:'Caneca "Grãos de Fé"', date:'2026-06-18', verified:true, demo:true,
    text:'Muito bonita, só achei o texto um pouco pequeno. Ainda assim recomendo.' },
  { id:9, productId:15, name:'Cliente exemplo — D.O.', rating:5, product:'Porta-Chaves "Grão de Mostarda"', date:'2026-07-30', verified:false, demo:true,
    text:'Adorei o pormenor do grão gravado. Prenda simples mas muito querida.' },
];
// Nota sobre a lógica de "Melhores Avaliados": um produto como o Porta-Chaves acima
// (1 avaliação, 5.0) NÃO ultrapassa a Caneca "Grãos de Fé" (3 avaliações, média 4.67)
// na função computeTopRatedProducts() — ver a média ponderada mais abaixo neste ficheiro.

/* =========================================================
   DATA: FAQ (facilmente extensível)
   ========================================================= */
const FAQ_DATA = [
  { q:'Como faço uma encomenda?', a:'Basta escolher os produtos na Loja, adicionar ao carrinho e finalizar a compra preenchendo o formulário com os seus dados. Depois de enviado o pedido, entramos em contacto para combinar o pagamento.' },
  { q:'Posso personalizar um produto?', a:'Sim — a maioria dos nossos produtos pode ser personalizada com nome, data ou um versículo à escolha, diretamente no formulário da página do produto.' },
  { q:'Quanto tempo demora uma encomenda personalizada?', a:'O tempo de produção varia entre 3 a 7 dias úteis consoante o produto, mais o tempo de envio. Para datas especiais, contacte-nos com antecedência.' },
  { q:'Como funciona o envio?', a:'Enviamos para todo o território nacional. Os detalhes de portes e prazos são confirmados após o envio da encomenda, com base na morada indicada.' },
  { q:'Posso trocar um produto?', a:'Sim, aceitamos trocas em produtos não personalizados dentro de 14 dias. Produtos personalizados são avaliados caso a caso — contacte-nos.' },
  { q:'Posso pedir alteração de design?', a:'Sim! Use a página de Encomendas Especiais para nos contar exatamente o que imagina — cores, frases, dimensões e referências.' },
  { q:'Como acompanho a minha encomenda?', a:'Depois de finalizar a encomenda, receberá um número de identificação. O acompanhamento do estado é feito diretamente via WhatsApp.' },
  { q:'Os produtos de impressão podem ter cores diferentes?', a:'Sim, sempre que aplicável indicamos as opções de cor disponíveis na página do produto ou por mensagem.' },
  { q:'Como contacto a loja?', a:`Pode contactar-nos por WhatsApp, por email (${SHOP.email}) ou através do formulário de Contacto.` },
];

/* =========================================================
   STATE
   ========================================================= */
const state = {
  cart: [],
  favorites: new Set(),
  lastOrder: null,
};

/* =========================================================
   TOAST
   ========================================================= */
let toastTimer;
function showToast(msg){
  const t = $('#toast');
  $('#toastMsg').textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 3200);
}

/* =========================================================
   CART LOGIC
   ========================================================= */
function stockOf(id){ const p = PRODUCTS.find(p=>p.id===id); return p ? p.stock : 0; }
function addToCart(id, qty=1){
  const p = PRODUCTS.find(p=>p.id===id);
  if(!p) return;
  qty = Number.isFinite(qty) ? Math.floor(qty) : 1;
  if(qty<1) qty = 1;
  if(p.stock<=0){ showToast('Este produto está esgotado no momento.'); return; }
  const existing = state.cart.find(c=>c.id===id);
  const currentQty = existing ? existing.qty : 0;
  const allowedQty = Math.min(qty, Math.max(0, p.stock-currentQty));
  if(allowedQty<=0){ showToast(`Só há ${p.stock} unidade(s) em stock — já tem o máximo no carrinho.`); return; }
  if(existing){ existing.qty += allowedQty; } else { state.cart.push({id, qty:allowedQty}); }
  renderCart();
  updateBadges();
  showToast(`${p.name} adicionado ao carrinho`);
  openCart();
}
function removeFromCart(id){
  state.cart = state.cart.filter(c=>c.id!==id);
  renderCart(); updateBadges();
}
function setQty(id, qty){
  const item = state.cart.find(c=>c.id===id);
  if(!item) return;
  qty = Number.isFinite(qty) ? Math.floor(qty) : item.qty;
  const max = Math.max(1, stockOf(id));
  item.qty = Math.max(1, Math.min(qty, max));
  renderCart(); updateBadges();
}
function cartTotal(){
  return state.cart.reduce((sum,c)=>{
    const p = PRODUCTS.find(p=>p.id===c.id);
    return sum + (p ? p.price*c.qty : 0);
  },0);
}
function cartCount(){ return state.cart.reduce((n,c)=>n+c.qty,0); }

function renderCart(){
  const wrap = $('#cartItems');
  const foot = $('#cartFoot');
  if(!wrap) return;
  if(state.cart.length===0){
    wrap.innerHTML = `<div class="cart-empty">
      <svg style="width:34px;height:34px;color:var(--line);margin-bottom:14px"><use href="#i-bag"/></svg>
      <p>O seu carrinho está vazio.</p>
    </div>`;
    foot.innerHTML = `<a href="#/loja" data-route="/loja" class="btn btn-primary btn-block" onclick="closeCart()">Ver a loja</a>`;
    return;
  }
  wrap.innerHTML = state.cart.map(c=>{
    const p = PRODUCTS.find(p=>p.id===c.id);
    const atMax = c.qty>=p.stock;
    return `<div class="cart-item">
      <img src="${p.images[0]}" alt="${p.name}" loading="lazy">
      <div class="cart-item-info">
        <div class="cart-item-top">
          <h4>${p.name}</h4>
          <button class="cart-item-remove" onclick="removeFromCart(${p.id})" aria-label="Remover ${p.name} do carrinho" title="Remover"><svg><use href="#i-x"/></svg></button>
        </div>
        <div class="cart-item-price">${euro(p.price)} <span class="cart-item-unit">/ un.</span></div>
        <div class="cart-item-bottom">
          <div class="qty-stepper">
            <button onclick="setQty(${p.id}, ${c.qty-1})" aria-label="Diminuir quantidade">–</button>
            <span>${c.qty}</span>
            <button onclick="setQty(${p.id}, ${c.qty+1})" aria-label="Aumentar quantidade" ${atMax?'disabled':''}>+</button>
          </div>
          <div class="cart-item-linetotal">${euro(p.price*c.qty)}</div>
        </div>
        ${atMax?`<div class="stock-warn">Máximo em stock (${p.stock})</div>`:''}
      </div>
    </div>`;
  }).join('');
  foot.innerHTML = `
    <div class="cart-summary"><span style="font-family:var(--sans);font-size:14px;color:var(--ink-soft)">Subtotal</span><span>${euro(cartTotal())}</span></div>
    <button class="btn btn-primary btn-block" onclick="goCheckout()">Finalizar encomenda</button>
    <p style="font-size:11.5px;color:var(--ink-soft);text-align:center;margin-top:10px">Pagamento combinado por WhatsApp após a encomenda</p>
  `;
}
function goCheckout(){
  closeCart();
  location.hash = '#/checkout';
}
function updateBadges(){
  const cb = $('#cartBadge');
  const n = cartCount();
  cb.style.display = n>0 ? 'flex' : 'none';
  cb.textContent = n;
  const fb = $('#favBadge');
  fb.style.display = state.favorites.size>0 ? 'flex' : 'none';
  fb.textContent = state.favorites.size;
}
function toggleFavorite(id){
  const p = PRODUCTS.find(p=>p.id===id);
  const nowFav = !state.favorites.has(id);
  if(nowFav) state.favorites.add(id); else state.favorites.delete(id);
  updateBadges();
  $$(`.fav-btn[data-id="${id}"]`).forEach(btn=>btn.classList.toggle('is-fav', nowFav));
  if(p) showToast(nowFav ? `${p.name} adicionado aos favoritos` : `${p.name} removido dos favoritos`);
  if(shopState.favOnly && $('#shopGrid')) renderShopGrid();
}

/* =========================================================
   DRAWERS
   ========================================================= */
function openCart(){ $('#cartDrawer').classList.add('open'); $('#drawerOverlay').classList.add('open'); }
function closeCart(){ $('#cartDrawer').classList.remove('open'); syncOverlay(); }
function openMobileNav(){ $('#mobileDrawer').classList.add('open'); $('#drawerOverlay').classList.add('open'); }
function closeMobileNav(){ $('#mobileDrawer').classList.remove('open'); syncOverlay(); }
function syncOverlay(){
  const anyOpen = $('#cartDrawer').classList.contains('open') || $('#mobileDrawer').classList.contains('open');
  $('#drawerOverlay').classList.toggle('open', anyOpen);
}

/* =========================================================
   COMPONENTS
   ========================================================= */
function stockTag(p){
  if(p.stock<=0) return `<span class="stock-tag out">Esgotado</span>`;
  if(p.stock<=3) return `<span class="stock-tag">Últimas ${p.stock} un.</span>`;
  return '';
}
function productCard(p, i=0){
  const isFav = state.favorites.has(p.id);
  return `
  <div class="product-card reveal reveal-${(i%4)+1}">
    <div class="product-media">
      <div class="media-badges">
        ${p.tags && p.tags[0] ? `<span class="tag tag-orange">${p.tags[0]}</span>` : ''}
        ${stockTag(p)}
      </div>
      <div class="product-icon-actions">
        <button class="fav-btn ${isFav?'is-fav':''}" data-id="${p.id}" onclick="toggleFavorite(${p.id})" aria-label="Adicionar aos favoritos">
          <svg><use href="#i-heart"/></svg>
        </button>
        <button class="cart-icon-btn" onclick="addToCart(${p.id})" aria-label="${p.stock<=0?'Produto esgotado':'Adicionar ao carrinho'}" ${p.stock<=0?'disabled':''}>
          <svg><use href="#i-bag"/></svg>
        </button>
      </div>
      <img src="${p.images[0]}" alt="${p.name}" onclick="location.hash='#/produto/${p.slug}'" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded')">
    </div>
    <div class="product-body">
      <span class="cat-label">${catName(p.category)}${p.personalizable?' · Personalizável':''}</span>
      <h3><a href="#/produto/${p.slug}" data-route="/produto/${p.slug}">${p.name}</a></h3>
      <p class="desc">${p.shortDesc}</p>
      <div class="product-foot">
        <span class="price">${euro(p.price)}</span>
        <a href="#/produto/${p.slug}" data-route="/produto/${p.slug}" class="mini-link">Ver produto</a>
      </div>
    </div>
  </div>`;
}

function reflectionCard(s, i){
  return `
  <div class="bible-card reveal reveal-${(i%4)+1}">
    <div class="bc-media">
      <span class="bc-num">${String(i+1).padStart(2,'0')}</span>
      <svg><use href="#${s.icon}"/></svg>
    </div>
    <div class="bc-body">
      <h4>${s.title}</h4>
      <p>${s.short}</p>
      <span class="tag verse-tag">${s.verse}</span>
      <button class="bc-more" onclick="openStoryModal(${s.id})">Saber mais →</button>
    </div>
  </div>`;
}

/** Cartão da galeria "Momentos de inspiração": composição com motivo real (grãos/folhagem)
    em vez de um ícone de linha genérico — cor de fundo e combinação de motivos variam
    por índice para que nenhum cartão pareça copiado do vizinho. */
/** Motivo primário de cada cartão — roda por 4 formas-base diferentes (índice do cartão),
    para nenhum cartão parecer "vazio" nem repetir sempre o mesmo grão/folha. */
function inspGalleryPrimaryMotif(g, roll){
  if(roll===0) return decorSeedClusterSVG(g.seed, 5);
  if(roll===1) return decorBranchFullSVG(g.seed);
  if(roll===2) return decorLeafPairSVG(g.seed);
  return decorSeedTrailSVG(g.seed, 4);
}
function inspGalleryCard(g, i){
  const motifSize = 78 + Math.round(seededRand(g.seed+2)*40);
  const motifTop = 10 + Math.round(seededRand(g.seed)*16);
  const motifRight = 10 + Math.round(seededRand(g.seed+1)*16);
  const useSecondary = i%2===0;
  return `
  <a href="#/loja" data-route="/loja" class="insp-card reveal reveal-${(i%4)+1}" title="${escapeHtml(g.label)}">
    <div class="insp-motif" style="top:${motifTop}px;right:${motifRight}px;width:${motifSize}px;height:${motifSize}px">
      ${inspGalleryPrimaryMotif(g, i%4)}
    </div>
    ${useSecondary ? `<div class="insp-motif" style="bottom:40px;left:12px;width:${Math.round(motifSize*0.55)}px;height:${Math.round(motifSize*0.85)}px">${decorTwigMiniSVG(g.seed+3)}</div>` : ''}
    <span class="insp-cap">${escapeHtml(g.label)}</span>
  </a>`;
}
function starsHTML(rating){ return `<div class="stars">${'<svg><use href="#i-star"/></svg>'.repeat(Math.round(rating))}</div>`; }
function initials(name){ return name.replace('Cliente exemplo — ','').trim().split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }
function reviewCard(t, opts={}){
  return `
  <div class="testi-card ${opts.highlight?'is-top':''} reveal">
    <svg class="quote-icon"><use href="#i-quote"/></svg>
    ${opts.highlight?`<span class="testi-top-tag">★ Avaliação em destaque</span>`:''}
    ${starsHTML(t.rating)}
    <p>"${t.text}"</p>
    <div class="testi-who">
      <div class="testi-who-l">
        <span class="testi-avatar">${initials(t.name)}</span>
        <div><strong>${t.name}</strong><span>${t.product}</span></div>
      </div>
    </div>
    ${t.verified?`<div class="verified-badge" style="margin-top:10px"><svg><use href="#i-check"/></svg>Compra verificada</div>`:''}
  </div>`;
}

/* =========================================================
   REFLECTION MODAL
   ========================================================= */
function openStoryModal(id){
  const s = REFLECTIONS.find(s=>s.id===id);
  if(!s) return;
  $('#modalNum').textContent = `Reflexão ${String(s.id).padStart(2,'0')}`;
  $('#modalTitle').textContent = s.title;
  $('#modalText').textContent = s.long;
  $('#modalVerse').textContent = s.verse;
  $('#storyModal .modal-media').innerHTML = `<svg><use href="#${s.icon}"/></svg>`;
  $('#storyModal').classList.add('open');
}
function closeStoryModal(){ $('#storyModal').classList.remove('open'); }

/* =========================================================
   NEWSLETTER (demonstração funcional — ver ARCHITECTURE.md)
   ---------------------------------------------------------
   Faz validação real de email, impede duplicados e guarda o
   pedido localmente para fins de demonstração. Em produção,
   isto chamaria uma API de backend ligada a um serviço como
   Resend / Brevo / Mailchimp / SendGrid (nunca com chaves no
   frontend).
   ========================================================= */
function getNewsletterList(){ return readJSON('gm_newsletter_demo', []); }
function saveNewsletterList(list){ localStorage.setItem('gm_newsletter_demo', JSON.stringify(list)); }
function isValidEmail(email){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

/* Devolve { ok, code, msg } em vez de só true/false, para o formulário mostrar um estado
   visual específico (erro/sucesso) e não só um toast passageiro. */
function subscribeNewsletter(email, consent=true){
  email = sanitizeText(email, 100).toLowerCase();
  if(!isValidEmail(email)) return { ok:false, code:'invalid', msg:'Introduza um email válido (ex: nome@exemplo.com).' };
  if(!consent) return { ok:false, code:'consent', msg:'É necessário aceitar receber comunicações para subscrever.' };
  const list = getNewsletterList();
  if(list.find(s=>s.email===email)) return { ok:true, code:'duplicate', msg:'Este email já está subscrito — obrigado!' };
  list.push({ email, consent:true, subscribedAt: new Date().toISOString(), lastVisit: new Date().toISOString(), lastReengagementEmailSent:null, unsubscribed:false });
  saveNewsletterList(list);
  return { ok:true, code:'success', msg:'Subscrição confirmada. Bem-vindo(a) à Grão de Mostarda!' };
}
function handleNewsletter(e){
  e.preventDefault();
  const form = e.target;
  const input = form.querySelector('input[type=email]');
  const consentBox = form.querySelector('input[type=checkbox]');
  const result = subscribeNewsletter(input.value, consentBox ? consentBox.checked : true);
  const msgEl = form.parentElement.querySelector('.newsletter-msg') || form.querySelector('.newsletter-msg');
  form.classList.toggle('is-error', !result.ok);
  form.classList.toggle('is-success', result.ok);
  input.setAttribute('aria-invalid', result.ok ? 'false' : 'true');
  if(msgEl){ msgEl.textContent = result.msg; msgEl.classList.toggle('is-error', !result.ok); }
  showToast(result.msg);
  if(result.ok) form.reset();
}
function unsubscribeNewsletter(email){
  email = (email||'').trim().toLowerCase();
  const list = getNewsletterList();
  const entry = list.find(s=>s.email===email);
  if(!entry){ showToast('Não encontrámos esse email na nossa lista.'); return false; }
  entry.unsubscribed = true;
  saveNewsletterList(list);
  showToast('Subscrição cancelada. Não vai voltar a receber emails nossos.');
  return true;
}
function pageNewsletterCancelar(){
  return `
  <div class="page-header">
    <span class="eyebrow">Fica a par</span>
    <h1>Cancelar subscrição</h1>
    <p>Lamentamos vê-lo(a) partir. Indique o email que quer remover da nossa lista.</p>
  </div>
  <section class="section" style="padding-top:0">
    <div class="wrap" style="max-width:480px;margin:0 auto">
      <form class="form-panel" id="unsubscribeForm" style="text-align:left">
        <label>Email</label>
        <input type="email" name="email" required placeholder="O seu email" maxlength="100" autocomplete="email">
        <button type="submit" class="btn btn-brown btn-block" style="margin-top:22px">Cancelar subscrição</button>
      </form>
    </div>
  </section>
  `;
}
function wireUnsubscribePage(){
  const form = $('#unsubscribeForm');
  if(!form) return;
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const email = new FormData(form).get('email');
    if(unsubscribeNewsletter(email)) form.reset();
  });
}

/* =========================================================
   ENCOMENDAS — checkout & encomendas especiais
   ---------------------------------------------------------
   Sem backend disponível neste protótipo, geramos um número de
   encomenda, guardamos localmente (demonstração) e usamos um
   link "mailto:" para abrir o cliente de email do utilizador
   já preenchido para ateliergraodemostarda176@gmail.com — uma
   forma funcional (sem servidor) de o pedido chegar à loja
   enquanto a automação de email de backend não está ligada.
   ========================================================= */
function nextOrderId(){
  const n = 1000 + ORDERS_DEMO.length + readJSON('gm_orders_demo', []).length + 1;
  return `GM-${n}`;
}
function saveOrderDemo(order){
  const list = readJSON('gm_orders_demo', []);
  list.push(order);
  localStorage.setItem('gm_orders_demo', JSON.stringify(list));
}
function buildOrderEmailBody(order){
  const lines = order.items.map(it=>`- ${it.qty}x ${it.name} (${euro(it.price)} cada) = ${euro(it.qty*it.price)}${it.personalization?` — Personalização: "${it.personalization}"`:''}`);
  return [
    `Nova encomenda — ${SHOP.name}`,
    ``,
    `Número: ${order.id}`,
    `Data: ${order.date}`,
    ``,
    `Cliente: ${order.customer.name}`,
    `Telefone: ${order.customer.phone}`,
    `Email: ${order.customer.email}`,
    `Morada: ${order.customer.address}, ${order.customer.postal} ${order.customer.city}`,
    ``,
    `Produtos:`,
    ...lines,
    ``,
    `Total: ${euro(order.total)}`,
    ``,
    `Observações: ${order.customer.notes || '—'}`,
    ``,
    `(Pagamento a combinar via WhatsApp — valores a confirmar pela loja antes do envio)`
  ].join('\n');
}
function submitOrder(customer){
  const items = state.cart.map(c=>{
    const p = PRODUCTS.find(p=>p.id===c.id);
    return { productId:p.id, name:p.name, qty:c.qty, price:p.price, personalization: customer.personalizations?.[p.id] || '' };
  });
  const order = {
    id: nextOrderId(),
    date: new Date().toISOString().slice(0,10),
    status: 'pendente de pagamento',
    customer,
    items,
    total: cartTotal(),
  };
  saveOrderDemo(order);
  state.lastOrder = order;

  // REQUER BACKEND: em produção, este passo chamaria uma API que:
  // 1) grava a encomenda na base de dados, 2) envia o email automático
  // ao responsável da loja, 3) envia email de confirmação ao cliente.
  // Como alternativa funcional sem servidor, abrimos um rascunho de
  // email já preenchido para o email oficial da loja:
  const subject = encodeURIComponent(`Nova encomenda — ${order.id} — ${SHOP.name}`);
  const body = encodeURIComponent(buildOrderEmailBody(order));
  const mailtoUrl = `mailto:${SHOP.email}?subject=${subject}&body=${body}`;

  state.cart = [];
  renderCart(); updateBadges();
  return { order, mailtoUrl };
}

function submitSpecialOrder(data){
  const id = `ENC-${1000 + Math.floor(seededRand(hashStr(data.email+data.name))*8999)}`;
  const record = { id, date:new Date().toISOString().slice(0,10), ...data };
  const list = readJSON('gm_special_orders_demo', []);
  list.push(record);
  localStorage.setItem('gm_special_orders_demo', JSON.stringify(list));
  const subject = encodeURIComponent(`Encomenda especial — ${id} — ${SHOP.name}`);
  const body = encodeURIComponent(
    `Novo pedido de encomenda especial — ${SHOP.name}\n\n`+
    `Número: ${id}\nData: ${record.date}\n\n`+
    `Nome: ${data.name}\nEmail: ${data.email}\nTelefone: ${data.phone}\n\n`+
    `Tipo de produto: ${data.type}\nQuantidade: ${data.qty}\n`+
    `Frase/versículo: ${data.verse || '—'}\nCores: ${data.colors || '—'}\nDimensões: ${data.dimensions || '—'}\n`+
    `Data pretendida: ${data.deadline || '—'}\n\nDescrição: ${data.description}\n\nObservações: ${data.notes || '—'}`
  );
  const mailtoUrl = `mailto:${SHOP.email}?subject=${subject}&body=${body}`;
  return { id, mailtoUrl };
}

/* =========================================================
   PAGE: HOME
   ========================================================= */
function pageHome(){
  const featured = PRODUCTS.filter(p=>p.featured).slice(0,4);
  const editorialPick = PRODUCTS.find(p=>p.slug==='caneca-graos-de-fe') || featured[0];
  const featuredRest = featured.filter(p=>p.id!==editorialPick.id).slice(0,3);
  const bestSellers = computeBestSellers(30, 6);
  const reflectionPreview = REFLECTIONS.slice(0,4);
  const reviews = REVIEWS_DEMO.slice(0,4);
  const topReview = reviews.reduce((best,r)=> r.rating>best.rating ? r : best, reviews[0]);
  return `
  <section class="hero">
    <div class="hero-glow"></div><div class="hero-glow-2"></div>
    ${decor('leaf','dec-side-l dec-lg tone-cream',101)}
    ${decor('leaf','dec-side-r2 dec-md tone-cream secondary',102)}
    ${decor('seeds','dec-tr dec-sm tone-gold secondary',105)}
    ${decor('seeds','dec-bot-r dec-sm tone-cream secondary faint',107)}
    <!-- FOTOGRAFIA REAL: o próprio logótipo (com a placa de couro e o selo já desenhados)
         é o elemento visual do hero até existir fotografia do ateliê/produto — ver
         ARCHITECTURE.md §3.9 para onde investir primeiro. -->
    <div class="hero-content">
      <img class="hero-logo reveal" src="assets/logo.webp" alt="Grão de Mostarda Personalizados">
      <span class="eyebrow reveal reveal-1">Artesanato · Personalização · Fé</span>
      <h1 class="reveal reveal-1">Produtos feitos com<br><span class="script-line">amor, fé e propósito</span></h1>
      <p class="hero-verse-line reveal reveal-2">"Se tiverdes fé do tamanho de um grão de mostarda..."<span>Lucas 17:6 · Mateus 17:20</span></p>
      <div class="hero-actions reveal reveal-2">
        <a href="#/loja" data-route="/loja" class="btn btn-primary">Ver a Loja</a>
        <a href="#/encomendas-especiais" data-route="/encomendas-especiais" class="btn btn-ghost">Pedir Encomenda Especial</a>
      </div>
      <div class="hero-trust-row reveal reveal-3">
        <div class="hero-trust-item"><span class="mini-seal"><svg><use href="#i-leaf"/></svg></span><span>Feito à mão</span></div>
        <div class="hero-trust-item"><span class="mini-seal"><svg><use href="#i-truck"/></svg></span><span>Envio nacional</span></div>
        <div class="hero-trust-item"><span class="mini-seal"><svg><use href="#i-shield"/></svg></span><span>Pagamento seguro</span></div>
        <span class="tag tag-mustard">100% personalizável</span>
      </div>
    </div>
  </section>

  <div class="trust-strip">
    ${stitchDivider('trust-strip-seam')}
    <div class="decor dec-br dec-lg faint" aria-hidden="true">${decorWoodBowlSVG(131)}</div>
    <div class="wrap trust-strip-grid">
      <a href="#/sobre" data-route="/sobre" class="trust-item reveal reveal-1"><span class="mini-seal tone-brown"><svg><use href="#i-leaf"/></svg></span><div><strong>Feito à mão</strong><span>peça a peça, sem produção em série</span></div></a>
      <a href="#/loja" data-route="/loja" class="trust-item reveal reveal-2"><span class="mini-seal tone-brown"><svg><use href="#i-gift"/></svg></span><div><strong>Personalização incluída</strong><span>nome, data ou versículo à escolha</span></div></a>
      <a href="#/contacto" data-route="/contacto" class="trust-item reveal reveal-3 is-highlight"><span class="mini-seal tone-brown"><svg><use href="#i-wa"/></svg></span><div><strong>Pagamento combinado por WhatsApp</strong><span>MBWay ou transferência, confirmado por nós</span></div></a>
      <a href="#/sobre" data-route="/sobre" class="trust-item reveal reveal-4"><span class="mini-seal tone-brown"><svg><use href="#i-shield"/></svg></span><div><strong>Produção em pequena escala</strong><span>sem atalhos, atenção a cada encomenda</span></div></a>
    </div>
  </div>

  <!-- História movida para logo a seguir aos benefícios (era mais a meio da página) —
       é um dos conteúdos mais fortes para gerar confiança, não deve exigir tanto scroll. -->
  <section class="story-teaser">
    ${decor('twig','dec-tl dec-md tone-orange secondary',125)}
    <div class="decor dec-br dec-lg faint" aria-hidden="true">${decorWoodBowlSVG(126)}</div>
    <div class="wrap story-grid">
      <div class="story-pull reveal">
        <span class="script-line">"Um grão pequeno,<br>plantado com fé."</span>
        ${seedGrowSVG()}
      </div>
      <div class="story-text reveal reveal-2">
        <span class="eyebrow">A nossa história</span>
        <h2>Porque lhe chamamos<br>Grão de Mostarda</h2>
        <p class="story-verse">"Se tiverdes fé do tamanho de um grão de mostarda, direis a esta amoreira: desarraiga-te e planta-te no mar; e ela vos obedecerá."<span>Lucas 17:6 · Mateus 17:20</span></p>
        <p>É esta a parábola que dá nome ao nosso ateliê — a fé de que algo pequeno, trabalhado com cuidado e paciência, pode crescer para muito mais do que parecia possível. Cada peça que sai das nossas mãos carrega esse propósito: não produzir em série, mas plantar, um detalhe de cada vez.</p>
        <a href="#/sobre" data-route="/sobre" class="btn btn-outline">Conhecer a nossa história completa</a>
      </div>
    </div>
  </section>

  <!-- "Como funciona" — explica o processo de personalização antes de a pessoa chegar
       aos produtos, para tirar dúvidas cedo em vez de as deixar para o carrinho. -->
  <section class="section">
    ${decor('sprig','dec-tr dec-md tone-brown secondary faint',132)}
    <div class="wrap">
      <div class="section-head center reveal">
        <span class="eyebrow">Como funciona</span>
        <h2>Personalizar é simples</h2>
      </div>
      <div class="steps-row">
        <div class="step-item reveal reveal-1"><span class="step-num">1</span><h4>Escolha o produto</h4><p>Explore a loja e escolha a peça que quer oferecer ou guardar para si.</p></div>
        <div class="step-item reveal reveal-2"><span class="step-num">2</span><h4>Personalize</h4><p>Indique o nome, a data ou o versículo à sua escolha, diretamente na página do produto.</p></div>
        <div class="step-item reveal reveal-3"><span class="step-num">3</span><h4>Confirmamos consigo</h4><p>Veja um resumo claro antes de enviar — o pagamento é combinado depois, por WhatsApp.</p></div>
      </div>
    </div>
  </section>

  <section class="section">
    ${decor('twig','dec-tr dec-lg tone-gold secondary',11)}
    ${decor('seeds','dec-near-title dec-xs tone-orange secondary faint',110)}
    <div class="wrap">
      <div class="section-head reveal">
        <span class="eyebrow">Categorias</span>
        <h2>Para cada canto<br>da casa e do dia a dia</h2>
      </div>
      <div class="cat-grid">
        ${CATEGORIES.map((c,i)=>{
          const count = PRODUCTS.filter(p=>p.category===c.slug).length;
          const isHero = i===0;
          return `
          <a href="#/loja?cat=${c.slug}" data-route="/loja" class="cat-card ${isHero?'cat-hero':''} reveal reveal-${(i%4)+1}">
            <svg class="cc-icon"><use href="#${c.icon}"/></svg>
            ${isHero ? `<div class="seal-badge seal-sm tone-cream">${sealBadgeSVG('Destaque')}</div>` : ''}
            <div class="cc-body">
              <span class="cc-name">${c.name}</span>
              <span class="cc-count">${count} ${count===1?'peça':'peças'}</span>
            </div>
          </a>`;
        }).join('')}
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:0">
    ${decor('leaf','dec-tl dec-md tone-brown secondary',111)}
    ${decor('daisy','dec-br dec-sm tone-gold secondary',112)}
    <div class="wrap">
      <div class="section-head reveal">
        <span class="eyebrow">Em destaque</span>
        <h2>Peças que estão a apaixonar os nossos clientes</h2>
      </div>
      <div class="featured-split">
        <a href="#/produto/${editorialPick.slug}" data-route="/produto/${editorialPick.slug}" class="featured-editorial reveal">
          <div class="fe-media">
            <span class="tag tag-mustard fe-tag">Peça do mês</span>
            <img src="${editorialPick.images[0]}" alt="${editorialPick.name}" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded')">
          </div>
          <div class="fe-body">
            <span class="cat-label">${catName(editorialPick.category)}</span>
            <h3>${editorialPick.name}</h3>
            <p>${editorialPick.longDesc}</p>
            <div class="fe-foot">
              <span class="fe-price">${euro(editorialPick.price)}</span>
              <span class="btn btn-outline btn-sm">Ver produto</span>
            </div>
          </div>
        </a>
        <div class="mini-product-list reveal reveal-2">
          ${featuredRest.map(p=>`
          <a href="#/produto/${p.slug}" data-route="/produto/${p.slug}" class="mini-product-row">
            <img src="${p.images[0]}" alt="${p.name}">
            <div class="mpr-info"><span class="mpr-cat">${catName(p.category)}</span><h4>${p.name}</h4></div>
            <span class="mpr-price">${euro(p.price)}</span>
          </a>`).join('')}
          <a href="#/loja" data-route="/loja" class="btn btn-outline btn-block" style="margin-top:10px">Ver todos os produtos</a>
        </div>
      </div>
    </div>
  </section>

  <section class="promo-banner">
    ${decor('twig','dec-tr dec-lg tone-cream secondary',122)}
    ${decor('seeds','dec-bl dec-sm tone-cream secondary faint',123)}
    <div class="wrap promo-grid">
      <div class="promo-text reveal">
        <span class="eyebrow">Feito à sua medida</span>
        <h2>Cada peça pode contar<br>a sua própria história</h2>
        <p>Nomes, datas, versículos ou uma frase que só faz sentido para si — a maioria das nossas peças pode ser personalizada diretamente no formulário do produto, sem custo extra.</p>
        <ul class="seed-marker-list on-dark" style="margin-top:28px">
          <li><svg><use href="#i-seed"/></svg> Escolha o texto, o versículo ou a data</li>
          <li><svg><use href="#i-seed"/></svg> Resumo claro antes de finalizar a encomenda</li>
          <li><svg><use href="#i-seed"/></svg> Ideal para batizados, crismas e aniversários</li>
        </ul>
        <a href="#/loja" data-route="/loja" class="btn btn-primary">Explorar personalizados</a>
      </div>
      <!-- FOTOGRAFIA REAL: uma fotografia de uma peça já personalizada (ex.: caneca com
           nome gravado, capa de Bíblia com iniciais) substitui este panfleto oficial aqui
           com muito mais impacto — ver ARCHITECTURE.md §3.9. -->
      <div class="promo-visual reveal reveal-2">
        <div class="promo-photo"><img src="assets/flyer-produtos.jpg" alt="Panfleto oficial Grão de Mostarda Personalizados"></div>
        <div class="seal-badge seal-md tone-cream">${sealBadgeSVG('Personalizável')}</div>
      </div>
    </div>
  </section>

  <section class="section">
    ${decor('leaf','dec-tl dec-md tone-brown secondary',124)}
    <div class="wrap">
      <div class="section-head reveal">
        <span class="eyebrow">Lifestyle</span>
        <h2>Peças que fazem parte<br>do dia a dia</h2>
        <p>Momentos simples onde a fé, o cuidado e os pequenos gestos se encontram — não é só o produto, é onde ele entra na sua rotina.</p>
      </div>
      <div class="lifestyle-mosaic">
        ${LIFESTYLE_MOMENTS.map((m,i)=>`
        <a href="#/loja?cat=${m.cat}" data-route="/loja" class="lifestyle-tile reveal reveal-${i+1}">
          <div class="lt-motif" style="top:14px;right:14px;width:${i===0?96:60}px;height:${i===0?96:60}px">${decorSeedClusterSVG(m.seed, i===0?6:4)}</div>
          <div class="lt-motif" style="bottom:${i===0?110:70}px;left:12px;width:${i===0?70:44}px;height:${i===0?116:74}px">${decorBotanicalSVG(m.seed+3)}</div>
          <div class="lt-cap"><strong>${m.label}</strong><span>${m.sub}</span></div>
        </a>`).join('')}
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:0">
    ${decor('seeds','dec-near-title dec-xs tone-gold secondary faint',113)}
    <div class="wrap">
      <div class="section-head reveal" style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;max-width:none">
        <div>
          <span class="eyebrow">Mais vendidos</span>
          <h2>As escolhas preferidas de quem já encomendou</h2>
        </div>
        <span style="font-size:12px;color:var(--ink-soft)">Últimos 30 dias</span>
      </div>
      <div class="hscroll">
        ${bestSellers.map((b,i)=>productCard(b.product,i)).join('')}
      </div>
    </div>
  </section>

  <section class="philosophy">
    ${decor('leaf','dec-bl dec-lg tone-cream',12)}
    ${decor('blossom','dec-tr dec-md tone-cream secondary',115)}
    ${decor('seeds','dec-top-l dec-sm tone-cream secondary faint',116)}
    <div class="wrap">
      <blockquote class="reveal">"Não fazemos produtos em série. Fazemos peças que alguém vai guardar, oferecer ou usar todos os dias — e isso muda a forma como trabalhamos cada detalhe."</blockquote>
      <cite class="reveal">A filosofia por trás da Grão de Mostarda</cite>
      <div class="pillars">
        <div class="pillar reveal reveal-1"><svg><use href="#i-seed"/></svg><h4>Fé sem exagero</h4><p>Mensagens cristãs apresentadas com elegância, para quem procura e para quem simplesmente aprecia o artesanato.</p></div>
        <div class="pillar reveal reveal-2"><svg><use href="#i-scroll"/></svg><h4>Cuidado em cada etapa</h4><p>Do desenho à embalagem, cada peça passa por mãos que conhecem o processo do início ao fim.</p></div>
        <div class="pillar reveal reveal-3"><svg><use href="#i-shield"/></svg><h4>Autenticidade</h4><p>Produção em pequena escala, sem atalhos, para que cada encomenda receba a atenção que merece.</p></div>
      </div>
    </div>
  </section>

  <section class="section">
    ${decor('twig','dec-tl dec-lg tone-orange secondary',119)}
    ${decor('heart','dec-br dec-xs tone-gold secondary',120)}
    <div class="wrap">
      <div class="section-head reveal">
        <span class="eyebrow">Inspiração</span>
        <h2>As histórias por trás de cada peça</h2>
      </div>
      <div class="hscroll">
        ${reflectionPreview.map((s,i)=>reflectionCard(s,i)).join('')}
      </div>
      <div style="margin-top:32px" class="reveal"><a href="#/inspiracao" data-route="/inspiracao" class="btn btn-outline">Ver todas as reflexões</a></div>
    </div>
  </section>

  <section class="section" style="padding-top:0">
    ${decor('daisy','dec-bl dec-sm tone-rose secondary',13)}
    ${decor('line','dec-top-r dec-lg tone-gold secondary',117)}
    <div class="wrap">
      <div class="section-head center reveal">
        <span class="eyebrow">Testemunhos</span>
        <h2>O que dizem sobre as suas encomendas</h2>
      </div>
      <p class="testimonial-note reveal" style="text-align:center">Avaliações de demonstração — serão substituídas por avaliações reais e moderadas quando a loja entrar em produção.</p>
      <div class="testi-grid">
        ${reviews.map(t=>reviewCard(t, {highlight: t.id===topReview.id})).join('')}
      </div>
      <div style="text-align:center;margin-top:32px" class="reveal"><a href="#/avaliacoes" data-route="/avaliacoes" class="btn btn-outline">Ver mais avaliações</a></div>
    </div>
  </section>

  <section class="cta-band">
    <div class="wrap">
      <div>
        <h2>Uma peça pronta a tornar-se especial</h2>
        <p>Junte-se à nossa lista e receba primeiro as novas coleções e peças em edição limitada.</p>
      </div>
      <div class="newsletter-block">
        <form class="newsletter-form" onsubmit="handleNewsletter(event)" novalidate>
          <label for="newsletterHomeEmail" class="sr-only">O seu email</label>
          <input type="email" id="newsletterHomeEmail" placeholder="O seu email" required maxlength="100" autocomplete="email">
          <button type="submit" aria-label="Subscrever"><svg style="width:15px;height:15px"><use href="#i-arrow"/></svg><span>Subscrever</span></button>
        </form>
        <span class="newsletter-msg" aria-live="polite"></span>
        <div class="consent-row">
          <input type="checkbox" id="consentHome" checked>
          <label for="consentHome">Aceito receber novidades e promoções por email. Posso cancelar a qualquer momento.</label>
        </div>
      </div>
    </div>
  </section>
  `;
}

/* =========================================================
   PAGE: LOJA (catálogo)
   ========================================================= */
let shopState = { query:'', cat:'todos', favOnly:false };

function pageLoja(params){
  if(params.get('cat')) shopState.cat = params.get('cat');
  return `
  <div class="page-header">
    ${decor('twig','dec-tr dec-lg tone-gold secondary',21)}
    ${decor('leaf','dec-tl dec-md tone-brown secondary',22)}
    ${decor('seeds','dec-bl dec-sm tone-orange secondary faint',23)}
    <span class="eyebrow">Catálogo</span>
    <h1>A loja</h1>
    <p>Explore todas as peças por categoria, ou pesquise diretamente pelo que procura.</p>
  </div>
  <section class="section" style="padding-top:0">
    ${decor('daisy','dec-br dec-sm tone-gold secondary',24)}
    <div class="wrap">
      ${decorDivider(25,'reveal')}
      <div class="shop-toolbar">
        <div class="search-box">
          <svg><use href="#i-search"/></svg>
          <input type="text" id="shopSearch" placeholder="Pesquisar produtos…" value="${escapeHtml(shopState.query)}" maxlength="60">
        </div>
        <div class="filter-pills" id="filterPills">
          <button class="tag tag-btn ${shopState.cat==='todos'?'is-active':''}" data-cat="todos">Todos</button>
          ${CATEGORIES.map(c=>`<button class="tag tag-btn ${shopState.cat===c.slug?'is-active':''}" data-cat="${c.slug}">${c.name}</button>`).join('')}
          <button class="tag tag-btn ${shopState.favOnly?'is-active':''}" id="favOnlyBtn">♥ Favoritos</button>
        </div>
      </div>
      <p class="results-count" id="resultsCount"></p>
      <div class="product-grid" id="shopGrid"></div>
    </div>
  </section>
  `;
}

function renderShopGrid(){
  let list = PRODUCTS.filter(p=>{
    const matchesCat = shopState.cat==='todos' || p.category===shopState.cat;
    const matchesQuery = !shopState.query || p.name.toLowerCase().includes(shopState.query.toLowerCase()) || p.shortDesc.toLowerCase().includes(shopState.query.toLowerCase());
    const matchesFav = !shopState.favOnly || state.favorites.has(p.id);
    return matchesCat && matchesQuery && matchesFav;
  });
  $('#resultsCount').textContent = `${list.length} produto${list.length!==1?'s':''} encontrado${list.length!==1?'s':''}`;
  const grid = $('#shopGrid');
  if(list.length===0){
    grid.style.display='none';
    let empty = $('#shopEmpty');
    if(!empty){
      empty = document.createElement('div');
      empty.id='shopEmpty';
      empty.className='empty-state';
      grid.after(empty);
    }
    empty.innerHTML = shopState.favOnly
      ? `<svg><use href="#i-heart"/></svg><p>Ainda não tem favoritos${shopState.query||shopState.cat!=='todos'?' com estes filtros':''}.<br>Explore a loja e guarde as peças que mais gosta.</p><a href="#/loja" data-route="/loja" class="btn btn-outline btn-sm" id="shopEmptyClearFav" style="margin-top:16px">Ver todos os produtos</a>`
      : `<svg><use href="#i-search"/></svg><p>Não encontrámos produtos com esses filtros.<br>Experimente outra categoria ou termo de pesquisa.</p>`;
    const clearBtn = $('#shopEmptyClearFav');
    if(clearBtn) clearBtn.addEventListener('click', (e)=>{ e.preventDefault(); shopState.favOnly=false; shopState.query=''; shopState.cat='todos'; location.hash='#/loja'; });
  } else {
    const old = $('#shopEmpty'); if(old) old.remove();
    grid.style.display='grid';
    grid.innerHTML = list.map((p,i)=>productCard(p,i)).join('');
  }
  runReveal();
}

function wireShopPage(){
  const search = $('#shopSearch');
  search.addEventListener('input', e=>{ shopState.query = e.target.value; renderShopGrid(); });
  $$('#filterPills .tag-btn[data-cat]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      shopState.cat = btn.dataset.cat;
      $$('#filterPills .tag-btn[data-cat]').forEach(b=>b.classList.toggle('is-active', b===btn));
      renderShopGrid();
    });
  });
  $('#favOnlyBtn').addEventListener('click', ()=>{
    shopState.favOnly = !shopState.favOnly;
    $('#favOnlyBtn').classList.toggle('is-active', shopState.favOnly);
    renderShopGrid();
  });
  renderShopGrid();
}

/* =========================================================
   PAGE: PRODUTO (detalhe)
   ========================================================= */
function pageProduto(slug){
  const p = PRODUCTS.find(p=>p.slug===slug);
  if(!p){
    return `<div class="page-header"><h1>Produto não encontrado</h1><p>O produto que procura pode ter sido removido.</p><a href="#/loja" data-route="/loja" class="btn btn-primary" style="margin-top:20px">Voltar à loja</a></div>`;
  }
  const related = relatedProducts(p);
  return `
  <section class="section" style="padding-top:150px">
    ${decor('twig','dec-tr dec-sm tone-gold secondary faint',p.id+140)}
    <div class="wrap">
      <p class="breadcrumb"><a href="#/loja" data-route="/loja">Loja</a> / <a href="#/loja?cat=${p.category}" data-route="/loja">${catName(p.category)}</a> / ${p.name}</p>
      <div class="pd-grid">
        <div class="pd-gallery">
          <div class="pd-gallery-main"><img id="pdMainImg" src="${p.images[0]}" alt="${p.name}"></div>
          <div class="pd-thumbs">
            ${p.images.map((img,i)=>`<button class="${i===0?'active':''}" data-img="${img}"><img src="${img}" alt="Vista ${i+1}"></button>`).join('')}
          </div>
        </div>
        <div class="pd-info">
          <span class="cat-label">${catName(p.category)}</span>
          <h1>${p.name}</h1>
          <div class="pd-price-row">
            <span class="pd-price">${euro(p.price)}</span>
            ${p.tags && p.tags[0] ? `<span class="tag tag-orange">${p.tags[0]}</span>` : ''}
            ${stockTag(p)}
          </div>
          <p class="lede">${p.longDesc}</p>

          ${p.personalizable ? `
          <div class="pd-option">
            <label>Personalização (texto, nome ou versículo)</label>
            <input type="text" id="pdPersonalization" placeholder="Ex: 'Lucas 17:6' ou 'Família Almeida'" maxlength="60">
          </div>` : ''}

          ${p.sizes ? `
          <div class="pd-option">
            <label>Tamanho</label>
            <div class="chip-row" id="sizeChips">
              ${p.sizes.map((s,i)=>`<button class="chip ${i===0?'active':''}" data-size="${s}">${s}</button>`).join('')}
            </div>
          </div>` : ''}

          <div class="pd-actions">
            <div class="qty-stepper" id="pdQty">
              <button data-delta="-1">–</button><span>1</span><button data-delta="1">+</button>
            </div>
            <button class="btn btn-primary" style="flex:1" id="pdAddBtn" ${p.stock<=0?'disabled':''}>${p.stock<=0?'Produto esgotado':'Adicionar ao carrinho'}</button>
            <button class="fav-btn" data-id="${p.id}" onclick="toggleFavorite(${p.id})" aria-label="Adicionar aos favoritos">
              <svg><use href="#i-heart"/></svg>
            </button>
          </div>

          <div class="pd-badge-row">
            <span class="tag">Envio em 3-5 dias úteis</span>
            <span class="tag">Feito por encomenda</span>
            <span class="tag tag-brown">Pagamento por WhatsApp</span>
          </div>

          <div class="pd-accordion">
            <div class="acc-item open">
              <button class="acc-head">Descrição<svg><use href="#i-plus"/></svg></button>
              <div class="acc-panel"><div class="acc-panel-in">${p.longDesc}</div></div>
            </div>
            <div class="acc-item">
              <button class="acc-head">Materiais<svg><use href="#i-plus"/></svg></button>
              <div class="acc-panel"><div class="acc-panel-in">${p.materials}</div></div>
            </div>
            <div class="acc-item">
              <button class="acc-head">Dimensões<svg><use href="#i-plus"/></svg></button>
              <div class="acc-panel"><div class="acc-panel-in">${p.dimensions}</div></div>
            </div>
            <div class="acc-item">
              <button class="acc-head">Envio &amp; Cuidados<svg><use href="#i-plus"/></svg></button>
              <div class="acc-panel"><div class="acc-panel-in">Produzimos cada peça por encomenda, por isso o tempo de produção é de 3 a 7 dias úteis, mais o tempo de envio. Embalamos com papel de proteção e cuidado especial.</div></div>
            </div>
          </div>
        </div>
      </div>

      ${related.length ? `
      <div style="margin-top:100px">
        <div class="section-head">
          <span class="eyebrow">Também pode gostar</span>
          <h2>Produtos relacionados</h2>
        </div>
        <div class="product-grid">${related.map((rp,i)=>productCard(rp,i)).join('')}</div>
      </div>` : ''}
    </div>
  </section>
  `;
}

function wireProdutoPage(slug){
  const p = PRODUCTS.find(p=>p.slug===slug);
  if(!p) return;
  $$('.pd-thumbs button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $('#pdMainImg').src = btn.dataset.img;
      $$('.pd-thumbs button').forEach(b=>b.classList.toggle('active', b===btn));
    });
  });
  $$('#sizeChips .chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      $$('#sizeChips .chip').forEach(c=>c.classList.toggle('active', c===chip));
    });
  });
  const qtyBox = $('#pdQty');
  if(qtyBox){
    let qty = 1;
    qtyBox.addEventListener('click', e=>{
      const btn = e.target.closest('button'); if(!btn) return;
      qty = Math.max(1, Math.min(p.stock||1, qty + Number(btn.dataset.delta)));
      qtyBox.querySelector('span').textContent = qty;
    });
    const addBtn = $('#pdAddBtn');
    if(addBtn) addBtn.addEventListener('click', ()=> addToCart(p.id, qty));
  }
  $$('.acc-head').forEach(head=>{
    head.addEventListener('click', ()=>{
      const item = head.closest('.acc-item');
      const wasOpen = item.classList.contains('open');
      $$('.acc-item').forEach(i=>i.classList.remove('open'));
      if(!wasOpen) item.classList.add('open');
    });
  });
}

/* =========================================================
   PAGE: CHECKOUT
   ========================================================= */
function pageCheckout(){
  if(state.cart.length===0){
    return `<div class="page-header"><h1>O seu carrinho está vazio</h1><p>Adicione produtos à loja antes de finalizar uma encomenda.</p><a href="#/loja" data-route="/loja" class="btn btn-primary" style="margin-top:20px">Ver a loja</a></div>`;
  }
  return `
  <section class="section" style="padding-top:150px">
    ${decor('twig','dec-tr dec-sm tone-gold secondary faint',77)}
    <div class="wrap">
      <p class="breadcrumb"><a href="#/loja" data-route="/loja">Loja</a> / Finalizar encomenda</p>
      <div class="section-head">
        <span class="eyebrow">Passo final</span>
        <h2>Finalizar encomenda</h2>
        <p>Preencha os seus dados. Depois de enviar, entramos em contacto pelo WhatsApp para combinar o pagamento.</p>
      </div>
      <div class="contact-grid">
        <div class="form-panel reveal">
          <form id="checkoutForm" novalidate>
            <p class="form-group-title">Identificação</p>
            <label>Nome completo</label>
            <input type="text" name="name" required placeholder="O seu nome" maxlength="80" autocomplete="name">
            <span class="field-error" aria-live="polite" data-for="name"></span>

            <p class="form-group-title">Morada de entrega</p>
            <label>Morada completa</label>
            <input type="text" name="address" required placeholder="Rua, número, andar" maxlength="120" autocomplete="street-address">
            <span class="field-error" aria-live="polite" data-for="address"></span>
            <div class="form-row-2">
              <div>
                <label>Código postal</label>
                <input type="text" name="postal" required placeholder="0000-000" maxlength="8" autocomplete="postal-code">
                <span class="field-error" aria-live="polite" data-for="postal"></span>
              </div>
              <div>
                <label>Cidade</label>
                <input type="text" name="city" required placeholder="Cidade" maxlength="60" autocomplete="address-level2">
                <span class="field-error" aria-live="polite" data-for="city"></span>
              </div>
            </div>

            <p class="form-group-title">Contacto</p>
            <div class="form-row-2">
              <div>
                <label>Telemóvel</label>
                <input type="tel" name="phone" required placeholder="9XX XXX XXX" maxlength="20" autocomplete="tel">
                <span class="field-error" aria-live="polite" data-for="phone"></span>
              </div>
              <div>
                <label>Email</label>
                <input type="email" name="email" required placeholder="O seu email" maxlength="100" autocomplete="email">
                <span class="field-error" aria-live="polite" data-for="email"></span>
              </div>
            </div>
            <label>Observações</label>
            <textarea name="notes" rows="4" placeholder="Alguma indicação especial para a sua encomenda?" maxlength="400"></textarea>

            <div class="consent-row">
              <input type="checkbox" id="checkoutConsent" required>
              <label for="checkoutConsent">Confirmo que os dados acima estão corretos e aceito ser contactado(a) por WhatsApp/email para combinar o pagamento e envio.</label>
            </div>
            <div class="payment-note" style="margin-top:16px"><svg><use href="#i-shield"/></svg><p>O pagamento é sempre combinado manualmente por MBWay ou transferência depois de enviar este pedido — não é feito nenhum pagamento automático aqui, e os valores são confirmados pela loja antes do envio da encomenda.</p></div>
            <button type="submit" class="btn btn-primary btn-block" style="margin-top:24px">Enviar encomenda</button>
          </form>
        </div>
        <div class="reveal reveal-2">
          <div class="order-summary-box">
            <h4>Resumo da encomenda</h4>
            ${state.cart.map(c=>{
              const p = PRODUCTS.find(p=>p.id===c.id);
              return `<div class="osb-item"><span>${c.qty}x ${p.name}</span><span>${euro(p.price*c.qty)}</span></div>`;
            }).join('')}
            <div class="osb-total"><span>Total</span><span>${euro(cartTotal())}</span></div>
          </div>
        </div>
      </div>
    </div>
  </section>
  `;
}

const CHECKOUT_RULES = {
  name:    { required:true, maxLen:80,  requiredMsg:'Indique o seu nome completo.', validate:v=>v.trim().includes(' '), msg:'Escreva o nome completo (nome e apelido).' },
  address: { required:true, maxLen:120, requiredMsg:'Indique a morada de entrega.' },
  postal:  { required:true, maxLen:8,   requiredMsg:'Indique o código postal.', validate:isValidPostalPT, msg:'Use o formato 0000-000.' },
  city:    { required:true, maxLen:60,  requiredMsg:'Indique a cidade.' },
  phone:   { required:true, maxLen:20,  requiredMsg:'Indique um telemóvel de contacto.', validate:isValidPhonePT, msg:'Introduza um número de telefone português válido (ex: 912 345 678).' },
  email:   { required:true, maxLen:100, requiredMsg:'Indique o seu email.', validate:isValidEmail, msg:'Introduza um email válido (ex: nome@exemplo.com).' },
  notes:   { required:false, maxLen:400 },
};
function wireCheckoutPage(){
  const form = $('#checkoutForm');
  if(!form) return;
  // validação em tempo real ao sair de cada campo, para o erro aparecer antes de tentar submeter
  Object.keys(CHECKOUT_RULES).forEach(name=>{
    const input = form.querySelector(`[name="${name}"]`);
    if(input) input.addEventListener('blur', ()=>{
      const raw = sanitizeText(input.value, CHECKOUT_RULES[name].maxLen);
      const rule = CHECKOUT_RULES[name];
      let msg = '';
      if(rule.required && !raw) msg = rule.requiredMsg;
      else if(raw && rule.validate && !rule.validate(raw)) msg = rule.msg;
      setFieldError(form, name, msg);
    });
  });
  form.addEventListener('submit', e=>{
    e.preventDefault();
    if(!form.querySelector('#checkoutConsent').checked){
      showToast('É necessário aceitar os termos de contacto para enviar a encomenda.');
      return;
    }
    const { ok, values } = validateForm(form, CHECKOUT_RULES);
    if(!ok){ showToast('Reveja os campos assinalados antes de enviar.'); return; }
    const { order, mailtoUrl } = submitOrder(values);
    window.open(mailtoUrl, '_blank');
    location.hash = `#/confirmacao/${order.id}`;
  });
}

/* =========================================================
   PAGE: CONFIRMAÇÃO
   ========================================================= */
function pageConfirmacao(orderId){
  const order = state.lastOrder && state.lastOrder.id===orderId ? state.lastOrder : null;
  return `
  <section class="section" style="padding-top:160px">
    <div class="wrap">
      <div class="confirm-box reveal">
        <div class="ok-icon"><svg><use href="#i-check"/></svg></div>
        <h2>Encomenda recebida!</h2>
        <p>Obrigado${order?`, ${escapeHtml(order.customer.name.split(' ')[0])}`:''}! A sua encomenda foi registada. Abrimos um email para ${SHOP.email} com todos os detalhes — se não abriu automaticamente, contacte-nos diretamente.</p>
        <div class="confirm-id">Número da encomenda: ${orderId}</div>
        <p style="margin-top:20px">O pagamento é combinado diretamente pelo WhatsApp. Clique abaixo para nos enviar uma mensagem com o número da sua encomenda.</p>
        <a class="btn btn-whatsapp" href="${SHOP.whatsappUrlPayment(orderId)}" target="_blank" rel="noopener"><svg style="width:17px;height:17px"><use href="#i-wa"/></svg>Combinar pagamento no WhatsApp</a>
        <div style="margin-top:14px"><a href="#/loja" data-route="/loja" class="btn btn-outline">Voltar à loja</a></div>
      </div>
    </div>
  </section>
  `;
}

/* =========================================================
   PAGE: SOBRE
   ========================================================= */
/* Ilustração discreta de uma semente a germinar/crescer — reutilizada em duas secções da página Sobre Nós */
function seedGrowSVG(cls){
  return `<svg class="seed-grow ${cls||''}" viewBox="0 0 120 160" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="60" cy="146" rx="9" ry="6.5" fill="currentColor" stroke="none" opacity=".92"/>
    <path d="M60 146 C58 112,62 78,60 34"/>
    <path d="M60 96 C40 91,29 71,33 50 C51 55,61 71,60 96Z" opacity=".85"/>
    <path d="M60 58 C81 53,91 33,86 13 C67 18,57 34,60 58Z" opacity=".85"/>
  </svg>`;
}

/* =========================================================
   ELEMENTOS DECORATIVOS DISCRETOS — grãos de mostarda e folhagem
   ---------------------------------------------------------
   Ronda de correção: os motivos anteriores (linhas finas tipo rabisco,
   pontinhos soltos) foram substituídos por dois motivos com aparência
   realista, diretamente inspirados nos panfletos oficiais (tigela de
   grãos dourados com sombra/gradiente, folhagem verde com nervura e
   curvatura natural do caule) — nunca uma cor plana isolada.
   Sempre pointer-events:none, nunca sobre texto/produtos/botões.
   Cor intencionalmente fixa (não currentColor): grãos são sempre
   dourados, folhas são sempre verdes — como na vida real — por isso
   as classes tone-* deixam de tingir estes dois motivos (continuam a
   controlar só posição/opacidade via .decor).
   ========================================================= */
const MUSTARD_SEED_TONES = ['#E8B22B','#C4901A','#F6D680','#D9A62A','#B4821A'];
const LEAF_TONES = ['#7C8A52','#8F9C63','#6B7A45'];
let seedClusterSeq = 0;
/** Definição de gradiente radial partilhada por qualquer grão desenhado no site (brilho a
    45% + sombra escura na borda) — evita repetir o mesmo bloco de defs em cada motivo. */
function seedGradientDef(gid, tone){
  return `<radialGradient id="${gid}" cx="35%" cy="30%" r="75%"><stop offset="0%" stop-color="#FCEFC4"/><stop offset="48%" stop-color="${tone}"/><stop offset="100%" stop-color="#7A4C1E"/></radialGradient>`;
}
/** Grupo de grãos de mostarda: esferas com gradiente (brilho + sombra) e sombra de contacto,
    tamanho e tom variados, dispersão orgânica (nunca em grelha). count maior = "buquê" mais denso. */
function decorSeedClusterSVG(seed, count=5){
  let defs = '', seeds = '';
  const w = 40 + count*12, h = 40 + count*7;
  const uid = seedClusterSeq++;
  for(let i=0;i<count;i++){
    const cx = 8 + seededRand(seed+i*3.1)*(w-16);
    const cy = 8 + seededRand(seed+i*5.7)*(h-16);
    const r = 3.2 + seededRand(seed+i*7.3)*3.4;
    const tone = MUSTARD_SEED_TONES[i % MUSTARD_SEED_TONES.length];
    const gid = `seedg${uid}_${i}`;
    defs += seedGradientDef(gid, tone);
    seeds += `<ellipse cx="${cx.toFixed(1)}" cy="${(cy+r*0.85).toFixed(1)}" rx="${(r*0.85).toFixed(1)}" ry="${(r*0.32).toFixed(1)}" fill="#2E1A0F" opacity=".15"/>`;
    seeds += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="url(#${gid})"/>`;
  }
  return `<svg viewBox="0 0 ${w} ${h}" fill="none"><defs>${defs}</defs>${seeds}</svg>`;
}
/** Uma folha individual (silhueta alongada e pontiaguda) com nervura central + veios laterais. */
function leafShapeSVG(x, y, scale, rot, tone){
  return `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${scale.toFixed(2)})">
    <path d="M0,0 C-9,-7 -11,-22 0,-38 C11,-22 9,-7 0,0 Z" fill="${tone}" opacity=".88"/>
    <path d="M0,-2 C-1,-14 -1,-26 0,-35" stroke="#3F4A26" stroke-width="1" fill="none" opacity=".55" stroke-linecap="round"/>
    <path d="M0,-10 C-3,-12 -5,-14 -6.5,-17" stroke="#3F4A26" stroke-width=".8" fill="none" opacity=".4" stroke-linecap="round"/>
    <path d="M0,-20 C3,-22 5,-24 6.5,-27" stroke="#3F4A26" stroke-width=".8" fill="none" opacity=".4" stroke-linecap="round"/>
  </g>`;
}
/** Segunda espécie: folha larga e arredondada (silhueta bem diferente da alongada acima),
    para o olhar não ver sempre a mesma planta. */
function leafRoundShapeSVG(x, y, scale, rot, tone){
  return `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${scale.toFixed(2)})">
    <path d="M0,0 C-14,-4 -19,-15 -11,-25 C-3,-33 9,-31 13,-19 C17,-9 10,-2 0,0 Z" fill="${tone}" opacity=".86"/>
    <path d="M0,-1 C-5,-8 -8,-15 -4,-23" stroke="#3F4A26" stroke-width=".9" fill="none" opacity=".5" stroke-linecap="round"/>
    <path d="M-2,-8 C-5,-9 -7,-10 -8,-12" stroke="#3F4A26" stroke-width=".6" fill="none" opacity=".35" stroke-linecap="round"/>
  </g>`;
}
/** Pequena flor de mostardeira: 4 pétalas amarelas + centro escuro — a planta tem flores
    pequenas antes das vagens, reforça a ligação ao nome da marca. */
function mustardFlowerSVG(x, y, scale, rot){
  return `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${scale.toFixed(2)})">
    <ellipse cx="0" cy="-4" rx="2.6" ry="4" fill="#F6D680" opacity=".92"/>
    <ellipse cx="0" cy="4" rx="2.6" ry="4" fill="#F6D680" opacity=".92"/>
    <ellipse cx="-4" cy="0" rx="4" ry="2.6" fill="#E8B22B" opacity=".92"/>
    <ellipse cx="4" cy="0" rx="4" ry="2.6" fill="#E8B22B" opacity=".92"/>
    <circle cx="0" cy="0" r="1.5" fill="#7A4C1E"/>
  </g>`;
}
/** Ramo médio com curvatura natural (caule em "S") e 2-3 folhas reais anexadas. */
function decorBotanicalSVG(seed){
  const rot = -14 + seededRand(seed)*28;
  const leafCount = 2 + Math.floor(seededRand(seed+9)*2);
  const anchors = [ {x:20,y:80,rot:-20}, {x:34,y:48,rot:20}, {x:20,y:22,rot:-10} ];
  let leaves = '';
  for(let i=0;i<leafCount;i++){
    const a = anchors[i];
    const tone = LEAF_TONES[Math.floor(seededRand(seed+i*4.2)*LEAF_TONES.length)];
    const scale = 0.72 + seededRand(seed+i*6.1)*0.5;
    leaves += leafShapeSVG(a.x, a.y, scale, a.rot + (-8+seededRand(seed+i*2.3)*16), tone);
  }
  return `<svg viewBox="0 0 60 100" fill="none" style="transform:rotate(${rot.toFixed(1)}deg)">
    <path d="M14 96C20 74 16 52 28 32C38 16 34 8 26 2" stroke="#6B4123" stroke-width="1.8" stroke-linecap="round" fill="none" opacity=".7"/>
    ${leaves}
  </svg>`;
}
/** Ramo "cheio": mais folhas, curvatura mais pronunciada (dois vincos em S) — para cantos de
    secções grandes (hero, história), onde o ramo médio ficaria pequeno demais. */
function decorBranchFullSVG(seed){
  const rot = -12 + seededRand(seed)*24;
  const anchors = [ {x:18,y:118,rot:-24}, {x:38,y:92,rot:18}, {x:14,y:64,rot:-16}, {x:36,y:36,rot:22}, {x:18,y:12,rot:-10} ];
  let leaves = '';
  anchors.forEach((a,i)=>{
    const tone = LEAF_TONES[Math.floor(seededRand(seed+i*4.4)*LEAF_TONES.length)];
    const scale = 0.8 + seededRand(seed+i*6.6)*0.55;
    leaves += leafShapeSVG(a.x, a.y, scale, a.rot + (-8+seededRand(seed+i*2.9)*16), tone);
  });
  return `<svg viewBox="0 0 80 140" fill="none" style="transform:rotate(${rot.toFixed(1)}deg)">
    <path d="M20 134C8 112 28 96 14 72C2 48 26 34 16 10" stroke="#6B4123" stroke-width="2" stroke-linecap="round" fill="none" opacity=".72"/>
    ${leaves}
  </svg>`;
}
/** Raminho pequeno e discreto, 1-2 folhas — para usar perto de texto sem distrair
    (cartões de produto, checkout/carrinho, citações). */
function decorTwigMiniSVG(seed){
  const rot = -16 + seededRand(seed)*32;
  const leafCount = 1 + Math.floor(seededRand(seed+9)*2);
  const anchors = [ {x:14,y:50,rot:-20}, {x:26,y:22,rot:18} ];
  let leaves = '';
  for(let i=0;i<leafCount;i++){
    const a = anchors[i];
    const tone = LEAF_TONES[Math.floor(seededRand(seed+i*3.7)*LEAF_TONES.length)];
    leaves += leafShapeSVG(a.x, a.y, 0.48+seededRand(seed+i*5.1)*0.22, a.rot, tone);
  }
  return `<svg viewBox="0 0 46 70" fill="none" style="transform:rotate(${rot.toFixed(1)}deg)">
    <path d="M10 66C15 50 8 36 20 14" stroke="#6B4123" stroke-width="1.3" stroke-linecap="round" fill="none" opacity=".6"/>
    ${leaves}
  </svg>`;
}
/** Cluster de folhas largas soltas (sem caule visível) — segunda "espécie" de planta. */
function decorLeafPairSVG(seed){
  const rot = seededRand(seed)*30-15;
  const anchors = [ {x:16,y:16,rot:-20}, {x:36,y:28,rot:35}, {x:22,y:38,rot:-60} ];
  const n = 2 + Math.floor(seededRand(seed+9)*2);
  let leaves = '';
  for(let i=0;i<n;i++){
    const a = anchors[i];
    const tone = LEAF_TONES[Math.floor(seededRand(seed+i*4.1)*LEAF_TONES.length)];
    leaves += leafRoundShapeSVG(a.x, a.y, 0.68+seededRand(seed+i*6.3)*0.4, a.rot, tone);
  }
  return `<svg viewBox="0 0 52 52" fill="none" style="transform:rotate(${rot.toFixed(1)}deg)">${leaves}</svg>`;
}
/** Ramo de flores de mostardeira — pequenas flores amarelas ao longo de um caule fino. */
function decorMustardFlowerSVG(seed){
  const rot = -14 + seededRand(seed)*28;
  const anchors = [ {x:14,y:80,s:.92}, {x:26,y:56,s:1.05}, {x:12,y:34,s:.85}, {x:24,y:12,s:1} ];
  const n = 3 + Math.floor(seededRand(seed+9)*2);
  let flowers = '';
  for(let i=0;i<n;i++){
    const a = anchors[i];
    flowers += mustardFlowerSVG(a.x, a.y, a.s*(0.85+seededRand(seed+i*3.3)*0.3), seededRand(seed+i*5.5)*360);
  }
  return `<svg viewBox="0 0 40 92" fill="none" style="transform:rotate(${rot.toFixed(1)}deg)">
    <path d="M12 88C17 70 9 50 18 8" stroke="#6B4123" stroke-width="1.5" stroke-linecap="round" fill="none" opacity=".62"/>
    ${flowers}
  </svg>`;
}
/** Grãos "derramados" em trilha horizontal — diferente da nuvem/cluster, para usar como
    separador ou faixa fina. */
function decorSeedTrailSVG(seed, count=6){
  let defs = '', seeds = '';
  const w = 20 + count*22;
  const uid = seedClusterSeq++;
  for(let i=0;i<count;i++){
    const t = count>1 ? i/(count-1) : 0;
    const cx = 10 + t*(w-20) + (seededRand(seed+i*3.1)-0.5)*10;
    const cy = 14 + Math.sin(t*Math.PI)*6 + (seededRand(seed+i*5.3)-0.5)*4;
    const r = 2.6 + seededRand(seed+i*7.1)*2.2;
    const tone = MUSTARD_SEED_TONES[i % MUSTARD_SEED_TONES.length];
    const gid = `trail${uid}_${i}`;
    defs += seedGradientDef(gid, tone);
    seeds += `<ellipse cx="${cx.toFixed(1)}" cy="${(cy+r*0.8).toFixed(1)}" rx="${(r*0.8).toFixed(1)}" ry="${(r*0.3).toFixed(1)}" fill="#2E1A0F" opacity=".14"/>`;
    seeds += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="url(#${gid})"/>`;
  }
  return `<svg viewBox="0 0 ${w} 28" fill="none"><defs>${defs}</defs>${seeds}</svg>`;
}
/** Cesto/tigela de madeira estilizado com grãos dentro — diretamente inspirado nos
    panfletos oficiais. Elemento mais complexo: usar com moderação (1-2 secções-chave). */
function decorWoodBowlSVG(seed){
  let defs = '', seeds = '';
  const uid = seedClusterSeq++;
  for(let i=0;i<7;i++){
    const cx = 30 + (seededRand(seed+i*3.1)-0.5)*56;
    const cy = 44 + (seededRand(seed+i*5.3)-0.5)*14;
    const r = 3 + seededRand(seed+i*7.7)*2.4;
    const tone = MUSTARD_SEED_TONES[i % MUSTARD_SEED_TONES.length];
    const gid = `bowl${uid}_${i}`;
    defs += seedGradientDef(gid, tone);
    seeds += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="url(#${gid})"/>`;
  }
  const bowlGid = `woodbowl${uid}`;
  defs += `<linearGradient id="${bowlGid}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#8a5a30"/><stop offset="55%" stop-color="#6B4123"/><stop offset="100%" stop-color="#402615"/>
  </linearGradient>`;
  return `<svg viewBox="0 0 60 70" fill="none">
    <defs>${defs}</defs>
    <ellipse cx="30" cy="53" rx="28" ry="13" fill="url(#${bowlGid})"/>
    <path d="M3 51C3 61 15 68 30 68C45 68 57 61 57 51L54 44L6 44Z" fill="url(#${bowlGid})"/>
    <ellipse cx="30" cy="48" rx="23" ry="9" fill="#2E1A0F" opacity=".28"/>
    ${seeds}
  </svg>`;
}
/** kind: qualquer um dos antigos nomes continua a funcionar (compatibilidade dos ~59 pontos de
    chamada) — cada nome mapeia agora para uma de 7 formas-base diferentes (grãos, ramo médio,
    ramo cheio, raminho discreto, folhas largas, flores de mostardeira, trilha de grãos), em
    vez de só duas — para o olhar não ver sempre a mesma folha/grão repetidos. A tigela de
    madeira (decorWoodBowlSVG) não está mapeada aqui de propósito — é usada diretamente, com
    moderação, em 1-2 secções-chave. cls: classes de posição (ex.: 'dec-tr dec-lg'). */
function decor(kind, cls, seed){
  const svg = kind==='seeds' ? decorSeedClusterSVG(seed, 4)
            : kind==='bouquet' ? decorSeedClusterSVG(seed, 7)
            : kind==='twig' ? decorTwigMiniSVG(seed)
            : kind==='sprig' ? decorBotanicalSVG(seed)
            : kind==='fern' ? decorBranchFullSVG(seed)
            : kind==='leaf' ? decorLeafPairSVG(seed)
            : kind==='daisy' ? decorMustardFlowerSVG(seed)
            : kind==='blossom' ? decorMustardFlowerSVG(seed)
            : kind==='line' ? decorSeedTrailSVG(seed, 5)
            : decorBranchFullSVG(seed);
  return `<div class="decor ${cls}" aria-hidden="true">${svg}</div>`;
}
/** Composição horizontal (grãos + uma folha) para o separador de secção — proporção larga
    e baixa, diferente da vertical usada nos cantos. */
function decorDividerSVG(seed){
  const y = 25 + (seededRand(seed)-0.5)*6;
  let defs = '', seeds = '';
  const uid = seedClusterSeq++;
  for(let i=0;i<4;i++){
    const cx = 66 + seededRand(seed+i*3.3)*70;
    const cy = 18 + seededRand(seed+i*5.1)*16;
    const r = 3 + seededRand(seed+i*7.2)*2.6;
    const tone = MUSTARD_SEED_TONES[i % MUSTARD_SEED_TONES.length];
    const gid = `divg${uid}_${i}`;
    defs += seedGradientDef(gid, tone);
    seeds += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="url(#${gid})"/>`;
  }
  return `<svg viewBox="0 0 190 50" fill="none">
    <defs>${defs}</defs>
    <path d="M8 ${y.toFixed(1)}C18 ${(y-8).toFixed(1)} 30 ${(y+6).toFixed(1)} 40 ${y.toFixed(1)}" stroke="#6B4123" stroke-width="1.6" stroke-linecap="round" fill="none" opacity=".6"/>
    ${leafShapeSVG(24, y-2, 0.55, -30, LEAF_TONES[Math.floor(seededRand(seed+2)*LEAF_TONES.length)])}
    ${seeds}
  </svg>`;
}
/** Separador decorativo em fluxo normal (não absoluto) — grãos + folha, usado entre secções/projetos */
function decorDivider(seed, cls){
  return `<div class="decor-divider ${cls||''}" aria-hidden="true">${decorDividerSVG(seed)}</div>`;
}

/* =========================================================
   MOTIVOS DE MARCA REUTILIZÁVEIS
   ---------------------------------------------------------
   Derivados da identidade oficial (selo circular do logótipo, couro
   com borda costurada, semente/gota dourada) — usados com intenção
   ao longo do site para reforçar a marca a cada scroll, não só no
   cabeçalho:
   1) sealBadgeSVG()   — selo circular ("feito à mão", "peça única"…)
   2) stitchDivider()  — costura de couro, divisor de secção
   3) ícone #i-seed reaproveitado como marcador de lista (.seed-marker-list)
   ========================================================= */
let sealSeq = 0;
function sealBadgeSVG(text){
  const pathId = `sealPath${sealSeq++}`;
  const label = escapeHtml(String(text||'').toUpperCase());
  return `<svg viewBox="0 0 120 120" class="seal-badge-svg" aria-hidden="true">
    <defs><path id="${pathId}" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0"/></defs>
    <circle cx="60" cy="60" r="57" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".9"/>
    <circle cx="60" cy="60" r="49" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="1.5 4" opacity=".6"/>
    <text font-family="'Space Mono',monospace" font-size="9" letter-spacing="2.6" fill="currentColor">
      <textPath href="#${pathId}" startOffset="1%">${label} • ${label} • </textPath>
    </text>
    <path d="M12 13c0-7 5-9 5-9s0 5-1.5 7C17 13 17 20 12 20s-5-7-3.5-9C7 9 7 4 7 4s5 2 5 9Z"
      fill="none" stroke="currentColor" stroke-width="1.6" transform="translate(41,41) scale(1.6)"/>
  </svg>`;
}
/** Divisor "costura de couro" — duas linhas tracejadas desalinhadas, em vez de uma linha reta genérica */
function stitchDivider(cls=''){
  return `<div class="stitch-divider ${cls}" aria-hidden="true"></div>`;
}

function pageSobre(){
  const spGraos = PRODUCTS.find(p=>p.slug==='caneca-graos-de-fe');
  const spCaderno = PRODUCTS.find(p=>p.slug==='caderno-devocional-a4');
  const spTshirt = PRODUCTS.find(p=>p.slug==='tshirt-grao-de-mostarda');
  const spBiblia = PRODUCTS.find(p=>p.slug==='biblia-sagrada-capa-personalizada');

  return `
  <section class="sb-hero">
    ${decor('bouquet','dec-tl-out dec-xl tone-gold bold',51)}
    ${decor('twig','dec-side-r dec-md tone-brown secondary',52)}
    ${decor('seeds','dec-top-r dec-sm tone-orange secondary faint',57)}
    <div class="wrap reveal">
      <img class="sb-hero-logo" src="assets/logo.webp" alt="Atelier Grão de Mostarda">
      <span class="eyebrow">Sobre nós</span>
      <h1>Uma história que começou com Deus</h1>
      <p>Conheça o propósito por trás do Atelier Grão de Mostarda.</p>
      ${seedGrowSVG()}
    </div>
  </section>

  <section class="sb-origin">
    ${decor('fern','dec-mid-l dec-md tone-brown secondary',53)}
    ${decor('seeds','dec-mid-r dec-sm tone-gold secondary faint',54)}
    <div class="wrap">
      <div class="section-head reveal">
        <span class="eyebrow">O nascimento do Atelier</span>
        <h2>Tudo começou com um propósito</h2>
      </div>
      <p class="sb-lead reveal">O Atelier Grão de Mostarda nasceu de um propósito que Deus colocou em nossos corações. O próprio nome Grão de Mostarda foi Deus quem nos deu. E, desde o início, entendemos que este atelier não seria apenas um negócio, mas uma ferramenta através da qual poderíamos servir, criar, inspirar e, acima de tudo, levar a mensagem de Deus às pessoas.</p>
      <p class="sb-pull reveal">"Este atelier não seria apenas um negócio, mas uma ferramenta para servir, criar e inspirar."</p>
    </div>
  </section>

  <section class="sb-destaque">
    ${decor('sprig','dec-tr-out dec-lg tone-cream bold',60)}
    <div class="wrap reveal">
      ${seedGrowSVG()}
      <span class="eyebrow">A inspiração</span>
      <p class="sb-verse">"Se tiverdes fé como um grão de mostarda…"<span>Mateus 17:20</span></p>
      <p class="sb-body">Uma pequena semente pode parecer insignificante, mas, quando plantada, cresce e produz frutos. É assim que enxergamos o nosso trabalho: cada produto, cada palavra, cada versículo e cada presente pode ser uma pequena semente plantada no coração de alguém.</p>
    </div>
  </section>

  <section class="sb-products">
    ${decor('leaf','dec-side-l2 dec-sm tone-brown secondary',82)}
    <div class="wrap">
      <div class="split reveal">
        <div class="split-text">
          <span class="eyebrow">Muito além de produtos</span>
          <h2>Criamos produtos. Semeamos mensagens.</h2>
          <p>Criamos produtos personalizados com carinho, dedicação e atenção a cada detalhe. Mas aquilo que fazemos vai muito além de criar e vender produtos.</p>
          <p style="margin-top:14px">Temos uma missão. Queremos usar aquilo que Deus colocou em nossas mãos para espalhar o Evangelho, transmitir fé, levar esperança e fazer com que mais pessoas conheçam o amor de Jesus.</p>
        </div>
        <div class="sb-products-grid">
          ${spGraos?`<a href="#/produto/${spGraos.slug}" data-route="/produto/${spGraos.slug}"><img src="${spGraos.images[0]}" alt="${spGraos.name}" loading="lazy"></a>`:''}
          ${spCaderno?`<a href="#/produto/${spCaderno.slug}" data-route="/produto/${spCaderno.slug}" class="sp-offset"><img src="${spCaderno.images[0]}" alt="${spCaderno.name}" loading="lazy"></a>`:''}
          ${spBiblia?`<a href="#/produto/${spBiblia.slug}" data-route="/produto/${spBiblia.slug}"><img src="${spBiblia.images[0]}" alt="${spBiblia.name}" loading="lazy"></a>`:''}
          ${spTshirt?`<a href="#/produto/${spTshirt.slug}" data-route="/produto/${spTshirt.slug}" class="sp-offset"><img src="${spTshirt.images[0]}" alt="${spTshirt.name}" loading="lazy"></a>`:''}
        </div>
      </div>
    </div>
  </section>

  <section class="sb-destaque">
    ${decor('line','dec-bl dec-md tone-cream secondary',85)}
    ${decor('seeds','dec-tr dec-sm tone-cream secondary faint',84)}
    <div class="wrap reveal">
      <span class="eyebrow">A nossa missão</span>
      <h2 style="color:#fff;margin-top:10px;font-size:clamp(24px,3.4vw,34px)">Uma missão que vai além do atelier</h2>
      <p class="sb-verse" style="margin-top:22px">"Ide por todo o mundo e pregai o evangelho a toda criatura."<span>Marcos 16:15</span></p>
      <p class="sb-body">Talvez não consigamos chegar fisicamente a todos os lugares do mundo, mas acreditamos que uma mensagem pode chegar onde os nossos pés não chegam.</p>
    </div>
  </section>

  <section class="section">
    ${decor('bouquet','dec-br-out dec-lg tone-gold bold',87)}
    <div class="wrap">
      <div class="section-head reveal">
        <span class="eyebrow">Pequenas sementes, grandes impactos</span>
        <h2>O que uma pequena peça pode fazer</h2>
      </div>
      <div class="seed-cards">
        <div class="seed-card reveal reveal-1"><svg><use href="#i-scroll"/></svg><p>Um caderno pode acompanhar alguém durante uma fase difícil.</p></div>
        <div class="seed-card reveal reveal-2"><svg><use href="#i-quote"/></svg><p>Um versículo pode trazer esperança num dia de tristeza.</p></div>
        <div class="seed-card reveal reveal-3"><svg><use href="#i-gift"/></svg><p>Um presente pode lembrar alguém de que Deus não se esqueceu dela.</p></div>
        <div class="seed-card reveal reveal-4"><svg><use href="#i-heart"/></svg><p>Uma pequena frase pode despertar uma conversa sobre Jesus.</p></div>
      </div>
      <p class="seed-cards-close reveal">E é assim que queremos semear.</p>
    </div>
  </section>

  <section class="sb-emotional">
    ${decor('seeds','dec-mid-r dec-xs tone-orange secondary faint',56)}
    <div class="wrap reveal">
      <p>Cada encomenda que sai do nosso atelier leva consigo um pouco da nossa história, do nosso carinho e da nossa fé. Tudo o que fazemos é para a honra e para a glória do nome de Deus.</p>
      <p class="sb-em-strong">Não queremos que as pessoas olhem apenas para aquilo que as nossas mãos conseguem criar, mas que, através do nosso trabalho, possam enxergar Aquele que nos deu o talento, a criatividade, a força e o propósito.</p>
    </div>
  </section>

  <section class="manifest-band">
    ${decor('bouquet','dec-tl-out dec-lg tone-cream bold',88)}
    ${decor('twig','dec-side-r dec-md tone-cream secondary',89)}
    <div class="wrap reveal">
      <div class="manifest-seed">🌱</div>
      <h2>Somos Grão de Mostarda.</h2>
      <p class="manifest-sub">Uma pequena semente nas mãos de um Deus grandioso.</p>
      <div class="manifest-lines">
        <span>Criamos com amor.</span>
        <span>Personalizamos com propósito.</span>
        <span>Servimos com fé.</span>
      </div>
      <p class="manifest-final">E semeamos para a eternidade.</p>
      <div class="manifest-foot">
        <strong>Atelier Grão de Mostarda</strong>
        <span>Pequenos detalhes. Grandes sementes de fé.</span>
      </div>
    </div>
  </section>
  `;
}

/* =========================================================
   PAGE: PROJETOS
   ========================================================= */
function pageProjetos(){
  return `
  <div class="page-header">
    ${decor('fern','dec-tl dec-md tone-gold secondary',41)}
    ${decor('seeds','dec-tr dec-sm tone-orange secondary faint',45)}
    <span class="eyebrow">Projetos</span>
    <h1>O que estamos a construir</h1>
    <p>Para além da loja, a Grão de Mostarda está por trás de mais do que um projeto. Estes são os que já estão em curso.</p>
  </div>
  <section class="section" style="padding-top:0">
    ${decor('seeds','dec-bl dec-md tone-orange secondary',42)}
    ${decor('leaf','dec-tr dec-lg tone-brown secondary',43)}
    <div class="wrap">
      ${decorDivider(44,'reveal')}
      <div class="projeto-grid">
        <div class="projeto-card reveal">
          <div class="projeto-media"><img src="assets/logo.webp" alt="Grão de Mostarda Personalizados"></div>
          <div class="projeto-body">
            <span class="tag tag-mustard" style="align-self:flex-start;margin-bottom:12px">Ativo</span>
            <h3>Grão de Mostarda Personalizados</h3>
            <p>A nossa loja de artesanato cristão personalizado — Bíblias, canecas, roupa, cadernos, decoração e presentes feitos com amor, fé e propósito, inspirados em Lucas 17:6 e Mateus 17:20.</p>
            <div class="projeto-status"><a href="#/loja" data-route="/loja" class="btn btn-outline btn-sm">Visitar a loja</a></div>
          </div>
        </div>
        <div class="projeto-card reveal reveal-2">
          <div class="projeto-media placeholder"><svg><use href="#i-book"/></svg></div>
          <div class="projeto-body">
            <span class="tag" style="align-self:flex-start;margin-bottom:12px">Em desenvolvimento</span>
            <h3>Ministério Bíblico</h3>
            <p>Um novo projeto da Grão de Mostarda, ainda em fase inicial. Em breve partilharemos aqui a missão, os objetivos e as atividades deste projeto.</p>
          </div>
        </div>
      </div>
      ${decorDivider(48,'reveal')}
    </div>
  </section>
  `;
}

/* =========================================================
   PAGE: INSPIRAÇÃO
   ========================================================= */
function pageInspiracao(){
  const origin = REFLECTIONS.find(s=>s.featured);
  const stories = REFLECTIONS.filter(s=>!s.featured);
  return `
  <!-- Fundidas numa única secção de abertura: .insp-hero e .origin-band eram duas
       introduções escuras e centradas empilhadas, com mensagem redundante. Agora é uma
       só — introdução geral, depois a origem do nome como o "porquê" dentro da mesma
       secção, separada por um traço fino em vez de repetir todo o tratamento visual. -->
  <section class="insp-hero">
    ${decor('twig','dec-side-l dec-lg tone-cream',61)}
    ${decor('seeds','dec-tr dec-sm tone-gold secondary',62)}
    ${decor('sprig','dec-tr-out dec-lg tone-cream bold',68)}
    ${decor('line','dec-bot-r dec-md tone-gold secondary',67)}
    <div class="wrap reveal">
      <span class="eyebrow">Inspiração</span>
      <h1>Inspiração que ganha forma</h1>
      <p>Histórias da Bíblia, um versículo de cada vez — e como cada uma pode inspirar uma peça personalizada, feita para acompanhar a sua fé no dia a dia.</p>
      <div class="insp-origin-quote">
        <div class="origin-icon"><svg><use href="#i-seed"/></svg></div>
        <span class="eyebrow">A nossa origem</span>
        <p class="origin-verse">"Se tiverdes fé do tamanho de um grão de mostarda, direis a esta amoreira: desarraiga-te e planta-te no mar; e ela vos obedecerá."<span>Lucas 17:6 · Mateus 17:20</span></p>
        <p class="origin-text">${origin.long.split('" ').slice(1).join('" ')}</p>
      </div>
    </div>
  </section>

  <section class="section">
    ${decor('fern','dec-tl dec-md tone-brown secondary',63)}
    ${decor('seeds','dec-tr dec-sm tone-gold secondary',71)}
    <div class="wrap">
      ${decorDivider(73,'reveal')}
      <div class="section-head reveal">
        <span class="eyebrow">Histórias de fé</span>
        <h2>Reflexões que inspiram cada peça</h2>
      </div>
      <div class="bible-grid">
        ${stories.map((s,i)=>reflectionCard(s,i)).join('')}
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:0;background:var(--sand)">
    ${decor('twig','dec-br dec-lg tone-orange secondary',64)}
    <div class="wrap">
      <div class="section-head reveal">
        <span class="eyebrow">Da inspiração ao produto</span>
        <h2>Cada tema pode tornar-se uma peça sua</h2>
      </div>
      <div class="insp-link-grid">
        ${INSPIRATION_LINKS.map((l,i)=>`
        <a href="#/loja?cat=${l.cat}" data-route="/loja" class="insp-link-card reveal reveal-${(i%4)+1}">
          <img src="${PIMG(l.phrase, l.seed, l.cat)}" alt="${l.phrase}" loading="lazy">
          <span>${l.phrase}</span>
        </a>`).join('')}
      </div>
    </div>
  </section>

  <section class="section">
    ${decor('leaf','dec-tr dec-md tone-rose',65)}
    ${decor('seeds','dec-bl dec-sm tone-orange secondary faint',76)}
    <div class="wrap">
      <div class="section-head reveal">
        <span class="eyebrow">Mood board</span>
        <h2>Momentos de inspiração</h2>
        <p>Não é um catálogo — é o "porquê" antes do "o quê". Cada imagem representa um sentimento ou versículo que depois se transforma numa peça real na loja.</p>
      </div>
      <div class="insp-gallery">
        ${INSPIRATION_GALLERY.map((g,i)=>inspGalleryCard(g,i)).join('')}
      </div>
      <div class="insp-gallery-bridge reveal">
        <p>Quer saber de onde vem tudo isto?</p>
        <a href="#/sobre" data-route="/sobre" class="btn btn-outline">Ler a nossa história</a>
      </div>
    </div>
  </section>
  `;
}

/* =========================================================
   PAGE: AVALIAÇÕES
   ========================================================= */
let reviewState = { stars:0, sort:'recent' };
function pageAvaliacoes(){
  return `
  <div class="page-header">
    <span class="eyebrow">Avaliações</span>
    <h1>O que dizem os nossos clientes</h1>
    <p>Avaliações de demonstração — a estrutura já suporta moderação, compra verificada e filtros por estrelas.</p>
  </div>
  <section class="section" style="padding-top:0">
    <div class="wrap">
      <div class="testi-toolbar">
        <div class="testi-summary" id="reviewSummary"></div>
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
          <div class="filter-pills" id="starFilters">
            <button class="tag tag-btn is-active" data-stars="0">Todas</button>
            ${[5,4,3,2,1].map(s=>`<button class="tag tag-btn" data-stars="${s}">${s}★</button>`).join('')}
          </div>
          <select id="sortReviews" style="padding:9px 12px;border:1px solid var(--line);border-radius:20px;font-family:var(--mono);font-size:12px;background:var(--paper)">
            <option value="recent">Mais recentes</option>
            <option value="rating">Melhor avaliação</option>
          </select>
        </div>
      </div>
      <div class="testi-grid" id="reviewGrid"></div>
    </div>
  </section>
  `;
}
function renderReviewSummary(){
  const total = REVIEWS_DEMO.length;
  const avg = (REVIEWS_DEMO.reduce((s,r)=>s+r.rating,0)/total).toFixed(1);
  $('#reviewSummary').innerHTML = `
    <span class="avg">${avg}</span>
    <div><div class="stars">${'<svg><use href="#i-star"/></svg>'.repeat(Math.round(avg))}</div><span class="count">${total} avaliações de demonstração</span></div>
  `;
}
function renderReviewGrid(){
  let list = REVIEWS_DEMO.filter(r=> reviewState.stars===0 || r.rating===reviewState.stars);
  list = list.slice().sort((a,b)=> reviewState.sort==='rating' ? b.rating-a.rating : new Date(b.date)-new Date(a.date));
  $('#reviewGrid').innerHTML = list.length ? list.map(t=>reviewCard(t)).join('') : `<div class="empty-state" style="grid-column:1/-1"><svg><use href="#i-star"/></svg><p>Sem avaliações para este filtro.</p></div>`;
  runReveal();
}
function wireAvaliacoesPage(){
  renderReviewSummary();
  renderReviewGrid();
  $$('#starFilters .tag-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      reviewState.stars = Number(btn.dataset.stars);
      $$('#starFilters .tag-btn').forEach(b=>b.classList.toggle('is-active', b===btn));
      renderReviewGrid();
    });
  });
  $('#sortReviews').addEventListener('change', e=>{ reviewState.sort = e.target.value; renderReviewGrid(); });
}

/* =========================================================
   PAGE: ENCOMENDAS ESPECIAIS
   ========================================================= */
function pageEncomendasEspeciais(){
  return `
  <div class="page-header">
    <span class="eyebrow">Feito à sua ideia</span>
    <h1>Encomendas Especiais</h1>
    <p>Tem uma ideia que não encontra na loja? Conte-nos os detalhes e criamos uma peça só para si.</p>
  </div>
  <section class="section" style="padding-top:0">
    <div class="wrap">
      <div class="contact-grid">
        <div class="form-panel reveal">
          <form id="specialForm" novalidate>
            <div class="form-row-2">
              <div><label>Nome</label><input type="text" name="name" required maxlength="80" autocomplete="name"><span class="field-error" aria-live="polite" data-for="name"></span></div>
              <div><label>Telefone</label><input type="tel" name="phone" required maxlength="20" autocomplete="tel"><span class="field-error" aria-live="polite" data-for="phone"></span></div>
            </div>
            <label>Email</label>
            <input type="email" name="email" required maxlength="100" autocomplete="email">
            <span class="field-error" aria-live="polite" data-for="email"></span>
            <div class="form-row-2">
              <div><label>Tipo de produto</label>
                <select name="type" required>
                  <option value="">Escolha uma categoria</option>
                  ${CATEGORIES.map(c=>`<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('')}
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div><label>Quantidade</label><input type="number" name="qty" min="1" max="99" value="1" required></div>
            </div>
            <label>Descrição da ideia</label>
            <textarea name="description" rows="4" required placeholder="Descreva a peça que imagina" maxlength="600"></textarea>
            <span class="field-error" aria-live="polite" data-for="description"></span>
            <label>Frase / versículo</label>
            <input type="text" name="verse" placeholder="Ex: Lucas 17:6" maxlength="120">
            <div class="form-row-2">
              <div><label>Cores</label><input type="text" name="colors" placeholder="Ex: bege e dourado" maxlength="60"></div>
              <div><label>Dimensões</label><input type="text" name="dimensions" placeholder="Ex: 30x20cm" maxlength="60"></div>
            </div>
            <label>Data pretendida</label>
            <input type="date" name="deadline">
            <label>Imagem de referência (opcional)</label>
            <input type="file" name="refImage" accept="image/*">
            <label>Observações</label>
            <textarea name="notes" rows="3" maxlength="400"></textarea>
            <button type="submit" class="btn btn-primary btn-block" style="margin-top:24px">Enviar pedido</button>
          </form>
        </div>
        <div class="reveal reveal-2">
          <div class="contact-info">
            <h3 style="font-size:20px;margin-bottom:20px">Como funciona</h3>
            <div class="contact-info-item"><svg><use href="#i-check"/></svg><div><h4>1. Conte-nos a ideia</h4><p>Quanto mais detalhe, melhor conseguimos orçamentar e desenhar a peça.</p></div></div>
            <div class="contact-info-item"><svg><use href="#i-check"/></svg><div><h4>2. Confirmamos consigo</h4><p>Entramos em contacto por WhatsApp ou email para afinar detalhes e valor.</p></div></div>
            <div class="contact-info-item"><svg><use href="#i-check"/></svg><div><h4>3. Produzimos com cuidado</h4><p>Cada peça especial é feita à mão, com o mesmo cuidado de qualquer encomenda.</p></div></div>
          </div>
        </div>
      </div>
    </div>
  </section>
  `;
}
const SPECIAL_ORDER_RULES = {
  name:        { required:true, maxLen:80,  requiredMsg:'Indique o seu nome.' },
  phone:       { required:true, maxLen:20,  requiredMsg:'Indique um telefone de contacto.', validate:isValidPhonePT, msg:'Introduza um número de telefone português válido.' },
  email:       { required:true, maxLen:100, requiredMsg:'Indique o seu email.', validate:isValidEmail, msg:'Introduza um email válido.' },
  description: { required:true, maxLen:600, requiredMsg:'Descreva a peça que imagina.' },
  verse:       { required:false, maxLen:120 },
  colors:      { required:false, maxLen:60 },
  dimensions:  { required:false, maxLen:60 },
  notes:       { required:false, maxLen:400 },
};
function wireSpecialForm(){
  const form = $('#specialForm');
  if(!form) return;
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const { ok, values } = validateForm(form, SPECIAL_ORDER_RULES);
    const type = form.querySelector('[name="type"]').value;
    const qty = Math.max(1, Math.min(99, parseInt(form.querySelector('[name="qty"]').value, 10) || 1));
    if(!type){ showToast('Escolha um tipo de produto.'); return; }
    if(!ok){ showToast('Reveja os campos assinalados antes de enviar.'); return; }
    const data = { ...values, type, qty, deadline: form.querySelector('[name="deadline"]').value || '' };
    const { id, mailtoUrl } = submitSpecialOrder(data);
    window.open(mailtoUrl,'_blank');
    showToast(`Pedido enviado! Referência: ${id}`);
    form.reset();
  });
}

/* =========================================================
   PAGE: FAQ
   ========================================================= */
function pageFaq(){
  return `
  <div class="page-header">
    <span class="eyebrow">Dúvidas</span>
    <h1>Perguntas Frequentes</h1>
    <p>Não encontrou o que procurava? <a href="#/contacto" data-route="/contacto" style="text-decoration:underline;color:var(--orange-dark)">Fale connosco</a>.</p>
  </div>
  <section class="section" style="padding-top:0">
    <div class="wrap">
      <div class="faq-list">
        ${FAQ_DATA.map((f,i)=>`
          <div class="faq-item ${i===0?'open':''}">
            <button class="faq-q">${f.q}<svg><use href="#i-plus"/></svg></button>
            <div class="faq-a"><div class="faq-a-in">${f.a}</div></div>
          </div>`).join('')}
      </div>
    </div>
  </section>
  `;
}
function wireFaqPage(){
  $$('.faq-q').forEach(q=>{
    q.addEventListener('click', ()=>{
      const item = q.closest('.faq-item');
      item.classList.toggle('open');
    });
  });
}

/* =========================================================
   PAGE: AJUDA (Envios, Trocas)
   ========================================================= */
const HELP_PAGES = {
  envios: {
    title:'Envios & Prazos',
    body:[
      'Produzimos cada peça por encomenda, por isso o tempo de produção varia entre 3 a 7 dias úteis, consoante o tipo de personalização.',
      'Depois de produzida, a encomenda é enviada para todo o território nacional. O prazo de entrega e o valor dos portes são confirmados após o envio da encomenda, com base na morada indicada.',
      'Para datas especiais (batizados, crismas, casamentos), recomendamos encomendar com pelo menos 2 semanas de antecedência.',
    ]
  },
  trocas: {
    title:'Trocas & Devoluções',
    body:[
      'Aceitamos trocas em produtos não personalizados, dentro de 14 dias após a receção, desde que o produto esteja em perfeitas condições.',
      'Produtos personalizados (com nome, data ou versículo específico) só podem ser trocados em caso de defeito de fabrico — avaliamos cada caso através do WhatsApp.',
      'Para iniciar uma troca ou devolução, contacte-nos com o número da sua encomenda e uma fotografia do produto.',
    ]
  }
};
function pageAjuda(slug){
  const info = HELP_PAGES[slug];
  if(!info){
    return `<div class="page-header"><h1>Página não encontrada</h1><a href="#/faq" data-route="/faq" class="btn btn-primary" style="margin-top:20px">Ver FAQ</a></div>`;
  }
  return `
  <div class="page-header">
    <span class="eyebrow">Ajuda</span>
    <h1>${info.title}</h1>
  </div>
  <section class="section" style="padding-top:0">
    <div class="wrap" style="max-width:760px;margin:0 auto">
      ${info.body.map(p=>`<p class="reveal" style="font-size:15.5px;margin-bottom:18px">${p}</p>`).join('')}
    </div>
  </section>
  `;
}

/* =========================================================
   PAGE: CONTACTO
   ========================================================= */
function pageContacto(){
  return `
  <div class="page-header">
    ${decor('leaf','dec-tl dec-md tone-brown secondary',31)}
    ${decor('daisy','dec-tr dec-sm tone-rose secondary',32)}
    <span class="eyebrow">Fale connosco</span>
    <h1>Contacto</h1>
    <p>Dúvidas sobre uma encomenda, prazos ou uma peça personalizada? Estamos por aqui.</p>
  </div>
  <section class="section" style="padding-top:0">
    ${decor('twig','dec-bl dec-md tone-orange secondary',33)}
    ${decor('seeds','dec-tr dec-sm tone-gold secondary faint',34)}
    <div class="wrap contact-grid">
      <div class="form-panel reveal">
        <h3 style="font-size:20px;margin-bottom:6px">Envie-nos uma mensagem</h3>
        <p style="font-size:13.5px">Respondemos, em média, dentro de 1 a 2 dias úteis.</p>
        <form id="contactForm" novalidate>
          <label>Nome</label>
          <input type="text" name="name" required placeholder="O seu nome" maxlength="80" autocomplete="name">
          <span class="field-error" aria-live="polite" data-for="name"></span>
          <label>Email</label>
          <input type="email" name="email" required placeholder="O seu email" maxlength="100" autocomplete="email">
          <span class="field-error" aria-live="polite" data-for="email"></span>
          <label>Assunto</label>
          <input type="text" name="subject" placeholder="Ex: Encomenda personalizada" maxlength="100">
          <label>Mensagem</label>
          <textarea name="message" rows="5" required placeholder="Escreva aqui a sua mensagem" maxlength="600"></textarea>
          <span class="field-error" aria-live="polite" data-for="message"></span>
          <button type="submit" class="btn btn-primary" style="margin-top:22px">Enviar mensagem</button>
        </form>
      </div>
      <div class="reveal reveal-2">
        <h3 style="font-size:20px;margin-bottom:20px">Outras formas de nos encontrar</h3>
        <div class="contact-info-item"><svg><use href="#i-mail"/></svg><div><h4>Email</h4><p><a href="mailto:${SHOP.email}">${SHOP.email}</a></p></div></div>
        <div class="contact-info-item"><svg><use href="#i-wa"/></svg><div><h4>WhatsApp</h4><p><a href="${SHOP.whatsappUrl}" target="_blank" rel="noopener">Falar connosco agora</a></p></div></div>
        <div class="contact-info-item"><svg><use href="#i-ig"/></svg><div><h4>Instagram</h4><p><a href="${SHOP.instagramUrl}" target="_blank" rel="noopener">${SHOP.instagramHandle}</a></p></div></div>
        <div class="contact-info-item"><svg><use href="#i-clock"/></svg><div><h4>Horário de resposta</h4><p>Segunda a sexta, 9h–18h</p></div></div>
        <div class="contact-info-item"><svg><use href="#i-truck"/></svg><div><h4>Envios</h4><p>Produção por encomenda: 3-7 dias úteis + envio</p></div></div>
        <div class="footer-social" style="margin-top:24px">
          <a class="fs-ig" href="${SHOP.instagramUrl}" target="_blank" rel="noopener" aria-label="Instagram"><svg><use href="#i-ig"/></svg></a>
          <a class="fs-wa" href="${SHOP.whatsappUrl}" target="_blank" rel="noopener" aria-label="WhatsApp"><svg><use href="#i-wa"/></svg></a>
          <a class="fs-mail" href="mailto:${SHOP.email}" aria-label="Email"><svg><use href="#i-mail"/></svg></a>
        </div>
      </div>
    </div>
  </section>
  `;
}
const CONTACT_RULES = {
  name:    { required:true, maxLen:80,  requiredMsg:'Indique o seu nome.' },
  email:   { required:true, maxLen:100, requiredMsg:'Indique o seu email.', validate:isValidEmail, msg:'Introduza um email válido.' },
  subject: { required:false, maxLen:100 },
  message: { required:true, maxLen:600, requiredMsg:'Escreva a sua mensagem.' },
};
function wireContactForm(){
  const form = $('#contactForm');
  if(!form) return;
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const { ok, values } = validateForm(form, CONTACT_RULES);
    if(!ok){ showToast('Reveja os campos assinalados antes de enviar.'); return; }
    const subject = encodeURIComponent(`Contacto pelo site — ${values.subject || 'Sem assunto'}`);
    const body = encodeURIComponent(`Nome: ${values.name}\nEmail: ${values.email}\n\nMensagem:\n${values.message}`);
    window.open(`mailto:${SHOP.email}?subject=${subject}&body=${body}`, '_blank');
    showToast('Mensagem preparada — confirme o envio no seu email.');
    form.reset();
  });
}

/* =========================================================
   PAGE: ADMIN (demonstração de leitura — ver ARCHITECTURE.md)
   ========================================================= */
function markOrderCompleted(orderId){
  const list = readJSON('gm_orders_demo', []);
  const idx = list.findIndex(o=>o.id===orderId);
  if(idx===-1) return;
  list[idx].status = 'concluída';
  localStorage.setItem('gm_orders_demo', JSON.stringify(list));
  showToast(`Encomenda ${orderId} marcada como concluída — "Mais vendidos" foi recalculado.`);
  router();
}
function pageAdmin(){
  const orders = readJSON('gm_orders_demo', []).filter(isValidOrderShape);
  const newsletter = getNewsletterList();
  const bs = computeBestSellers(30,5);
  const topRated = computeTopRatedProducts(6);
  return `
  <div class="page-header" style="padding-top:130px">
    <span class="eyebrow">Área reservada</span>
    <h1>Administração (demonstração)</h1>
    <p>Pré-visualização do painel de gestão. Em produção teria autenticação e ligação real à base de dados.</p>
  </div>
  <section class="section" style="padding-top:0">
    <div class="wrap">
      <div class="arch-note" style="margin-bottom:28px">
        <svg><use href="#i-server"/></svg>
        <p><strong>Isto é uma maquete.</strong> Não há login nem dados protegidos — serve apenas para mostrar o que a administração da loja poderá fazer assim que o backend estiver ligado.</p>
      </div>
      <div class="admin-shell">
        <div class="admin-side">
          <div class="as-brand"><img src="assets/logo.webp" alt=""><strong style="font-family:var(--serif)">Painel</strong></div>
          <ul>
            <li class="active">Visão geral</li>
            <li>Produtos</li>
            <li>Encomendas</li>
            <li>Mais vendidos</li>
            <li>Avaliações</li>
            <li>Newsletter</li>
            <li>Encomendas especiais</li>
            <li>FAQ &amp; Projetos</li>
          </ul>
        </div>
        <div class="admin-main">
          <div class="admin-stats">
            <div class="admin-stat"><div class="num">${PRODUCTS.length}</div><div class="lbl">Produtos ativos</div></div>
            <div class="admin-stat"><div class="num">${orders.length}</div><div class="lbl">Encomendas nesta sessão</div></div>
            <div class="admin-stat"><div class="num">${newsletter.length}</div><div class="lbl">Subscritores (demo)</div></div>
            <div class="admin-stat"><div class="num">${REVIEWS_DEMO.length}</div><div class="lbl">Avaliações por moderar</div></div>
          </div>
          <h4 style="margin-bottom:12px">Encomendas registadas nesta sessão (localStorage)</h4>
          ${orders.length ? `<table class="admin-table" style="margin-bottom:30px">
            <thead><tr><th>Nº</th><th>Cliente</th><th>Total</th><th>Estado</th><th></th></tr></thead>
            <tbody>${orders.slice().reverse().map(o=>`<tr>
              <td>${escapeHtml(o.id)}</td><td>${escapeHtml(o.customer?.name||'—')}</td><td>${euro(o.total)}</td>
              <td>${escapeHtml(o.status)}</td>
              <td>${o.status!=='concluída' ? `<button class="btn btn-outline btn-sm" onclick="markOrderCompleted('${escapeHtml(o.id)}')">Marcar como concluída</button>` : '✓'}</td>
            </tr>`).join('')}</tbody>
          </table>` : `<p style="font-size:13.5px;margin-bottom:30px">Ainda sem encomendas nesta sessão — finalize uma compra na loja para ver aqui.</p>`}
          <div class="arch-note" style="margin-bottom:28px">
            <svg><use href="#i-alert"/></svg>
            <p>Só encomendas com estado <strong>"concluída"</strong> contam para "Mais vendidos" — reflete a regra de que uma venda só se confirma depois do pagamento, não no momento da encomenda. Marque uma encomenda como concluída acima para ver a tabela abaixo recalcular-se.</p>
          </div>
          <h4 style="margin-bottom:12px">Mais vendidos — últimos 30 dias (calculado a partir das encomendas concluídas)</h4>
          <table class="admin-table" style="margin-bottom:30px">
            <thead><tr><th>Produto</th><th>Categoria</th><th>Unidades vendidas</th></tr></thead>
            <tbody>${bs.length ? bs.map(b=>`<tr><td>${b.product.name}</td><td>${catName(b.product.category)}</td><td>${b.unitsSold}</td></tr>`).join('') : `<tr><td colspan="3">Sem encomendas concluídas neste período.</td></tr>`}</tbody>
          </table>
          <h4 style="margin-bottom:12px">Melhores avaliados (média ponderada — ver computeTopRatedProducts() em app.js)</h4>
          <table class="admin-table" style="margin-bottom:30px">
            <thead><tr><th>Produto</th><th>Nº avaliações</th><th>Média simples</th><th>Pontuação ponderada</th></tr></thead>
            <tbody>${topRated.map(t=>`<tr><td>${t.product.name}</td><td>${t.reviewCount}</td><td>${t.avgRating.toFixed(2)}</td><td>${t.score.toFixed(2)}</td></tr>`).join('')}</tbody>
          </table>
          <h4 style="margin-bottom:12px">Capacidades previstas para a administração</h4>
          <ul class="admin-capability-list">
            <li><svg><use href="#i-check"/></svg>Adicionar/editar produtos, preços e stock</li>
            <li><svg><use href="#i-check"/></svg>Ativar/desativar produtos</li>
            <li><svg><use href="#i-check"/></svg>Consultar e gerir encomendas</li>
            <li><svg><use href="#i-check"/></svg>Moderar avaliações antes de publicar</li>
            <li><svg><use href="#i-check"/></svg>Gerir subscritores da newsletter</li>
            <li><svg><use href="#i-check"/></svg>Enviar notificações a subscritores</li>
            <li><svg><use href="#i-check"/></svg>Gerir encomendas especiais</li>
            <li><svg><use href="#i-check"/></svg>Editar FAQ, Ajuda e páginas de Projetos</li>
          </ul>
        </div>
      </div>
    </div>
  </section>
  `;
}

/* =========================================================
   REVEAL ON SCROLL
   ========================================================= */
let revealObserver;
function runReveal(){
  if(revealObserver) revealObserver.disconnect();
  const els = $$('.reveal');
  if(!('IntersectionObserver' in window)){ els.forEach(el=>el.classList.add('is-visible')); return; }
  revealObserver = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold:0.12, rootMargin:'0px 0px -40px 0px' });
  els.forEach(el=>revealObserver.observe(el));
}

/* =========================================================
   ROUTER
   ========================================================= */
const ROUTES_META = {
  '/':                     { title:`${SHOP.name} — Amor, Fé e Propósito`, desc:'Bíblias, canecas, roupa, cadernos e decoração cristã personalizados, feitos com amor, fé e propósito.' },
  '/loja':                 { title:`Loja — ${SHOP.name}`, desc:'Explore o catálogo completo: Bíblias, reforma de Bíblia, canecas, t-shirts, decoração, kits de pintura, porta-chaves e cadernos personalizados.' },
  '/sobre':                { title:`Sobre Nós — ${SHOP.name}`, desc:'Conheça a história da Grão de Mostarda Personalizados.' },
  '/inspiracao':           { title:`Inspiração — ${SHOP.name}`, desc:'As reflexões bíblicas por trás de cada peça da Grão de Mostarda.' },
  '/projetos':             { title:`Projetos — ${SHOP.name}`, desc:'Os projetos da Grão de Mostarda: a loja e o Ministério Bíblico.' },
  '/contacto':             { title:`Contacto — ${SHOP.name}`, desc:'Fale com a equipa da Grão de Mostarda sobre encomendas, prazos ou peças personalizadas.' },
  '/checkout':             { title:`Finalizar encomenda — ${SHOP.name}`, desc:'Finalize a sua encomenda.' },
  '/faq':                  { title:`Perguntas Frequentes — ${SHOP.name}`, desc:'Respostas às perguntas mais comuns.' },
  '/avaliacoes':           { title:`Avaliações — ${SHOP.name}`, desc:'O que dizem os nossos clientes.' },
  '/encomendas-especiais': { title:`Encomendas Especiais — ${SHOP.name}`, desc:'Peça uma peça feita à sua ideia.' },
  '/admin':                { title:`Administração — ${SHOP.name}`, desc:'Painel de administração (demonstração).' },
};

function parseHash(){
  let hash = location.hash || '#/';
  hash = hash.slice(1);
  const [pathAndQuery] = [hash];
  const [path, queryString] = pathAndQuery.split('?');
  const params = new URLSearchParams(queryString || '');
  return { path: path || '/', params };
}

function router(){
  const { path, params } = parseHash();
  const main = $('#main');
  let html = '';
  let metaKey = path;
  let productSlug = null, orderIdParam = null, helpSlug = null;

  if(path === '/' || path === ''){
    html = pageHome();
  } else if(path === '/loja'){
    html = pageLoja(params);
  } else if(path.startsWith('/produto/')){
    productSlug = path.replace('/produto/','');
    html = pageProduto(productSlug);
    const p = PRODUCTS.find(p=>p.slug===productSlug);
    metaKey = null;
    document.title = p ? `${p.name} — ${SHOP.name}` : `Produto — ${SHOP.name}`;
    $('#meta-desc').setAttribute('content', p ? p.shortDesc : 'Produto artesanal personalizado.');
  } else if(path === '/checkout'){
    html = pageCheckout();
  } else if(path.startsWith('/confirmacao/')){
    orderIdParam = path.replace('/confirmacao/','');
    html = pageConfirmacao(orderIdParam);
    metaKey = null;
    document.title = `Encomenda confirmada — ${SHOP.name}`;
  } else if(path === '/sobre'){
    html = pageSobre();
  } else if(path === '/inspiracao'){
    html = pageInspiracao();
  } else if(path === '/projetos'){
    html = pageProjetos();
  } else if(path === '/avaliacoes'){
    html = pageAvaliacoes();
  } else if(path === '/encomendas-especiais'){
    html = pageEncomendasEspeciais();
  } else if(path === '/faq'){
    html = pageFaq();
  } else if(path.startsWith('/ajuda/')){
    helpSlug = path.replace('/ajuda/','');
    html = pageAjuda(helpSlug);
    metaKey = null;
    document.title = `${(HELP_PAGES[helpSlug]||{}).title || 'Ajuda'} — ${SHOP.name}`;
  } else if(path === '/contacto'){
    html = pageContacto();
  } else if(path === '/admin'){
    html = pageAdmin();
  } else if(path === '/newsletter/cancelar'){
    html = pageNewsletterCancelar();
    metaKey = null;
    document.title = `Cancelar subscrição — ${SHOP.name}`;
  } else {
    html = pageHome();
    metaKey = '/';
  }

  main.innerHTML = `<div class="page active">${html}</div>`;

  if(metaKey && ROUTES_META[metaKey]){
    document.title = ROUTES_META[metaKey].title;
    $('#meta-desc').setAttribute('content', ROUTES_META[metaKey].desc);
  }

  // active nav state
  $$('a[data-route]').forEach(a=>{
    const r = a.dataset.route;
    const isHome = r === '/' && (path === '/' || path === '');
    const isMatch = r === path || isHome || (r === '/loja' && path.startsWith('/produto/'));
    a.classList.toggle('active', isMatch);
  });

  // page-specific wiring
  if(path === '/loja') wireShopPage();
  if(productSlug) wireProdutoPage(productSlug);
  if(path === '/checkout') wireCheckoutPage();
  if(path === '/avaliacoes') wireAvaliacoesPage();
  if(path === '/encomendas-especiais') wireSpecialForm();
  if(path === '/faq') wireFaqPage();
  if(path === '/contacto') wireContactForm();
  if(path === '/newsletter/cancelar') wireUnsubscribePage();

  updateBadges();
  window.scrollTo({top:0, behavior:'instant' in window ? 'instant' : 'auto'});
  closeMobileNav();
  requestAnimationFrame(runReveal);
}

window.addEventListener('hashchange', router);

/* =========================================================
   HEADER SMART HIDE ON SCROLL
   ========================================================= */
(function(){
  let lastY = 0;
  const header = $('#siteHeader');
  window.addEventListener('scroll', ()=>{
    const y = window.scrollY;
    if(y > lastY && y > 140){ header.classList.add('hide'); }
    else { header.classList.remove('hide'); }
    lastY = y;
  }, { passive:true });
})();

/* =========================================================
   GLOBAL EVENT WIRING (runs once)
   ========================================================= */
document.addEventListener('DOMContentLoaded', ()=>{
  // official contact links (single source of truth: SHOP)
  $('#waFloat').href = SHOP.whatsappUrl;
  $('#drawerWaBtn').href = SHOP.whatsappUrl;

  // mobile nav
  $('#btnMobileNav').addEventListener('click', openMobileNav);
  $('#closeMobileNav').addEventListener('click', closeMobileNav);
  // cart
  $('#btnCartToggle').addEventListener('click', openCart);
  $('#closeCart').addEventListener('click', closeCart);
  // overlay closes whichever drawer is open
  $('#drawerOverlay').addEventListener('click', ()=>{ closeCart(); closeMobileNav(); });
  // favorites shortcut -> go to shop with favOnly
  $('#btnFavToggle').addEventListener('click', ()=>{
    shopState.favOnly = true;
    location.hash = '#/loja';
  });
  // search shortcut -> go to shop and focus search
  $('#btnSearch').addEventListener('click', ()=>{
    location.hash = '#/loja';
    setTimeout(()=>{ const s = $('#shopSearch'); if(s) s.focus(); }, 250);
  });
  // reflection modal close
  $('#closeModal').addEventListener('click', closeStoryModal);
  $('#storyModal').addEventListener('click', (e)=>{ if(e.target.id==='storyModal') closeStoryModal(); });
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ closeStoryModal(); closeCart(); closeMobileNav(); } });
  // footer newsletter
  $('#footerNewsletterForm').addEventListener('submit', handleNewsletter);

  // REQUER BACKEND (documentado em ARCHITECTURE.md): marca a visita atual
  // do "utilizador" para fins do futuro email de reengajamento aos 60 dias.
  try{
    const list = getNewsletterList();
    if(list.length){
      list.forEach(s=>{ s.lastVisit = new Date().toISOString(); });
      saveNewsletterList(list);
    }
  }catch(e){/* localStorage indisponível — sem efeito no protótipo */}

  renderCart();
  router();
});
