// ─────────────────────────────────────────────────────────────────────────────
// CATARINA COSMÉTICOS & ECCOS BRUSQUE — DADOS DA LOJA + ARMAZENAMENTO
// ─────────────────────────────────────────────────────────────────────────────
// Este arquivo é compartilhado pela vitrine (index.html) e pelo painel
// (admin.html). Ele guarda:
//   1) os DADOS INICIAIS da loja (marcas, categorias, configurações, frete) —
//      usados na primeira vez que o site abre, ou ao "restaurar o catálogo
//      original" no painel. Os produtos ficam em produtos.js;
//   2) o CÁLCULO DE FRETE por CEP (tabela editável no painel);
//   3) a camada de ARMAZENAMENTO (LojaDB), que salva tudo no navegador
//      (localStorage). Vitrine e painel abertos no mesmo navegador enxergam os
//      mesmos dados na hora: mudou o preço no painel, a vitrine atualiza.
//
// Para colocar a loja no ar com vários aparelhos sincronizados (a dona mexe no
// celular, o cliente vê no dele), basta trocar os métodos carregar()/salvar()
// do LojaDB por um banco online (ex.: Firebase) — o resto do código não muda.
// ─────────────────────────────────────────────────────────────────────────────

const LOJA_STORAGE_KEY = "catarina_eccos_catalogo_v1";
const LOJA_VERSAO_DADOS = 1;

// Crédito da TF Solutions (produtora do site) — usado só no rodapé.
const TF_SOLUTIONS_WHATSAPP = "5551982165186";

// ─── MARCAS (as duas abas da vitrine) ────────────────────────────────────────
// As cores vêm dos logos dos dois perfis: o roxo da Catarina Cosméticos
// (Bel Col) e o verde das folhas da Eccos Brusque.
const LOJA_MARCAS_PADRAO = [
    {
        id: "belcol", nome: "Bel Col", assinatura: "Advanced skincare",
        perfil: "Catarina Cosméticos SC", descricao: "Distribuidora oficial Bel Col no Vale do Itajaí",
        frase: "Um sonho de pele para toda a vida",
        instagram: "catarinasccosmeticos", logo: "assets/marca-belcol.png", avatar: "assets/logo-catarina.webp",
        cor: "#583878", corEscura: "#3A2452", corClara: "#F1EAF7", corApoio: "#883870",
    },
    {
        id: "eccos", nome: "Eccos", assinatura: "Dermocosméticos",
        perfil: "Eccos Brusque", descricao: "Distribuidor oficial Eccos em Santa Catarina",
        frase: "Tecnologia que ilumina, essência que permanece",
        instagram: "eccosbrusque", logo: "assets/marca-eccos.png", avatar: "assets/logo-eccos-brusque.webp",
        cor: "#236B38", corEscura: "#16432A", corClara: "#EAF4E3", corApoio: "#7FB01C",
    },
];

