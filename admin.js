// ─────────────────────────────────────────────────────────────────────────────
// CATARINA COSMÉTICOS & ECCOS BRUSQUE — PAINEL DA LOJA
// Painel, pedidos, venda direta, produtos (preço final e profissional),
// entradas e saídas, frete, cupons e configurações.
// Os dados ficam no LojaDB (ver dados.js).
// ─────────────────────────────────────────────────────────────────────────────

(() => {
    const $ = (s, el = document) => el.querySelector(s);
    const $$ = (s, el = document) => [...el.querySelectorAll(s)];
    const esc = lojaEscapar;
    const moeda = lojaMoeda;
    const pad = (n) => String(n).padStart(2, "0");

    let D = LojaDB.carregar();
    const salvar = () => {
        if (!LojaDB.salvar(D)) toast("Não foi possível salvar neste navegador (armazenamento cheio ou bloqueado).", true);
        atualizarBadges();
    };

    // ─── DATAS ───────────────────────────────────────────────────────────────
    const chaveDia = (d) => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
    const hojeChave = () => chaveDia(new Date());
    const fmtData = (d) => { const x = new Date(d); return `${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()}`; };
    const fmtDataHora = (d) => { const x = new Date(d); return `${pad(x.getDate())}/${pad(x.getMonth() + 1)} ${pad(x.getHours())}:${pad(x.getMinutes())}`; };
    const isoDeChave = (k) => { const [a, m, d] = k.split("-").map(Number); return new Date(a, m - 1, d, 12, 0).toISOString(); };
    const NOMES_MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const moedaCurta = (v) => Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : `R$ ${Math.round(v)}`;
    const num = (v) => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : 0; };

    // Lista de dias (chaves) entre duas datas
    const diasEntre = (ini, fim) => {
        const out = []; const d = new Date(ini); d.setHours(12, 0, 0, 0);
        const f = new Date(fim); f.setHours(12, 0, 0, 0);
        while (d <= f) { out.push(chaveDia(d)); d.setDate(d.getDate() + 1); }
        return out;
    };

    // ─── TOAST / MODAL / CONFIRMAÇÃO ─────────────────────────────────────────
    let toastT = null;
    const toast = (msg, erro = false) => {
        const t = $("#toast");
        t.className = `toast mostrar${erro ? " toast--erro" : ""}`;
        t.innerHTML = `<i class="fa-solid ${erro ? "fa-circle-exclamation" : "fa-circle-check"}"></i><span>${msg}</span>`;
        clearTimeout(toastT);
        toastT = setTimeout(() => t.classList.remove("mostrar"), 3000);
    };

    const abrirModal = ({ titulo, corpo, rodape = "", largura = 620, aoAbrir }) => {
        $("#modal-titulo").innerHTML = titulo;
        $("#modal-corpo").innerHTML = corpo;
        $("#modal-rodape").innerHTML = rodape;
        $(".modal").style.width = `min(${largura}px, 100%)`;
        $("#modal-fundo").hidden = false;
        if (aoAbrir) aoAbrir($("#modal-corpo"));
        const primeiro = $("#modal-corpo input:not([type=hidden]):not([type=checkbox]), #modal-corpo select, #modal-corpo textarea");
        if (primeiro) setTimeout(() => primeiro.focus(), 50);
    };
    const fecharModal = () => { $("#modal-fundo").hidden = true; $("#modal-corpo").innerHTML = ""; };
    $("#modal-fechar").addEventListener("click", fecharModal);
    $("#modal-fundo").addEventListener("mousedown", (e) => { if (e.target.id === "modal-fundo") fecharModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#modal-fundo").hidden) fecharModal(); });

    const confirmar = (mensagem, textoBotao, aoConfirmar, perigo = true) => {
        abrirModal({
            titulo: "Confirmar",
            corpo: `<p style="font-weight:700">${mensagem}</p>`,
            rodape: `<button type="button" class="btn btn-fantasma" data-fechar>Cancelar</button><button type="button" class="btn ${perigo ? "btn-perigo" : "btn-primario"}" id="btn-confirmar">${textoBotao}</button>`,
            largura: 440,
        });
        $("#btn-confirmar").onclick = () => { fecharModal(); aoConfirmar(); };
    };
    document.addEventListener("click", (e) => { if (e.target.closest("[data-fechar]")) fecharModal(); });

    // ─── LOGIN ───────────────────────────────────────────────────────────────
    const CHAVE_SESSAO = "catarina_eccos_admin_sessao";
    const entrar = () => {
        $("#tela-login").hidden = true;
        $("#app").hidden = false;
        aplicarMarca();
        irPara(location.hash.replace("#", "") || "painel");
    };
    $("#form-login").addEventListener("submit", (e) => {
        e.preventDefault();
        const senha = $("#login-senha").value;
        if (senha === (D.config.senhaAdmin || "catarina123")) {
            try { sessionStorage.setItem(CHAVE_SESSAO, "1"); } catch (err) { /* ignora */ }
            entrar();
        } else {
            $("#login-erro").textContent = "Senha incorreta.";
            $("#login-senha").classList.add("erro");
        }
    });
    $("#btn-sair").addEventListener("click", () => {
        try { sessionStorage.removeItem(CHAVE_SESSAO); } catch (err) { /* ignora */ }
        location.hash = "";
        location.reload();
    });

    const aplicarMarca = () => {
        $("#lateral-nome").textContent = D.config.nomeLoja;
        const avatares = D.marcas.map((m) => (m.avatar ? `<img src="${esc(m.avatar)}" alt="">` : "")).join("");
        $("#lateral-logos").innerHTML = avatares;
        $("#login-logos").innerHTML = avatares;
        document.title = `Painel · ${D.config.nomeLoja}`;
    };

    // ─── NAVEGAÇÃO ───────────────────────────────────────────────────────────
    let abaAtual = "painel";
    const RENDER = {};
    const irPara = (aba) => {
        if (!RENDER[aba]) aba = "painel";
        abaAtual = aba;
        $$(".aba").forEach((s) => { s.hidden = s.id !== `aba-${aba}`; });
        $$("#menu button").forEach((b) => b.classList.toggle("ativo", b.dataset.aba === aba));
        history.replaceState(null, "", `#${aba}`);
        RENDER[aba]();
        atualizarBadges();
        window.scrollTo(0, 0);
    };
    $("#menu").addEventListener("click", (e) => { const b = e.target.closest("button[data-aba]"); if (b) irPara(b.dataset.aba); });
    document.addEventListener("click", (e) => { const b = e.target.closest("[data-ir]"); if (b) irPara(b.dataset.ir); });

    // ─── AUXILIARES DE NEGÓCIO ───────────────────────────────────────────────
    const categoriaDe = (id) => D.categorias.find((c) => c.id === id) || { id, nome: "Sem categoria", icone: "fa-spa", marca: "" };
    const marcaDe = (id) => D.marcas.find((m) => m.id === id) || { id, nome: "—", cor: "#583878", corEscura: "#3A2452", corClara: "#F1EAF7" };
    // Preço que fecha o pedido: tabela profissional ou final (Configurações → Preços)
    const precoDe = (p) => lojaPreco(p, D.config);
    const produtoPorId = (id) => D.produtos.find((p) => p.id === Number(id));
    const controlaEstoque = (p) => p.estoque !== undefined && p.estoque !== null && p.estoque !== "";
    const estoqueBaixo = (p) => controlaEstoque(p) && Number(p.estoque) > 0 && Number(p.estoque) <= Number(p.estoqueMin || 0);
    const estoqueZerado = (p) => controlaEstoque(p) && Number(p.estoque) <= 0;
    const proximoId = (lista) => lista.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
    const iconeProduto = (p) => {
        const c = categoriaDe(p.categoria), m = marcaDe(p.marca);
        return `<span class="pdv-prod-icone" style="background:${p.imagem ? m.corClara : m.cor}">${p.imagem ? `<img src="${esc(p.imagem)}" alt="">` : `<i class="fa-solid ${esc(c.icone)}"></i>`}</span>`;
    };

    const movimentarEstoque = (itens, sinal, motivo) => {
        itens.forEach((it) => {
            const p = produtoPorId(it.id);
            if (!p || !controlaEstoque(p)) return;
            p.estoque = Math.max(0, Number(p.estoque) + sinal * Number(it.qtd));
            D.movEstoque.unshift({ data: new Date().toISOString(), produtoId: p.id, qtd: sinal * it.qtd, motivo });
        });
        D.movEstoque = D.movEstoque.slice(0, 500);
    };

    const lancar = (dados) => {
        const l = { id: proximoId(D.lancamentos), data: new Date().toISOString(), ...dados };
        D.lancamentos.push(l);
        return l;
    };

    const atualizarBadges = () => {
        const novos = D.pedidos.filter((p) => p.status === "novo").length;
        const b1 = $("#badge-pedidos"); b1.hidden = !novos; b1.textContent = novos;
        const baixos = D.produtos.filter((p) => p.ativo !== false && (estoqueBaixo(p) || estoqueZerado(p))).length;
        const b2 = $("#badge-estoque"); b2.hidden = !baixos; b2.textContent = baixos;
    };

    // ═════════════════════════════════════════════════════════════════════════
    // PAINEL
    // ═════════════════════════════════════════════════════════════════════════
    let periodoPainel = "mes";
    const intervaloPeriodo = (p) => {
        const hoje = new Date();
        if (p === "hoje") return { ini: hoje, fim: hoje, texto: `Hoje, ${fmtData(hoje)}` };
        if (p === "7") { const i = new Date(); i.setDate(i.getDate() - 6); return { ini: i, fim: hoje, texto: "Últimos 7 dias" }; }
        if (p === "mesant") {
            const i = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
            const f = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
            return { ini: i, fim: f, texto: `${NOMES_MES[i.getMonth()]} de ${i.getFullYear()}` };
        }
        const i = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        return { ini: i, fim: hoje, texto: `${NOMES_MES[i.getMonth()]} de ${i.getFullYear()} (até hoje)` };
    };
    const lancNoIntervalo = (ini, fim) => {
        const a = chaveDia(ini), b = chaveDia(fim);
        return D.lancamentos.filter((l) => { const k = chaveDia(l.data); return k >= a && k <= b; });
    };

    const kpi = (classe, icone, rotulo, valor, sub) => `
        <div class="kpi ${classe}">
            <div class="kpi-rotulo"><i class="fa-solid ${icone}"></i>${rotulo}</div>
            <div class="kpi-valor">${valor}</div>
            ${sub ? `<div class="kpi-sub">${sub}</div>` : ""}
        </div>`;

    const barrasH = (pares, cor) => {
        if (!pares.length) return `<p class="vazio-mini">Nada lançado no período.</p>`;
        const max = Math.max(...pares.map((p) => p[1]));
        return pares.map(([nome, v]) => `
            <div class="barra-h">
                <div class="barra-h-topo"><span>${esc(nome)}</span><span>${moeda(v)}</span></div>
                <div class="barra-h-trilho"><span style="width:${Math.max(2, (v / max) * 100)}%;background:${cor}"></span></div>
            </div>`).join("");
    };
    const agrupar = (lista, chave) => {
        const m = new Map();
        lista.forEach((l) => m.set(l[chave] || "Outros", (m.get(l[chave] || "Outros") || 0) + Number(l.valor)));
        return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };

    // Gráfico de barras agrupadas (entradas × saídas por dia), em SVG
    const desenharGrafico = (el, dias, entradas, saidas) => {
        const W = Math.max(300, el.clientWidth || 600), H = 240;
        const m = { t: 10, r: 8, b: 26, l: 58 };
        const iw = W - m.l - m.r, ih = H - m.t - m.b;
        const max = Math.max(100, ...entradas, ...saidas);
        const passo = Math.pow(10, Math.floor(Math.log10(max / 4)));
        const tick = [1, 2, 2.5, 5, 10].map((f) => f * passo).find((t) => max / t <= 5) || passo * 10;
        const topo = Math.ceil(max / tick) * tick;
        const y = (v) => m.t + ih - (v / topo) * ih;
        const bw = iw / dias.length;
        const barra = Math.max(2, Math.min(18, (bw - 6) / 2));
        let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Entradas e saídas por dia">`;
        for (let v = 0; v <= topo; v += tick) {
            svg += `<line class="grade-linha" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text class="eixo" x="${m.l - 8}" y="${y(v) + 3}" text-anchor="end">${moedaCurta(v)}</text>`;
        }
        const retangulo = (x, v, cor) => {
            if (v <= 0) return "";
            const h = Math.max(2, (v / topo) * ih), yy = m.t + ih - h, r = Math.min(4, h / 2, barra / 2);
            return `<path d="M${x},${m.t + ih} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + barra - r} Q${x + barra},${yy} ${x + barra},${yy + r} V${m.t + ih} Z" fill="${cor}"/>`;
        };
        const cadaRotulo = Math.ceil(dias.length / Math.max(1, Math.floor(iw / 44)));
        dias.forEach((d, i) => {
            const cx = m.l + bw * i + bw / 2;
            svg += retangulo(cx - barra - 1, entradas[i], "var(--cor-entrada)");
            svg += retangulo(cx + 1, saidas[i], "var(--cor-saida)");
            if (i % cadaRotulo === 0) svg += `<text class="eixo" x="${cx}" y="${H - 8}" text-anchor="middle">${d.slice(8, 10)}/${d.slice(5, 7)}</text>`;
            svg += `<rect class="alvo" data-i="${i}" x="${m.l + bw * i}" y="${m.t}" width="${bw}" height="${ih}"/>`;
        });
        svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${m.t + ih}" y2="${m.t + ih}" stroke="#C9C5B8"/></svg><div class="grafico-dica" hidden></div>`;
        el.innerHTML = svg;
        const dica = $(".grafico-dica", el);
        $$(".alvo", el).forEach((r) => {
            r.addEventListener("mouseenter", () => {
                const i = Number(r.dataset.i);
                const saldo = entradas[i] - saidas[i];
                dica.innerHTML = `<b>${fmtData(isoDeChave(dias[i]))}</b><span class="leg leg--entrada"></span> Entradas: ${moeda(entradas[i])}<br><span class="leg leg--saida"></span> Saídas: ${moeda(saidas[i])}<br>Saldo do dia: ${saldo < 0 ? "−" : "+"} ${moeda(Math.abs(saldo))}`;
                const box = el.getBoundingClientRect(), rb = r.getBoundingClientRect();
                dica.style.left = `${Math.min(Math.max(rb.left - box.left + rb.width / 2, 90), box.width - 90)}px`;
                dica.style.top = `${Math.max(56, y(Math.max(entradas[i], saidas[i])) * (box.height / H)) - 6}px`;
                dica.hidden = false;
            });
            r.addEventListener("mouseleave", () => { dica.hidden = true; });
        });
    };

    // O que falta para divulgar o catálogo (some sozinho quando resolvido)
    const renderPendencias = () => {
        const c = D.config, itens = [];
        if (!c.whatsapp) itens.push(`Informe o <strong>WhatsApp que recebe os pedidos</strong> em <button type="button" class="link" data-ir="config">Configurações</button>.`);
        if ((c.frete || {}).modo === "tabela" && (c.frete || {}).valoresDeExemplo) itens.push(`A tabela de <strong>frete</strong> está com valores de exemplo — troque pelos reais em <button type="button" class="link" data-ir="frete">Frete</button>.`);
        if (!c.endereco || /^brusque\s*\/\s*sc$/i.test(c.endereco.trim())) itens.push(`Complete o <strong>endereço de retirada</strong> e o horário de atendimento em <button type="button" class="link" data-ir="config">Configurações</button>.`);
        if (c.senhaAdmin === "catarina123") itens.push(`Troque a <strong>senha inicial</strong> do painel em <button type="button" class="link" data-ir="config">Configurações</button>.`);
        const semFoto = D.produtos.filter((p) => p.ativo !== false && !p.imagem).length;
        if (semFoto) itens.push(`${semFoto} ${semFoto === 1 ? "produto está" : "produtos estão"} sem foto (filtro “Sem foto” em <button type="button" class="link" data-ir="produtos">Produtos</button>).`);
        $("#painel-pendencias").innerHTML = itens.length ? `<div class="pendencias"><h3><i class="fa-solid fa-list-check"></i> Antes de divulgar o catálogo</h3><ul>${itens.map((t) => `<li><i class="fa-regular fa-square"></i><span>${t}</span></li>`).join("")}</ul></div>` : "";
    };

    RENDER.painel = () => {
        renderPendencias();
        const { ini, fim, texto } = intervaloPeriodo(periodoPainel);
        $("#painel-periodo-texto").textContent = texto;
        $$("#painel-periodo button").forEach((b) => b.classList.toggle("ativo", b.dataset.p === periodoPainel));
        const lanc = lancNoIntervalo(ini, fim);
        const entradas = lanc.filter((l) => l.tipo === "entrada");
        const saidas = lanc.filter((l) => l.tipo === "saida");
        const totE = entradas.reduce((a, l) => a + Number(l.valor), 0);
        const totS = saidas.reduce((a, l) => a + Number(l.valor), 0);
        const vendas = entradas.filter((l) => /^Venda/.test(l.categoria));
        const totVendas = vendas.reduce((a, l) => a + Number(l.valor), 0);
        const custoVendido = vendas.reduce((a, l) => a + (l.itens || []).reduce((s, it) => s + (Number(it.custo) || 0) * it.qtd, 0), 0);
        const saldo = totE - totS;

        $("#painel-kpis").innerHTML =
            kpi("kpi--entrada", "fa-arrow-down", "Entradas", moeda(totE), `${entradas.length} lançamentos`) +
            kpi("kpi--saida", "fa-arrow-up", "Saídas", moeda(totS), `${saidas.length} lançamentos`) +
            kpi(`kpi--saldo${saldo < 0 ? " kpi--negativo" : ""}`, "fa-scale-balanced", "Saldo do período", `${saldo < 0 ? "− " : ""}${moeda(Math.abs(saldo))}`, saldo >= 0 ? "Entrou mais do que saiu" : "Saiu mais do que entrou") +
            kpi("", "fa-bag-shopping", "Vendas", String(vendas.length), vendas.length ? `Ticket médio ${moeda(totVendas / vendas.length)}` : "Nenhuma venda") +
            kpi("", "fa-sack-dollar", "Lucro nas vendas", custoVendido > 0 ? moeda(totVendas - custoVendido) : "—", custoVendido > 0 ? `Margem de ${Math.round(((totVendas - custoVendido) / totVendas) * 100)}% sobre as vendas` : "Informe o custo dos produtos para ver o lucro");

        const dias = diasEntre(ini, fim);
        const porDia = (lista) => dias.map((d) => lista.filter((l) => chaveDia(l.data) === d).reduce((a, l) => a + Number(l.valor), 0));
        desenharGrafico($("#painel-grafico"), dias, porDia(entradas), porDia(saidas));

        const aguardando = D.pedidos.filter((p) => ["novo", "pago", "enviado"].includes(p.status)).slice(0, 5);
        $("#painel-pedidos").innerHTML = aguardando.length
            ? `<ul class="lista-simples">${aguardando.map((p) => `<li><div>#${esc(p.codigo)} · ${esc(p.cliente)}<small>${fmtDataHora(p.data)} · ${p.entrega.tipo === "entrega" ? "Entrega" : "Retirada"}</small></div><div style="text-align:right">${pillStatus(p.status)}<div class="valor">${moeda(p.total)}</div></div></li>`).join("")}</ul>`
            : `<p class="vazio-mini"><i class="fa-solid fa-circle-check"></i> Nenhum pedido aguardando.</p>`;

        const baixos = D.produtos.filter((p) => p.ativo !== false && (estoqueBaixo(p) || estoqueZerado(p))).sort((a, b) => a.estoque - b.estoque);
        $("#painel-estoque").innerHTML = baixos.length
            ? `<ul class="lista-simples">${baixos.slice(0, 6).map((p) => `<li><div>${esc(p.nome)}<small>${esc(p.unidade || "")} · mínimo ${p.estoqueMin || 0}</small></div><div style="display:flex;gap:8px;align-items:center">${estoqueZerado(p) ? `<span class="pill pill--zerado">Esgotado</span>` : `<span class="pill pill--baixo">${p.estoque} un.</span>`}<button type="button" class="btn btn-fantasma btn-sm" data-repor="${p.id}">Repor</button></div></li>`).join("")}</ul>`
            : `<p class="vazio-mini"><i class="fa-solid fa-circle-check"></i> Estoque em dia.</p>`;

        const cont = new Map();
        vendas.forEach((l) => (l.itens || []).forEach((it) => {
            const c = cont.get(it.nome) || { qtd: 0, valor: 0 };
            c.qtd += it.qtd; c.valor += it.qtd * it.preco; cont.set(it.nome, c);
        }));
        const top = [...cont.entries()].sort((a, b) => b[1].valor - a[1].valor).slice(0, 5);
        $("#painel-top").innerHTML = top.length
            ? `<ul class="lista-simples">${top.map(([n, c], i) => `<li><div>${i + 1}. ${esc(n)}<small>${c.qtd} unidades vendidas</small></div><span class="valor">${moeda(c.valor)}</span></li>`).join("")}</ul>`
            : `<p class="vazio-mini">Nenhuma venda no período.</p>`;

        $("#painel-despesas").innerHTML = barrasH(agrupar(saidas, "categoria").slice(0, 6), "var(--cor-saida)");
    };
    $("#painel-periodo").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; periodoPainel = b.dataset.p; RENDER.painel(); });
    let resizeT = null;
    window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (abaAtual === "painel") RENDER.painel(); }, 200); });

    // ═════════════════════════════════════════════════════════════════════════
    // PEDIDOS
    // ═════════════════════════════════════════════════════════════════════════
    const STATUS = {
        novo: { nome: "Novo", icone: "fa-bell" },
        pago: { nome: "Pago", icone: "fa-circle-dollar-to-slot" },
        enviado: { nome: "Enviado / Pronto", icone: "fa-truck-fast" },
        concluido: { nome: "Concluído", icone: "fa-circle-check" },
        cancelado: { nome: "Cancelado", icone: "fa-ban" },
    };
    const pillStatus = (s) => `<span class="pill pill--${s}"><i class="fa-solid ${STATUS[s]?.icone || "fa-circle"}"></i> ${STATUS[s]?.nome || s}</span>`;
    let filtroPedidos = "abertos";

    const confirmarPagamento = (p) => {
        if (p.lancamentoId) return;
        const itens = p.itens.map((it) => {
            const prod = produtoPorId(it.id);
            return { ...it, custo: prod ? prod.custo : 0 };
        });
        const l = lancar({
            tipo: "entrada", categoria: "Venda pelo catálogo",
            descricao: `Pedido #${p.codigo} — ${p.cliente}`,
            valor: Math.round(Number(p.total) * 100) / 100,
            formaPagamento: p.pagamento?.forma || "PIX", itens, pedidoCodigo: p.codigo,
        });
        p.lancamentoId = l.id;
        movimentarEstoque(p.itens, -1, `Pedido #${p.codigo}`);
    };
    const desfazerPagamento = (p) => {
        if (!p.lancamentoId) return;
        D.lancamentos = D.lancamentos.filter((l) => l.id !== p.lancamentoId);
        movimentarEstoque(p.itens, +1, `Cancelamento #${p.codigo}`);
        p.lancamentoId = null;
    };
    const mudarStatus = (codigo, novo) => {
        const p = D.pedidos.find((x) => x.codigo === codigo);
        if (!p) return;
        if (novo === "cancelado") desfazerPagamento(p);
        else if (["pago", "enviado", "concluido"].includes(novo)) confirmarPagamento(p);
        else if (novo === "novo") desfazerPagamento(p);
        p.status = novo;
        salvar();
        toast(novo === "pago" ? `Pagamento do pedido #${codigo} lançado no caixa e estoque baixado.` : `Pedido #${codigo}: ${STATUS[novo].nome}.`);
        RENDER.pedidos();
    };

    const linkWhatsCliente = (p, texto) => {
        let tel = String(p.telefone || "").replace(/\D/g, "");
        if (tel.length <= 11) tel = `55${tel}`;
        return `https://wa.me/${tel}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
    };
    const descricaoEntrega = (e) => e.tipo === "entrega"
        ? `${esc(e.rua || "")}${e.numero ? `, nº ${esc(e.numero)}` : ""}${e.complemento ? ` — ${esc(e.complemento)}` : ""} · ${esc(e.bairro || "")}${e.cidade ? ` · ${esc(e.cidade)}/${esc(e.uf || "")}` : ""}${e.cep ? ` · CEP ${esc(e.cep)}` : ""}${e.servico ? `<br><strong>${esc(e.servico)}</strong>${e.prazo ? ` · ${esc(e.prazo)}` : ""}` : ""}`
        : `Retirada ${e.data ? fmtData(isoDeChave(e.data)) : ""} ${e.hora ? `às ${esc(e.hora)}` : ""}`;

    RENDER.pedidos = () => {
        const cont = (f) => D.pedidos.filter(f).length;
        const filtros = [
            ["abertos", "Em aberto", (p) => ["novo", "pago", "enviado"].includes(p.status)],
            ["novo", "Novos", (p) => p.status === "novo"],
            ["pago", "Pagos", (p) => p.status === "pago"],
            ["enviado", "Enviados / Prontos", (p) => p.status === "enviado"],
            ["concluido", "Concluídos", (p) => p.status === "concluido"],
            ["cancelado", "Cancelados", (p) => p.status === "cancelado"],
            ["todos", "Todos", () => true],
        ];
        $("#pedidos-filtro").innerHTML = filtros.map(([k, n, f]) => `<button type="button" data-f="${k}" class="${filtroPedidos === k ? "ativo" : ""}">${n}<em>${cont(f)}</em></button>`).join("");
        const f = filtros.find((x) => x[0] === filtroPedidos)[2];
        const lista = D.pedidos.filter(f).sort((a, b) => new Date(b.data) - new Date(a.data));
        $("#lista-pedidos").innerHTML = lista.length ? lista.map((p) => {
            const proximo = { novo: ["pago", "fa-circle-dollar-to-slot", "Confirmar pagamento"], pago: ["enviado", "fa-truck-fast", p.entrega.tipo === "entrega" ? "Marcar como enviado" : "Pronto p/ retirada"], enviado: ["concluido", "fa-circle-check", "Concluir"] }[p.status];
            return `
            <article class="pedido${p.status === "novo" ? " pedido--novo" : ""}">
                <div class="pedido-topo">
                    <div><div class="pedido-codigo">#${esc(p.codigo)}</div><div class="pedido-data">${fmtDataHora(p.data)} · ${p.origem === "whatsapp" ? "colado do WhatsApp" : "pelo catálogo"}</div></div>
                    ${pillStatus(p.status)}
                </div>
                <div class="pedido-cliente">${esc(p.cliente)}</div>
                <div class="pedido-linha"><i class="fa-solid ${p.entrega.tipo === "entrega" ? "fa-truck" : "fa-store"}"></i>${descricaoEntrega(p.entrega)}</div>
                <div class="pedido-linha"><i class="fa-solid fa-wallet"></i>${esc(p.pagamento?.forma || "")}${p.pagamento?.troco ? ` · troco p/ ${moeda(p.pagamento.troco)}` : ""}</div>
                <div class="pedido-itens">${p.itens.map((it) => `${it.qtd}x ${esc(it.nome)}`).join("<br>")}</div>
                <div class="pedido-rodape">
                    <span class="pedido-total">${moeda(p.total)}</span>
                    <div class="pedido-acoes">
                        <a class="icone-btn" href="${linkWhatsCliente(p, `Olá, ${p.cliente.split(" ")[0]}! Aqui é da ${D.config.nomeLoja}, sobre o seu pedido #${p.codigo}.`)}" target="_blank" rel="noopener" title="Chamar cliente no WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
                        <button type="button" class="icone-btn" data-ped-ver="${esc(p.codigo)}" title="Ver detalhes"><i class="fa-solid fa-eye"></i></button>
                        ${proximo ? `<button type="button" class="btn btn-primario btn-sm" data-ped-status="${esc(p.codigo)}" data-novo="${proximo[0]}"><i class="fa-solid ${proximo[1]}"></i> ${proximo[2]}</button>` : ""}
                    </div>
                </div>
            </article>`;
        }).join("") : `<div class="painel-card"><p class="vazio-mini"><i class="fa-solid fa-inbox"></i> Nenhum pedido neste filtro.</p></div>`;
    };
    $("#pedidos-filtro").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; filtroPedidos = b.dataset.f; RENDER.pedidos(); });
    $("#lista-pedidos").addEventListener("click", (e) => {
        const st = e.target.closest("[data-ped-status]");
        if (st) return mudarStatus(st.dataset.pedStatus, st.dataset.novo);
        const ver = e.target.closest("[data-ped-ver]");
        if (ver) verPedido(ver.dataset.pedVer);
    });

    const verPedido = (codigo) => {
        const p = D.pedidos.find((x) => x.codigo === codigo);
        if (!p) return;
        const e = p.entrega;
        abrirModal({
            titulo: `Pedido #${esc(p.codigo)} ${pillStatus(p.status)}`,
            corpo: `
                <div class="detalhe-grupo"><h4>Cliente</h4>${esc(p.cliente)}<br>${esc(p.telefone || "")}${p.empresa ? `<br>${esc(p.empresa)}` : ""}${p.documento ? `<br>CPF/CNPJ: ${esc(p.documento)}` : ""}${p.tabela ? `<br><small style="color:var(--muted)">Tabela: ${p.tabela === "final" ? "preço final" : "profissional"}</small>` : ""}</div>
                <div class="detalhe-grupo"><h4>Itens</h4>
                    <ul class="lista-simples">${p.itens.map((it) => `<li><span>${it.qtd}x ${esc(it.nome)} <small>${esc(it.unidade || "")} · ${esc(it.codigo || "")}</small></span><span class="valor">${moeda(it.qtd * it.preco)}</span></li>`).join("")}</ul>
                    <ul class="lista-simples">
                        <li><span>Subtotal</span><span class="valor">${moeda(p.subtotal)}</span></li>
                        ${p.desconto ? `<li><span>Desconto ${esc(p.cupom || "")}</span><span class="valor">− ${moeda(p.desconto)}</span></li>` : ""}
                        ${e.tipo === "entrega" ? `<li><span>Frete${e.servico ? ` (${esc(e.servico)})` : ""}</span><span class="valor">${p.taxaEntrega ? moeda(p.taxaEntrega) : esc(e.taxaTexto || "Grátis")}</span></li>` : ""}
                        <li><strong>Total</strong><strong class="valor">${moeda(p.total)}</strong></li>
                    </ul>
                </div>
                <div class="detalhe-grupo"><h4>${e.tipo === "entrega" ? "Entrega" : "Retirada"}</h4>${descricaoEntrega(e)}${e.pesoKg ? `<br><small style="color:var(--muted)">Peso estimado: ${lojaPesoTexto(e.pesoKg)}</small>` : ""}</div>
                <div class="detalhe-grupo"><h4>Pagamento</h4>${esc(p.pagamento?.forma || "")}${p.pagamento?.troco ? ` · troco para ${moeda(p.pagamento.troco)}` : ""}${p.obs ? `<br>Obs.: ${esc(p.obs)}` : ""}</div>
                <label class="campo"><span>Alterar status</span>
                    <select id="ped-status-sel">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === p.status ? "selected" : ""}>${v.nome}</option>`).join("")}</select>
                    <span class="campo-ajuda">Pago, Enviado/Pronto e Concluído lançam a venda no caixa e baixam o estoque controlado (uma única vez). Cancelado desfaz o lançamento e devolve o estoque.</span>
                </label>`,
            rodape: `<button type="button" class="btn btn-fantasma esquerda" id="ped-excluir"><i class="fa-solid fa-trash"></i> Excluir</button><button type="button" class="btn btn-fantasma" data-fechar>Fechar</button><button type="button" class="btn btn-primario" id="ped-salvar">Salvar status</button>`,
        });
        $("#ped-salvar").onclick = () => { const v = $("#ped-status-sel").value; fecharModal(); if (v !== p.status) mudarStatus(p.codigo, v); };
        $("#ped-excluir").onclick = () => confirmar(`Excluir o pedido #${esc(p.codigo)}? Se ele já foi pago, o lançamento no caixa também será removido e o estoque devolvido.`, "Excluir pedido", () => {
            desfazerPagamento(p);
            D.pedidos = D.pedidos.filter((x) => x !== p);
            salvar(); RENDER.pedidos(); toast("Pedido excluído.");
        });
    };

    // Colar pedido recebido no WhatsApp (de outro aparelho) para registrar aqui
    const lerMensagemPedido = (texto) => {
        const valor = (s) => num(String(s).replace(/\./g, "").replace(",", "."));
        const codigo = (texto.match(/Pedido:\s*\*?#?([A-Z0-9]{5,12})/i) || [])[1];
        const itens = [];
        texto.split("\n").forEach((linha) => {
            const m = linha.match(/^\s*[•\-*]\s*(\d+)x\s+(.+?)\s+—\s+R\$\s*([\d.,]+)(?:\s*\[#?([\w.-]+)\])?/);
            if (!m) return;
            const qtd = Number(m[1]);
            const nomeCompleto = m[2].replace(/\s*\([^)]*\)\s*$/, "").trim();
            const mesmoNome = (p) => p.nome.toLowerCase() === nomeCompleto.toLowerCase();
            const mesmoCodigo = (p) => m[4] && (p.codigo === m[4] || String(p.id) === m[4]);
            // código + nome primeiro (há códigos repetidos na tabela), depois só código, depois só nome
            const prod = D.produtos.find((p) => mesmoCodigo(p) && mesmoNome(p)) || D.produtos.find(mesmoCodigo) || D.produtos.find(mesmoNome);
            const totalLinha = valor(m[3]);
            itens.push({ id: prod ? prod.id : null, codigo: prod ? lojaCodigoProduto(prod) : "", marca: prod ? prod.marca : "", nome: prod ? prod.nome : nomeCompleto, unidade: prod ? prod.unidade : "", qtd, preco: Math.round((totalLinha / qtd) * 100) / 100 });
        });
        const total = valor((texto.match(/Total:\s*R\$\s*([\d.,]+)/) || [])[1] || 0);
        const subtotal = valor((texto.match(/Subtotal:\s*R\$\s*([\d.,]+)/) || [])[1] || 0) || itens.reduce((a, i) => a + i.qtd * i.preco, 0);
        const desconto = valor((texto.match(/Desconto[^:]*:\s*-\s*R\$\s*([\d.,]+)/) || [])[1] || 0);
        const cliente = ((texto.match(/Cliente:\*?\s*(.+)/) || [])[1] || "Cliente").replace(/\*/g, "").trim();
        const telefone = ((texto.match(/📱\s*(.+)/) || [])[1] || "").trim();
        const pagamento = ((texto.match(/Pagamento:\*?\s*(.+)/) || [])[1] || "").replace(/\*/g, "").trim();
        const retirada = /\*Retirada\*/i.test(texto);
        const linhasTxt = texto.split("\n").map((l) => l.trim());
        const iEnd = retirada ? -1 : linhasTxt.findIndex((l) => /, nº /.test(l));
        const endereco = iEnd >= 0 ? linhasTxt[iEnd] : "";
        const [rua, numero] = endereco.split(/, nº /);
        const local = iEnd >= 0 ? (linhasTxt[iEnd + 1] || "").match(/^(.*?)\s·\s(.+)\/([A-Z]{2})$/) : null;
        const bairro = local ? local[1] : "", cidade = local ? local[2] : "", uf = local ? local[3] : "";
        const cep = ((texto.match(/CEP\s+(\d{5}-?\d{3})/) || [])[1] || "");
        const envio = (texto.match(/Envio:\s*([^(\n]+?)(?:\s*\(([^)]+)\))?\s*$/m) || []);
        const tabela = /Tabela:\s*preço final/i.test(texto) ? "final" : "profissional";
        const empresa = ((texto.match(/🏢\s*(.+)/) || [])[1] || "").trim();
        const documento = ((texto.match(/CPF\/CNPJ:\s*(.+)/) || [])[1] || "").trim();
        const troco = 0;
        const taxaEntrega = valor((texto.match(/Frete:\s*R\$\s*([\d.,]+)/) || [])[1] || 0);
        const dataRet = (texto.match(/(\d{2})\/(\d{2})\/(\d{4}) às (\d{2}:\d{2})/) || []);
        return {
            codigo: codigo ? codigo.toUpperCase() : `WA${Date.now().toString(36).slice(-6).toUpperCase()}`,
            data: new Date().toISOString(), status: "novo", origem: "whatsapp", cliente, telefone, empresa, documento, tabela, itens,
            subtotal, desconto, taxaEntrega, total: total || subtotal - desconto + taxaEntrega,
            entrega: retirada ? { tipo: "retirada", data: dataRet[3] ? `${dataRet[3]}-${dataRet[2]}-${dataRet[1]}` : "", hora: dataRet[4] || "" } : { tipo: "entrega", cep, bairro, cidade, uf, rua: rua || "", numero: numero ? numero.split(" — ")[0] : "", complemento: numero && numero.includes(" — ") ? numero.split(" — ").slice(1).join(" — ") : "", servico: (envio[1] || "").trim(), prazo: (envio[2] || "").trim(), taxa: taxaEntrega },
            pagamento: { forma: pagamento.split(" — ")[0] || "PIX", troco },
        };
    };
    $("#btn-importar-pedido").addEventListener("click", () => {
        abrirModal({
            titulo: `<i class="fa-brands fa-whatsapp"></i> Colar pedido do WhatsApp`,
            corpo: `
                <div class="aviso-box aviso-box--info"><i class="fa-solid fa-circle-info"></i><span>Recebeu um pedido do catálogo no WhatsApp? Copie a mensagem inteira e cole aqui — o painel lê os itens, o cliente e a entrega e cria o pedido.</span></div>
                <label class="campo"><span>Mensagem do pedido</span><textarea id="imp-texto" rows="9" placeholder="Cole aqui a mensagem que começa com “NOVO PEDIDO”..."></textarea></label>
                <div id="imp-previa" class="previa-importacao"></div>`,
            rodape: `<button type="button" class="btn btn-fantasma" data-fechar>Cancelar</button><button type="button" class="btn btn-secundario" id="imp-salvar" disabled><i class="fa-solid fa-check"></i> Registrar pedido</button>`,
        });
        let lido = null;
        $("#imp-texto").addEventListener("input", (e) => {
            const t = e.target.value;
            lido = t.trim() ? lerMensagemPedido(t) : null;
            const ok = lido && lido.itens.length;
            $("#imp-salvar").disabled = !ok;
            $("#imp-previa").innerHTML = !t.trim() ? "" : ok
                ? `<div class="detalhe-grupo"><h4>Pré-visualização</h4>#${esc(lido.codigo)} · ${esc(lido.cliente)} · ${lido.entrega.tipo === "entrega" ? "Entrega" : "Retirada"}<ul class="lista-simples">${lido.itens.map((i) => `<li><span>${i.qtd}x ${esc(i.nome)} ${i.id ? "" : `<small style="color:var(--alerta)">produto não encontrado no cadastro (não baixa estoque)</small>`}</span><span class="valor">${moeda(i.qtd * i.preco)}</span></li>`).join("")}<li><strong>Total</strong><strong class="valor">${moeda(lido.total)}</strong></li></ul></div>`
                : `<div class="aviso-box"><i class="fa-solid fa-triangle-exclamation"></i> Não encontrei itens nessa mensagem. Cole o texto completo do pedido.</div>`;
        });
        $("#imp-salvar").onclick = () => {
            if (!lido) return;
            if (D.pedidos.some((p) => p.codigo === lido.codigo)) { toast(`O pedido #${lido.codigo} já está registrado.`, true); return; }
            D.pedidos.unshift(lido);
            salvar(); fecharModal(); filtroPedidos = "novo"; RENDER.pedidos();
            toast(`Pedido #${lido.codigo} registrado.`);
        };
    });

    // ═════════════════════════════════════════════════════════════════════════
    // VENDA NO BALCÃO (PDV)
    // ═════════════════════════════════════════════════════════════════════════
    let vendaPDV = [];
    RENDER.pdv = () => {
        const termo = $("#pdv-busca").value.trim().toLowerCase();
        const lista = D.produtos.filter((p) => p.ativo !== false && (!termo || lojaSemAcento(`${p.nome} ${p.unidade} ${marcaDe(p.marca).nome} ${lojaCodigoProduto(p)}`).includes(lojaSemAcento(termo)))).slice(0, 60);
        $("#pdv-grade").innerHTML = lista.map((p) => `
            <button type="button" class="pdv-prod" data-pdv-add="${p.id}" ${estoqueZerado(p) ? "disabled" : ""}>
                <span class="pdv-prod-topo">${iconeProduto(p)}<strong>${esc(p.nome)}</strong></span>
                <small>${esc(marcaDe(p.marca).nome)}${p.unidade ? ` · ${esc(p.unidade)}` : ""}${controlaEstoque(p) ? ` · ${p.estoque} em estoque` : ""}</small>
                <span class="preco">${moeda(precoDe(p))}</span>
            </button>`).join("") || `<p class="vazio-mini">Nenhum produto encontrado.</p>`;
        $("#pdv-pagamento").innerHTML = ["PIX", "Cartão de crédito", "Cartão de débito", "Boleto", "Dinheiro", "A receber"].map((f) => `<option>${f}</option>`).join("");
        renderVendaPDV();
        renderVendasHoje();
    };
    const renderVendaPDV = () => {
        const itens = vendaPDV.map((v) => ({ ...v, p: produtoPorId(v.id) })).filter((v) => v.p);
        $("#pdv-itens").innerHTML = itens.length ? itens.map(({ p, qtd }) => `
            <div class="pdv-item">
                <div class="pdv-item-nome">${esc(p.nome)}<small>${moeda(precoDe(p))} · ${esc(p.unidade || "")}</small></div>
                <div class="qtd"><button type="button" data-pdv-menos="${p.id}">−</button><span>${qtd}</span><button type="button" data-pdv-add="${p.id}">+</button></div>
                <strong style="min-width:78px;text-align:right">${moeda(precoDe(p) * qtd)}</strong>
            </div>`).join("") : `<p class="vazio-mini">Busque e toque nos produtos ao lado para adicionar.</p>`;
        const sub = itens.reduce((a, v) => a + precoDe(v.p) * v.qtd, 0);
        const total = Math.max(0, sub - num($("#pdv-desconto").value));
        $("#pdv-total").textContent = moeda(total);
        $("#pdv-finalizar").disabled = !itens.length;
    };
    const renderVendasHoje = () => {
        const hoje = D.lancamentos.filter((l) => l.tipo === "entrada" && chaveDia(l.data) === hojeChave()).sort((a, b) => new Date(b.data) - new Date(a.data));
        $("#pdv-hoje-total").textContent = moeda(hoje.reduce((a, l) => a + Number(l.valor), 0));
        $("#pdv-hoje").innerHTML = hoje.length
            ? `<ul class="lista-simples">${hoje.map((l) => `<li><div>${esc(l.descricao)}<small>${fmtDataHora(l.data)} · ${esc(l.categoria)} · ${esc(l.formaPagamento || "")}</small></div><span class="valor valor-entrada">${moeda(l.valor)}</span></li>`).join("")}</ul>`
            : `<p class="vazio-mini">Nenhuma venda registrada hoje.</p>`;
    };
    $("#aba-pdv").addEventListener("click", (e) => {
        const add = e.target.closest("[data-pdv-add]");
        const menos = e.target.closest("[data-pdv-menos]");
        if (add) {
            const id = Number(add.dataset.pdvAdd), p = produtoPorId(id);
            const item = vendaPDV.find((v) => v.id === id);
            const nova = (item ? item.qtd : 0) + 1;
            if (controlaEstoque(p) && nova > Number(p.estoque)) { toast(`Só há ${p.estoque} em estoque.`, true); return; }
            if (item) item.qtd = nova; else vendaPDV.push({ id, qtd: 1 });
            renderVendaPDV();
        }
        if (menos) {
            const id = Number(menos.dataset.pdvMenos), item = vendaPDV.find((v) => v.id === id);
            if (item) { item.qtd--; if (item.qtd <= 0) vendaPDV = vendaPDV.filter((v) => v !== item); }
            renderVendaPDV();
        }
    });
    $("#pdv-busca").addEventListener("input", () => RENDER.pdv());
    $("#pdv-desconto").addEventListener("input", renderVendaPDV);
    $("#pdv-limpar").addEventListener("click", () => { vendaPDV = []; $("#pdv-desconto").value = ""; $("#pdv-cliente").value = ""; renderVendaPDV(); });
    $("#pdv-finalizar").addEventListener("click", () => {
        const itens = vendaPDV.map((v) => { const p = produtoPorId(v.id); return { id: p.id, nome: p.nome, qtd: v.qtd, preco: precoDe(p), custo: p.custo || 0 }; });
        if (!itens.length) return;
        const sub = itens.reduce((a, i) => a + i.preco * i.qtd, 0);
        const total = Math.round(Math.max(0, sub - num($("#pdv-desconto").value)) * 100) / 100;
        const cliente = $("#pdv-cliente").value.trim();
        lancar({
            tipo: "entrada", categoria: "Venda direta",
            descricao: `${itens.map((i) => `${i.qtd}x ${i.nome}`).join(", ")}${cliente ? ` — ${cliente}` : ""}`,
            valor: total, formaPagamento: $("#pdv-pagamento").value, itens,
        });
        movimentarEstoque(itens, -1, "Venda direta");
        salvar();
        vendaPDV = []; $("#pdv-desconto").value = ""; $("#pdv-cliente").value = "";
        RENDER.pdv();
        toast(`Venda de ${moeda(total)} registrada no caixa.`);
    });

    // ═════════════════════════════════════════════════════════════════════════
    // PRODUTOS E ESTOQUE
    // ═════════════════════════════════════════════════════════════════════════
    RENDER.produtos = () => {
        const selMarca = $("#prod-filtro-marca");
        const marcaAtual = selMarca.value;
        selMarca.innerHTML = `<option value="">Todas as marcas</option>` + D.marcas.map((m) => `<option value="${esc(m.id)}">${esc(m.nome)}</option>`).join("");
        selMarca.value = marcaAtual;
        const selCat = $("#prod-filtro-cat");
        let catAtual = selCat.value;
        const catsVisiveis = D.categorias.filter((c) => !marcaAtual || c.marca === marcaAtual);
        if (catAtual && !catsVisiveis.some((c) => c.id === catAtual)) catAtual = "";
        selCat.innerHTML = `<option value="">Todas as categorias</option>` + catsVisiveis.map((c) => `<option value="${esc(c.id)}">${marcaAtual ? "" : `${esc(marcaDe(c.marca).nome)} · `}${esc(c.nome)}</option>`).join("");
        selCat.value = catAtual;
        const termo = lojaSemAcento($("#prod-busca").value.trim());
        const est = $("#prod-filtro-est").value;
        const lista = D.produtos.filter((p) => {
            if (marcaAtual && p.marca !== marcaAtual) return false;
            if (catAtual && p.categoria !== catAtual) return false;
            if (termo && !lojaSemAcento(`${p.nome} ${p.unidade} ${p.linha || ""} ${lojaCodigoProduto(p)}`).includes(termo)) return false;
            if (est === "baixo" && !estoqueBaixo(p)) return false;
            if (est === "zerado" && !estoqueZerado(p)) return false;
            if (est === "lancamento" && !p.lancamento) return false;
            if (est === "destaque" && !p.destaque) return false;
            if (est === "semfoto" && p.imagem) return false;
            if (est === "semcusto" && Number(p.custo) > 0) return false;
            if (est === "inativo" && p.ativo !== false) return false;
            return true;
        });
        const usaFinal = D.config.tabelaPreco === "final";
        $("#th-final").innerHTML = `Preço final${usaFinal ? ` <span class="em-uso">em uso</span>` : ""}`;
        $("#th-prof").innerHTML = `Profissional${usaFinal ? "" : ` <span class="em-uso">em uso</span>`}`;
        const comEstoque = D.produtos.filter(controlaEstoque);
        const valorEstoqueCusto = comEstoque.reduce((a, p) => a + Number(p.estoque) * Number(p.custo || 0), 0);
        const valorEstoqueVenda = comEstoque.reduce((a, p) => a + Number(p.estoque) * precoDe(p), 0);
        $("#resumo-estoque").innerHTML = `
            <span><strong>${D.produtos.length}</strong> produtos (${D.marcas.map((m) => `${D.produtos.filter((p) => p.marca === m.id).length} ${esc(m.nome)}`).join(" · ")})</span>
            <span>Tabela em uso na loja: <strong>${usaFinal ? "preço final" : "profissional"}</strong></span>
            ${comEstoque.length ? `<span>Estoque a preço de venda: <strong>${moeda(valorEstoqueVenda)}</strong>${valorEstoqueCusto ? ` · a custo: <strong>${moeda(valorEstoqueCusto)}</strong>` : ""}</span>` : `<span>Estoque: <strong>sem controle</strong> (preencha a coluna Estoque para controlar)</span>`}`;
        $("#tabela-produtos tbody").innerHTML = lista.length ? lista.map((p) => {
            const c = categoriaDe(p.categoria), m = marcaDe(p.marca);
            const pv = precoDe(p);
            const margem = pv > 0 && Number(p.custo) > 0 ? ((pv - p.custo) / pv) * 100 : null;
            const pillEst = estoqueZerado(p) ? `<span class="pill pill--zerado">Esgotado</span>` : estoqueBaixo(p) ? `<span class="pill pill--baixo">Baixo</span>` : "";
            return `<tr>
                <td><div class="prod-cel">${iconeProduto(p)}<div>${esc(p.nome)}<small>${esc(p.unidade || "")}${p.unidade ? " · " : ""}${esc(lojaCodigoProduto(p))}${p.lancamento ? " · lançamento" : ""}${p.destaque ? " · ★ destaque" : ""}</small></div></div></td>
                <td><span class="marca-pill" style="--marca-clara:${esc(m.corClara)};--marca-escura:${esc(m.corEscura)}">${esc(m.nome)}</span><br><small style="color:var(--muted);font-weight:700">${esc(c.nome)}</small></td>
                <td class="num"><input type="number" class="inline-num" style="width:84px!important" step="0.01" min="0" value="${Number(p.custo) > 0 ? Number(p.custo).toFixed(2) : ""}" placeholder="—" data-custo="${p.id}" aria-label="Custo de ${esc(p.nome)}"></td>
                <td class="num"><input type="number" class="inline-num${usaFinal ? " preco-ativo" : ""}" step="0.01" min="0" value="${Number(p.precoFinal || 0).toFixed(2)}" data-preco-final="${p.id}" aria-label="Preço final de ${esc(p.nome)}"></td>
                <td class="num"><input type="number" class="inline-num${usaFinal ? "" : " preco-ativo"}" step="0.01" min="0" value="${Number(p.precoProf || 0).toFixed(2)}" data-preco-prof="${p.id}" aria-label="Preço profissional de ${esc(p.nome)}"></td>
                <td class="num ${margem === null ? "" : margem >= 20 ? "margem-boa" : "margem-baixa"}">${margem === null ? "—" : `${Math.round(margem)}%`}</td>
                <td class="num"><div class="estoque-cel">${pillEst}<input type="number" class="inline-num" style="width:72px!important" step="1" min="0" value="${controlaEstoque(p) ? p.estoque : ""}" placeholder="—" data-estoque="${p.id}" aria-label="Estoque de ${esc(p.nome)}"></div></td>
                <td><label class="switch" title="Mostrar na loja"><input type="checkbox" data-ativo="${p.id}" ${p.ativo !== false ? "checked" : ""}><span></span></label></td>
                <td class="acoes">
                    <button type="button" class="icone-btn" data-repor="${p.id}" title="Repor estoque"><i class="fa-solid fa-truck-ramp-box"></i></button>
                    <button type="button" class="icone-btn" data-editar="${p.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="icone-btn icone-btn--perigo" data-excluir="${p.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
        }).join("") : `<tr><td colspan="9"><p class="vazio-mini">Nenhum produto neste filtro.</p></td></tr>`;
    };
    ["#prod-busca", "#prod-filtro-marca", "#prod-filtro-cat", "#prod-filtro-est"].forEach((s) => $(s).addEventListener("input", () => RENDER.produtos()));

    $("#tabela-produtos").addEventListener("change", (e) => {
        const t = e.target;
        const precoCampo = t.dataset.precoFinal ? "precoFinal" : t.dataset.precoProf ? "precoProf" : "";
        if (precoCampo) {
            const p = produtoPorId(t.dataset.precoFinal || t.dataset.precoProf);
            const v = num(t.value);
            if (v <= 0) { toast("Preço inválido.", true); t.value = Number(p[precoCampo] || 0).toFixed(2); return; }
            p[precoCampo] = Math.round(v * 100) / 100;
            salvar(); RENDER.produtos(); toast(`${precoCampo === "precoFinal" ? "Preço final" : "Preço profissional"} de ${esc(p.nome)}: ${moeda(p[precoCampo])}.`);
        }
        if (t.dataset.custo) {
            const p = produtoPorId(t.dataset.custo);
            p.custo = t.value === "" ? null : Math.round(Math.max(0, num(t.value)) * 100) / 100;
            salvar(); RENDER.produtos(); toast(`Custo de ${esc(p.nome)} atualizado.`);
        }
        if (t.dataset.estoque) {
            const p = produtoPorId(t.dataset.estoque);
            const antes = controlaEstoque(p) ? Number(p.estoque) : null;
            p.estoque = t.value === "" ? null : Math.max(0, Math.round(num(t.value)));
            if (antes !== null && p.estoque !== null) D.movEstoque.unshift({ data: new Date().toISOString(), produtoId: p.id, qtd: p.estoque - antes, motivo: "Ajuste manual" });
            salvar(); RENDER.produtos(); toast(p.estoque === null ? `${esc(p.nome)}: estoque sem controle.` : `Estoque de ${esc(p.nome)} ajustado.`);
        }
        if (t.dataset.ativo) {
            const p = produtoPorId(t.dataset.ativo);
            p.ativo = t.checked;
            salvar(); toast(`${esc(p.nome)} ${p.ativo ? "aparece" : "não aparece mais"} na loja.`);
        }
    });

    document.addEventListener("click", (e) => {
        const ed = e.target.closest("[data-editar]");
        if (ed) return modalProduto(produtoPorId(ed.dataset.editar));
        const rp = e.target.closest("[data-repor]");
        if (rp) return modalRepor(produtoPorId(rp.dataset.repor));
        const ex = e.target.closest("[data-excluir]");
        if (ex) {
            const p = produtoPorId(ex.dataset.excluir);
            return confirmar(`Excluir <strong>${esc(p.nome)}</strong> do catálogo? Dica: para só esconder da loja, desligue a chave "Na loja".`, "Excluir produto", () => {
                D.produtos = D.produtos.filter((x) => x !== p);
                salvar(); RENDER.produtos(); toast("Produto excluído.");
            });
        }
    });
    $("#btn-novo-produto").addEventListener("click", () => modalProduto(null));

    // Reduz a foto enviada para ~600px (JPEG) para caber no armazenamento
    const comprimirImagem = (arquivo, max = 600) => new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onerror = reject;
        leitor.onload = () => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                const escala = Math.min(1, max / Math.max(img.width, img.height));
                const c = document.createElement("canvas");
                c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
                const ctx = c.getContext("2d");
                ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
                ctx.drawImage(img, 0, 0, c.width, c.height);
                resolve(c.toDataURL("image/jpeg", 0.8));
            };
            img.src = leitor.result;
        };
        leitor.readAsDataURL(arquivo);
    });
    const editorFoto = (idPrefixo, valor) => `
        <div class="foto-editor">
            <div class="foto-previa" id="${idPrefixo}-previa">${valor ? `<img src="${esc(valor)}" alt="">` : `<i class="fa-regular fa-image"></i>`}</div>
            <div class="foto-botoes">
                <input type="url" id="${idPrefixo}-url" placeholder="Cole o link de uma foto (opcional)" value="${valor && !valor.startsWith("data:") ? esc(valor) : ""}">
                <div style="display:flex;gap:6px">
                    <label class="btn btn-fantasma btn-sm" style="flex:1"><i class="fa-solid fa-upload"></i> Enviar foto<input type="file" accept="image/*" id="${idPrefixo}-arquivo" hidden></label>
                    <button type="button" class="btn btn-fantasma btn-sm" id="${idPrefixo}-remover"><i class="fa-solid fa-xmark"></i> Remover</button>
                </div>
                <input type="hidden" id="${idPrefixo}-valor" value="${esc(valor || "")}">
            </div>
        </div>`;
    const ligarEditorFoto = (idPrefixo) => {
        const previa = (v) => { $(`#${idPrefixo}-previa`).innerHTML = v ? `<img src="${esc(v)}" alt="">` : `<i class="fa-regular fa-image"></i>`; $(`#${idPrefixo}-valor`).value = v; };
        $(`#${idPrefixo}-url`).addEventListener("input", (e) => previa(e.target.value.trim()));
        $(`#${idPrefixo}-arquivo`).addEventListener("change", async (e) => {
            const f = e.target.files[0]; if (!f) return;
            try { previa(await comprimirImagem(f)); $(`#${idPrefixo}-url`).value = ""; } catch (err) { toast("Não foi possível ler essa imagem.", true); }
        });
        $(`#${idPrefixo}-remover`).addEventListener("click", () => { $(`#${idPrefixo}-url`).value = ""; previa(""); });
    };

    const modalProduto = (p) => {
        const novo = !p;
        const marcaInicial = $("#prod-filtro-marca").value || D.marcas[0]?.id || "";
        p = p || { nome: "", unidade: "", marca: marcaInicial, categoria: "", linha: "", codigo: "", precoFinal: "", precoProf: "", custo: "", pesoG: 150, estoque: "", estoqueMin: 2, descricao: "", imagem: "", uso: "", destaque: false, lancamento: false, ativo: true };
        const opcoesCat = (marca, atual) => D.categorias.filter((c) => c.marca === marca).map((c) => `<option value="${esc(c.id)}" ${c.id === atual ? "selected" : ""}>${esc(c.nome)}</option>`).join("");
        abrirModal({
            titulo: novo ? "Novo produto" : "Editar produto",
            largura: 720,
            corpo: `
                <label class="campo"><span>Nome do produto</span><input type="text" id="p-nome" value="${esc(p.nome)}" placeholder="Ex.: Hialuderme - Fluido de ácido hialurônico"></label>
                <div class="campo-linha">
                    <label class="campo"><span>Marca</span><select id="p-marca">${D.marcas.map((m) => `<option value="${esc(m.id)}" ${m.id === p.marca ? "selected" : ""}>${esc(m.nome)}</option>`).join("")}</select></label>
                    <label class="campo"><span>Categoria</span><select id="p-categoria">${opcoesCat(p.marca, p.categoria)}</select></label>
                    <label class="campo"><span>Linha <em>(subgrupo)</em></span><input type="text" id="p-linha" value="${esc(p.linha || "")}" placeholder="Ex.: Vitamina C"></label>
                </div>
                <div class="campo-linha">
                    <label class="campo"><span>Tamanho / embalagem</span><input type="text" id="p-unidade" value="${esc(p.unidade || "")}" placeholder="Ex.: 30 ml"></label>
                    <label class="campo"><span>Código</span><input type="text" id="p-codigo" value="${esc(p.codigo || "")}" placeholder="${p.id ? `#${p.id}` : "Automático"}"></label>
                    <label class="campo"><span>Uso</span><select id="p-uso"><option value="">Não informar</option><option value="profissional" ${p.uso === "profissional" ? "selected" : ""}>Profissional (cabine)</option><option value="homecare" ${p.uso === "homecare" ? "selected" : ""}>Home care</option></select></label>
                </div>
                <div class="campo-linha">
                    <label class="campo"><span>Preço final (R$)</span><input type="number" step="0.01" min="0" id="p-final" value="${p.precoFinal}"></label>
                    <label class="campo"><span>Preço profissional (R$)</span><input type="number" step="0.01" min="0" id="p-prof" value="${p.precoProf}"></label>
                    <label class="campo"><span>Custo <em>(quanto a loja paga)</em></span><input type="number" step="0.01" min="0" id="p-custo" value="${Number(p.custo) > 0 ? p.custo : ""}" placeholder="Opcional"></label>
                </div>
                <p class="campo-ajuda" id="p-margem" style="margin:-4px 0 12px"></p>
                <div class="campo-linha">
                    <label class="campo"><span>Peso para o frete (g)</span><input type="number" step="1" min="0" id="p-peso" value="${p.pesoG ?? ""}"></label>
                    <label class="campo"><span>Estoque atual</span><input type="number" step="1" min="0" id="p-estoque" value="${controlaEstoque(p) ? p.estoque : ""}" placeholder="Vazio = não controlar"></label>
                    <label class="campo"><span>Avisar quando chegar a</span><input type="number" step="1" min="0" id="p-min" value="${p.estoqueMin ?? ""}"></label>
                </div>
                <label class="campo"><span>Descrição</span><textarea id="p-desc" rows="4">${esc(p.descricao || "")}</textarea></label>
                <div class="campo"><span>Foto <em>(fundo branco fica melhor na vitrine)</em></span>${editorFoto("p-foto", p.imagem)}</div>
                <div class="linha-switch"><label class="switch"><input type="checkbox" id="p-lancamento" ${p.lancamento ? "checked" : ""}><span></span></label> Marcar como lançamento</div>
                <div class="linha-switch"><label class="switch"><input type="checkbox" id="p-destaque" ${p.destaque ? "checked" : ""}><span></span></label> Destacar na página inicial</div>
                <div class="linha-switch"><label class="switch"><input type="checkbox" id="p-ativo" ${p.ativo !== false ? "checked" : ""}><span></span></label> Mostrar na loja</div>`,
            rodape: `<button type="button" class="btn btn-fantasma" data-fechar>Cancelar</button><button type="button" class="btn btn-primario" id="p-salvar"><i class="fa-solid fa-floppy-disk"></i> Salvar</button>`,
            aoAbrir: () => ligarEditorFoto("p-foto"),
        });
        $("#p-marca").addEventListener("change", (e) => { $("#p-categoria").innerHTML = opcoesCat(e.target.value, ""); });
        const atualizarMargem = () => {
            const fin = num($("#p-final").value), prof = num($("#p-prof").value), cu = num($("#p-custo").value);
            const pr = D.config.tabelaPreco === "final" ? fin : (prof || fin);
            const partes = [];
            if (fin > 0 && prof > 0 && prof < fin) partes.push(`Profissional ${Math.round((1 - prof / fin) * 100)}% abaixo do preço final`);
            if (pr > 0 && cu > 0) partes.push(`margem de ${Math.round(((pr - cu) / pr) * 100)}% (lucro de ${moeda(pr - cu)} por unidade)`);
            $("#p-margem").textContent = partes.join(" · ");
        };
        ["#p-final", "#p-prof", "#p-custo"].forEach((s) => $(s).addEventListener("input", atualizarMargem));
        atualizarMargem();
        $("#p-salvar").onclick = () => {
            const nome = $("#p-nome").value.trim();
            let fin = num($("#p-final").value), prof = num($("#p-prof").value);
            if (fin <= 0 && prof > 0) fin = prof;
            if (prof <= 0 && fin > 0) prof = fin;
            $("#p-nome").classList.toggle("erro", !nome);
            $("#p-final").classList.toggle("erro", fin <= 0);
            $("#p-categoria").classList.toggle("erro", !$("#p-categoria").value);
            if (!nome || fin <= 0) { toast("Preencha o nome e pelo menos um dos preços.", true); return; }
            if (!$("#p-categoria").value) { toast("Escolha a categoria (crie uma em Categorias, se a marca ainda não tiver).", true); return; }
            const dadosP = {
                nome, unidade: $("#p-unidade").value.trim(), marca: $("#p-marca").value, categoria: $("#p-categoria").value, linha: $("#p-linha").value.trim(),
                codigo: $("#p-codigo").value.trim(), uso: $("#p-uso").value,
                precoFinal: Math.round(fin * 100) / 100, precoProf: Math.round(prof * 100) / 100,
                custo: $("#p-custo").value === "" ? null : num($("#p-custo").value), pesoG: Math.max(0, Math.round(num($("#p-peso").value))) || 150,
                estoque: $("#p-estoque").value === "" ? null : Math.max(0, Math.round(num($("#p-estoque").value))),
                estoqueMin: Math.round(num($("#p-min").value)), descricao: $("#p-desc").value.trim(), imagem: $("#p-foto-valor").value,
                lancamento: $("#p-lancamento").checked, destaque: $("#p-destaque").checked, ativo: $("#p-ativo").checked,
            };
            if (novo) D.produtos.push({ id: proximoId(D.produtos), forma: "", linhaInfo: "", ...dadosP });
            else Object.assign(p, dadosP);
            salvar(); fecharModal(); RENDER.produtos();
            toast(novo ? "Produto cadastrado e já aparece na loja." : "Produto atualizado.");
        };
    };

    const modalRepor = (p) => {
        abrirModal({
            titulo: `Repor estoque`,
            largura: 480,
            corpo: `
                <div class="detalhe-grupo" style="display:flex;gap:10px;align-items:center">${iconeProduto(p)}<div>${esc(p.nome)}<br><small style="color:var(--muted)">Estoque atual: ${controlaEstoque(p) ? p.estoque : "—"}</small></div></div>
                <div class="campo-linha">
                    <label class="campo"><span>Quantidade que chegou</span><input type="number" min="1" step="1" id="r-qtd" value="10"></label>
                    <label class="campo"><span>Custo por unidade (R$)</span><input type="number" min="0" step="0.01" id="r-custo" value="${Number(p.custo) > 0 ? p.custo : ""}"></label>
                </div>
                <div class="linha-switch"><label class="switch"><input type="checkbox" id="r-lancar" checked><span></span></label> Lançar a compra como saída no caixa</div>
                <div class="campo-linha" id="r-pag-linha">
                    <label class="campo"><span>Pago com</span><select id="r-pag"><option>Boleto</option><option>PIX</option><option>Dinheiro</option><option>Cartão de crédito</option><option>Cartão de débito</option></select></label>
                    <label class="campo"><span>Fornecedor <em>(opcional)</em></span><input type="text" id="r-forn"></label>
                </div>
                <p class="campo-ajuda" id="r-total"></p>`,
            rodape: `<button type="button" class="btn btn-fantasma" data-fechar>Cancelar</button><button type="button" class="btn btn-primario" id="r-salvar"><i class="fa-solid fa-truck-ramp-box"></i> Dar entrada no estoque</button>`,
        });
        const atual = () => { $("#r-total").textContent = `Total da compra: ${moeda(num($("#r-qtd").value) * num($("#r-custo").value))}`; $("#r-pag-linha").hidden = !$("#r-lancar").checked; };
        ["#r-qtd", "#r-custo", "#r-lancar"].forEach((s) => $(s).addEventListener("input", atual));
        atual();
        $("#r-salvar").onclick = () => {
            const qtd = Math.round(num($("#r-qtd").value)), custo = num($("#r-custo").value);
            if (qtd <= 0) { $("#r-qtd").classList.add("erro"); return; }
            p.estoque = (controlaEstoque(p) ? Number(p.estoque) : 0) + qtd;
            if (custo > 0) p.custo = custo;
            D.movEstoque.unshift({ data: new Date().toISOString(), produtoId: p.id, qtd, motivo: "Reposição" });
            if ($("#r-lancar").checked && custo > 0) {
                const forn = $("#r-forn").value.trim();
                lancar({ tipo: "saida", categoria: `Compra de produtos ${marcaDe(p.marca).nome}`, descricao: `${qtd}x ${p.nome}${forn ? ` — ${forn}` : ""}`, valor: Math.round(qtd * custo * 100) / 100, formaPagamento: $("#r-pag").value });
            }
            salvar(); fecharModal(); RENDER[abaAtual]();
            toast(`+${qtd} unidades de ${esc(p.nome)}.`);
        };
    };

    $("#btn-reajuste").addEventListener("click", () => {
        abrirModal({
            titulo: "Reajustar preços",
            largura: 520,
            corpo: `
                <div class="aviso-box aviso-box--info"><i class="fa-solid fa-circle-info"></i><span>Use quando a marca atualizar a tabela. Número negativo baixa os preços.</span></div>
                <div class="campo-linha">
                    <label class="campo"><span>Marca</span><select id="rj-marca"><option value="">Todas</option>${D.marcas.map((m) => `<option value="${esc(m.id)}">${esc(m.nome)}</option>`).join("")}</select></label>
                    <label class="campo"><span>Categoria</span><select id="rj-cat"></select></label>
                </div>
                <label class="campo"><span>O que fazer</span><select id="rj-modo">
                    <option value="ambos">Reajustar preço final e profissional (%)</option>
                    <option value="final">Reajustar só o preço final (%)</option>
                    <option value="prof">Reajustar só o profissional (%)</option>
                    <option value="desconto">Recalcular o profissional: preço final menos X%</option>
                </select></label>
                <div class="campo-linha">
                    <label class="campo"><span id="rj-pct-rotulo">Reajuste (%)</span><input type="number" step="0.1" id="rj-pct" value="5"></label>
                </div>
                <div class="linha-switch"><label class="switch"><input type="checkbox" id="rj-custo"><span></span></label> Reajustar também o custo (mesmo %)</div>
                <p class="campo-ajuda" id="rj-prev"></p>`,
            rodape: `<button type="button" class="btn btn-fantasma" data-fechar>Cancelar</button><button type="button" class="btn btn-primario" id="rj-aplicar">Aplicar</button>`,
        });
        const r2 = (v) => Math.round(v * 100) / 100;
        const montarCats = () => { const m = $("#rj-marca").value; $("#rj-cat").innerHTML = `<option value="">Todas</option>` + D.categorias.filter((c) => !m || c.marca === m).map((c) => `<option value="${esc(c.id)}">${m ? "" : `${esc(marcaDe(c.marca).nome)} · `}${esc(c.nome)}</option>`).join(""); };
        montarCats();
        const alvo = () => D.produtos.filter((p) => (!$("#rj-marca").value || p.marca === $("#rj-marca").value) && (!$("#rj-cat").value || p.categoria === $("#rj-cat").value));
        const novos = (p) => {
            const modo = $("#rj-modo").value, pct = num($("#rj-pct").value) / 100;
            let fin = Number(p.precoFinal) || 0, prof = Number(p.precoProf) || 0;
            if (modo === "desconto") prof = r2(fin * (1 - pct));
            else {
                if (modo !== "prof") fin = r2(fin * (1 + pct));
                if (modo !== "final") prof = r2(prof * (1 + pct));
            }
            return { fin, prof };
        };
        const prev = () => {
            const desconto = $("#rj-modo").value === "desconto";
            $("#rj-pct-rotulo").textContent = desconto ? "Desconto do profissional sobre o final (%)" : "Reajuste (%)";
            $("#rj-custo").closest(".linha-switch").hidden = desconto;
            const a = alvo();
            if (!a.length) { $("#rj-prev").textContent = "Nenhum produto."; return; }
            const n = novos(a[0]);
            $("#rj-prev").textContent = `${a.length} produtos. Ex.: ${a[0].nome} — final ${moeda(a[0].precoFinal)} → ${moeda(n.fin)} · profissional ${moeda(a[0].precoProf)} → ${moeda(n.prof)}`;
        };
        $("#rj-marca").addEventListener("input", () => { montarCats(); prev(); });
        ["#rj-cat", "#rj-pct", "#rj-modo"].forEach((s) => $(s).addEventListener("input", prev));
        prev();
        $("#rj-aplicar").onclick = () => {
            const a = alvo(), pct = num($("#rj-pct").value), desconto = $("#rj-modo").value === "desconto";
            if (desconto && (pct < 0 || pct >= 100)) { toast("Informe um desconto entre 0 e 99%.", true); return; }
            a.forEach((p) => {
                const n = novos(p);
                p.precoFinal = n.fin; p.precoProf = n.prof;
                if (!desconto && $("#rj-custo").checked && Number(p.custo) > 0) p.custo = r2(p.custo * (1 + pct / 100));
            });
            salvar(); fecharModal(); RENDER.produtos(); toast(`${a.length} produtos atualizados.`);
        };
    });

    const ICONES_CAT = ["fa-pump-soap", "fa-droplet", "fa-vial", "fa-flask", "fa-wand-magic-sparkles", "fa-layer-group", "fa-shield-heart", "fa-eye", "fa-face-smile", "fa-person", "fa-spray-can-sparkles", "fa-sun", "fa-brush", "fa-ruler", "fa-hand-holding-heart", "fa-seedling", "fa-leaf", "fa-spa", "fa-gift", "fa-box"];
    $("#btn-categorias").addEventListener("click", () => {
        const linhas = () => D.categorias.map((c, i) => `
            <div class="bairro-linha">
                <select data-cat-marca="${i}" style="width:120px">${D.marcas.map((m) => `<option value="${esc(m.id)}" ${m.id === c.marca ? "selected" : ""}>${esc(m.nome)}</option>`).join("")}</select>
                <select data-cat-icone="${i}" style="width:150px">${ICONES_CAT.map((ic) => `<option value="${ic}" ${ic === c.icone ? "selected" : ""}>${ic.replace("fa-", "")}</option>`).join("")}</select>
                <input type="text" value="${esc(c.nome)}" data-cat-nome="${i}">
                <span class="pdv-prod-icone" style="background:${esc(marcaDe(c.marca).cor)}"><i class="fa-solid ${esc(c.icone)}"></i></span>
                <button type="button" class="icone-btn icone-btn--perigo" data-cat-del="${i}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </div>`).join("");
        abrirModal({
            titulo: "Categorias",
            largura: 700,
            corpo: `<p class="campo-ajuda" style="margin-bottom:10px">Cada categoria pertence a uma marca e aparece dentro da aba dela na loja.</p><div class="bairros-lista" id="cat-lista">${linhas()}</div><button type="button" class="btn btn-fantasma btn-sm" id="cat-add"><i class="fa-solid fa-plus"></i> Nova categoria</button>`,
            rodape: `<button type="button" class="btn btn-primario" id="cat-ok">Concluir</button>`,
        });
        const lista = $("#cat-lista");
        lista.addEventListener("input", (e) => {
            const t = e.target;
            if (t.dataset.catNome) D.categorias[t.dataset.catNome].nome = t.value;
            if (t.dataset.catIcone) D.categorias[t.dataset.catIcone].icone = t.value;
            if (t.dataset.catMarca) {
                const c = D.categorias[t.dataset.catMarca];
                const qtd = D.produtos.filter((p) => p.categoria === c.id).length;
                if (qtd) { toast(`Há ${qtd} produtos em "${esc(c.nome)}". Mova os produtos antes de trocar a marca da categoria.`, true); t.value = c.marca; return; }
                c.marca = t.value;
            }
            if (t.dataset.catMarca || t.dataset.catIcone) { const i = t.dataset.catMarca || t.dataset.catIcone; const ic = t.closest(".bairro-linha").querySelector(".pdv-prod-icone"); ic.style.background = marcaDe(D.categorias[i].marca).cor; ic.innerHTML = `<i class="fa-solid ${D.categorias[i].icone}"></i>`; }
            salvar();
        });
        lista.addEventListener("click", (e) => {
            const b = e.target.closest("[data-cat-del]"); if (!b) return;
            const c = D.categorias[b.dataset.catDel];
            const qtd = D.produtos.filter((p) => p.categoria === c.id).length;
            if (qtd) { toast(`Há ${qtd} produtos em "${esc(c.nome)}". Mude a categoria deles antes de excluir.`, true); return; }
            D.categorias.splice(Number(b.dataset.catDel), 1); salvar(); lista.innerHTML = linhas();
        });
        $("#cat-add").onclick = () => { D.categorias.push({ id: `cat${Date.now().toString(36)}`, marca: $("#prod-filtro-marca").value || D.marcas[0]?.id || "", nome: "Nova categoria", icone: "fa-spa" }); salvar(); lista.innerHTML = linhas(); lista.lastElementChild.scrollIntoView({ block: "nearest" }); };
        $("#cat-ok").onclick = () => { fecharModal(); RENDER.produtos(); };
    });

    // ═════════════════════════════════════════════════════════════════════════
    // ENTRADAS E SAÍDAS
    // ═════════════════════════════════════════════════════════════════════════
    const hoje0 = new Date();
    let finMes = { a: hoje0.getFullYear(), m: hoje0.getMonth() };
    let finTipo = "";
    const lancDoMes = () => D.lancamentos.filter((l) => { const d = new Date(l.data); return d.getFullYear() === finMes.a && d.getMonth() === finMes.m; });

    RENDER.financeiro = () => {
        $("#fin-mes-texto").textContent = `${NOMES_MES[finMes.m]} ${finMes.a}`;
        $$("#fin-tipo button").forEach((b) => b.classList.toggle("ativo", b.dataset.t === finTipo));
        const doMes = lancDoMes();
        const e = doMes.filter((l) => l.tipo === "entrada"), s = doMes.filter((l) => l.tipo === "saida");
        const tE = e.reduce((a, l) => a + Number(l.valor), 0), tS = s.reduce((a, l) => a + Number(l.valor), 0);
        $("#fin-kpis").innerHTML =
            kpi("kpi--entrada", "fa-arrow-down", "Entradas do mês", moeda(tE), `${e.length} lançamentos`) +
            kpi("kpi--saida", "fa-arrow-up", "Saídas do mês", moeda(tS), `${s.length} lançamentos`) +
            kpi(`kpi--saldo${tE - tS < 0 ? " kpi--negativo" : ""}`, "fa-scale-balanced", "Saldo do mês", `${tE - tS < 0 ? "− " : ""}${moeda(Math.abs(tE - tS))}`, "Entradas menos saídas");
        $("#fin-cat-saidas").innerHTML = barrasH(agrupar(s, "categoria"), "var(--cor-saida)");
        $("#fin-cat-entradas").innerHTML = barrasH(agrupar(e, "formaPagamento"), "var(--cor-entrada)");

        const termo = $("#fin-busca").value.trim().toLowerCase();
        const lista = doMes
            .filter((l) => !finTipo || l.tipo === finTipo)
            .filter((l) => !termo || `${l.descricao} ${l.categoria} ${l.formaPagamento}`.toLowerCase().includes(termo))
            .sort((a, b) => new Date(b.data) - new Date(a.data));
        $("#tabela-lanc tbody").innerHTML = lista.length ? lista.map((l) => `
            <tr>
                <td style="white-space:nowrap">${fmtData(l.data)}</td>
                <td>${esc(l.descricao)}</td>
                <td><span class="pill ${l.tipo === "entrada" ? "pill--pago" : "pill--baixo"}">${esc(l.categoria)}</span></td>
                <td>${esc(l.formaPagamento || "—")}</td>
                <td class="num ${l.tipo === "entrada" ? "valor-entrada" : "valor-saida"}">${l.tipo === "entrada" ? "+" : "−"} ${moeda(l.valor)}</td>
                <td class="acoes">
                    <button type="button" class="icone-btn" data-lanc-editar="${l.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="icone-btn icone-btn--perigo" data-lanc-excluir="${l.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`).join("") : `<tr><td colspan="6"><p class="vazio-mini">Nenhum lançamento.</p></td></tr>`;
    };
    $("#fin-mes-ant").addEventListener("click", () => { finMes.m--; if (finMes.m < 0) { finMes.m = 11; finMes.a--; } RENDER.financeiro(); });
    $("#fin-mes-prox").addEventListener("click", () => { finMes.m++; if (finMes.m > 11) { finMes.m = 0; finMes.a++; } RENDER.financeiro(); });
    $("#fin-tipo").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; finTipo = b.dataset.t; RENDER.financeiro(); });
    $("#fin-busca").addEventListener("input", () => RENDER.financeiro());

    const modalLancamento = (tipo, l) => {
        const novo = !l;
        l = l || { tipo, data: new Date().toISOString(), categoria: "", descricao: "", valor: "", formaPagamento: "PIX" };
        const cats = l.tipo === "entrada" ? LOJA_CATEGORIAS_ENTRADA : LOJA_CATEGORIAS_SAIDA;
        abrirModal({
            titulo: `${novo ? "Nova" : "Editar"} ${l.tipo === "entrada" ? "entrada" : "saída"}`,
            largura: 520,
            corpo: `
                ${l.pedidoCodigo ? `<div class="aviso-box"><i class="fa-solid fa-link"></i><span>Lançamento ligado ao pedido #${esc(l.pedidoCodigo)}.</span></div>` : ""}
                <label class="campo"><span>Descrição</span><input type="text" id="l-desc" value="${esc(l.descricao)}" placeholder="${l.tipo === "entrada" ? "Ex.: Venda para clínica, curso" : "Ex.: Boleto Bel Col, postagem nos Correios"}"></label>
                <div class="campo-linha">
                    <label class="campo"><span>Valor (R$)</span><input type="number" step="0.01" min="0" id="l-valor" value="${l.valor}"></label>
                    <label class="campo"><span>Data</span><input type="date" id="l-data" value="${chaveDia(l.data)}"></label>
                </div>
                <div class="campo-linha">
                    <label class="campo"><span>Categoria</span><select id="l-cat">${cats.map((c) => `<option ${c === l.categoria ? "selected" : ""}>${c}</option>`).join("")}${l.categoria && !cats.includes(l.categoria) ? `<option selected>${esc(l.categoria)}</option>` : ""}</select></label>
                    <label class="campo"><span>Forma de pagamento</span><select id="l-pag">${["PIX", "Cartão de crédito", "Cartão de débito", "Boleto", "Transferência", "Dinheiro", "A receber"].map((f) => `<option ${f === l.formaPagamento ? "selected" : ""}>${f}</option>`).join("")}</select></label>
                </div>`,
            rodape: `<button type="button" class="btn btn-fantasma" data-fechar>Cancelar</button><button type="button" class="btn ${l.tipo === "entrada" ? "btn-entrada" : "btn-saida"}" id="l-salvar">Salvar</button>`,
        });
        $("#l-salvar").onclick = () => {
            const desc = $("#l-desc").value.trim(), valor = num($("#l-valor").value);
            $("#l-desc").classList.toggle("erro", !desc); $("#l-valor").classList.toggle("erro", valor <= 0);
            if (!desc || valor <= 0) { toast("Preencha descrição e valor.", true); return; }
            const d = { descricao: desc, valor: Math.round(valor * 100) / 100, data: isoDeChave($("#l-data").value || hojeChave()), categoria: $("#l-cat").value, formaPagamento: $("#l-pag").value };
            if (novo) lancar({ tipo: l.tipo, ...d }); else Object.assign(l, d);
            const dt = new Date(d.data); finMes = { a: dt.getFullYear(), m: dt.getMonth() };
            salvar(); fecharModal(); RENDER.financeiro();
            toast(`${l.tipo === "entrada" ? "Entrada" : "Saída"} de ${moeda(d.valor)} ${novo ? "lançada" : "atualizada"}.`);
        };
    };
    $$("[data-novo-lanc]").forEach((b) => b.addEventListener("click", () => modalLancamento(b.dataset.novoLanc)));
    $("#tabela-lanc").addEventListener("click", (e) => {
        const ed = e.target.closest("[data-lanc-editar]");
        if (ed) return modalLancamento(null, D.lancamentos.find((l) => l.id === Number(ed.dataset.lancEditar)));
        const ex = e.target.closest("[data-lanc-excluir]");
        if (ex) {
            const l = D.lancamentos.find((x) => x.id === Number(ex.dataset.lancExcluir));
            confirmar(`Excluir o lançamento <strong>${esc(l.descricao)}</strong> (${moeda(l.valor)})?${l.pedidoCodigo ? " O pedido ligado a ele voltará para “Novo”." : ""}`, "Excluir", () => {
                D.lancamentos = D.lancamentos.filter((x) => x !== l);
                if (l.pedidoCodigo) { const p = D.pedidos.find((x) => x.codigo === l.pedidoCodigo); if (p) { p.lancamentoId = null; p.status = "novo"; movimentarEstoque(p.itens, +1, `Estorno #${p.codigo}`); } }
                salvar(); RENDER.financeiro(); toast("Lançamento excluído.");
            });
        }
    });
    $("#fin-csv").addEventListener("click", () => {
        const linhas = [["Data", "Tipo", "Descrição", "Categoria", "Forma de pagamento", "Valor"]];
        lancDoMes().sort((a, b) => new Date(a.data) - new Date(b.data)).forEach((l) => linhas.push([fmtData(l.data), l.tipo === "entrada" ? "Entrada" : "Saída", l.descricao, l.categoria, l.formaPagamento || "", (l.tipo === "entrada" ? 1 : -1) * Number(l.valor)].map((c) => typeof c === "number" ? c.toFixed(2).replace(".", ",") : `"${String(c).replace(/"/g, '""')}"`)));
        const blob = new Blob(["﻿" + linhas.map((l) => l.join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `caixa-${finMes.a}-${pad(finMes.m + 1)}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        toast("Planilha do mês baixada.");
    });

    // ═════════════════════════════════════════════════════════════════════════
    // CUPONS
    // ═════════════════════════════════════════════════════════════════════════
    RENDER.cupons = () => {
        $("#cupons-grade").innerHTML = D.cupons.length ? D.cupons.map((c, i) => `
            <div class="cupom-card${c.ativo === false ? " inativo" : ""}">
                <span class="cupom-codigo">${esc(c.codigo)}</span>
                <span class="cupom-valor">${c.tipo === "fixo" ? `${moeda(c.valor)} de desconto` : `${c.valor}% de desconto`}</span>
                <span class="cupom-regras">${c.valorMinimo ? `Pedido mínimo ${moeda(c.valorMinimo)}` : "Sem pedido mínimo"} · ${c.validade ? `até ${fmtData(isoDeChave(c.validade))}` : "sem validade"}</span>
                <div class="cupom-acoes">
                    <label class="switch" title="Ativo"><input type="checkbox" data-cupom-ativo="${i}" ${c.ativo !== false ? "checked" : ""}><span></span></label>
                    <button type="button" class="icone-btn" data-cupom-editar="${i}" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="icone-btn icone-btn--perigo" data-cupom-excluir="${i}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`).join("") : `<div class="painel-card"><p class="vazio-mini">Nenhum cupom criado.</p></div>`;
    };
    const modalCupom = (i) => {
        const novo = i === undefined;
        const c = novo ? { codigo: "", tipo: "percentual", valor: 10, valorMinimo: 0, validade: "", ativo: true } : D.cupons[i];
        abrirModal({
            titulo: novo ? "Novo cupom" : "Editar cupom",
            largura: 480,
            corpo: `
                <label class="campo"><span>Código</span><input type="text" id="c-cod" value="${esc(c.codigo)}" placeholder="Ex.: BEMVINDA10" style="text-transform:uppercase"></label>
                <div class="campo-linha">
                    <label class="campo"><span>Tipo</span><select id="c-tipo"><option value="percentual" ${c.tipo !== "fixo" ? "selected" : ""}>Porcentagem (%)</option><option value="fixo" ${c.tipo === "fixo" ? "selected" : ""}>Valor fixo (R$)</option></select></label>
                    <label class="campo"><span>Valor</span><input type="number" min="0" step="0.01" id="c-valor" value="${c.valor}"></label>
                </div>
                <div class="campo-linha">
                    <label class="campo"><span>Pedido mínimo (R$)</span><input type="number" min="0" step="0.01" id="c-min" value="${c.valorMinimo || ""}"></label>
                    <label class="campo"><span>Válido até <em>(opcional)</em></span><input type="date" id="c-val" value="${c.validade || ""}"></label>
                </div>`,
            rodape: `<button type="button" class="btn btn-fantasma" data-fechar>Cancelar</button><button type="button" class="btn btn-primario" id="c-salvar">Salvar</button>`,
        });
        $("#c-salvar").onclick = () => {
            const codigo = $("#c-cod").value.trim().toUpperCase().replace(/\s+/g, "");
            if (!codigo) { $("#c-cod").classList.add("erro"); return; }
            if (D.cupons.some((x, j) => x.codigo === codigo && j !== i)) { toast("Já existe um cupom com esse código.", true); return; }
            const d = { codigo, tipo: $("#c-tipo").value, valor: num($("#c-valor").value), valorMinimo: num($("#c-min").value), validade: $("#c-val").value, ativo: c.ativo !== false };
            if (novo) D.cupons.push(d); else D.cupons[i] = d;
            salvar(); fecharModal(); RENDER.cupons(); toast("Cupom salvo.");
        };
    };
    $("#btn-novo-cupom").addEventListener("click", () => modalCupom());
    $("#cupons-grade").addEventListener("click", (e) => {
        const ed = e.target.closest("[data-cupom-editar]");
        if (ed) return modalCupom(Number(ed.dataset.cupomEditar));
        const ex = e.target.closest("[data-cupom-excluir]");
        if (ex) { const i = Number(ex.dataset.cupomExcluir); confirmar(`Excluir o cupom ${esc(D.cupons[i].codigo)}?`, "Excluir", () => { D.cupons.splice(i, 1); salvar(); RENDER.cupons(); }); }
    });
    $("#cupons-grade").addEventListener("change", (e) => {
        const t = e.target.closest("[data-cupom-ativo]");
        if (t) { D.cupons[Number(t.dataset.cupomAtivo)].ativo = t.checked; salvar(); RENDER.cupons(); }
    });

    // ═════════════════════════════════════════════════════════════════════════
    // CONFIGURAÇÕES
    // ═════════════════════════════════════════════════════════════════════════
    const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const FORMAS = ["PIX", "Cartão de crédito", "Cartão de débito", "Boleto", "Dinheiro"];
    const SENHA_INICIAL = "catarina123";
    RENDER.config = () => {
        const c = D.config;
        const campo = (id, rotulo, valor, tipo = "text", extra = "") => `<label class="campo"><span>${rotulo}</span><input type="${tipo}" id="cf-${id}" value="${esc(valor ?? "")}" ${extra}></label>`;
        const temExemplos = D.lancamentos.some((l) => l.exemplo);
        $("#form-config").innerHTML = `
            <div class="config-bloco">
                <h3><i class="fa-solid fa-store"></i> Dados da loja</h3>
                ${campo("nomeLoja", "Nome da loja", c.nomeLoja)}
                ${campo("slogan", "Frase abaixo do nome", c.slogan)}
                <div class="campo-linha">
                    ${campo("whatsapp", "WhatsApp que recebe os pedidos", c.whatsapp, "tel", 'placeholder="5547999999999"')}
                    ${campo("telefoneExibicao", "Telefone exibido", c.telefoneExibicao, "text", 'placeholder="(47) 99999-9999"')}
                </div>
                <p class="campo-ajuda" style="margin:-6px 0 12px">55 + DDD + número, só números. Enquanto estiver vazio, o pedido abre o WhatsApp do cliente para ele escolher o contato.</p>
                ${campo("linkContato", "Link de contato (usado enquanto o número não é informado)", c.linkContato)}
                ${campo("endereco", "Endereço (retirada e “como chegar”)", c.endereco)}
                ${campo("horarioTexto", "Horário de atendimento", c.horarioTexto, "text", 'placeholder="Ex.: Seg a Sex · 9h às 18h"')}
            </div>
            <div class="config-bloco">
                <h3><i class="fa-solid fa-tags"></i> Preços</h3>
                <label class="campo"><span>Tabela usada para fechar o pedido</span>
                    <select id="cf-tabelaPreco">
                        <option value="profissional" ${c.tabelaPreco !== "final" ? "selected" : ""}>Preço profissional</option>
                        <option value="final" ${c.tabelaPreco === "final" ? "selected" : ""}>Preço final (consumidor)</option>
                    </select>
                    <span class="campo-ajuda">Trocar aqui muda todos os preços da loja de uma vez. Os dois valores de cada produto continuam guardados.</span>
                </label>
                <div class="linha-switch"><label class="switch"><input type="checkbox" id="cf-mostrarPrecoFinal" ${c.mostrarPrecoFinal !== false ? "checked" : ""}><span></span></label> Mostrar o preço final como referência ao lado do profissional</div>
                ${campo("avisoPrecos", "Aviso sobre os preços (aparece na lista e na sacolinha)", c.avisoPrecos)}
                ${campo("pedidoMinimo", "Pedido mínimo (R$)", c.pedidoMinimo || "", "number", 'min="0" step="1" placeholder="Sem mínimo"')}
                <h3 style="margin-top:8px"><i class="fa-solid fa-bullhorn"></i> Vitrine</h3>
                ${campo("avisoTopo", "Faixa de aviso no topo", c.avisoTopo)}
                ${campo("heroTitulo", "Título da página inicial", c.heroTitulo)}
                <label class="campo"><span>Texto de apoio</span><textarea id="cf-heroSubtitulo" rows="2">${esc(c.heroSubtitulo || "")}</textarea></label>
            </div>
            <div class="config-bloco">
                <h3><i class="fa-solid fa-swatchbook"></i> Marcas (abas da loja)</h3>
                ${D.marcas.map((m, i) => `
                    <div class="detalhe-grupo">
                        <h4>${esc(m.nome)}</h4>
                        <div class="campo-linha">
                            <label class="campo"><span>Perfil</span><input type="text" id="cf-m${i}-perfil" value="${esc(m.perfil || "")}"></label>
                            <label class="campo"><span>Instagram (sem @)</span><input type="text" id="cf-m${i}-instagram" value="${esc(m.instagram || "")}"></label>
                        </div>
                        <label class="campo"><span>Descrição</span><input type="text" id="cf-m${i}-descricao" value="${esc(m.descricao || "")}"></label>
                        <div class="campo-linha" style="align-items:flex-end">
                            ${[["cor", "Cor"], ["corEscura", "Escura"], ["corClara", "Clara"], ["corApoio", "Apoio"]].map(([k, r]) => `<label class="campo" style="min-width:70px"><span>${r}</span><input type="color" id="cf-m${i}-${k}" value="${esc(m[k] || "#583878")}" style="height:40px;padding:2px"></label>`).join("")}
                        </div>
                    </div>`).join("")}
                <p class="campo-ajuda">Link direto para cada aba: <strong>index.html#belcol</strong> e <strong>index.html#eccos</strong> (bom para a bio de cada perfil).</p>
            </div>
            <div class="config-bloco">
                <h3><i class="fa-solid fa-truck-fast"></i> Entrega e retirada</h3>
                <div class="linha-switch"><label class="switch"><input type="checkbox" id="cf-entregaDisponivel" ${c.entregaDisponivel !== false ? "checked" : ""}><span></span></label> Enviar pedidos (valores na aba <button type="button" class="link" data-ir="frete">Frete</button>)</div>
                <div class="linha-switch"><label class="switch"><input type="checkbox" id="cf-retiradaDisponivel" ${c.retiradaDisponivel !== false ? "checked" : ""}><span></span></label> Permitir retirada</div>
                <div class="campo"><span>Dias de retirada</span><div class="checks">${DIAS.map((d, i) => `<label class="check"><input type="checkbox" class="cf-dia" value="${i}" ${(c.retiradaDias || []).includes(i) ? "checked" : ""}> ${d}</label>`).join("")}</div></div>
                <div class="campo-linha">
                    ${campo("retiradaHoraInicio", "Das", c.retiradaHoraInicio, "time")}
                    ${campo("retiradaHoraFim", "Até", c.retiradaHoraFim, "time")}
                    <label class="campo"><span>Intervalo</span><select id="cf-retiradaIntervalo">${[15, 30, 60].map((m) => `<option value="${m}" ${Number(c.retiradaIntervalo) === m ? "selected" : ""}>${m} min</option>`).join("")}</select></label>
                </div>
                <h3 style="margin-top:8px"><i class="fa-solid fa-wallet"></i> Pagamento</h3>
                <div class="campo"><span>Formas aceitas</span><div class="checks">${FORMAS.map((f) => `<label class="check"><input type="checkbox" class="cf-forma" value="${f}" ${(c.formasPagamento || []).includes(f) ? "checked" : ""}> ${f}</label>`).join("")}</div></div>
                <label class="campo"><span>Aviso sobre o pagamento</span><textarea id="cf-avisoPagamento" rows="3">${esc(c.avisoPagamento || "")}</textarea></label>
            </div>
            <div class="config-bloco">
                <h3><i class="fa-solid fa-lock"></i> Acesso ao painel</h3>
                ${campo("senhaAdmin", "Senha do painel", c.senhaAdmin, "text")}
                <p class="campo-ajuda">Esta senha é uma trava simples, guardada no próprio navegador. Para uso com vários aparelhos, o ideal é ligar um login de verdade (ex.: Firebase).</p>
            </div>
            <div class="config-bloco">
                <h3><i class="fa-solid fa-cloud-arrow-down"></i> Backup dos dados</h3>
                <p class="campo-ajuda" style="margin-bottom:12px">Os dados ficam salvos neste navegador. Baixe um backup de vez em quando (e antes de trocar de computador).</p>
                <div class="botoes">
                    <button type="button" class="btn btn-fantasma" id="cf-exportar"><i class="fa-solid fa-download"></i> Baixar backup</button>
                    <label class="btn btn-fantasma"><i class="fa-solid fa-upload"></i> Restaurar backup<input type="file" accept="application/json,.json" id="cf-importar" hidden></label>
                </div>
                <h3 style="margin-top:16px"><i class="fa-solid fa-flask"></i> Demonstração</h3>
                <p class="campo-ajuda" style="margin-bottom:12px">O caixa começa vazio. Para mostrar o painel funcionando, carregue vendas e despesas fictícias dos últimos 2 meses — e apague quando for usar de verdade.</p>
                <div class="botoes">
                    ${temExemplos
                        ? `<button type="button" class="btn btn-fantasma" id="cf-exemplo-apagar"><i class="fa-solid fa-eraser"></i> Apagar movimentações de exemplo</button>`
                        : `<button type="button" class="btn btn-fantasma" id="cf-exemplo-carregar"><i class="fa-solid fa-chart-column"></i> Carregar movimentações de exemplo</button>`}
                    <button type="button" class="btn btn-fantasma" id="cf-original" style="color:var(--perigo)"><i class="fa-solid fa-rotate-left"></i> Restaurar catálogo original</button>
                </div>
            </div>`;
        $("#cf-exportar").onclick = () => {
            const blob = new Blob([JSON.stringify(D, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob); a.download = `backup-catalogo-${hojeChave()}.json`; a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            toast("Backup baixado.");
        };
        $("#cf-importar").onchange = (e) => {
            const f = e.target.files[0]; if (!f) return;
            f.text().then((t) => {
                try { D = LojaDB.importar(t); aplicarMarca(); RENDER.config(); atualizarBadges(); toast("Backup restaurado."); }
                catch (err) { toast("Arquivo de backup inválido.", true); }
            });
        };
        if ($("#cf-exemplo-carregar")) $("#cf-exemplo-carregar").onclick = () => {
            const novos = lojaGerarExemplos(D);
            D.lancamentos.push(...novos);
            salvar(); RENDER.config(); toast(`${novos.length} movimentações de exemplo carregadas. Veja no Painel.`);
        };
        if ($("#cf-exemplo-apagar")) $("#cf-exemplo-apagar").onclick = () => confirmar("Apagar todas as movimentações de exemplo? Os lançamentos reais não são afetados.", "Apagar exemplos", () => {
            D.lancamentos = D.lancamentos.filter((l) => !l.exemplo);
            salvar(); RENDER.config(); toast("Movimentações de exemplo apagadas.");
        });
        $("#cf-original").onclick = () => confirmar("Voltar ao catálogo original das tabelas em PDF? Produtos, preços, pedidos, lançamentos, frete e configurações atuais serão perdidos. Baixe um backup antes.", "Restaurar catálogo original", () => {
            D = LojaDB.restaurarOriginal(); aplicarMarca(); RENDER.config(); atualizarBadges(); toast("Catálogo original restaurado.");
        });
    };
    $("#btn-salvar-config").addEventListener("click", () => {
        const v = (id) => $(`#cf-${id}`).value.trim();
        const c = D.config;
        const whats = v("whatsapp").replace(/\D/g, "");
        if (whats && whats.length < 12) { $("#cf-whatsapp").classList.add("erro"); toast("WhatsApp inválido: use 55 + DDD + número.", true); return; }
        if (!v("senhaAdmin")) { $("#cf-senhaAdmin").classList.add("erro"); toast("A senha não pode ficar vazia.", true); return; }
        Object.assign(c, {
            nomeLoja: v("nomeLoja") || c.nomeLoja, slogan: v("slogan"), whatsapp: whats, telefoneExibicao: v("telefoneExibicao"),
            linkContato: v("linkContato"), horarioTexto: v("horarioTexto"), endereco: v("endereco"),
            tabelaPreco: $("#cf-tabelaPreco").value, mostrarPrecoFinal: $("#cf-mostrarPrecoFinal").checked, avisoPrecos: v("avisoPrecos"), pedidoMinimo: num(v("pedidoMinimo")),
            avisoTopo: v("avisoTopo"), heroTitulo: v("heroTitulo"), heroSubtitulo: v("heroSubtitulo"),
            entregaDisponivel: $("#cf-entregaDisponivel").checked, retiradaDisponivel: $("#cf-retiradaDisponivel").checked,
            retiradaDias: $$(".cf-dia:checked").map((x) => Number(x.value)),
            retiradaHoraInicio: v("retiradaHoraInicio") || "09:00", retiradaHoraFim: v("retiradaHoraFim") || "18:00", retiradaIntervalo: Number($("#cf-retiradaIntervalo").value),
            formasPagamento: $$(".cf-forma:checked").map((x) => x.value), avisoPagamento: v("avisoPagamento"), senhaAdmin: v("senhaAdmin"),
        });
        if (!c.formasPagamento.length) c.formasPagamento = ["PIX"];
        if (!c.entregaDisponivel && !c.retiradaDisponivel) c.entregaDisponivel = true;
        D.marcas.forEach((m, i) => ["perfil", "instagram", "descricao", "cor", "corEscura", "corClara", "corApoio"].forEach((k) => { m[k] = k === "instagram" ? v(`m${i}-${k}`).replace("@", "") : v(`m${i}-${k}`); }));
        salvar(); aplicarMarca(); RENDER.config();
        toast("Configurações salvas. A loja já está atualizada.");
    });

    // ═════════════════════════════════════════════════════════════════════════
    // FRETE — tabela por região de destino × peso do pedido
    // ═════════════════════════════════════════════════════════════════════════
    const UFS_VALIDAS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
    let F = null; // cópia do frete em edição (só vai para a loja ao salvar)
    const vazioOuNum = (v) => (v === "" || v === null || v === undefined ? "" : num(v));
    const numBR = (t) => { const s = String(t).replace(/[^\d.,-]/g, ""); return s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s; };
    const faixaTexto = (kg) => (kg < 1 ? `${Math.round(kg * 1000)} g` : `${String(kg).replace(".", ",")} kg`);

    const lerFrete = () => {
        if (!F || !$("#fr-modo")) return;
        F.modo = $("#fr-modo").value;
        F.cepOrigem = $("#fr-cep").value.replace(/\D/g, "").slice(0, 8);
        F.embalagemG = Math.max(0, Math.round(num($("#fr-emb").value)));
        F.prazoPostagem = Math.max(0, Math.round(num($("#fr-post").value)));
        F.gratisAcima = Math.max(0, num($("#fr-gratis").value));
        F.aviso = $("#fr-aviso").value.trim();
        F.zonas = $$(".zona-linha[data-id]").map((l) => ({
            id: l.dataset.id, nome: $(".z-nome", l).value.trim() || "Região",
            ufs: [...new Set($(".z-ufs", l).value.toUpperCase().split(/[^A-Z]+/).filter((u) => UFS_VALIDAS.includes(u)))],
            ceps: $(".z-ceps", l).value.trim(),
        }));
        F.servicos.forEach((s, i) => {
            const el = $(`.servico[data-s="${i}"]`);
            if (!el) return;
            s.nome = $(".s-nome", el).value.trim() || "Serviço";
            s.ativo = $(".s-ativo", el).checked;
            s.tabela = s.tabela || {};
            F.zonas.forEach((z) => {
                const pega = (k) => { const inp = $(`input[data-z="${z.id}"][data-k="${k}"]`, el); return inp ? vazioOuNum(inp.value) : ""; };
                s.tabela[z.id] = { prazo: [pega("p0"), pega("p1")], precos: F.faixasKg.map((_, j) => pega(`f${j}`)), extraKg: pega("x") };
            });
        });
    };

    const desenharFrete = () => {
        const combinar = F.modo === "combinar";
        const celula = (z, k, valor, classe = "") => `<input type="number" min="0" step="${k[0] === "p" ? 1 : 0.01}" class="${classe}" data-z="${esc(z.id)}" data-k="${k}" value="${valor === "" || valor === null || valor === undefined ? "" : valor}" placeholder="—">`;
        $("#frete-form").innerHTML = `
            ${F.valoresDeExemplo ? `<div class="aviso-box"><i class="fa-solid fa-triangle-exclamation"></i><span><strong>Os valores e prazos abaixo são exemplos para demonstração.</strong> Troque pelos valores do contrato com os Correios ou da tabela da transportadora e salve — o aviso some.</span></div>` : ""}
            <div class="frete-grid">
                <div class="config-bloco">
                    <h3><i class="fa-solid fa-sliders"></i> Como calcular</h3>
                    <label class="campo"><span>Modo</span><select id="fr-modo">
                        <option value="tabela" ${!combinar ? "selected" : ""}>Calcular pelo CEP com a tabela abaixo</option>
                        <option value="combinar" ${combinar ? "selected" : ""}>Não calcular: frete combinado no WhatsApp</option>
                    </select></label>
                    <div class="campo-linha">
                        <label class="campo"><span>CEP de origem</span><input type="text" id="fr-cep" value="${esc(F.cepOrigem || "")}" maxlength="9" inputmode="numeric"></label>
                        <label class="campo"><span>Peso da embalagem (g)</span><input type="number" id="fr-emb" min="0" step="10" value="${F.embalagemG ?? 0}"></label>
                    </div>
                    <div class="campo-linha">
                        <label class="campo"><span>Dias para postar</span><input type="number" id="fr-post" min="0" step="1" value="${F.prazoPostagem ?? 0}"></label>
                        <label class="campo"><span>Frete grátis acima de (R$)</span><input type="number" id="fr-gratis" min="0" step="1" value="${F.gratisAcima || ""}" placeholder="Desligado"></label>
                    </div>
                    <p class="campo-ajuda" style="margin:-4px 0 10px">O peso do pedido é a soma do “peso para o frete” de cada produto + a embalagem. Os dias para postar são somados ao prazo. O frete grátis vale para a opção mais barata.</p>
                    <label class="campo"><span>Aviso mostrado ao cliente junto do frete</span><textarea id="fr-aviso" rows="2">${esc(F.aviso || "")}</textarea></label>
                </div>
                <div class="config-bloco">
                    <h3><i class="fa-solid fa-calculator"></i> Simular um envio</h3>
                    <div class="campo-linha">
                        <label class="campo"><span>CEP de destino</span><input type="text" id="sim-cep" maxlength="9" inputmode="numeric" placeholder="00000-000"></label>
                        <label class="campo"><span>Peso dos produtos (g)</span><input type="number" id="sim-peso" min="0" step="10" value="500"></label>
                        <label class="campo"><span>Valor do pedido (R$)</span><input type="number" id="sim-valor" min="0" step="1" value="300"></label>
                    </div>
                    <button type="button" class="btn btn-fantasma btn-sm" id="sim-btn"><i class="fa-solid fa-play"></i> Simular com a tabela desta tela</button>
                    <div class="simulador-res" id="sim-res"></div>
                </div>
            </div>
            <div class="config-bloco" style="margin-bottom:14px">
                <h3><i class="fa-solid fa-map-location-dot"></i> Regiões de destino</h3>
                <p class="campo-ajuda" style="margin-bottom:10px">Cada CEP cai na primeira região que tiver a faixa de CEP dele; se nenhuma tiver, vale a região do estado (UF). Faixas no formato <strong>88350000-88359999</strong>, separadas por vírgula.</p>
                <div class="zona-linha zona-cab"><span>Região</span><span>Estados (UF)</span><span>Faixas de CEP (opcional)</span><span></span></div>
                <div id="fr-zonas">${F.zonas.map((z) => `
                    <div class="zona-linha" data-id="${esc(z.id)}">
                        <input type="text" class="z-nome" value="${esc(z.nome)}" placeholder="Nome da região">
                        <input type="text" class="z-ufs" value="${esc((z.ufs || []).join(", "))}" placeholder="Ex.: PR, RS">
                        <input type="text" class="z-ceps" value="${esc(z.ceps || "")}" placeholder="Ex.: 88350000-88359999">
                        <button type="button" class="icone-btn icone-btn--perigo" data-zona-del="${esc(z.id)}" title="Remover região"><i class="fa-solid fa-trash"></i></button>
                    </div>`).join("")}</div>
                <button type="button" class="btn btn-fantasma btn-sm" id="fr-zona-add"><i class="fa-solid fa-plus"></i> Adicionar região</button>
                <h3 style="margin-top:18px"><i class="fa-solid fa-weight-hanging"></i> Faixas de peso (kg)</h3>
                <div class="campo-linha" style="align-items:flex-end">
                    <label class="campo campo--grande"><span>Limites “até”, separados por ponto e vírgula</span><input type="text" id="fr-faixas" value="${F.faixasKg.map((f) => String(f).replace(".", ",")).join("; ")}"></label>
                    <button type="button" class="btn btn-fantasma" id="fr-faixas-btn" style="margin-bottom:12px">Aplicar faixas</button>
                </div>
            </div>
            ${F.servicos.map((s, i) => `
                <div class="servico${s.ativo === false ? " inativo" : ""}" data-s="${i}">
                    <div class="servico-topo">
                        <input type="text" class="s-nome" value="${esc(s.nome)}" aria-label="Nome do serviço">
                        <div class="linha-switch"><label class="switch"><input type="checkbox" class="s-ativo" ${s.ativo !== false ? "checked" : ""}><span></span></label> Oferecer na loja</div>
                        <span class="campo-ajuda" style="flex:1">Preço em R$ por faixa de peso · prazo em dias úteis. Célula vazia = não envia por este serviço.</span>
                        <button type="button" class="icone-btn icone-btn--perigo" data-serv-del="${i}" title="Excluir serviço"><i class="fa-solid fa-trash"></i></button>
                    </div>
                    <div class="tabela-frete-wrap">
                        <table class="tabela-frete">
                            <thead><tr><th>Região</th><th colspan="2">Prazo (de–até)</th>${F.faixasKg.map((f, j) => `<th class="${j === 0 ? "sep" : ""}">até ${faixaTexto(f)}</th>`).join("")}<th class="sep">+ por kg extra</th></tr></thead>
                            <tbody>${F.zonas.map((z) => {
                                const l = (s.tabela || {})[z.id] || { prazo: ["", ""], precos: [], extraKg: "" };
                                return `<tr><td>${esc(z.nome)}</td><td>${celula(z, "p0", l.prazo?.[0] ?? "", "prazo")}</td><td>${celula(z, "p1", l.prazo?.[1] ?? "", "prazo")}</td>${F.faixasKg.map((_, j) => `<td class="${j === 0 ? "sep" : ""}">${celula(z, `f${j}`, l.precos?.[j] ?? "")}</td>`).join("")}<td class="sep">${celula(z, "x", l.extraKg ?? "")}</td></tr>`;
                            }).join("")}</tbody>
                        </table>
                    </div>
                </div>`).join("")}
            <div class="botoes">
                <button type="button" class="btn btn-fantasma" id="fr-serv-add"><i class="fa-solid fa-plus"></i> Adicionar serviço ou transportadora</button>
                <span class="campo-ajuda">Dica: copie as células de preço de uma planilha (Excel/Google) e cole na primeira célula — a tabela é preenchida de uma vez.</span>
            </div>`;
    };

    RENDER.frete = () => { F = JSON.parse(JSON.stringify(D.config.frete)); desenharFrete(); };

    $("#frete-form").addEventListener("click", (e) => {
        const zDel = e.target.closest("[data-zona-del]");
        const sDel = e.target.closest("[data-serv-del]");
        if (zDel) {
            lerFrete();
            const id = zDel.dataset.zonaDel;
            F.zonas = F.zonas.filter((z) => z.id !== id);
            F.servicos.forEach((s) => { if (s.tabela) delete s.tabela[id]; });
            return desenharFrete();
        }
        if (sDel) {
            lerFrete();
            const i = Number(sDel.dataset.servDel);
            return confirmar(`Excluir o serviço <strong>${esc(F.servicos[i].nome)}</strong> e a tabela dele?`, "Excluir serviço", () => { F.servicos.splice(i, 1); desenharFrete(); toast("Serviço removido. Salve o frete para valer na loja."); });
        }
        if (e.target.closest("#fr-zona-add")) {
            lerFrete();
            F.zonas.push({ id: `z${Date.now().toString(36)}`, nome: "", ufs: [], ceps: "" });
            desenharFrete();
            $("#fr-zonas .zona-linha:last-child .z-nome").focus();
            return;
        }
        if (e.target.closest("#fr-serv-add")) {
            lerFrete();
            F.servicos.push({ id: `s${Date.now().toString(36)}`, nome: "Nova transportadora", ativo: false, tabela: {} });
            desenharFrete();
            const novo = $(`.servico[data-s="${F.servicos.length - 1}"]`);
            novo.scrollIntoView({ block: "center" }); $(".s-nome", novo).select();
            return;
        }
        if (e.target.closest("#fr-faixas-btn")) {
            lerFrete();
            const novas = [...new Set($("#fr-faixas").value.split(/[;\s]+/).map((t) => num(numBR(t))).filter((n) => n > 0))].sort((a, b) => a - b);
            if (!novas.length) { toast("Informe pelo menos uma faixa de peso, em kg.", true); return; }
            const antigas = F.faixasKg;
            F.servicos.forEach((s) => Object.values(s.tabela || {}).forEach((l) => { l.precos = novas.map((f) => { const j = antigas.indexOf(f); return j === -1 ? "" : (l.precos?.[j] ?? ""); }); }));
            F.faixasKg = novas;
            desenharFrete();
            toast("Faixas de peso atualizadas. Preencha as colunas novas e salve.");
            return;
        }
        if (e.target.closest("#sim-btn")) {
            const cep = $("#sim-cep").value, peso = $("#sim-peso").value, valor = $("#sim-valor").value;
            lerFrete();
            const r = lojaCalcularFrete({ frete: F }, cep, num(peso), num(valor));
            const res = $("#sim-res");
            if (r.erro) res.innerHTML = `<div class="aviso-box"><i class="fa-solid fa-triangle-exclamation"></i> ${esc(r.erro)}</div>`;
            else if (F.modo === "combinar") res.innerHTML = `<p class="vazio-mini">Modo “frete combinado”: a loja não mostra valores, só avisa que o frete é combinado no WhatsApp.</p>`;
            else if (!r.opcoes.length) res.innerHTML = `<div class="aviso-box"><i class="fa-solid fa-triangle-exclamation"></i> ${r.zona ? `Região “${esc(r.zona.nome)}” (${esc(r.uf)}) sem preço para ${lojaPesoTexto(r.pesoKg)}.` : `Nenhuma região cobre o estado ${esc(r.uf)}.`} Na loja aparece “frete a combinar”.</div>`;
            else res.innerHTML = `<p class="campo-ajuda">Destino: ${esc(r.uf)} · região “${esc(r.zona.nome)}” · peso com embalagem ${lojaPesoTexto(r.pesoKg)}</p><ul class="lista-simples">${r.opcoes.map((o) => `<li><div>${esc(o.nome)}<small>${lojaPrazoTexto(o) || "sem prazo informado"}</small></div><span class="valor">${o.gratis ? "Grátis" : moeda(o.valor)}</span></li>`).join("")}</ul>`;
        }
    });
    $("#frete-form").addEventListener("change", (e) => {
        if (e.target.matches(".s-ativo")) e.target.closest(".servico").classList.toggle("inativo", !e.target.checked);
    });
    // Colar de planilha: preenche a grade a partir da célula onde o cursor está
    $("#frete-form").addEventListener("paste", (e) => {
        const inp = e.target.closest(".tabela-frete input");
        if (!inp) return;
        const texto = (e.clipboardData || window.clipboardData).getData("text");
        if (!/[\t\n]/.test(texto.trim())) return;
        e.preventDefault();
        const linhas = texto.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "").map((l) => l.split("\t"));
        let tr = inp.closest("tr");
        const col = [...tr.querySelectorAll("input")].indexOf(inp);
        linhas.forEach((cels) => {
            if (!tr) return;
            const inputs = [...tr.querySelectorAll("input")];
            cels.forEach((c, k) => { const alvo = inputs[col + k]; if (alvo) { const n = numBR(c); alvo.value = n === "" ? "" : n; } });
            tr = tr.nextElementSibling;
        });
        toast("Valores colados. Confira e salve o frete.");
    });
    $("#btn-salvar-frete").addEventListener("click", () => {
        lerFrete();
        if (F.modo === "tabela") {
            if (!F.zonas.length) { toast("Cadastre pelo menos uma região de destino.", true); return; }
            const semDestino = F.zonas.find((z) => !z.ufs.length && !lojaFaixasDeCep(z.ceps).length);
            if (semDestino) { toast(`A região “${esc(semDestino.nome)}” não tem estados nem faixa de CEP.`, true); return; }
            if (!F.servicos.some((s) => s.ativo !== false)) { toast("Ative pelo menos um serviço de envio (ou mude o modo para frete combinado).", true); return; }
        }
        F.valoresDeExemplo = false;
        D.config.frete = JSON.parse(JSON.stringify(F));
        salvar(); desenharFrete();
        toast("Frete salvo. A loja já calcula com a nova tabela.");
    });

    // ─── SINCRONIA COM A LOJA (outra aba) ────────────────────────────────────
    LojaDB.aoMudarEmOutraAba((novo) => {
        const antes = D.pedidos.length;
        D = novo;
        atualizarBadges();
        if ($("#modal-fundo").hidden && !$("#app").hidden && abaAtual !== "config" && abaAtual !== "frete") RENDER[abaAtual]();
        if (D.pedidos.length > antes) toast(`Novo pedido recebido: #${D.pedidos[0].codigo}`);
    });

    // ─── INÍCIO ──────────────────────────────────────────────────────────────
    aplicarMarca();
    let logado = false;
    try { logado = sessionStorage.getItem(CHAVE_SESSAO) === "1"; } catch (e) { /* ignora */ }
    if (logado) entrar();
})();
