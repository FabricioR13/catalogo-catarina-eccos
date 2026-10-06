# Catálogo Catarina Cosméticos & Eccos Brusque

Catálogo online da distribuidora de dermocosméticos de Brusque/SC, com as duas marcas em abas separadas — **Bel Col** (perfil @catarinasccosmeticos) e **Eccos** (perfil @eccosbrusque) —, sacolinha, entrega com frete calculado pelo CEP ou retirada, finalização do pedido no WhatsApp e um painel para a dona cuidar de preços, pedidos, frete e do caixa (entradas e saídas).

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html`, `style.css`, `script.js` | A loja (vitrine) que o cliente usa |
| `admin.html`, `admin.css`, `admin.js` | Painel da loja (link "Área da loja" no rodapé) |
| `dados.js` | Marcas, categorias, configurações, tabela e cálculo de frete, armazenamento |
| `produtos.js` | Os 268 produtos (181 Bel Col + 87 Eccos) extraídos das tabelas em PDF |
| `assets/produtos/` | Fotos recortadas dos PDFs (`bc-*.webp` Bel Col, `ec-*.webp` Eccos) |
| `assets/logo-*.webp`, `assets/marca-*.png` | Avatares dos dois perfis e logos das marcas |

Os dois PDFs de origem (`tabela_de_preco_belcol_2026a.pdf` e `Profissional_Tabela_Preços_Eccos_2026 (1).pdf`) e os prints do Instagram não são usados pelo site — são só a fonte.

## De onde vieram os dados

- **Bel Col** — tabela REF2026A (vigência 05/2026): coluna "Tabela" = preço final, coluna "Profissional" = preço profissional (30% abaixo). Os 17 acessórios têm preço único.
- **Eccos** — Tabela de Preços Profissional 2026: "Preço Final" e "Preço Profissional" (25% abaixo).
- Nome, tamanho, descrição, foto e a marcação "Profissional / Home care" (Bel Col) e "Lançamento" (Eccos) vêm dos mesmos PDFs.
- O **pedido fecha pelo preço profissional**. Em Configurações → Preços dá para trocar a loja inteira para o preço final; os dois valores de cada produto ficam guardados.
- O produto *AminoDerme Acqua Micelar* (P0272) está sem foto porque o PDF traz "imagem indisponível".
- Os boxes *Duo Adapt Vitamina C* e *Duo Adapt K-Beauty LHA+CICA* aparecem com o mesmo código (P0404) na tabela da Bel Col; foi mantido como está no PDF.

## Como a loja é organizada

- **Abas por marca** (Início · Bel Col · Eccos). Cada aba pinta a loja com a cor do logo do perfil: roxo da Catarina Cosméticos, verde da Eccos Brusque.
- **Categorias dentro de cada marca** (12 na Bel Col, 10 na Eccos) e, dentro da categoria, os produtos agrupados pela **linha** original do PDF (ex.: Anti-idade → Ácido hialurônico, Vitamina C, Retinol…).
- Links diretos: `index.html#belcol` e `index.html#eccos` — bons para a bio de cada perfil.

## Como funciona o pedido

1. O cliente escolhe os produtos e monta a **sacolinha** (pode misturar as duas marcas).
2. Escolhe **Entrega** (digita o CEP, vê as opções com valor e prazo, completa o endereço) ou **Retirada** (dia e horário).
3. Escolhe a forma de pagamento e informa nome e WhatsApp (clínica e CPF/CNPJ são opcionais).
4. Confere o resumo e toca em **Finalizar no WhatsApp**: abre a conversa com a loja já com o pedido escrito, separado por marca, com frete, prazo, endereço e o código `#CExxxxxx`. O pagamento é combinado ali.

## Frete

O frete é calculado **por tabela**, no próprio navegador: região de destino (por estado ou por faixa de CEP) × peso do pedido (soma do "peso para o frete" de cada produto + embalagem). Tudo é editável no painel, aba **Frete**:

- serviços (Correios PAC, SEDEX, transportadora — quantos quiser), cada um com preço por faixa de peso e prazo em dias úteis por região;
- regiões, faixas de peso, CEP de origem, peso da embalagem, dias para postar, frete grátis acima de um valor;
- dá para **colar a tabela direto de uma planilha** e **simular um envio** antes de salvar;
- modo alternativo "frete combinado no WhatsApp" (não mostra valores).

**Os valores e prazos que vêm de fábrica são exemplos**, não são a tabela dos Correios. Troque pelos valores do contrato antes de divulgar (o painel avisa enquanto não forem salvos). Os pesos dos produtos são estimados a partir do tamanho da embalagem (ml/g) e podem ser ajustados em cada produto.

O endereço é preenchido pelo ViaCEP; se a consulta falhar, o frete é calculado do mesmo jeito pela faixa de CEP do estado.

Cotação em tempo real direto dos Correios ou de uma transportadora (em vez da tabela) exige um contrato/token e um pequeno servidor intermediário — o navegador do cliente não pode guardar o token. É um passo seguinte possível (Correios, Melhor Envio, Frenet etc.).

## Painel da loja (`admin.html`)

Senha inicial: `catarina123` (troque em Configurações).

- **Painel**: entradas, saídas, saldo, vendas, gráfico por dia, pedidos aguardando, mais vendidos, despesas por categoria e uma lista do que falta antes de divulgar.
- **Pedidos**: acompanha os status (Novo → Pago → Enviado/Pronto → Concluído). Ao marcar como pago, a venda entra no caixa. "Colar pedido do WhatsApp" registra um pedido a partir da mensagem recebida.
- **Vender**: venda direta, fora do catálogo.
- **Produtos**: preço final e profissional (edição direto na tabela), custo e margem, estoque opcional, peso, fotos, lançamentos e destaques, categorias por marca, reajuste em lote (por marca/categoria, ou recalculando o profissional a partir do final).
- **Entradas e saídas**: caixa do mês com categorias, formas de pagamento e exportação para planilha (CSV).
- **Frete**, **Cupons** e **Configurações** (WhatsApp, endereço, tabela de preços, cores e Instagram de cada marca, retirada, pagamento, backup).

O caixa começa vazio. Em Configurações → Demonstração há um botão que carrega 2 meses de movimentações fictícias para apresentar o painel, e outro que apaga só elas.

## Antes de divulgar

1. Informar o **WhatsApp que recebe os pedidos** (55 + DDD + número). Enquanto estiver vazio, o pedido abre o WhatsApp do cliente para ele escolher o contato, e os botões de contato usam o link da bio (`wa.link/7x4yh7`).
2. Trocar a **tabela de frete** de exemplo pelos valores reais.
3. Completar o **endereço de retirada** e o horário de atendimento (hoje está só "Brusque/SC").
4. Trocar a **senha** do painel.
5. Se tiver os logos em arquivo (em vez do recorte do print do Instagram), substituir `assets/logo-catarina.webp` e `assets/logo-eccos-brusque.webp`.

## Importante: onde os dados ficam

Nesta versão tudo é salvo **no navegador** (localStorage). Na mesma máquina, loja e painel conversam na hora (mudou o preço no painel, a loja atualiza). Mas as mudanças feitas no painel **não chegam ao celular dos clientes** até a loja ser ligada a um banco online (ex.: Firebase). O `dados.js` foi feito para essa troca: basta substituir os métodos `carregar()` e `salvar()` do `LojaDB`. Até lá, mudanças de preço que precisam valer para todos devem ser feitas em `produtos.js`, aumentando o número `LOJA_VERSAO_CATALOGO` no topo do arquivo — é isso que faz o navegador de quem já visitou a loja trocar os produtos guardados pelos novos (produtos criados só pelo painel não são preservados nessa troca).

Os pedidos dos clientes chegam sempre pelo WhatsApp, independentemente disso.

---
Site desenvolvido por **TF Solutions**.