// ─── CATEGORIAS (as "subpastas" de cada marca) ───────────────────────────────
const LOJA_CATEGORIAS_PADRAO = [
    // Bel Col
    { id: "bc-limpeza", marca: "belcol", nome: "Limpeza e higienização", icone: "fa-pump-soap" },
    { id: "bc-protocolos", marca: "belcol", nome: "Protocolos profissionais", icone: "fa-vial" },
    { id: "bc-seruns", marca: "belcol", nome: "Séruns e tratamento", icone: "fa-droplet" },
    { id: "bc-antiidade", marca: "belcol", nome: "Anti-idade", icone: "fa-wand-magic-sparkles" },
    { id: "bc-peelings", marca: "belcol", nome: "Peelings e clareamento", icone: "fa-layer-group" },
    { id: "bc-acne", marca: "belcol", nome: "Antiacne", icone: "fa-shield-heart" },
    { id: "bc-olhos-labios", marca: "belcol", nome: "Olhos e lábios", icone: "fa-eye" },
    { id: "bc-mascaras", marca: "belcol", nome: "Máscaras", icone: "fa-face-smile" },
    { id: "bc-corporal", marca: "belcol", nome: "Corporal", icone: "fa-person" },
    { id: "bc-capilar", marca: "belcol", nome: "Capilar", icone: "fa-spray-can-sparkles" },
    { id: "bc-solar", marca: "belcol", nome: "Proteção solar", icone: "fa-sun" },
    { id: "bc-acessorios", marca: "belcol", nome: "Acessórios", icone: "fa-brush" },
    // Eccos
    { id: "ec-higiene", marca: "eccos", nome: "Higienização e emoliência", icone: "fa-pump-soap" },
    { id: "ec-tonicos", marca: "eccos", nome: "Tônicos e hidratação", icone: "fa-spray-can-sparkles" },
    { id: "ec-seruns", marca: "eccos", nome: "Séruns e tratamento", icone: "fa-droplet" },
    { id: "ec-mascaras", marca: "eccos", nome: "Máscaras", icone: "fa-face-smile" },
    { id: "ec-acidos", marca: "eccos", nome: "Ácidos e esfoliação", icone: "fa-flask" },
    { id: "ec-solar", marca: "eccos", nome: "Proteção solar", icone: "fa-sun" },
    { id: "ec-medidas", marca: "eccos", nome: "Redução de medidas", icone: "fa-ruler" },
    { id: "ec-corpo", marca: "eccos", nome: "Corpo e massagem", icone: "fa-hand-holding-heart" },
    { id: "ec-capilar", marca: "eccos", nome: "Capilar", icone: "fa-seedling" },
    { id: "ec-oleos", marca: "eccos", nome: "Óleos, florais e chás", icone: "fa-leaf" },
];

