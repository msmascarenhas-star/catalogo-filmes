// Lista "quero assistir", salva no navegador (localStorage).
(function () {
  const CHAVE = 'queroAssistir';

  function criar(storage) {
    let filmes = [];
    try {
      const salvo = JSON.parse(storage.getItem(CHAVE));
      if (Array.isArray(salvo)) filmes = salvo.filter(f => f && typeof f.id === 'number');
    } catch (e) { filmes = []; }

    function salvar() {
      try { storage.setItem(CHAVE, JSON.stringify(filmes)); } catch (e) { /* armazenamento bloqueado: segue só em memória */ }
    }

    return {
      listar: () => filmes.slice(),
      contem: (id) => filmes.some(f => f.id === id),
      adicionar(filme) {
        if (filmes.some(f => f.id === filme.id)) return;
        filmes.push({ id: filme.id, titulo: filme.titulo, ano: filme.ano, poster: filme.poster });
        salvar();
      },
      remover(id) {
        filmes = filmes.filter(f => f.id !== id);
        salvar();
      }
    };
  }

  const Lista = { criar };
  if (typeof module !== 'undefined') module.exports = Lista;
  else window.Lista = Lista;
})();
