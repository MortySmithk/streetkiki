import requests
import datetime

# --- CONFIGURAÇÕES ---
TMDB_API_KEY = "001bbf841bab48f314947688a8230535"  # Sua chave da API do TMDB
# ATENÇÃO: Corrigido para o seu domínio streetflix.pro
SITE_URL = "https://streetflix.pro"
# Total de filmes e séries que você quer (5000 de cada = 10000 total)
TOTAL_ITEMS_PER_TYPE = 5000
# ---------------------

def fetch_tmdb_data(media_type, total_items):
    """Busca dados do TMDB para filmes ou séries."""
    print(f"Buscando {total_items} {media_type}s...")
    items = []
    # A API do TMDB retorna 20 itens por página.
    # Para 5000 itens, precisamos de 250 páginas.
    pages_to_fetch = (total_items // 20)

    # A API do TMDB limita a paginação a 500.
    if pages_to_fetch > 500:
        pages_to_fetch = 500
        print("Aviso: A API do TMDB permite buscar no máximo 10.000 itens (500 páginas).")

    for page in range(1, pages_to_fetch + 1):
        if len(items) >= total_items:
            break

        url = f"https://api.themoviedb.org/3/discover/{media_type}?api_key={TMDB_API_KEY}&language=pt-BR&sort_by=popularity.desc&page={page}"
        try:
            response = requests.get(url)
            response.raise_for_status()
            data = response.json()
            if 'results' in data and data['results']:
                # Adiciona apenas os itens que têm um ID
                items.extend([item for item in data['results'] if 'id' in item])
            else:
                print(f"A página {page} não retornou resultados.")
                break
        except requests.exceptions.RequestException as e:
            print(f"Erro ao buscar dados da página {page}: {e}")
            break

        print(f"  - Página {page}/{pages_to_fetch} buscada, total de itens: {len(items)}")

    return items[:total_items]

def generate_sitemap(filename, items):
    """Gera um arquivo de sitemap para uma lista de itens."""
    print(f"Gerando sitemap: {filename}...")
    with open(filename, 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        f.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')

        today = datetime.date.today().isoformat()

        for item in items:
            item_id = item.get('id')
            if not item_id:
                continue # Pula item se não tiver ID

            url = f"{SITE_URL}/player.html?id={item_id}"
            f.write('  <url>\n')
            f.write(f'    <loc>{url}</loc>\n')
            f.write(f'    <lastmod>{today}</lastmod>\n')
            f.write('    <changefreq>monthly</changefreq>\n')
            f.write('    <priority>0.8</priority>\n')
            f.write('  </url>\n')

        f.write('</urlset>\n')
    print(f"{filename} gerado com sucesso!")

def generate_sitemap_index():
    """Gera o arquivo de índice do sitemap."""
    print("Gerando índice do sitemap: sitemap.xml...")
    # Salva o sitemap.xml na pasta 'public' diretamente
    with open('public/sitemap.xml', 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        f.write('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')

        today = datetime.date.today().isoformat()

        f.write('  <sitemap>\n')
        f.write(f'    <loc>{SITE_URL}/sitemap-movies.xml</loc>\n')
        f.write(f'    <lastmod>{today}</lastmod>\n')
        f.write('  </sitemap>\n')

        f.write('  <sitemap>\n')
        f.write(f'    <loc>{SITE_URL}/sitemap-series.xml</loc>\n')
        f.write(f'    <lastmod>{today}</lastmod>\n')
        f.write('  </sitemap>\n')

        f.write('</sitemapindex>\n')
    print("public/sitemap.xml gerado com sucesso!")


if __name__ == "__main__":
    # Busca os dados
    movies = fetch_tmdb_data('movie', TOTAL_ITEMS_PER_TYPE)
    series = fetch_tmdb_data('tv', TOTAL_ITEMS_PER_TYPE)

    # Gera os sitemaps na pasta 'public'
    generate_sitemap('public/sitemap-movies.xml', movies)
    generate_sitemap('public/sitemap-series.xml', series)

    # Gera o índice do sitemap
    generate_sitemap_index()

    print("\nProcesso concluído! Os seguintes arquivos foram criados/atualizados na pasta 'public':")
    print("- public/sitemap.xml")
    print("- public/sitemap-movies.xml")
    print("- public/sitemap-series.xml")
    print("\nPróximo passo: Faça o deploy (envio) do seu site novamente para que as alterações entrem no ar.")