// ─── FRETE ───────────────────────────────────────────────────────────────────
// O site calcula o frete pela TABELA abaixo (editável no painel, aba Frete):
//   · zonas    = regiões de destino, por UF ou por faixa de CEP;
//   · faixasKg = limites de peso (até 0,3 kg, até 0,5 kg, ...);
//   · servicos = Correios PAC, SEDEX, transportadora… cada um com o preço de
//                cada zona em cada faixa de peso, e o prazo em dias úteis.
// ATENÇÃO: os valores e prazos de fábrica são EXEMPLOS para demonstração.
// Substitua pelos valores do contrato/tabela real antes de divulgar.
const LOJA_FAIXAS_KG = [0.3, 0.5, 1, 2, 3, 5, 10, 20, 30];
const LOJA_ZONAS_PADRAO = [
    { id: "local", nome: "Brusque e região", ufs: [], ceps: "88350000-88359999" },
    { id: "sc", nome: "Santa Catarina", ufs: ["SC"], ceps: "" },
    { id: "sul", nome: "Paraná e Rio Grande do Sul", ufs: ["PR", "RS"], ceps: "" },
    { id: "sp", nome: "São Paulo", ufs: ["SP"], ceps: "" },
    { id: "sudeste", nome: "RJ, MG e ES", ufs: ["RJ", "MG", "ES"], ceps: "" },
    { id: "centro", nome: "Centro-Oeste", ufs: ["DF", "GO", "MT", "MS"], ceps: "" },
    { id: "nordeste", nome: "Nordeste", ufs: ["BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA"], ceps: "" },
    { id: "norte", nome: "Norte", ufs: ["PA", "AP", "AM", "RR", "AC", "RO", "TO"], ceps: "" },
];
const lojaFretePadrao = () => {
    const pac = {
        local: { prazo: [2, 4], precos: [14.9, 15.9, 17.9, 19.9, 21.9, 25.9, 34.9, 52.9, 69.9], extraKg: 2 },
        sc: { prazo: [3, 5], precos: [17.9, 18.9, 21.9, 24.9, 27.9, 33.9, 46.9, 72.9, 98.9], extraKg: 3 },
        sul: { prazo: [4, 7], precos: [21.9, 23.9, 27.9, 31.9, 35.9, 43.9, 62.9, 99.9, 139.9], extraKg: 4 },
        sp: { prazo: [5, 8], precos: [23.9, 25.9, 29.9, 34.9, 39.9, 48.9, 69.9, 112.9, 159.9], extraKg: 5 },
        sudeste: { prazo: [6, 9], precos: [27.9, 29.9, 34.9, 40.9, 46.9, 57.9, 84.9, 139.9, 196.9], extraKg: 6 },
        centro: { prazo: [7, 11], precos: [31.9, 34.9, 40.9, 48.9, 56.9, 71.9, 104.9, 172.9, 244.9], extraKg: 7 },
        nordeste: { prazo: [9, 14], precos: [37.9, 41.9, 49.9, 61.9, 73.9, 94.9, 142.9, 236.9, 332.9], extraKg: 10 },
        norte: { prazo: [11, 18], precos: [44.9, 49.9, 59.9, 74.9, 89.9, 116.9, 176.9, 292.9, 412.9], extraKg: 12 },
    };
    const prazosSedex = { local: [1, 2], sc: [1, 3], sul: [2, 3], sp: [2, 3], sudeste: [2, 4], centro: [3, 5], nordeste: [3, 6], norte: [4, 8] };
    const sedex = {}, transp = {};
    Object.keys(pac).forEach((z) => {
        sedex[z] = { prazo: prazosSedex[z], precos: pac[z].precos.map((v) => Math.floor(v * 1.65) + 0.9), extraKg: Math.round(pac[z].extraKg * 1.6) };
        transp[z] = { prazo: ["", ""], precos: LOJA_FAIXAS_KG.map(() => ""), extraKg: "" };
    });
    return {
        modo: "tabela",                // "tabela" = calcula pelo CEP · "combinar" = frete combinado no WhatsApp
        cepOrigem: "88350000",        // Brusque/SC
        embalagemG: 150,               // peso da caixa/embalagem somado ao pedido
        prazoPostagem: 1,              // dias úteis para separar e postar (somados ao prazo)
        gratisAcima: 0,                // 0 = desligado. Ex.: 500 → frete grátis (opção mais barata) acima de R$ 500
        valoresDeExemplo: true,        // some quando a tabela é salva no painel
        aviso: "Valor e prazo estimados pela tabela da loja. O frete exato é confirmado no WhatsApp antes do pagamento.",
        faixasKg: [...LOJA_FAIXAS_KG],
        zonas: LOJA_ZONAS_PADRAO.map((z) => ({ ...z, ufs: [...z.ufs] })),
        servicos: [
            { id: "pac", nome: "Correios PAC", ativo: true, tabela: pac },
            { id: "sedex", nome: "Correios SEDEX", ativo: true, tabela: sedex },
            { id: "transp", nome: "Transportadora", ativo: false, tabela: transp },
        ],
    };
};

