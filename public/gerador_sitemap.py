import requests
import datetime

# --- CONFIGURAÇÕES ---
TMDB_API_KEY = "001bbf841bab48f314947688a8230535"  # Sua chave da API do TMDB
SITE_URL = "https://streetflix.pro"  # URL principal do seu site
TOTAL_ITEMS_PER_TYPE = 5000 # Total de filmes e séries que você quer (5000 de cada = 10000 total)
# ---------------------

def fetch_tmdb_data(media_type, total_items):
    """Busca dados do TMDB para filmes ou séries."""
    print(f"Buscando {total_items} {media_type}s...")
    items = []
    # A API do TMDB retorna 20 itens por página.
    # Para 5000 itens, precisamos de 250 páginas.
    pages_to_fetch = (total_items // 20) + 1
    
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
            if 'results' in data:
                items.extend(data['results'])
            else:
                print(f"A página {page} não retornou resultados.")
                break
        except requests.exceptions.RequestException as e:
            print(f"Erro ao buscar dados da página {page}: {e}")
            break
        
        print(f"  - Página {page}/{pages_to_fetch} buscada, total de itens: {len(items)}")

    return items[:total_items]

def generate_sitemap(filename, items, media_type):
    """Gera um arquivo de sitemap para uma lista de itens."""
    print(f"Gerando sitemap: {filename}...")
    with open(filename, 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        f.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        
        today = datetime.date.today().isoformat()
        
        for item in items:
            # Usamos o novo formato de URL com hash
            url = f"{SITE_URL}/#details/{media_type}/{item['id']}"
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
    with open('sitemap.xml', 'w', encoding='utf-8') as f:
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
    print("sitemap.xml gerado com sucesso!")


if __name__ == "__main__":
    movies = fetch_tmdb_data('movie', TOTAL_ITEMS_PER_TYPE)
    generate_sitemap('sitemap-movies.xml', movies, 'movie')
    
    series = fetch_tmdb_data('tv', TOTAL_ITEMS_PER_TYPE)
    generate_sitemap('sitemap-series.xml', series, 'tv')
    
    generate_sitemap_index()
    
    print("\nProcesso concluído! Os seguintes arquivos foram criados:")
    print("- sitemap.xml")
    print("- sitemap-movies.xml")
    print("- sitemap-series.xml")
    print("\nPróximo passo: envie estes 3 arquivos para a pasta 'public' do seu projeto.")