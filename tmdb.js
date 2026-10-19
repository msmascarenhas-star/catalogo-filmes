// Cliente da API do TMDB. Única parte do site que conversa com o TMDB.
(function () {
  const BASE = 'https://api.themoviedb.org/3';
  const ORDENS = {
    popularidade: { sort_by: 'popularity.desc' },
    nota: { sort_by: 'vote_average.desc', 'vote_count.gte': '100' },
    recentes: { sort_by: 'primary_release_date.desc' }
  };

  class TokenInvalido extends Error {}
  class FalhaRede extends Error {}

  const ano = (data) => (data && data.length >= 4 ? Number(data.slice(0, 4)) : null);
  const resumo = (f) => ({ id: f.id, titulo: f.title, ano: ano(f.release_date), nota: f.vote_average, poster: f.poster_path || null });
  const streaming = (p) => ({ id: p.provider_id, nome: p.provider_name, logo: p.logo_path });
  const pagina = (r) => ({ filmes: (r.results || []).map(resumo), pagina: r.page || 1, totalPaginas: Math.min(r.total_pages || 0, 500) }); // o TMDB recusa page > 500
  const acharTrailer = (videos) => {
    const v = (videos || []).find(v => v.site === 'YouTube' && v.type === 'Trailer');
    return v ? v.key : null;
  };

  function criar({ token, fetch }) {
    async function get(caminho, params) {
      const url = new URL(BASE + caminho);
      for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, v);
      let resp;
      try {
        resp = await fetch(url.toString(), { headers: { Authorization: 'Bearer ' + token, accept: 'application/json' } });
      } catch (e) {
        throw new FalhaRede(e.message);
      }
      if (resp.status === 401) throw new TokenInvalido('token inválido');
      if (!resp.ok) throw new FalhaRede('HTTP ' + resp.status);
      return resp.json();
    }

    return {
      async streamings() {
        const r = await get('/watch/providers/movie', { watch_region: 'BR', language: 'pt-BR' });
        const prio = (p) => (p.display_priorities && p.display_priorities.BR != null ? p.display_priorities.BR : p.display_priority);
        return (r.results || []).slice().sort((a, b) => prio(a) - prio(b)).map(streaming);
      },

      async generos() {
        const r = await get('/genre/movie/list', { language: 'pt-BR' });
        return (r.genres || []).map(g => ({ id: g.id, nome: g.name }));
      },

      async descobrir({ streamings, genero, ordem, pagina: n, provedoresTodos }) {
        const ids = streamings && streamings.length ? streamings : provedoresTodos;
        if (!ids || !ids.length) throw new Error('provedores não carregados');
        const params = Object.assign({
          watch_region: 'BR',
          with_watch_monetization_types: 'flatrate',
          with_watch_providers: ids.join('|'),
          language: 'pt-BR',
          page: String(n || 1)
        }, ORDENS[ordem] || ORDENS.popularidade);
        if (genero) params.with_genres = String(genero);
        return pagina(await get('/discover/movie', params));
      },

      async buscar(texto, n) {
        const r = await get('/search/movie', { query: texto.trim(), language: 'pt-BR', region: 'BR', page: String(n || 1) });
        return pagina(r);
      },

      async detalhes(id) {
        const f = await get('/movie/' + id, { append_to_response: 'credits,videos,watch/providers', language: 'pt-BR' });
        let trailer = acharTrailer(f.videos && f.videos.results);
        if (!trailer) {
          try {
            const v = await get('/movie/' + id + '/videos');
            trailer = acharTrailer(v.results);
          } catch (e) {
            if (e instanceof TokenInvalido) throw e;
            trailer = null; // sem trailer, mas os detalhes continuam
          }
        }
        const br = (f['watch/providers'] && f['watch/providers'].results && f['watch/providers'].results.BR) || {};
        return {
          id: f.id,
          titulo: f.title,
          ano: ano(f.release_date),
          duracao: f.runtime || null,
          generos: (f.genres || []).map(g => g.name),
          nota: f.vote_average,
          poster: f.poster_path || null,
          sinopse: f.overview || '',
          elenco: ((f.credits && f.credits.cast) || []).slice(0, 6).map(a => a.name),
          trailer,
          streamings: (br.flatrate || []).map(streaming),
          linkTmdb: br.link || 'https://www.themoviedb.org/movie/' + id
        };
      }
    };
  }

  const Tmdb = { criar, TokenInvalido, FalhaRede };
  if (typeof module !== 'undefined') module.exports = Tmdb;
  else window.Tmdb = Tmdb;
})();