// Faixas de CEP por estado (primeiros 5 dígitos). Usado quando a consulta do
// endereço (ViaCEP) não responde — o frete continua sendo calculado.
const LOJA_CEP_UF = [
    [1000, 19999, "SP"], [20000, 28999, "RJ"], [29000, 29999, "ES"], [30000, 39999, "MG"],
    [40000, 48999, "BA"], [49000, 49999, "SE"], [50000, 56999, "PE"], [57000, 57999, "AL"],
    [58000, 58999, "PB"], [59000, 59999, "RN"], [60000, 63999, "CE"], [64000, 64999, "PI"],
    [65000, 65999, "MA"], [66000, 68899, "PA"], [68900, 68999, "AP"], [69000, 69299, "AM"],
    [69300, 69399, "RR"], [69400, 69899, "AM"], [69900, 69999, "AC"], [70000, 72799, "DF"],
    [72800, 72999, "GO"], [73000, 73699, "DF"], [73700, 76799, "GO"], [76800, 76999, "RO"],
    [77000, 77999, "TO"], [78000, 78899, "MT"], [79000, 79999, "MS"], [80000, 87999, "PR"],
    [88000, 89999, "SC"], [90000, 99999, "RS"],
];
const lojaUfDoCep = (cep) => {
    const d = String(cep || "").replace(/\D/g, "");
    if (d.length !== 8) return "";
    const p = Number(d.slice(0, 5));
    const f = LOJA_CEP_UF.find(([a, b]) => p >= a && p <= b);
    return f ? f[2] : "";
};
const lojaFaixasDeCep = (texto) => String(texto || "").split(/[,;\n]/).map((t) => t.trim()).filter(Boolean).map((t) => {
    const [a, b] = t.split("-").map((x) => Number(x.replace(/\D/g, "")));
    return [a, b || a];
}).filter(([a, b]) => a > 0 && b >= a);
const lojaZonaDoCep = (frete, cep, uf) => {
    const n = Number(String(cep).replace(/\D/g, ""));
    const zonas = frete.zonas || [];
    // 1º as zonas por faixa de CEP (mais específicas), depois por estado
    return zonas.find((z) => lojaFaixasDeCep(z.ceps).some(([a, b]) => n >= a && n <= b))
        || zonas.find((z) => (z.ufs || []).includes(uf || lojaUfDoCep(cep)))
        || null;
};
// Devolve { uf, zona, pesoKg, opcoes: [{ id, nome, valor, prazoMin, prazoMax, gratis }] }
const lojaCalcularFrete = (cfg, cep, pesoItensG, valorPedido, ufInformada) => {
    const frete = cfg.frete || {};
    const d = String(cep || "").replace(/\D/g, "");
    const uf = ufInformada || lojaUfDoCep(d);
    const out = { uf, zona: null, pesoKg: 0, opcoes: [], erro: "" };
    if (d.length !== 8 || !uf) { out.erro = "CEP não encontrado. Confira os 8 números."; return out; }
    out.pesoKg = Math.round((Number(pesoItensG || 0) + Number(frete.embalagemG || 0)) / 10) / 100;
    if (frete.modo === "combinar") return out;
    const zona = lojaZonaDoCep(frete, d, uf);
    out.zona = zona;
    if (!zona) return out;
    const faixas = frete.faixasKg || [];
    (frete.servicos || []).filter((s) => s.ativo !== false).forEach((s) => {
        const linha = (s.tabela || {})[zona.id];
        if (!linha) return;
        let i = faixas.findIndex((f) => out.pesoKg <= f);
        let valor;
        if (i === -1) {
            // acima da última faixa: último preço + adicional por kg (se informado)
            const ultimo = Number(linha.precos[faixas.length - 1]);
            const extra = Number(linha.extraKg);
            if (!(ultimo > 0) || !(extra > 0)) return;
            valor = ultimo + Math.ceil(out.pesoKg - faixas[faixas.length - 1]) * extra;
        } else {
            valor = Number(linha.precos[i]);
            if (linha.precos[i] === "" || linha.precos[i] === null || !(valor >= 0) || Number.isNaN(valor)) return;
        }
        const post = Number(frete.prazoPostagem) || 0;
        const pMin = Number(linha.prazo?.[0]) || 0, pMax = Number(linha.prazo?.[1]) || pMin;
        out.opcoes.push({ id: s.id, nome: s.nome, valor: Math.round(valor * 100) / 100, prazoMin: pMin ? pMin + post : 0, prazoMax: pMax ? pMax + post : 0, gratis: false });
    });
    out.opcoes.sort((a, b) => a.valor - b.valor);
    if (out.opcoes.length && Number(frete.gratisAcima) > 0 && valorPedido >= Number(frete.gratisAcima)) {
        out.opcoes[0].valorOriginal = out.opcoes[0].valor;
        out.opcoes[0].valor = 0;
        out.opcoes[0].gratis = true;
    }
    return out;
};
const lojaPrazoTexto = (o) => !o || !o.prazoMin ? "" : o.prazoMin === o.prazoMax ? `${o.prazoMin} ${o.prazoMin === 1 ? "dia útil" : "dias úteis"}` : `${o.prazoMin} a ${o.prazoMax} dias úteis`;
const lojaPesoTexto = (kg) => kg < 1 ? `${Math.round(kg * 1000)} g` : `${kg.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`;

