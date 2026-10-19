# Catálogo de Filmes

Site da família para ver quais filmes estão disponíveis nos streamings por assinatura no Brasil.
Os dados de filmes vêm do TMDB e a disponibilidade vem do JustWatch.

## 1. Configurar o token

1. Entre em **themoviedb.org**, clique no seu avatar e vá em **Configurações → API**.
2. Copie o **API Read Access Token**, que é o código longo.
3. Na pasta do site, faça uma cópia de `config.exemplo.js` com o nome **`config.js`**.
4. Abra o `config.js` no Bloco de Notas e troque `COLE_AQUI` pelo token, mantendo as aspas.
5. Abra o `index.html` com um clique duplo para usar o site no seu computador.

## 2. Rodar os testes automáticos

Abra o arquivo `testes/testes.html` no navegador. A última linha deve mostrar **"0 falharam"**.
Se você tiver o Node instalado, também pode rodar `node testes/testes.js`.

## 3. Publicar na internet (GitHub Pages, gratuito)

> ⚠️ O token fica visível para quem abrir o código do site. Ele só permite ler dados do TMDB,
> então o risco é baixo para um site familiar. Mesmo assim, não divulgue o link publicamente.
> Se precisar, você pode gerar um token novo no TMDB a qualquer momento.

1. Crie uma conta em **github.com**.
2. Clique em **New repository**, dê o nome `catalogo-filmes`, marque **Public** e clique em **Create repository**.
3. Na página do repositório, clique em **uploading an existing file**.
4. Arraste **todos os arquivos e pastas** do site, **incluindo o `config.js`** com o seu token. Depois clique em **Commit changes**.
   Se for enviar pelo git, apague a linha `config.js` do arquivo `.gitignore` antes de enviar.
5. Vá em **Settings → Pages**. Em "Branch", escolha **main** e a pasta **/ (root)**, e clique em **Save**.
6. Depois de 1 ou 2 minutos, o site estará em `https://SEU-USUARIO.github.io/catalogo-filmes`.
   Mande esse link para a família. No celular, dá para usar "Adicionar à tela inicial".

## 4. Roteiro de teste manual (no computador e no celular)

- [ ] Abrir o site: os filmes aparecem em uma grade.
- [ ] Marcar **Netflix** e escolher o gênero **Comédia**: os filmes mudam, e o logo da Netflix aparece nos cartões.
- [ ] Ordenar por **Nota**, depois por **Lançamento recente**.
- [ ] Recarregar a página: os filtros continuam os mesmos.
- [ ] Clicar em **Carregar mais**: novos filmes entram no fim da grade.
- [ ] Buscar um título, por exemplo "Matrix": os resultados aparecem.
- [ ] Buscar um filme antigo e abri-lo: se não estiver em nenhum streaming, aparece "Não disponível em streaming no momento".
- [ ] Abrir um filme: aparecem a sinopse, o elenco, o trailer e "Onde assistir".
- [ ] Clicar em **☆ Quero assistir**: o contador no topo aumenta.
- [ ] Abrir **Quero assistir (N)**, recarregar a página e conferir que os filmes continuam na lista. Remover um deles.
- [ ] No celular: abrir um filme e apertar **voltar**. A janela fecha e você continua no site.
- [ ] No celular: o botão **Filtros** abre e fecha os filtros.
- [ ] Copiar o link de um filtro e abrir em outra aba: os mesmos filtros são aplicados.
- [ ] Trocar o token no `config.js` por `x`: aparece "Configure seu token no arquivo config.js".
- [ ] Desligar a internet e recarregar: aparece "Não foi possível carregar os filmes" com o botão "Tentar de novo".

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | Estrutura das telas |
| `estilo.css` | Visual (celular e computador) |
| `config.js` | Seu token do TMDB (não vai para o git) |
| `tmdb.js` | Conversa com a API do TMDB |
| `lista.js` | Lista "quero assistir" (salva no navegador) |
| `estado.js` | Filtros guardados no link |
| `app.js` | Telas e cliques |
| `testes/` | Testes automáticos |
