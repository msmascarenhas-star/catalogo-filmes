// Estado da tela (filtros, busca, filme aberto) guardado na URL, para poder compartilhar o link.
(function () {
  const ORDENS = ['popularidade', 'nota', 'recentes'];

  function idValido(texto) {
    const n = Number(texto);
    return Number.isInteger(n) && n > 0 && /^\d+$/.test(texto) ? n : null;
  }

  function ler(search) {
    const p = new URLSearchParams(search || '');
    const ordem = p.get('o');
    return {
      streamings: (p.get('s') || '').split(',').map(idValido).filter(n => n !== null),
      genero: idValido(p.get('g') || ''),
      ordem: ORDENS.includes(ordem) ? ordem : 'popularidade',
      busca: (p.get('q') || '').trim(),
      filme: idValido(p.get('filme') || ''),
      tela: p.get('tela') === 'lista' ? 'lista' : 'catalogo'
    };
  }

  function escrever(e) {
    const p = new URLSearchParams();
    if (e.streamings && e.streamings.length) p.set('s', e.streamings.join(','));
    if (e.genero) p.set('g', String(e.genero));
    if (e.ordem && e.ordem !== 'popularidade') p.set('o', e.ordem);
    if (e.busca) p.set('q', e.busca);
    if (e.filme) p.set('filme', String(e.filme));
    if (e.tela === 'lista') p.set('tela', 'lista');
    const texto = p.toString();
    return texto ? '?' + texto : '';
  }

  const temMaisPaginas = (pagina, totalPaginas) => pagina < totalPaginas;

  const Estado = { ler, escrever, temMaisPaginas };
  if (typeof module !== 'undefined') module.exports = Estado;
  else window.Estado = Estado;
})();