// ─── CONFIGURAÇÕES PADRÃO ────────────────────────────────────────────────────
const LOJA_CONFIG_PADRAO = {
    nomeLoja: "Catarina Cosméticos & Eccos Brusque",
    slogan: "Distribuidora oficial Bel Col e Eccos · Brusque/SC",
    // WhatsApp que recebe os pedidos: 55 + DDD + número (só números).
    // Enquanto estiver vazio, o pedido abre o WhatsApp para o cliente escolher o contato.
    whatsapp: "",
    telefoneExibicao: "",
    linkContato: "https://wa.link/7x4yh7", // link do WhatsApp que está na bio dos dois perfis
    endereco: "Brusque/SC",
    horarioTexto: "",
    avisoTopo: "Enviamos para todo o Brasil · Pedido finalizado pelo WhatsApp",

    heroTitulo: "Dermocosméticos profissionais, direto da distribuidora",
    heroSubtitulo: "Escolha a marca, monte sua sacolinha, calcule o frete pelo CEP e finalize o pedido no WhatsApp.",

    // Preços: "profissional" ou "final" (qual tabela fecha o pedido)
    tabelaPreco: "profissional",
    mostrarPrecoFinal: true, // mostra o preço final como referência ao lado do profissional
    avisoPrecos: "Preços da tabela profissional, válidos para profissionais da área de estética.",
    pedidoMinimo: 0,

    // Entrega e retirada
    entregaDisponivel: true,
    retiradaDisponivel: true,
    retiradaDias: [1, 2, 3, 4, 5],
    retiradaHoraInicio: "09:00",
    retiradaHoraFim: "18:00",
    retiradaIntervalo: 30,
    frete: null, // preenchido em lojaDadosIniciais()

    // Pagamento (finalizado pelo WhatsApp)
    formasPagamento: ["PIX", "Cartão de crédito", "Boleto"],
    avisoPagamento: "O pagamento é combinado e confirmado pelo WhatsApp: enviamos a chave PIX, o link do cartão ou o boleto na conversa.",

    // Painel
    senhaAdmin: "catarina123",
};

// ─── CATEGORIAS DO FINANCEIRO ────────────────────────────────────────────────
const LOJA_CATEGORIAS_ENTRADA = ["Venda pelo catálogo", "Venda direta", "Frete recebido", "Outras entradas"];
const LOJA_CATEGORIAS_SAIDA = ["Compra de produtos Bel Col", "Compra de produtos Eccos", "Frete e envios", "Embalagens", "Aluguel", "Energia, água e internet", "Funcionários", "Impostos e taxas", "Marketing", "Outras saídas"];

// ─── PREÇO EM USO ────────────────────────────────────────────────────────────
// A loja fecha o pedido pela tabela escolhida em Configurações (profissional
// ou final). Trocar a tabela muda a vitrine inteira de uma vez.
const lojaPreco = (p, cfg) => {
    const prof = Number(p.precoProf) || 0, fin = Number(p.precoFinal) || 0;
    if (cfg && cfg.tabelaPreco === "final") return fin || prof;
    return prof || fin;
};

