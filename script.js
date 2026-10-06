// ─────────────────────────────────────────────────────────────────────────────
// CATARINA COSMÉTICOS & ECCOS BRUSQUE — VITRINE
// Os dados (marcas, categorias, produtos, configurações, frete) vêm do
// dados.js/produtos.js, através do LojaDB. A sacolinha fica salva no navegador
// do cliente e o pedido é finalizado no WhatsApp da loja.
// Dica: index.html#belcol e index.html#eccos abrem direto na aba da marca
// (bom para o link da bio de cada perfil do Instagram).
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);
    const esc = lojaEscapar;
    const moeda = lojaMoeda;
    const semAcento = lojaSemAcento;

    // ─── ESTADO ──────────────────────────────────────────────────────────────
    let dados = LojaDB.carregar();
    let cfg = dados.config;
    let produtos = [];
    let categorias = [];
    let marcas = [];
    const CHAVE_SACOLA = "catarina_eccos_sacolinha_v1";
    const CHAVE_CLIENTE = "catarina_eccos_cliente_v1";

    const estado = {
        marca: "todas",
        categoria: "todas",
        busca: "",
        ordem: "catalogo",
        uso: "",
        sacola: [], // [{ id, qtd }]
        cupom: null,
        etapa: 1,
        etapaMax: 1,
        tipoEntrega: "entrega",
        pagamento: "PIX",
        detalheId: null,
        detalheQtd: 1,
        frete: { cep: "", uf: "", cidade: "", servico: "", consultando: false, erro: "" },
    };

    const atualizarReferencias = () => {
        cfg = dados.config;
        produtos = dados.produtos.filter((p) => p.ativo !== false);
        categorias = dados.categorias;
        marcas = dados.marcas;
    };
    atualizarReferencias();

    try {
        const salva = JSON.parse(localStorage.getItem(CHAVE_SACOLA) || "[]");
        if (Array.isArray(salva)) estado.sacola = salva.filter((i) => i && i.id && i.qtd > 0);
    } catch (e) { /* sem armazenamento: sacola só na memória */ }

    const salvarSacola = () => {
        try { localStorage.setItem(CHAVE_SACOLA, JSON.stringify(estado.sacola)); } catch (e) { /* ignora */ }
    };

    // ─── AUXILIARES ──────────────────────────────────────────────────────────
    const marcaDe = (id) => marcas.find((m) => m.id === id) || { id, nome: "Outros", cor: "#3A2452", corEscura: "#2A2433", corClara: "#F1EEF4", corApoio: "#883870" };
    const categoriaDe = (id) => categorias.find((c) => c.id === id) || { id, nome: "Outros", icone: "fa-spa", marca: "" };
    const produtoPorId = (id) => produtos.find((p) => p.id === id);
    const preco = (p) => lojaPreco(p, cfg);
    const precoRef = (p) => (cfg.tabelaPreco !== "final" && cfg.mostrarPrecoFinal !== false && Number(p.precoFinal) > Number(p.precoProf)) ? Number(p.precoFinal) : 0;
    const temEstoqueControlado = (p) => p.estoque !== undefined && p.estoque !== null && p.estoque !== "";
    const esgotado = (p) => temEstoqueControlado(p) && Number(p.estoque) <= 0;
    const qtdNaSacola = (id) => (estado.sacola.find((i) => i.id === id) || {}).qtd || 0;
    const estiloMarca = (m) => `--marca:${m.cor};--marca-escura:${m.corEscura};--marca-clara:${m.corClara};--marca-apoio:${m.corApoio}`;
    const rotuloUso = { profissional: "Uso profissional", homecare: "Home care" };

    const linkPedido = (texto) => cfg.whatsapp
        ? `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(texto)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    const linkContato = (texto) => cfg.whatsapp
        ? `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(texto)}`
        : (cfg.linkContato || linkPedido(texto));

    // Foto do produto sobre o fundo claro da marca (como nas postagens)
    const fotoProduto = (p, grande = false) => p.imagem
        ? `<img class="foto" src="${esc(p.imagem)}" alt="${esc(p.nome)}" ${grande ? "" : 'loading="lazy"'}>`
        : `<span class="foto-vazia"><i class="fa-solid ${esc(categoriaDe(p.categoria).icone)}" aria-hidden="true"></i><small>Foto em breve</small></span>`;

    // ─── TOAST ───────────────────────────────────────────────────────────────
    let toastTimer = null;
    const toast = (msg, comBotao = true) => {
        const el = $("#toast");
        el.innerHTML = `<i class="fa-solid fa-circle-check"></i><span>${msg}</span>${comBotao ? `<button type="button" id="toast-ver">Ver sacolinha</button>` : ""}`;
        el.classList.add("mostrar");
        const btn = $("#toast-ver");
        if (btn) btn.onclick = () => { el.classList.remove("mostrar"); abrirSacolinha(); };
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove("mostrar"), 2800);
    };

    // ─── CONFIGURAÇÕES DA LOJA ───────────────────────────────────────────────
    const aplicarConfig = () => {
        document.title = `${cfg.nomeLoja} · Catálogo`;
        $("#nome-loja").textContent = cfg.nomeLoja;
        $("#slogan-loja").textContent = cfg.slogan || "";
        $("#marca-avatares").innerHTML = marcas.map((m) => m.avatar ? `<img src="${esc(m.avatar)}" alt="${esc(m.perfil || m.nome)}" width="48" height="48">` : "").join("");
        $("#aviso-topo").textContent = cfg.avisoTopo || "";
        $("#horario-topo").textContent = cfg.horarioTexto || "";
        $("#horario-topo-box").hidden = !cfg.horarioTexto;
        $("#telefone-topo").textContent = cfg.telefoneExibicao || "Fale com a gente";
        $("#hero-titulo").textContent = cfg.heroTitulo || "";
        $("#hero-sub").textContent = cfg.heroSubtitulo || "";
        $("#loja-endereco").textContent = cfg.endereco || "";
        $("#loja-horario").textContent = cfg.horarioTexto || "";
        $("#loja-horario-linha").hidden = !cfg.horarioTexto;
        $("#ret-endereco").textContent = cfg.endereco || "";
        $("#aviso-pagamento").textContent = cfg.avisoPagamento || "";
        $("#aviso-precos").textContent = cfg.tabelaPreco !== "final" ? (cfg.avisoPrecos || "") : "";
        $("#aviso-precos").hidden = !$("#aviso-precos").textContent;

        const oi = `Olá! Vim pelo catálogo online da ${cfg.nomeLoja} e queria tirar uma dúvida.`;
        $("#whats-topo").href = linkContato(oi);
        $("#whats-flutuante").href = linkContato(oi);
        $("#loja-whats").href = linkContato(oi);
        $("#loja-mapa").href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cfg.endereco || cfg.nomeLoja)}`;
        $("#loja-perfis").innerHTML = marcas.map((m) => `
            <a class="perfil" style="${estiloMarca(m)}" href="https://instagram.com/${esc((m.instagram || "").replace("@", ""))}" target="_blank" rel="noopener">
                ${m.avatar ? `<img src="${esc(m.avatar)}" alt="" width="56" height="56">` : ""}
                <span><strong>@${esc(m.instagram || "")}</strong><small>${esc(m.descricao || "")}</small></span>
                <i class="fa-brands fa-instagram" aria-hidden="true"></i>
            </a>`).join("");
        $("#rodape-copy").textContent = `© ${new Date().getFullYear()} ${cfg.nomeLoja} · ${cfg.endereco || ""}`;
        $("#credito-tf").href = `https://wa.me/${TF_SOLUTIONS_WHATSAPP}?text=${encodeURIComponent(`Olá! Vi o catálogo da ${cfg.nomeLoja} e quero um site assim.`)}`;

        // Entrega / retirada disponíveis
        const btnEnt = $('.opcao-entrega[data-tipo="entrega"]');
        const btnRet = $('.opcao-entrega[data-tipo="retirada"]');
        btnEnt.hidden = cfg.entregaDisponivel === false;
        btnRet.hidden = cfg.retiradaDisponivel === false;
        if (cfg.entregaDisponivel === false && estado.tipoEntrega === "entrega") estado.tipoEntrega = "retirada";
        if (cfg.retiradaDisponivel === false && estado.tipoEntrega === "retirada") estado.tipoEntrega = "entrega";

        // Dias de retirada
        const nomesDias = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
        $("#ret-dias-info").textContent = `Retiradas: ${(cfg.retiradaDias || []).map((d) => nomesDias[d]).join(", ")} · ${cfg.retiradaHoraInicio} às ${cfg.retiradaHoraFim}`;
        const hoje = new Date();
        const hojeISO = new Date(hoje.getTime() - hoje.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        $("#ret-data").min = hojeISO;

        $("#cupom-box").hidden = !(dados.cupons || []).some((c) => c.ativo !== false);
        renderPagamentos();
        aplicarTipoEntrega();
    };

    // ─── MARCA ATIVA (tema + abas + categorias) ──────────────────────────────
    const aplicarTema = () => {
        document.body.dataset.marca = estado.marca;
        const m = estado.marca === "todas" ? null : marcaDe(estado.marca);
        ["--marca", "--marca-escura", "--marca-clara", "--marca-apoio"].forEach((v) => document.body.style.removeProperty(v));
        if (m) {
            document.body.style.setProperty("--marca", m.cor);
            document.body.style.setProperty("--marca-escura", m.corEscura);
            document.body.style.setProperty("--marca-clara", m.corClara);
            document.body.style.setProperty("--marca-apoio", m.corApoio);
        }
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = m ? m.corEscura : "#2A2433";
    };

    const renderAbas = () => {
        const aba = (id, conteudo, extra = "") => `<button type="button" role="tab" class="aba-marca${estado.marca === id ? " ativa" : ""}" aria-selected="${estado.marca === id}" data-marca="${esc(id)}" ${extra}>${conteudo}</button>`;
        $("#abas-marca").innerHTML = aba("todas", `<span class="aba-marca-nome">Início</span>`)
            + marcas.map((m) => aba(m.id, `${m.avatar ? `<img src="${esc(m.avatar)}" alt="" width="30" height="30">` : ""}<span class="aba-marca-nome">${esc(m.nome)}</span><em>${produtos.filter((p) => p.marca === m.id).length}</em>`, `style="${estiloMarca(m)}"`)).join("");
    };

    const renderCategorias = () => {
        const bar = $("#categorias-bar");
        if (estado.marca === "todas") { bar.innerHTML = ""; bar.hidden = true; return; }
        bar.hidden = false;
        const daMarca = produtos.filter((p) => p.marca === estado.marca);
        const chip = (id, nome, icone, qtd) => `
            <button type="button" class="chip${estado.categoria === id ? " ativo" : ""}" data-cat="${esc(id)}">
                <i class="fa-solid ${esc(icone)}" aria-hidden="true"></i>${esc(nome)}<em>${qtd}</em>
            </button>`;
        const usadas = categorias.filter((c) => c.marca === estado.marca && daMarca.some((p) => p.categoria === c.id));
        bar.innerHTML = chip("todas", "Tudo", "fa-border-all", daMarca.length)
            + usadas.map((c) => chip(c.id, c.nome, c.icone, daMarca.filter((p) => p.categoria === c.id).length)).join("");
    };

    const escolherMarca = (id, rolar = true) => {
        estado.marca = marcas.some((m) => m.id === id) ? id : "todas";
        estado.categoria = "todas";
        estado.uso = "";
        $("#filtro-uso").value = "";
        if (estado.busca) { estado.busca = ""; $("#busca-input").value = ""; }
        try { history.replaceState(null, "", estado.marca === "todas" ? location.pathname + location.search : `#${estado.marca}`); } catch (e) { /* ignora */ }
        aplicarTema();
        renderAbas();
        renderCategorias();
        renderNovidades();
        renderProdutos();
        medirHeader();
        if (rolar) window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // ─── HERO: UMA "PORTA" POR MARCA ─────────────────────────────────────────
    const renderPortas = () => {
        $("#portas").innerHTML = marcas.map((m) => {
            const daMarca = produtos.filter((p) => p.marca === m.id);
            const vitrine = [...daMarca.filter((p) => p.destaque && p.imagem), ...daMarca.filter((p) => p.lancamento && p.imagem), ...daMarca.filter((p) => p.imagem)]
                .filter((p, i, arr) => arr.indexOf(p) === i).slice(0, 3);
            const cats = categorias.filter((c) => c.marca === m.id && daMarca.some((p) => p.categoria === c.id));
            return `
            <button type="button" class="porta" data-marca="${esc(m.id)}" style="${estiloMarca(m)}" aria-label="Ver produtos ${esc(m.nome)}">
                <span class="porta-topo">
                    ${m.logo ? `<img class="porta-logo" src="${esc(m.logo)}" alt="${esc(m.nome)}">` : `<strong class="porta-nome">${esc(m.nome)}</strong>`}
                    <span class="porta-perfil">${esc(m.perfil || "")}</span>
                </span>
                <span class="porta-fotos">${vitrine.map((p) => `<img src="${esc(p.imagem)}" alt="" loading="lazy">`).join("")}</span>
                <span class="porta-base">
                    <span class="porta-frase">${esc(m.descricao || "")}</span>
                    <span class="porta-cta">Ver ${daMarca.length} produtos em ${cats.length} categorias <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
                </span>
            </button>`;
        }).join("");
    };

    // ─── CARDS ───────────────────────────────────────────────────────────────
    const blocoPreco = (p) => {
        const ref = precoRef(p);
        return `<div class="precos">
            ${cfg.tabelaPreco !== "final" && ref ? `<span class="preco-rotulo">Profissional</span>` : ""}
            <span class="preco">${moeda(preco(p))}</span>
            ${ref ? `<span class="preco-ref">Preço final ${moeda(ref)}</span>` : ""}
        </div>`;
    };

    const cardProduto = (p) => {
        const m = marcaDe(p.marca);
        const qtd = qtdNaSacola(p.id);
        const sem = esgotado(p);
        let acao;
        if (sem) acao = `<span class="tag-esgotado">Esgotado</span>`;
        else if (qtd > 0) acao = `<div class="qtd-seletor"><button type="button" data-menos="${p.id}" aria-label="Diminuir">−</button><span>${qtd}</span><button type="button" data-mais="${p.id}" aria-label="Aumentar">+</button></div>`;
        else acao = `<button type="button" class="btn btn-marca" data-add="${p.id}"><i class="fa-solid fa-bag-shopping"></i> Adicionar</button>`;
        return `
            <article class="card${sem ? " card--esgotado" : ""}" style="${estiloMarca(m)}">
                <button type="button" class="card-foto" data-abrir="${p.id}" aria-label="Ver detalhes de ${esc(p.nome)}">
                    ${fotoProduto(p)}
                    ${p.lancamento ? `<span class="selo selo--lancamento">Lançamento</span>` : ""}
                    ${p.unidade ? `<span class="card-unidade">${esc(p.unidade)}</span>` : ""}
                </button>
                <div class="card-info">
                    <span class="card-linha">${esc(m.nome)}${p.linha ? ` · ${esc(p.linha)}` : ""}</span>
                    <h3 class="card-nome" data-abrir="${p.id}">${esc(p.nome)}</h3>
                    <p class="card-desc">${esc(p.descricao || "")}</p>
                    ${blocoPreco(p)}
                    <div class="card-acao">${acao}</div>
                </div>
            </article>`;
    };

    const renderNovidades = () => {
        const lista = produtos
            .filter((p) => (p.lancamento || p.destaque) && !esgotado(p) && (estado.marca === "todas" || p.marca === estado.marca))
            .sort((a, b) => (b.lancamento ? 1 : 0) - (a.lancamento ? 1 : 0));
        $("#novidades").hidden = lista.length === 0 || !!estado.busca.trim();
        $("#novidades-sub").textContent = estado.marca === "todas" ? "O que acabou de chegar nas duas marcas" : `Novidades ${marcaDe(estado.marca).nome}`;
        $("#carrossel-novidades").innerHTML = lista.map(cardProduto).join("");
    };

    const renderProdutos = () => {
        const termo = semAcento(estado.busca.trim());
        let lista = [...produtos];
        let titulo = "Todos os produtos", trilha = "", agrupar = null;

        if (termo) {
            lista = lista.filter((p) => {
                const alvo = semAcento(`${p.nome} ${p.descricao || ""} ${p.unidade || ""} ${p.linha || ""} ${p.codigo || ""} ${categoriaDe(p.categoria).nome} ${marcaDe(p.marca).nome}`);
                return termo.split(/\s+/).every((t) => alvo.includes(t));
            });
            titulo = `Resultados para “${estado.busca.trim()}”`;
            trilha = "Busca nas duas marcas";
        } else if (estado.marca !== "todas") {
            const m = marcaDe(estado.marca);
            lista = lista.filter((p) => p.marca === estado.marca);
            if (estado.categoria !== "todas") {
                lista = lista.filter((p) => p.categoria === estado.categoria);
                titulo = categoriaDe(estado.categoria).nome;
                trilha = m.nome;
                agrupar = (p) => p.linha || "";
            } else {
                titulo = `Todos os produtos ${m.nome}`;
                trilha = m.perfil || m.nome;
                agrupar = (p) => categoriaDe(p.categoria).nome;
            }
        } else {
            agrupar = (p) => marcaDe(p.marca).nome;
        }

        const temUso = !termo && estado.marca !== "todas" && produtos.some((p) => p.marca === estado.marca && p.uso);
        $("#filtro-uso-box").hidden = !temUso;
        if (temUso && estado.uso) lista = lista.filter((p) => p.uso === estado.uso);

        const esg = (p) => (esgotado(p) ? 1 : 0);
        if (estado.ordem !== "catalogo") {
            const ordens = {
                menor: (a, b) => esg(a) - esg(b) || preco(a) - preco(b),
                maior: (a, b) => esg(a) - esg(b) || preco(b) - preco(a),
                nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
            };
            lista.sort(ordens[estado.ordem]);
            agrupar = null;
        }

        $("#trilha").textContent = trilha;
        $("#trilha").hidden = !trilha;
        $("#titulo-lista").textContent = titulo;
        $("#contador-produtos").textContent = `${lista.length} ${lista.length === 1 ? "produto" : "produtos"}`;

        const alvo = $("#lista-produtos");
        if (!lista.length) {
            alvo.innerHTML = `<div class="vazio"><i class="fa-solid fa-magnifying-glass"></i><strong>Não encontramos esse produto</strong><p>Tente outra palavra ou fale com a gente no WhatsApp — a distribuidora pode ter o que você procura.</p></div>`;
            return;
        }
        if (!agrupar) { alvo.innerHTML = `<div class="grade-produtos">${lista.map(cardProduto).join("")}</div>`; return; }
        const grupos = new Map();
        lista.forEach((p) => { const k = agrupar(p); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(p); });
        alvo.innerHTML = [...grupos.entries()].map(([nome, itens]) => `
            <section class="grupo">
                ${grupos.size > 1 && nome ? `<h3 class="grupo-titulo">${esc(nome)} <em>${itens.length}</em></h3>` : ""}
                <div class="grade-produtos">${itens.map(cardProduto).join("")}</div>
            </section>`).join("");
    };

    const renderTudo = () => {
        aplicarTema();
        renderAbas();
        renderCategorias();
        renderPortas();
        renderNovidades();
        renderProdutos();
        renderSacola();
    };

    // ─── SACOLINHA: ITENS E TOTAIS ───────────────────────────────────────────
    const itensSacola = () => estado.sacola
        .map((i) => ({ ...i, produto: produtoPorId(i.id) }))
        .filter((i) => i.produto);

    const calcular = () => {
        const itens = itensSacola();
        const r2 = (v) => Math.round(v * 100) / 100;
        const subtotal = r2(itens.reduce((a, i) => a + i.qtd * preco(i.produto), 0));
        const pesoG = itens.reduce((a, i) => a + i.qtd * (Number(i.produto.pesoG) || 150), 0);
        let desconto = 0;
        if (estado.cupom) {
            if (estado.cupom.valorMinimo && subtotal < estado.cupom.valorMinimo) {
                estado.cupom = null;
                const msg = $("#cupom-msg");
                msg.textContent = "Cupom removido: o pedido ficou abaixo do valor mínimo.";
                msg.className = "cupom-msg erro";
            } else {
                desconto = r2(estado.cupom.tipo === "fixo" ? Math.min(estado.cupom.valor, subtotal) : subtotal * (estado.cupom.valor / 100));
            }
        }
        let taxa = 0, taxaTexto = "", frete = null, opcao = null;
        if (estado.tipoEntrega === "entrega") {
            if ((cfg.frete || {}).modo === "combinar") taxaTexto = "A combinar";
            else if (estado.frete.cep.length !== 8) taxaTexto = "Informe o CEP";
            else {
                frete = lojaCalcularFrete(cfg, estado.frete.cep, pesoG, subtotal - desconto, estado.frete.uf);
                opcao = frete.opcoes.find((o) => o.id === estado.frete.servico) || frete.opcoes[0] || null;
                if (opcao) { taxa = opcao.valor; taxaTexto = opcao.gratis ? "Grátis" : moeda(taxa); }
                else taxaTexto = "A combinar";
            }
        } else {
            taxaTexto = "Retirada";
        }
        const total = r2(Math.max(0, subtotal - desconto) + taxa);
        const qtdItens = itens.reduce((a, i) => a + i.qtd, 0);
        return { itens, subtotal, desconto, taxa, taxaTexto, total, qtdItens, pesoG, frete, opcao };
    };

    const renderSacola = () => {
        const c = calcular();
        const lista = $("#lista-itens");
        if (!c.itens.length) {
            lista.innerHTML = `<div class="sacola-vazia"><i class="fa-solid fa-bag-shopping"></i><strong>Sua sacolinha está vazia</strong><p>Escolha uma marca e adicione os produtos do seu pedido.</p><button type="button" class="btn btn-escuro" id="btn-ir-produtos">Ver produtos</button></div>`;
            $("#btn-ir-produtos").onclick = () => { fecharSacolinha(); document.getElementById("produtos").scrollIntoView(); };
        } else {
            lista.innerHTML = c.itens.map(({ produto: p, qtd }) => `
                <div class="item" style="${estiloMarca(marcaDe(p.marca))}">
                    <div class="item-foto">${fotoProduto(p)}</div>
                    <div class="item-info">
                        <p class="item-nome">${esc(p.nome)}</p>
                        <p class="item-unidade">${esc(marcaDe(p.marca).nome)}${p.unidade ? ` · ${esc(p.unidade)}` : ""} · ${moeda(preco(p))} cada</p>
                        <div class="item-rodape">
                            <div class="qtd-seletor"><button type="button" data-menos="${p.id}" aria-label="Diminuir">−</button><span>${qtd}</span><button type="button" data-mais="${p.id}" aria-label="Aumentar">+</button></div>
                            <strong class="item-preco">${moeda(preco(p) * qtd)}</strong>
                        </div>
                    </div>
                    <button type="button" class="item-remover" data-remover="${p.id}" aria-label="Remover ${esc(p.nome)}"><i class="fa-solid fa-xmark"></i></button>
                </div>`).join("")
                + (cfg.tabelaPreco !== "final" && cfg.avisoPrecos ? `<p class="campo-ajuda nota-precos"><i class="fa-solid fa-circle-info"></i> ${esc(cfg.avisoPrecos)}</p>` : "");
        }

        // Totais
        $("#t-subtotal").textContent = moeda(c.subtotal);
        $("#t-desconto-linha").hidden = c.desconto <= 0;
        $("#t-desconto").textContent = `- ${moeda(c.desconto)}${estado.cupom ? ` (${estado.cupom.codigo})` : ""}`;
        $("#t-entrega-linha").hidden = estado.etapa < 2 && !c.opcao;
        $("#t-entrega-rotulo").textContent = estado.tipoEntrega === "entrega" ? (c.opcao ? `Frete (${c.opcao.nome})` : "Frete") : "Entrega";
        $("#t-entrega").textContent = c.taxaTexto;
        $("#t-total").textContent = moeda(c.total);

        // Header, badge e barra inferior
        const badge = $("#badge-sacolinha");
        if (badge.textContent !== String(c.qtdItens)) {
            badge.textContent = c.qtdItens;
            badge.classList.remove("pulo"); void badge.offsetWidth; badge.classList.add("pulo");
        }
        $("#total-header").textContent = moeda(c.subtotal - c.desconto);
        $("#barra-qtd").textContent = `${c.qtdItens} ${c.qtdItens === 1 ? "item" : "itens"} na sacolinha`;
        $("#barra-total").textContent = moeda(c.subtotal - c.desconto);
        $("#barra-sacolinha").classList.toggle("mostrar", c.qtdItens > 0 && !$("#sacolinha").classList.contains("aberta"));
        document.body.classList.toggle("tem-itens", c.qtdItens > 0);
        $("#btn-avancar").disabled = estado.etapa === 1 && c.itens.length === 0;

        renderFrete(c);
        return c;
    };

    const alterarQtd = (id, delta, origemCard = false) => {
        const p = produtoPorId(id);
        if (!p) return;
        const item = estado.sacola.find((i) => i.id === id);
        const atual = item ? item.qtd : 0;
        const nova = atual + delta;
        if (delta > 0 && temEstoqueControlado(p) && nova > Number(p.estoque)) {
            toast(`Temos só ${p.estoque} ${Number(p.estoque) === 1 ? "unidade" : "unidades"} de ${esc(p.nome)} no momento.`, false);
            return;
        }
        if (nova <= 0) estado.sacola = estado.sacola.filter((i) => i.id !== id);
        else if (item) item.qtd = nova;
        else estado.sacola.push({ id, qtd: nova });
        salvarSacola();
        renderSacola();
        renderProdutos();
        renderNovidades();
        if (delta > 0 && atual === 0 && origemCard) toast(`${esc(p.nome)} na sacolinha!`);
    };

    // ─── CUPOM ───────────────────────────────────────────────────────────────
    const aplicarCupom = () => {
        const codigo = $("#cupom-input").value.trim().toUpperCase();
        const msg = $("#cupom-msg");
        if (!codigo) return;
        const c = (dados.cupons || []).find((x) => (x.codigo || "").toUpperCase() === codigo);
        const subtotal = calcular().subtotal;
        let erro = "";
        if (!c) erro = "Cupom não encontrado.";
        else if (c.ativo === false) erro = "Este cupom não está mais ativo.";
        else if (c.validade && new Date(`${c.validade}T23:59:59`) < new Date()) erro = "Este cupom expirou.";
        else if (c.valorMinimo && subtotal < c.valorMinimo) erro = `Válido para pedidos a partir de ${moeda(c.valorMinimo)}.`;
        if (erro) { estado.cupom = null; msg.textContent = erro; msg.className = "cupom-msg erro"; }
        else {
            estado.cupom = c;
            msg.textContent = `Cupom ${c.codigo} aplicado: ${c.tipo === "fixo" ? moeda(c.valor) : `${c.valor}%`} de desconto!`;
            msg.className = "cupom-msg ok";
        }
        renderSacola();
    };

    // ─── ENTREGA: FRETE POR CEP ──────────────────────────────────────────────
    const aplicarTipoEntrega = () => {
        $$(".opcao-entrega").forEach((b) => {
            const ativo = b.dataset.tipo === estado.tipoEntrega;
            b.classList.toggle("ativa", ativo);
            b.setAttribute("aria-checked", ativo);
        });
        $("#form-entrega").hidden = estado.tipoEntrega !== "entrega";
        $("#form-retirada").hidden = estado.tipoEntrega !== "retirada";
    };

    // Mostra as opções de frete (PAC, SEDEX, transportadora…) do CEP informado
    const renderFrete = (c) => {
        const box = $("#frete-resultado");
        const f = estado.frete;
        const combinar = (cfg.frete || {}).modo === "combinar";
        $("#ent-endereco").hidden = f.cep.length !== 8 || !!f.erro || f.consultando;
        if (estado.tipoEntrega !== "entrega") { box.innerHTML = ""; return; }
        if (f.consultando) { box.innerHTML = `<p class="frete-status"><i class="fa-solid fa-spinner fa-spin"></i> Consultando o CEP…</p>`; return; }
        if (f.erro) { box.innerHTML = `<div class="aviso aviso--alerta"><i class="fa-solid fa-triangle-exclamation"></i><p>${esc(f.erro)}</p></div>`; return; }
        if (f.cep.length !== 8) {
            box.innerHTML = combinar ? "" : `<p class="frete-status"><i class="fa-solid fa-box"></i> Peso estimado do pedido: <strong>${lojaPesoTexto((c.pesoG + Number((cfg.frete || {}).embalagemG || 0)) / 1000)}</strong>. Digite o CEP para ver o valor e o prazo.</p>`;
            return;
        }
        const destino = `${f.cidade ? `${esc(f.cidade)}/` : ""}${esc(f.uf || (c.frete && c.frete.uf) || "")}`;
        if (combinar || !c.frete || !c.frete.opcoes.length) {
            box.innerHTML = `<div class="aviso aviso--info"><i class="fa-solid fa-comments"></i><p><strong>Frete a combinar${destino ? ` para ${destino}` : ""}.</strong> Finalize o pedido e a loja informa o valor e o prazo no WhatsApp antes do pagamento.</p></div>`;
            return;
        }
        const escolhida = c.opcao ? c.opcao.id : "";
        const gratisAcima = Number((cfg.frete || {}).gratisAcima) || 0;
        const falta = gratisAcima - (c.subtotal - c.desconto);
        box.innerHTML = `
            <p class="frete-destino"><i class="fa-solid fa-location-dot"></i> Envio para <strong>${destino}</strong> · peso estimado ${lojaPesoTexto(c.frete.pesoKg)}</p>
            <div class="opcoes-frete" role="radiogroup" aria-label="Forma de envio">
                ${c.frete.opcoes.map((o) => `
                <button type="button" class="opcao-frete${o.id === escolhida ? " ativa" : ""}" role="radio" aria-checked="${o.id === escolhida}" data-frete="${esc(o.id)}">
                    <span class="opcao-frete-bolinha"></span>
                    <span class="opcao-frete-nome"><strong>${esc(o.nome)}</strong><small>${lojaPrazoTexto(o) ? `Chega em ${lojaPrazoTexto(o)}` : "Prazo informado no WhatsApp"}</small></span>
                    <span class="opcao-frete-valor">${o.gratis ? `<s>${moeda(o.valorOriginal)}</s> Grátis` : moeda(o.valor)}</span>
                </button>`).join("")}
            </div>
            ${gratisAcima > 0 && falta > 0 ? `<p class="frete-status"><i class="fa-solid fa-gift"></i> Faltam <strong>${moeda(falta)}</strong> para ganhar frete grátis.</p>` : ""}
            ${(cfg.frete || {}).aviso ? `<p class="campo-ajuda">${esc(cfg.frete.aviso)}</p>` : ""}`;
    };

    const mascaraCep = (v) => { const d = v.replace(/\D/g, "").slice(0, 8); return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; };

    let consultaAtual = 0;
    const consultarCep = async () => {
        const d = $("#ent-cep").value.replace(/\D/g, "");
        const f = estado.frete;
        if (d.length !== 8) { f.cep = ""; f.erro = d.length ? "O CEP tem 8 números." : ""; renderSacola(); return; }
        const mudou = d !== f.cep;
        f.cep = d; f.erro = ""; f.uf = lojaUfDoCep(d); if (mudou) f.cidade = "";
        if (!f.uf) { f.cep = ""; f.erro = "CEP não encontrado. Confira os 8 números."; renderSacola(); return; }
        f.consultando = true;
        renderSacola();
        const minha = ++consultaAtual;
        // Busca rua, bairro e cidade no ViaCEP. Se a consulta falhar, o frete é
        // calculado do mesmo jeito (pela faixa de CEP do estado) e o cliente
        // digita o endereço.
        try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 5000);
            const r = await fetch(`https://viacep.com.br/ws/${d}/json/`, { signal: ctrl.signal });
            clearTimeout(t);
            const j = await r.json();
            if (minha !== consultaAtual) return;
            if (j && j.erro) { f.cep = ""; f.erro = "CEP não encontrado. Confira os 8 números."; }
            else if (j && j.uf) {
                f.uf = j.uf; f.cidade = j.localidade || "";
                if (mudou || !$("#ent-rua").value) $("#ent-rua").value = j.logradouro || "";
                if (mudou || !$("#ent-bairro").value) $("#ent-bairro").value = j.bairro || "";
                $("#ent-cidade").value = j.localidade || "";
                $("#ent-uf").value = j.uf;
            }
        } catch (e) {
            if (minha !== consultaAtual) return;
            if (!$("#ent-uf").value) $("#ent-uf").value = f.uf;
        }
        f.consultando = false;
        renderSacola();
        if (!f.erro && !$("#ent-endereco").hidden) ($("#ent-rua").value ? $("#ent-numero") : $("#ent-rua")).focus({ preventScroll: true });
    };

    const montarHorarios = () => {
        const sel = $("#ret-hora");
        const dataStr = $("#ret-data").value;
        const [hI, mI] = (cfg.retiradaHoraInicio || "09:00").split(":").map(Number);
        const [hF, mF] = (cfg.retiradaHoraFim || "18:00").split(":").map(Number);
        const passo = Number(cfg.retiradaIntervalo) || 30;
        const agora = new Date();
        const ehHoje = dataStr && dataStr === new Date(agora.getTime() - agora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        const minAgora = agora.getHours() * 60 + agora.getMinutes() + 60; // 1 h pra separar o pedido
        const anterior = sel.value;
        let html = `<option value="">Selecione</option>`;
        let algum = false;
        for (let m = hI * 60 + mI; m <= hF * 60 + mF; m += passo) {
            if (ehHoje && m < minAgora) continue;
            const hh = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
            html += `<option value="${hh}">${hh}</option>`;
            algum = true;
        }
        if (!algum) html = `<option value="">Sem horários neste dia</option>`;
        sel.innerHTML = html;
        if (anterior && sel.querySelector(`option[value="${anterior}"]`)) sel.value = anterior;
    };

    // ─── PAGAMENTO ───────────────────────────────────────────────────────────
    const ICONES_PAG = { "PIX": "fa-brands fa-pix", "Cartão de crédito": "fa-regular fa-credit-card", "Cartão de débito": "fa-solid fa-credit-card", "Boleto": "fa-solid fa-barcode", "Dinheiro": "fa-solid fa-money-bill-wave" };
    const renderPagamentos = () => {
        const formas = cfg.formasPagamento && cfg.formasPagamento.length ? cfg.formasPagamento : ["PIX"];
        if (!formas.includes(estado.pagamento)) estado.pagamento = formas[0];
        $("#opcoes-pagamento").innerHTML = formas.map((f) => `
            <button type="button" class="opcao-pag${f === estado.pagamento ? " ativa" : ""}" data-pag="${esc(f)}">
                <i class="${ICONES_PAG[f] || "fa-solid fa-wallet"}"></i>${esc(f)}
            </button>`).join("");
    };

    // ─── VALIDAÇÃO POR ETAPA ─────────────────────────────────────────────────
    const marcarErro = (el, erro) => { el.classList.toggle("erro", erro); return !erro; };
    const validarEtapa = (n) => {
        const c = calcular();
        if (n === 1) {
            if (!c.itens.length) { toast("Adicione pelo menos um produto.", false); return false; }
            if (cfg.pedidoMinimo && c.subtotal - c.desconto < cfg.pedidoMinimo) { toast(`O pedido mínimo é de ${moeda(cfg.pedidoMinimo)}.`, false); return false; }
            return true;
        }
        if (n === 2) {
            if (estado.tipoEntrega === "entrega") {
                if (estado.frete.consultando) { toast("Aguarde a consulta do CEP.", false); return false; }
                if (estado.frete.cep.length !== 8 || estado.frete.erro) { marcarErro($("#ent-cep"), true); toast("Informe o CEP para calcular o frete.", false); return false; }
                const ok = [
                    marcarErro($("#ent-rua"), $("#ent-rua").value.trim().length < 3),
                    marcarErro($("#ent-numero"), $("#ent-numero").value.trim() === ""),
                    marcarErro($("#ent-bairro"), $("#ent-bairro").value.trim().length < 2),
                    marcarErro($("#ent-cidade"), $("#ent-cidade").value.trim().length < 2),
                    marcarErro($("#ent-uf"), $("#ent-uf").value.trim().length !== 2),
                ].every(Boolean);
                if (!ok) { toast("Complete o endereço de entrega.", false); return false; }
                return true;
            }
            const dataEl = $("#ret-data"), horaEl = $("#ret-hora");
            const ok = marcarErro(dataEl, !dataEl.value) & marcarErro(horaEl, !horaEl.value);
            if (dataEl.value) {
                const [a, m, d] = dataEl.value.split("-").map(Number);
                const dia = new Date(a, m - 1, d).getDay();
                if (!(cfg.retiradaDias || []).includes(dia)) {
                    marcarErro(dataEl, true);
                    toast("Não há retirada neste dia da semana. Escolha outra data.", false);
                    return false;
                }
            }
            if (!ok) { toast("Escolha o dia e o horário da retirada.", false); return false; }
            return true;
        }
        if (n === 4) {
            const nome = $("#cli-nome"), tel = $("#cli-telefone");
            const ok = [
                marcarErro(nome, nome.value.trim().split(/\s+/).filter(Boolean).length < 2),
                marcarErro(tel, tel.value.replace(/\D/g, "").length < 10),
            ].every(Boolean);
            if (!ok) toast("Informe nome e sobrenome e um WhatsApp válido.", false);
            return ok;
        }
        return true;
    };

    // ─── RESUMO ──────────────────────────────────────────────────────────────
    const dataBR = (iso) => { const [a, m, d] = iso.split("-"); return `${d}/${m}/${a}`; };
    const enderecoEntrega = () => ({
        cep: mascaraCep(estado.frete.cep), rua: $("#ent-rua").value.trim(), numero: $("#ent-numero").value.trim(),
        complemento: $("#ent-complemento").value.trim(), bairro: $("#ent-bairro").value.trim(),
        cidade: $("#ent-cidade").value.trim(), uf: $("#ent-uf").value.trim().toUpperCase(),
    });
    const descricaoEntrega = (c) => {
        if (estado.tipoEntrega === "entrega") {
            const e = enderecoEntrega();
            const prazo = c.opcao ? lojaPrazoTexto(c.opcao) : "";
            return {
                titulo: "Entrega",
                linhas: [
                    `${e.rua}, nº ${e.numero}${e.complemento ? ` — ${e.complemento}` : ""}`,
                    `${e.bairro} · ${e.cidade}/${e.uf}`,
                    `CEP ${e.cep}`,
                    c.opcao ? `Envio: ${c.opcao.nome}${prazo ? ` (${prazo})` : ""}` : "Envio: a combinar",
                ],
            };
        }
        return { titulo: "Retirada", linhas: [`${dataBR($("#ret-data").value)} às ${$("#ret-hora").value}`, cfg.endereco || ""] };
    };

    const renderResumo = () => {
        const c = calcular();
        const ent = descricaoEntrega(c);
        const obs = $("#obs-input").value.trim();
        const empresa = $("#cli-empresa").value.trim(), doc = $("#cli-doc").value.trim();
        $("#resumo").innerHTML = `
            <div class="resumo-bloco">
                <h5>Itens (${c.qtdItens}) <button type="button" data-ir="1">Alterar</button></h5>
                <ul>${c.itens.map(({ produto: p, qtd }) => `<li><span>${qtd}x ${esc(p.nome)} <small>${esc(p.unidade || "")}</small></span><span>${moeda(preco(p) * qtd)}</span></li>`).join("")}</ul>
            </div>
            <div class="resumo-bloco">
                <h5>${ent.titulo} <button type="button" data-ir="2">Alterar</button></h5>
                ${ent.linhas.map((l) => `<p>${esc(l)}</p>`).join("")}
                ${estado.tipoEntrega === "entrega" ? `<p>Frete: ${c.taxaTexto}</p>` : ""}
            </div>
            <div class="resumo-bloco">
                <h5>Pagamento <button type="button" data-ir="3">Alterar</button></h5>
                <p>${esc(estado.pagamento)}</p>
                ${estado.cupom ? `<p>Cupom: ${esc(estado.cupom.codigo)} (- ${moeda(c.desconto)})</p>` : ""}
                ${obs ? `<p>Obs.: ${esc(obs)}</p>` : ""}
            </div>
            <div class="resumo-bloco">
                <h5>Seus dados <button type="button" data-ir="4">Alterar</button></h5>
                <p>${esc($("#cli-nome").value.trim())}</p>
                <p>${esc($("#cli-telefone").value.trim())}</p>
                ${empresa ? `<p>${esc(empresa)}</p>` : ""}
                ${doc ? `<p>CPF/CNPJ: ${esc(doc)}</p>` : ""}
            </div>
            <div class="aviso aviso--whats"><i class="fa-brands fa-whatsapp"></i><p>Ao tocar em <strong>Finalizar no WhatsApp</strong>, abrimos a conversa com a loja com todo o pedido escrito. É só enviar e combinar o pagamento.</p></div>`;
    };

    // ─── NAVEGAÇÃO ENTRE ETAPAS ──────────────────────────────────────────────
    const irParaEtapa = (n) => {
        estado.etapa = n;
        if (typeof n === "number" && n > estado.etapaMax) estado.etapaMax = n;
        $$(".etapa").forEach((s) => { s.hidden = s.dataset.etapa !== String(n); });
        const sucesso = n === "ok";
        $("#etapas").hidden = sucesso;
        $("#sacolinha-rodape").hidden = sucesso;
        $$("#etapas li").forEach((li) => {
            const e = Number(li.dataset.etapa);
            li.classList.toggle("ativa", e === n);
            li.classList.toggle("feita", e !== n && e <= estado.etapaMax);
        });
        $("#btn-voltar").hidden = n === 1;
        $("#btn-avancar").hidden = n === 5;
        $("#btn-finalizar").hidden = n !== 5;
        if (n === 2) montarHorarios();
        if (n === 5) renderResumo();
        renderSacola();
        $("#sacolinha-corpo").scrollTop = 0;
    };

    const abrirSacolinha = () => {
        $("#toast").classList.remove("mostrar");
        $("#sacolinha").classList.add("aberta");
        $("#sacolinha").setAttribute("aria-hidden", "false");
        $("#fundo-sacolinha").classList.add("mostrar");
        document.body.classList.add("travado");
        renderSacola();
    };
    const fecharSacolinha = () => {
        $("#sacolinha").classList.remove("aberta");
        $("#sacolinha").setAttribute("aria-hidden", "true");
        $("#fundo-sacolinha").classList.remove("mostrar");
        document.body.classList.remove("travado");
        if (estado.etapa === "ok") novoPedido(false);
        renderSacola();
    };

    // ─── FINALIZAR NO WHATSAPP ───────────────────────────────────────────────
    const gerarCodigo = () => {
        const L = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let s = "CE";
        for (let i = 0; i < 6; i++) s += L[Math.floor(Math.random() * L.length)];
        return s;
    };

    const montarMensagem = (codigo, c) => {
        const ent = descricaoEntrega(c);
        const obs = $("#obs-input").value.trim();
        const empresa = $("#cli-empresa").value.trim(), doc = $("#cli-doc").value.trim();
        const linhas = [`🛍️ *NOVO PEDIDO — ${cfg.nomeLoja}*`, `Pedido: *#${codigo}*`, `Tabela: ${cfg.tabelaPreco === "final" ? "preço final" : "profissional"}`];
        marcas.forEach((m) => {
            const daMarca = c.itens.filter((i) => i.produto.marca === m.id);
            if (!daMarca.length) return;
            linhas.push("", `*${m.nome}*`);
            daMarca.forEach(({ produto: p, qtd }) => linhas.push(`• ${qtd}x ${p.nome}${p.unidade ? ` (${p.unidade})` : ""} — ${moeda(preco(p) * qtd)} [${lojaCodigoProduto(p)}]`));
        });
        linhas.push("", `Subtotal: ${moeda(c.subtotal)}`);
        if (c.desconto > 0) linhas.push(`Desconto (${estado.cupom.codigo}): - ${moeda(c.desconto)}`);
        if (estado.tipoEntrega === "entrega") linhas.push(`Frete: ${c.taxaTexto}${c.opcao ? ` — ${c.opcao.nome}` : ""}`);
        linhas.push(`*Total: ${moeda(c.total)}*`, "");
        if (estado.tipoEntrega === "entrega") {
            linhas.push("🚚 *Entrega*", ...ent.linhas, `Peso estimado: ${lojaPesoTexto((c.pesoG + Number((cfg.frete || {}).embalagemG || 0)) / 1000)}`);
        } else {
            linhas.push("🏪 *Retirada*", ...ent.linhas.filter((l) => l && l !== cfg.endereco));
        }
        linhas.push("", `💰 *Pagamento:* ${estado.pagamento}`);
        if (estado.pagamento === "PIX") linhas.push("_Aguardo a chave PIX para pagar._");
        if (obs) linhas.push("", `📝 *Obs.:* ${obs}`);
        linhas.push("", `👤 *Cliente:* ${$("#cli-nome").value.trim()}`, `📱 ${$("#cli-telefone").value.trim()}`);
        if (empresa) linhas.push(`🏢 ${empresa}`);
        if (doc) linhas.push(`CPF/CNPJ: ${doc}`);
        return linhas.join("\n");
    };

    const finalizar = () => {
        for (const n of [1, 2, 4]) {
            if (!validarEtapa(n)) { irParaEtapa(n); return; }
        }
        const c = calcular();
        const codigo = gerarCodigo();
        const mensagem = montarMensagem(codigo, c);
        const url = linkPedido(mensagem);
        const e = enderecoEntrega();

        // Registra o pedido (aparece no painel da loja, aba Pedidos)
        try {
            const atual = LojaDB.carregar();
            atual.pedidos.unshift({
                codigo,
                data: new Date().toISOString(),
                status: "novo",
                origem: "site",
                cliente: $("#cli-nome").value.trim(),
                telefone: $("#cli-telefone").value.trim(),
                empresa: $("#cli-empresa").value.trim(),
                documento: $("#cli-doc").value.trim(),
                tabela: cfg.tabelaPreco === "final" ? "final" : "profissional",
                itens: c.itens.map(({ produto: p, qtd }) => ({ id: p.id, codigo: lojaCodigoProduto(p), marca: p.marca, nome: p.nome, unidade: p.unidade, qtd, preco: preco(p) })),
                subtotal: c.subtotal, desconto: c.desconto, cupom: estado.cupom ? estado.cupom.codigo : "",
                taxaEntrega: c.taxa, total: c.total,
                entrega: estado.tipoEntrega === "entrega"
                    ? { tipo: "entrega", ...e, servico: c.opcao ? c.opcao.nome : "A combinar", prazo: c.opcao ? lojaPrazoTexto(c.opcao) : "", pesoKg: (c.pesoG + Number((cfg.frete || {}).embalagemG || 0)) / 1000, taxa: c.taxa, taxaTexto: c.taxaTexto }
                    : { tipo: "retirada", data: $("#ret-data").value, hora: $("#ret-hora").value },
                pagamento: { forma: estado.pagamento },
                obs: $("#obs-input").value.trim(),
            });
            LojaDB.salvar(atual);
            dados = atual;
        } catch (err) { /* o pedido segue pelo WhatsApp mesmo assim */ }

        // Guarda os dados do cliente para a próxima compra (o CPF/CNPJ não é guardado)
        try {
            localStorage.setItem(CHAVE_CLIENTE, JSON.stringify({
                nome: $("#cli-nome").value.trim(), telefone: $("#cli-telefone").value.trim(), empresa: $("#cli-empresa").value.trim(),
                cep: estado.frete.cep, rua: e.rua, numero: e.numero, complemento: e.complemento, bairro: e.bairro, cidade: e.cidade, uf: e.uf,
            }));
        } catch (err) { /* ignora */ }

        $("#sucesso-codigo").textContent = `#${codigo}`;
        $("#sucesso-whats").href = url;
        irParaEtapa("ok");

        // Encaminha o cliente para o WhatsApp da loja
        const janela = window.open(url, "_blank");
        if (!janela) window.location.href = url;
    };

    const novoPedido = (fechar = true) => {
        estado.sacola = [];
        estado.cupom = null;
        estado.etapaMax = 1;
        $("#cupom-input").value = "";
        $("#cupom-msg").textContent = "";
        $("#obs-input").value = "";
        salvarSacola();
        irParaEtapa(1);
        renderProdutos();
        renderNovidades();
        if (fechar) fecharSacolinha();
    };

    // ─── DETALHE DO PRODUTO ──────────────────────────────────────────────────
    const abrirDetalhe = (id) => {
        const p = produtoPorId(id);
        if (!p) return;
        const m = marcaDe(p.marca), cat = categoriaDe(p.categoria);
        estado.detalheId = id;
        estado.detalheQtd = 1;
        const modal = $("#modal-detalhe");
        modal.setAttribute("style", estiloMarca(m));
        $("#det-foto").innerHTML = `${fotoProduto(p, true)}${p.lancamento ? `<span class="selo selo--lancamento">Lançamento</span>` : ""}`;
        $("#det-cat").textContent = `${m.nome} · ${cat.nome}`;
        $("#det-nome").textContent = p.nome;
        $("#det-etiquetas").innerHTML = [p.unidade, p.forma, rotuloUso[p.uso]].filter(Boolean).map((t) => `<span>${esc(t)}</span>`).join("");
        $("#det-desc").textContent = p.descricao || "";
        $("#det-linha").innerHTML = p.linha ? `<strong>Linha ${esc(p.linha)}</strong>${p.linhaInfo ? ` — ${esc(p.linhaInfo)}` : ""}` : "";
        const est = $("#det-estoque");
        if (!temEstoqueControlado(p)) { est.textContent = ""; est.className = "det-estoque"; }
        else if (esgotado(p)) { est.textContent = "Esgotado no momento — chame no WhatsApp para encomendar."; est.className = "det-estoque baixo"; }
        else if (Number(p.estoque) <= 3) { est.innerHTML = `<i class="fa-solid fa-fire"></i> Últimas ${p.estoque} unidades`; est.className = "det-estoque baixo"; }
        else { est.innerHTML = `<i class="fa-solid fa-circle-check"></i> Disponível para envio`; est.className = "det-estoque"; }
        $("#det-preco").innerHTML = blocoPreco(p);
        $("#det-qtd").textContent = "1";
        $("#det-adicionar").disabled = esgotado(p);
        $("#det-codigo").textContent = `Código: ${lojaCodigoProduto(p)}`;
        modal.hidden = false;
        $("#fundo-detalhe").classList.add("mostrar");
        document.body.classList.add("travado");
        $("#det-adicionar").focus({ preventScroll: true });
    };
    const fecharDetalhe = () => {
        $("#modal-detalhe").hidden = true;
        $("#fundo-detalhe").classList.remove("mostrar");
        if (!$("#sacolinha").classList.contains("aberta")) document.body.classList.remove("travado");
        estado.detalheId = null;
    };

    // ─── MÁSCARAS ────────────────────────────────────────────────────────────
    $("#cli-telefone").addEventListener("input", (e) => {
        const d = e.target.value.replace(/\D/g, "").slice(0, 11);
        let v = d;
        if (d.length > 2) v = `(${d.slice(0, 2)}) ${d.slice(2)}`;
        if (d.length > 7) v = `(${d.slice(0, 2)}) ${d.slice(2, d.length === 11 ? 7 : 6)}-${d.slice(d.length === 11 ? 7 : 6)}`;
        e.target.value = v;
    });
    $("#cli-doc").addEventListener("input", (e) => {
        const d = e.target.value.replace(/\D/g, "").slice(0, 14);
        e.target.value = d.length <= 11
            ? d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2")
            : d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
    });
    $("#ent-cep").addEventListener("input", (e) => {
        e.target.value = mascaraCep(e.target.value);
        e.target.classList.remove("erro");
        const d = e.target.value.replace(/\D/g, "");
        if (d.length === 8) consultarCep();
        else if (estado.frete.cep || estado.frete.erro) { estado.frete.cep = ""; estado.frete.erro = ""; renderSacola(); }
    });
    $("#ent-cep").addEventListener("keydown", (e) => { if (e.key === "Enter") consultarCep(); });
    $("#ent-cep-btn").addEventListener("click", consultarCep);
    $("#ent-uf").addEventListener("change", (e) => { e.target.value = e.target.value.trim().toUpperCase(); renderSacola(); });
    $("#ent-cidade").addEventListener("change", (e) => { estado.frete.cidade = e.target.value.trim(); renderSacola(); });

    // ─── EVENTOS ─────────────────────────────────────────────────────────────
    // Cliques nos produtos (grade, carrossel e sacolinha) — delegados
    document.addEventListener("click", (e) => {
        const add = e.target.closest("[data-add]");
        const mais = e.target.closest("[data-mais]");
        const menos = e.target.closest("[data-menos]");
        const remover = e.target.closest("[data-remover]");
        const abrir = e.target.closest("[data-abrir]");
        const ir = e.target.closest("[data-ir]");
        const frete = e.target.closest("[data-frete]");
        const porta = e.target.closest(".porta[data-marca], .aba-marca[data-marca]");
        if (add) return alterarQtd(Number(add.dataset.add), 1, true);
        if (mais) return alterarQtd(Number(mais.dataset.mais), 1);
        if (menos) return alterarQtd(Number(menos.dataset.menos), -1);
        if (remover) { estado.sacola = estado.sacola.filter((i) => i.id !== Number(remover.dataset.remover)); salvarSacola(); renderSacola(); renderProdutos(); renderNovidades(); return; }
        if (ir) return irParaEtapa(Number(ir.dataset.ir));
        if (frete) { estado.frete.servico = frete.dataset.frete; renderSacola(); return; }
        if (porta) return escolherMarca(porta.dataset.marca);
        if (abrir) return abrirDetalhe(Number(abrir.dataset.abrir));
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (!$("#modal-detalhe").hidden) fecharDetalhe();
            else if ($("#sacolinha").classList.contains("aberta")) fecharSacolinha();
        }
    });
    $("#link-inicio").addEventListener("click", (e) => { e.preventDefault(); escolherMarca("todas"); });

    $("#categorias-bar").addEventListener("click", (e) => {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        estado.categoria = chip.dataset.cat;
        if (estado.busca) { estado.busca = ""; $("#busca-input").value = ""; renderNovidades(); }
        renderCategorias();
        renderProdutos();
        document.getElementById("produtos").scrollIntoView({ behavior: "smooth" });
    });

    let buscaTimer = null;
    $("#busca-input").addEventListener("input", (e) => {
        clearTimeout(buscaTimer);
        buscaTimer = setTimeout(() => {
            estado.busca = e.target.value;
            renderNovidades();
            renderProdutos();
        }, 140);
    });
    $("#busca-input").addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.target.blur(); document.getElementById("produtos").scrollIntoView({ behavior: "smooth" }); }
    });
    $("#ordenar-select").addEventListener("change", (e) => { estado.ordem = e.target.value; renderProdutos(); });
    $("#filtro-uso").addEventListener("change", (e) => { estado.uso = e.target.value; renderProdutos(); });

    $$(".carrossel-setas .seta").forEach((b) => b.addEventListener("click", () => {
        const car = $("#carrossel-novidades");
        car.scrollBy({ left: Number(b.dataset.dir) * car.clientWidth * 0.8, behavior: "smooth" });
    }));

    $("#btn-abrir-sacolinha").addEventListener("click", abrirSacolinha);
    $("#barra-abrir").addEventListener("click", abrirSacolinha);
    $("#btn-fechar-sacolinha").addEventListener("click", fecharSacolinha);
    $("#fundo-sacolinha").addEventListener("click", fecharSacolinha);

    $("#cupom-btn").addEventListener("click", aplicarCupom);
    $("#cupom-input").addEventListener("keydown", (e) => { if (e.key === "Enter") aplicarCupom(); });

    $$(".opcao-entrega").forEach((b) => b.addEventListener("click", () => {
        estado.tipoEntrega = b.dataset.tipo;
        aplicarTipoEntrega();
        if (estado.tipoEntrega === "retirada") montarHorarios();
        renderSacola();
    }));
    $("#ret-data").addEventListener("change", () => { $("#ret-data").classList.remove("erro"); montarHorarios(); });
    ["#ent-rua", "#ent-numero", "#ent-bairro", "#ent-cidade", "#ent-uf", "#cli-nome", "#cli-telefone", "#ret-hora"].forEach((s) =>
        $(s).addEventListener("input", (e) => e.target.classList.remove("erro")));

    $("#opcoes-pagamento").addEventListener("click", (e) => {
        const b = e.target.closest(".opcao-pag");
        if (!b) return;
        estado.pagamento = b.dataset.pag;
        renderPagamentos();
    });

    $("#btn-avancar").addEventListener("click", () => {
        if (!validarEtapa(estado.etapa)) return;
        if (estado.etapa < 5) irParaEtapa(estado.etapa + 1);
    });
    $("#btn-voltar").addEventListener("click", () => { if (estado.etapa > 1) irParaEtapa(estado.etapa - 1); });
    $("#etapas").addEventListener("click", (e) => {
        const li = e.target.closest("li");
        if (!li) return;
        const n = Number(li.dataset.etapa);
        if (n <= estado.etapaMax) irParaEtapa(n);
    });
    $("#btn-finalizar").addEventListener("click", finalizar);
    $("#btn-novo-pedido").addEventListener("click", () => novoPedido(true));

    $("#btn-fechar-detalhe").addEventListener("click", fecharDetalhe);
    $("#fundo-detalhe").addEventListener("click", fecharDetalhe);
    $("#det-mais").addEventListener("click", () => {
        const p = produtoPorId(estado.detalheId);
        const limite = p && temEstoqueControlado(p) ? Number(p.estoque) - qtdNaSacola(p.id) : 999;
        if (estado.detalheQtd < limite) estado.detalheQtd++;
        else toast("Essa é a quantidade disponível no estoque.", false);
        $("#det-qtd").textContent = estado.detalheQtd;
    });
    $("#det-menos").addEventListener("click", () => {
        if (estado.detalheQtd > 1) estado.detalheQtd--;
        $("#det-qtd").textContent = estado.detalheQtd;
    });
    $("#det-adicionar").addEventListener("click", () => {
        const id = estado.detalheId;
        const qtd = estado.detalheQtd;
        const p = produtoPorId(id);
        if (!p) return;
        if (temEstoqueControlado(p) && qtdNaSacola(id) + qtd > Number(p.estoque)) {
            toast(`Temos só ${p.estoque} unidades de ${esc(p.nome)}.`, false);
            return;
        }
        const item = estado.sacola.find((i) => i.id === id);
        if (item) item.qtd += qtd; else estado.sacola.push({ id, qtd });
        salvarSacola();
        fecharDetalhe();
        renderSacola(); renderProdutos(); renderNovidades();
        toast(`${qtd}x ${esc(p.nome)} na sacolinha!`);
    });

    // Preenche dados de um pedido anterior (conveniência para o cliente)
    try {
        const cli = JSON.parse(localStorage.getItem(CHAVE_CLIENTE) || "null");
        if (cli) {
            $("#cli-nome").value = cli.nome || "";
            $("#cli-telefone").value = cli.telefone || "";
            $("#cli-empresa").value = cli.empresa || "";
            $("#ent-rua").value = cli.rua || "";
            $("#ent-numero").value = cli.numero || "";
            $("#ent-complemento").value = cli.complemento || "";
            $("#ent-bairro").value = cli.bairro || "";
            $("#ent-cidade").value = cli.cidade || "";
            $("#ent-uf").value = cli.uf || "";
            if (cli.cep && String(cli.cep).length === 8 && lojaUfDoCep(cli.cep)) {
                $("#ent-cep").value = mascaraCep(cli.cep);
                estado.frete.cep = cli.cep; estado.frete.uf = lojaUfDoCep(cli.cep); estado.frete.cidade = cli.cidade || "";
            }
        }
    } catch (e) { /* ignora */ }

    // Se o painel mudar preços/estoque em outra aba, a vitrine atualiza sozinha
    LojaDB.aoMudarEmOutraAba((novo) => {
        dados = novo;
        atualizarReferencias();
        aplicarConfig();
        renderTudo();
    });

    // Altura real do cabeçalho (muda no celular) para a barra de marcas grudar logo abaixo
    const medirHeader = () => {
        document.documentElement.style.setProperty("--altura-header", `${$(".header").offsetHeight}px`);
        document.documentElement.style.setProperty("--altura-nav", `${$(".navegacao").offsetHeight}px`);
    };
    window.addEventListener("resize", medirHeader);

    // ─── INICIALIZAÇÃO ───────────────────────────────────────────────────────
    const marcaInicial = decodeURIComponent(location.hash.replace("#", ""));
    if (marcas.some((m) => m.id === marcaInicial)) estado.marca = marcaInicial;
    aplicarConfig();
    renderTudo();
    medirHeader();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medirHeader);
    irParaEtapa(1);
});
