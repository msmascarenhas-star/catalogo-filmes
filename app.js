// Telas, filtros e eventos. Usa Tmdb (dados), Lista (quero assistir) e Estado (URL).
(function () {
  // Só a resposta da consulta mais recente é entregue; as anteriores ficam pendentes para sempre.
  function ultimaConsulta() {
    let atual = 0;
    return function (promessa) {
      const minha = ++atual;
      return new Promise((resolve, reject) => {
        promessa.then(
          v => { if (minha === atual) resolve(v); },
          e => { if (minha === atual) reject(e); }
        );
      });
    };
  }

  const App = { ultimaConsulta };
  if (typeof module !== 'undefined') { module.exports = App; return; }
  window.App = App;
  if (!document.getElementById('app')) return; // página de testes

  // ---------- utilidades ----------
  const IMG = 'https://image.tmdb.org/t/p/';
  const SEM_POSTER = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 3"><rect width="2" height="3" fill="#2a2a2a"/>' +
    '<text x="1" y="1.7" font-size="0.6" text-anchor="middle" fill="#666">🎬</text></svg>');
  const $ = (id) => document.getElementById(id);
  const el = (tag, props, filhos) => {
    const e = Object.assign(document.createElement(tag), props || {});
    (filhos || []).forEach(f => f != null && e.append(f));
    return e;
  };
  const poster = (caminho, tamanho) => (caminho ? IMG + tamanho + caminho : SEM_POSTER);
  const nota = (n) => (n ? '★ ' + n.toFixed(1) : '');
  const duracao = (min) => (min ? Math.floor(min / 60) + 'h ' + (min % 60) + 'min' : '');
  const logo = (s, tamanho) => el('img', { src: IMG + 'w92' + s.logo, alt: s.nome, title: s.nome, width: tamanho, height: tamanho });

  // ---------- estado ----------
  const token = window.TMDB_TOKEN;
  const cliente = Tmdb.criar({ token, fetch: window.fetch.bind(window) });
  const lista = Lista.criar(window.localStorage || { getItem() { return null; }, setItem() {} });
  const consulta = ultimaConsulta();
  let estado = Estado.ler(location.search);
  let streamings = [];
  let generos = [];
  let pronto = false;
  let pagina = 1;
  let detalheAbertoPorClique = false;

  // ---------- mensagens ----------
  function mensagem(conteudo, botao) {
    const m = $('mensagem');
    m.replaceChildren(...[].concat(conteudo), ...(botao ? [el('button', { type: 'button', className: 'btn btn-primario', textContent: botao.rotulo, onclick: botao.acao })] : []));
    m.hidden = false;
  }
  function limparMensagem() { $('mensagem').hidden = true; $('mensagem').replaceChildren(); }

  function mensagemToken() {
    mensagem([
      el('p', { textContent: 'Configure seu token no arquivo config.js' }),
      el('ol', {}, [
        el('li', { textContent: 'Entre em themoviedb.org → Configurações → API e copie o "API Read Access Token".' }),
        el('li', { textContent: 'Copie o arquivo config.exemplo.js com o nome config.js.' }),
        el('li', { textContent: 'Abra o config.js e cole o token no lugar de COLE_AQUI.' }),
        el('li', { textContent: 'Recarregue esta página.' })
      ])
    ]);
  }

  function tratarErro(erro, tentarDeNovo) {
    $('carregar-mais').hidden = true;
    if (erro instanceof Tmdb.TokenInvalido) return mensagemToken();
    console.error(erro);
    mensagem(el('p', { textContent: 'Não foi possível carregar os filmes' }), { rotulo: 'Tentar de novo', acao: tentarDeNovo });
  }

  // ---------- URL ----------
  function gravarUrl(modo) {
    const url = location.pathname + Estado.escrever(estado);
    history[modo === 'push' ? 'pushState' : 'replaceState'](null, '', url);
  }

  // ---------- cartões ----------
  function cartao(filme, extras) {
    const c = el('button', { type: 'button', className: 'cartao' }, [
      el('img', { className: 'poster', src: poster(filme.poster, 'w342'), alt: '', loading: 'lazy' }),
      el('div', { className: 'info' }, [
        el('div', { className: 'titulo', textContent: filme.titulo }),
        el('div', { className: 'meta', textContent: [filme.ano, nota(filme.nota)].filter(Boolean).join(' · ') }),
        extras && extras.logos ? el('div', { className: 'logos' }, extras.logos.map(s => logo(s, 24))) : null
      ])
    ]);
    c.addEventListener('click', () => abrirDetalhes(filme.id));
    return c;
  }

  function atualizarBotaoLista() {
    $('btn-lista').textContent = 'Quero assistir (' + lista.listar().length + ')';
  }

  // ---------- filtros ----------
  // O Brasil tem ~90 streamings; mostramos os principais (já vêm ordenados por relevância) e os marcados.
  const PRINCIPAIS = 10;
  let todosStreamings = false;

  function montarStreamings() {
    const visiveis = todosStreamings ? streamings
      : streamings.filter((s, i) => i < PRINCIPAIS || estado.streamings.includes(s.id));
    const chips = visiveis.map(s => {
      const caixa = el('input', { type: 'checkbox', value: s.id, checked: estado.streamings.includes(s.id) });
      caixa.addEventListener('change', () => {
        estado.streamings = caixa.checked ? estado.streamings.concat(s.id) : estado.streamings.filter(id => id !== s.id);
        mudouFiltro();
      });
      return el('label', { className: 'chip' }, [caixa, logo(s, 24), s.nome]);
    });
    const ocultos = streamings.length - visiveis.length;
    const alternar = el('button', { type: 'button', className: 'chip chip-mais',
      textContent: todosStreamings ? 'Menos streamings' : 'Mais streamings (' + ocultos + ')' });
    alternar.addEventListener('click', () => { todosStreamings = !todosStreamings; montarStreamings(); });
    $('filtro-streamings').replaceChildren(...chips, ...(todosStreamings || ocultos > 0 ? [alternar] : []));
  }

  function montarFiltros() {
    montarStreamings();
    $('filtro-genero').replaceChildren(el('option', { value: '', textContent: 'Todos' }),
      ...generos.map(g => el('option', { value: g.id, textContent: g.nome })));
    sincronizarCampos();
  }

  function sincronizarCampos() {
    $('filtro-genero').value = estado.genero || '';
    $('filtro-ordem').value = estado.ordem;
    if (document.activeElement !== $('busca')) $('busca').value = estado.busca;
    $('filtro-streamings').querySelectorAll('input').forEach(i => { i.checked = estado.streamings.includes(Number(i.value)); });
  }

  function mudouFiltro() {
    estado.filme = null;
    gravarUrl('replace');
    carregarCatalogo(true);
  }

  function limparFiltros() {
    estado = Object.assign(estado, { streamings: [], genero: null, ordem: 'popularidade', busca: '' });
    sincronizarCampos();
    mudouFiltro();
  }

  // ---------- catálogo ----------
  function logosDoCartao() {
    if (estado.busca || estado.streamings.length !== 1) return null;
    const s = streamings.find(x => x.id === estado.streamings[0]);
    return s ? [s] : null;
  }

  async function carregarCatalogo(recomecar) {
    if (estado.tela !== 'catalogo') return;
    if (!pronto) return iniciar(); // listas de streamings/gêneros ainda não carregaram (ex.: falha na abertura)
    if (recomecar) { pagina = 1; $('grade').replaceChildren(); }
    limparMensagem();
    $('titulo-tela').textContent = estado.busca ? 'Resultados para "' + estado.busca + '"' : '';
    $('carregar-mais').hidden = true;
    const pedido = estado.busca
      ? cliente.buscar(estado.busca, pagina)
      : cliente.descobrir({ streamings: estado.streamings, genero: estado.genero, ordem: estado.ordem, pagina, provedoresTodos: streamings.map(s => s.id) });
    let r;
    try { r = await consulta(pedido); } catch (e) {
      if (estado.tela !== 'catalogo') return;
      return tratarErro(e, () => carregarCatalogo(false));
    }
    if (estado.tela !== 'catalogo') return; // usuário foi para "Quero assistir" enquanto carregava
    const logos = logosDoCartao();
    $('grade').append(...r.filmes.map(f => cartao(f, { logos })));
    if (!$('grade').children.length) {
      mensagem(el('p', { textContent: 'Nenhum filme encontrado' }), { rotulo: 'Limpar filtros', acao: limparFiltros });
    }
    $('carregar-mais').hidden = !Estado.temMaisPaginas(r.pagina, r.totalPaginas);
  }

  // ---------- quero assistir ----------
  async function emParalelo(itens, limite, fn) {
    const fila = itens.slice();
    const trabalhadores = Array.from({ length: Math.min(limite, fila.length) }, async () => {
      while (fila.length) await fn(fila.shift());
    });
    await Promise.all(trabalhadores);
  }

  function mostrarLista() {
    limparMensagem();
    $('carregar-mais').hidden = true;
    $('titulo-tela').textContent = 'Quero assistir';
    const filmes = lista.listar();
    if (!filmes.length) {
      $('grade').replaceChildren();
      return mensagem(el('p', { textContent: 'Sua lista está vazia' }));
    }
    const cartoes = filmes.map(f => {
      const logos = el('div', { className: 'logos' });
      const c = cartao(f);
      c.querySelector('.info').append(logos);
      const remover = el('button', { type: 'button', className: 'btn remover', textContent: 'Remover' });
      remover.addEventListener('click', (ev) => { ev.stopPropagation(); lista.remover(f.id); atualizarBotaoLista(); mostrarLista(); });
      c.append(remover);
      return { filme: f, c, logos };
    });
    $('grade').replaceChildren(...cartoes.map(x => x.c));
    emParalelo(cartoes, 4, async (x) => {
      try {
        const d = await cliente.detalhes(x.filme.id);
        x.logos.replaceChildren(...d.streamings.map(s => logo(s, 24)));
        if (!d.streamings.length) x.logos.append(el('span', { className: 'meta', textContent: 'Fora do streaming' }));
      } catch (e) { /* sem internet: cartão fica sem logos */ }
    });
  }

  // ---------- detalhes ----------
  const pedidoDetalhes = ultimaConsulta();

  async function abrirDetalhes(id, vindoDaUrl) {
    if (!vindoDaUrl) {
      estado.filme = id;
      detalheAbertoPorClique = true;
      gravarUrl('push');
    }
    const caixa = $('conteudo-detalhes');
    caixa.replaceChildren(el('p', { className: 'mensagem', textContent: 'Carregando...' }));
    if (!$('detalhes').open) $('detalhes').showModal();
    let d;
    try { d = await pedidoDetalhes(cliente.detalhes(id)); }
    catch (e) {
      const texto = e instanceof Tmdb.TokenInvalido ? 'Configure seu token no arquivo config.js' : 'Não foi possível carregar os filmes';
      return caixa.replaceChildren(el('div', { className: 'mensagem' }, [
        el('p', { textContent: texto }),
        e instanceof Tmdb.TokenInvalido ? null : el('button', { type: 'button', className: 'btn btn-primario', textContent: 'Tentar de novo', onclick: () => abrirDetalhes(id, true) })
      ]));
    }
    if (estado.filme !== id) return;

    const botao = el('button', { type: 'button', className: 'btn' });
    const pintar = () => { botao.textContent = lista.contem(d.id) ? '★ Na sua lista' : '☆ Quero assistir'; };
    botao.addEventListener('click', () => {
      if (lista.contem(d.id)) lista.remover(d.id);
      else lista.adicionar({ id: d.id, titulo: d.titulo, ano: d.ano, poster: d.poster });
      pintar(); atualizarBotaoLista();
      if (estado.tela === 'lista') mostrarLista();
    });
    pintar();

    const ondeAssistir = d.streamings.length
      ? [el('div', { className: 'logos' }, d.streamings.map(s => logo(s, 40))),
         el('p', {}, [el('a', { href: d.linkTmdb, target: '_blank', rel: 'noopener', textContent: 'Ver onde assistir no TMDB ↗' })])]
      : [el('p', { className: 'aviso', textContent: 'Não disponível em streaming no momento' })];

    caixa.replaceChildren(el('div', { className: 'det' }, [
      el('img', { className: 'poster', src: poster(d.poster, 'w500'), alt: 'Pôster de ' + d.titulo }),
      el('div', {}, [
        el('h2', { textContent: d.titulo }),
        el('div', { className: 'meta' }, [
          [d.ano, duracao(d.duracao), d.generos.join(', ')].filter(Boolean).join(' · ') + ' ',
          d.nota ? el('span', { className: 'nota', textContent: nota(d.nota) }) : null
        ]),
        botao,
        el('h3', { textContent: 'Onde assistir' }), ...ondeAssistir,
        d.sinopse ? el('h3', { textContent: 'Sinopse' }) : null,
        d.sinopse ? el('p', { textContent: d.sinopse }) : null,
        d.elenco.length ? el('h3', { textContent: 'Elenco' }) : null,
        d.elenco.length ? el('p', { textContent: d.elenco.join(', ') }) : null
      ]),
      d.trailer ? el('iframe', {
        className: 'trailer', src: 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(d.trailer),
        title: 'Trailer de ' + d.titulo, allow: 'encrypted-media; picture-in-picture', allowFullscreen: true
      }) : null
    ]));
  }

  function fecharDetalhesNaTela() {
    if ($('detalhes').open) $('detalhes').close();
    $('conteudo-detalhes').replaceChildren(); // para o trailer
  }

  function pedirFechamento() {
    if (detalheAbertoPorClique) { history.back(); return; }
    estado.filme = null;
    gravarUrl('replace');
    fecharDetalhesNaTela();
  }

  // ---------- telas ----------
  function aplicarTela() {
    $('area-filtros').hidden = estado.tela === 'lista';
    if (estado.tela === 'lista') mostrarLista();
    else carregarCatalogo(true);
  }

  window.addEventListener('popstate', () => {
    const anterior = estado;
    estado = Estado.ler(location.search);
    sincronizarCampos();
    const mudouLista = anterior.tela !== estado.tela ||
      Estado.escrever(Object.assign({}, anterior, { filme: null })) !== Estado.escrever(Object.assign({}, estado, { filme: null }));
    if (mudouLista) aplicarTela();
    if (estado.filme) abrirDetalhes(estado.filme, true);
    else { detalheAbertoPorClique = false; fecharDetalhesNaTela(); }
  });

  // ---------- eventos ----------
  let espera;
  $('busca').addEventListener('input', () => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      estado.busca = $('busca').value.trim();
      if (estado.tela !== 'catalogo') { estado.tela = 'catalogo'; $('area-filtros').hidden = false; }
      mudouFiltro();
    }, 400);
  });
  $('filtro-genero').addEventListener('change', (e) => { estado.genero = Number(e.target.value) || null; mudouFiltro(); });
  $('filtro-ordem').addEventListener('change', (e) => { estado.ordem = e.target.value; mudouFiltro(); });
  $('btn-filtros').addEventListener('click', () => {
    const aberto = $('painel-filtros').classList.toggle('aberto');
    $('btn-filtros').setAttribute('aria-expanded', String(aberto));
  });
  $('carregar-mais').addEventListener('click', () => { pagina++; carregarCatalogo(false); });
  $('btn-lista').addEventListener('click', () => {
    if (estado.tela === 'lista') return;
    estado.tela = 'lista'; estado.filme = null;
    gravarUrl('push');
    aplicarTela();
  });
  $('fechar-detalhes').addEventListener('click', pedirFechamento);
  $('detalhes').addEventListener('cancel', (e) => { e.preventDefault(); pedirFechamento(); }); // tecla Esc
  $('detalhes').addEventListener('click', (e) => { if (e.target === $('detalhes')) pedirFechamento(); }); // clique fora

  // ---------- início ----------
  let iniciando = false;
  async function iniciar() {
    if (iniciando) return;
    iniciando = true;
    try { await iniciarUmaVez(); } finally { iniciando = false; }
  }

  async function iniciarUmaVez() {
    atualizarBotaoLista();
    sincronizarCampos();
    if (!token || token === 'COLE_AQUI') { $('area-filtros').hidden = true; return mensagemToken(); }
    if (estado.tela === 'lista') aplicarTela();
    else $('area-filtros').hidden = false;
    if (estado.filme) abrirDetalhes(estado.filme, true);
    try {
      [streamings, generos] = await Promise.all([cliente.streamings(), cliente.generos()]);
    } catch (e) {
      if (estado.tela === 'catalogo') tratarErro(e, iniciar);
      return;
    }
    pronto = true;
    montarFiltros();
    if (estado.tela === 'catalogo') carregarCatalogo(true);
  }

  iniciar();
})();