// ─── MOVIMENTAÇÕES DE EXEMPLO (opcional) ─────────────────────────────────────
// O painel abre sem nenhum lançamento. Em Configurações há um botão que
// carrega ~2 meses de vendas e despesas fictícias para demonstração, todas
// marcadas com exemplo: true (e outro botão que as apaga de uma vez).
const lojaGerarExemplos = (dados) => {
    const produtos = dados.produtos.filter((p) => p.ativo !== false);
    let semente = 20261003;
    const rand = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; };
    const escolhe = (arr) => arr[Math.floor(rand() * arr.length)];
    const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
    let id = dados.lancamentos.reduce((m, l) => Math.max(m, Number(l.id) || 0), 0) + 1;
    const formas = ["PIX", "PIX", "PIX", "Cartão de crédito", "Boleto"];
    const nomes = ["Clínica Bella Pele", "Studio Renata Estética", "Espaço Vitalle", "Dra. Camila Rocha", "Ana Paula Esteticista", "Clínica Harmonize", "Juliana Martins", "Estética Flor de Lótus"];
    const lanc = [];
    for (let atras = 60; atras >= 1; atras--) {
        const dia = new Date(hoje); dia.setDate(hoje.getDate() - atras);
        if (dia.getDay() === 0) continue;
        const qtdVendas = Math.floor(rand() * 4);
        for (let v = 0; v < qtdVendas; v++) {
            const itens = [];
            const n = 2 + Math.floor(rand() * 4);
            for (let i = 0; i < n; i++) { const p = escolhe(produtos); itens.push({ id: p.id, nome: p.nome, qtd: 1 + Math.floor(rand() * 3), preco: lojaPreco(p, dados.config), custo: p.custo || 0 }); }
            const total = itens.reduce((a, it) => a + it.qtd * it.preco, 0);
            const d = new Date(dia); d.setHours(9 + Math.floor(rand() * 9), Math.floor(rand() * 60));
            lanc.push({ id: id++, exemplo: true, tipo: "entrada", data: d.toISOString(), categoria: rand() < 0.7 ? "Venda pelo catálogo" : "Venda direta", descricao: `${escolhe(nomes)} — ${itens.map((it) => `${it.qtd}x ${it.nome}`).join(", ")}`.slice(0, 160), valor: Math.round(total * 100) / 100, formaPagamento: escolhe(formas), itens });
        }
        const d = new Date(dia);
        const saida = (categoria, descricao, valor, forma = "PIX") => lanc.push({ id: id++, exemplo: true, tipo: "saida", data: d.toISOString(), categoria, descricao, valor: Math.round(valor * 100) / 100, formaPagamento: forma });
        if (dia.getDate() === 5) saida("Aluguel", "Aluguel da sala", 1600);
        if (dia.getDate() === 10) saida("Energia, água e internet", "Luz e internet", 310 + rand() * 60);
        if (dia.getDate() === 20) saida("Impostos e taxas", "Guia do Simples", 420 + rand() * 180);
        if (dia.getDay() === 1 && rand() < 0.6) saida("Compra de produtos Bel Col", "Reposição Bel Col", 1800 + rand() * 1500, "Boleto");
        if (dia.getDay() === 3 && rand() < 0.6) saida("Compra de produtos Eccos", "Reposição Eccos", 1500 + rand() * 1400, "Boleto");
        if (dia.getDay() === 5) saida("Frete e envios", "Postagens da semana (Correios)", 140 + rand() * 180, "Cartão de crédito");
    }
    return lanc;
};

// ─── MONTA O "BANCO" INICIAL ─────────────────────────────────────────────────
// custo = quanto a loja paga pelo produto (preencha no painel para ver a margem)
// estoque = vazio (null) → não controla estoque; com número → baixa a cada venda
const lojaProdutosIniciais = () => (typeof LOJA_PRODUTOS_BASE === "undefined" ? [] : LOJA_PRODUTOS_BASE)
    .map((p) => ({ custo: null, estoque: null, estoqueMin: 2, ativo: true, destaque: false, lancamento: false, uso: "", forma: "", linhaInfo: "", ...p }));
const lojaConfigInicial = () => ({ ...JSON.parse(JSON.stringify(LOJA_CONFIG_PADRAO)), frete: lojaFretePadrao() });
const lojaDadosIniciais = () => ({
    versao: LOJA_VERSAO_DADOS,
    versaoCatalogo: typeof LOJA_VERSAO_CATALOGO === "undefined" ? 1 : LOJA_VERSAO_CATALOGO,
    config: lojaConfigInicial(),
    marcas: LOJA_MARCAS_PADRAO.map((m) => ({ ...m })),
    categorias: LOJA_CATEGORIAS_PADRAO.map((c) => ({ ...c })),
    produtos: lojaProdutosIniciais(),
    cupons: [],
    lancamentos: [],
    pedidos: [],
    movEstoque: [],
});

// ─── CAMADA DE ARMAZENAMENTO ─────────────────────────────────────────────────
// Tudo é salvo no localStorage do navegador. Se o navegador bloquear o
// armazenamento (aba anônima, por exemplo), o site continua funcionando só na
// memória daquela aba.
const LojaDB = (() => {
    let memoria = null;
    const lerStorage = () => {
        try { return localStorage.getItem(LOJA_STORAGE_KEY); } catch (e) { return null; }
    };
    const gravarStorage = (texto) => {
        try { localStorage.setItem(LOJA_STORAGE_KEY, texto); return true; } catch (e) { return false; }
    };
    const completar = (d) => {
        // Garante que campos novos existam em dados salvos por versões anteriores
        d.config = { ...LOJA_CONFIG_PADRAO, ...(d.config || {}) };
        if (!d.config.frete || !Array.isArray(d.config.frete.servicos)) d.config.frete = lojaFretePadrao();
        d.marcas = d.marcas && d.marcas.length ? d.marcas : LOJA_MARCAS_PADRAO.map((m) => ({ ...m }));
        d.categorias = d.categorias || [];
        d.produtos = d.produtos || [];
        // produtos.js mudou de versão: troca o catálogo guardado pelo do arquivo,
        // mantendo custo e estoque lançados no painel
        if (typeof LOJA_VERSAO_CATALOGO !== "undefined" && d.versaoCatalogo !== LOJA_VERSAO_CATALOGO) {
            const antigos = new Map(d.produtos.map((p) => [p.id, p]));
            d.produtos = lojaProdutosIniciais().map((p) => { const a = antigos.get(p.id); return a ? { ...p, custo: a.custo ?? null, estoque: a.estoque ?? null, estoqueMin: a.estoqueMin ?? 2 } : p; });
            d.versaoCatalogo = LOJA_VERSAO_CATALOGO;
        }
        d.cupons = d.cupons || [];
        d.lancamentos = d.lancamentos || [];
        d.pedidos = d.pedidos || [];
        d.movEstoque = d.movEstoque || [];
        return d;
    };
    return {
        carregar() {
            const bruto = lerStorage();
            if (bruto) {
                try {
                    const d = JSON.parse(bruto);
                    if (d && d.versao === LOJA_VERSAO_DADOS) { memoria = completar(d); return memoria; }
                } catch (e) { /* dados corrompidos: recomeça */ }
            }
            if (memoria) return memoria;
            memoria = lojaDadosIniciais();
            gravarStorage(JSON.stringify(memoria));
            return memoria;
        },
        salvar(dados) {
            memoria = dados;
            return gravarStorage(JSON.stringify(dados));
        },
        restaurarOriginal() {
            memoria = lojaDadosIniciais();
            gravarStorage(JSON.stringify(memoria));
            return memoria;
        },
        importar(texto) {
            const d = JSON.parse(texto);
            if (!d || !Array.isArray(d.produtos) || !d.config) throw new Error("Arquivo de backup inválido.");
            d.versao = LOJA_VERSAO_DADOS;
            memoria = completar(d);
            gravarStorage(JSON.stringify(memoria));
            return memoria;
        },
        // Avisa quando outra aba (ex.: o painel) alterou os dados
        aoMudarEmOutraAba(callback) {
            window.addEventListener("storage", (e) => {
                if (e.key === LOJA_STORAGE_KEY) { memoria = null; callback(this.carregar()); }
            });
        },
    };
})();

// ─── UTILITÁRIOS COMPARTILHADOS ──────────────────────────────────────────────
const lojaMoeda = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const lojaCodigoProduto = (p) => p.codigo || `#${p.id}`;
const lojaEscapar = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lojaSemAcento = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
