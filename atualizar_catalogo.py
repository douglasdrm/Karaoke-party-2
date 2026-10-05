import json
import time
import requests
import os

# Caminhos dos arquivos
SONGS_FILE = r"d:\Karaoke Party\songs.json"
OUTPUT_FILE = r"d:\Karaoke Party\songs_atualizado.json"

def get_genre(artist, title):
    """Busca o gênero da música usando a API gratuita do iTunes."""
    try:
        query = f"{artist} {title}"
        url = f"https://itunes.apple.com/search?term={query}&media=music&limit=1"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data['resultCount'] > 0:
                return data['results'][0].get('primaryGenreName', None)
    except Exception as e:
        pass
    return None

import re
import unicodedata

def slugify(text):
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
    text = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')
    return text

import urllib.parse

import json

def get_letras_url(artist, title):
    """Tenta encontrar a URL correta no Letras.mus.br usando a API de busca deles."""
    try:
        query = f"{artist} {title}"
        search_url = f"https://solr.sscdn.co/letras/m1/?q={urllib.parse.quote(query)}"
        r = requests.get(search_url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=5)
        if r.status_code == 200:
            # Limpa o JSONP: LetrasSug({...}) -> {...}
            content = r.text.strip()
            if content.startswith("LetrasSug("):
                content = content[content.find("(")+1 : content.rfind(")")]
            data = json.loads(content)
            docs = data.get("response", {}).get("docs", [])
            if docs:
                # Pega o primeiro resultado
                doc = docs[0]
                art_dns = doc.get("dns")
                mus_url = doc.get("url")
                if art_dns and mus_url:
                    return f"https://www.letras.mus.br/{art_dns}/{mus_url}/"
    except:
        pass
    
    # Fallback: tenta adivinhar o link direto pelo nome original
    return f"https://www.letras.mus.br/{slugify(artist)}/{slugify(title)}/"

import random

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
]

def get_vagalume_url(artist, title):
    """Tenta encontrar a URL correta no Vagalume usando a API de busca deles."""
    try:
        query = f"{artist} {title}"
        search_url = f"https://data-search.vagalume.com.br/search?q={urllib.parse.quote(query)}&limit=5"
        r = requests.get(search_url, headers={'User-Agent': random.choice(USER_AGENTS)}, timeout=5)
        if r.status_code == 200:
            data = r.json()
            docs = data.get("response", {}).get("docs", [])
            for doc in docs:
                # Verifica se o resultado parece ser uma música (tem campo 'url' que começa com /)
                url = doc.get("url", "")
                if url.endswith(".html"):
                    return f"https://www.vagalume.com.br{url}"
    except:
        pass
    return None

def get_lyrics_start(artist, title):
    """Busca a letra no Vagalume (mais amigável) com fallback para Lyrics.ovh."""
    
    # 1. Tenta Vagalume primeiro (Melhor para brasileiras e menos bloqueios)
    try:
        url = get_vagalume_url(artist, title)
        if url:
            headers = { 'User-Agent': random.choice(USER_AGENTS) }
            time.sleep(random.uniform(1.5, 3)) # Delay leve para não abusar
            response = requests.get(url, headers=headers, timeout=7)
            if response.status_code == 200:
                html = response.text
                # A letra no Vagalume fica dentro de um <div id="lyrics">
                match = re.search(r'<div id="lyrics"[^>]*>(.*?)</div>', html, re.DOTALL | re.IGNORECASE)
                if match:
                    lyric_content = match.group(1)
                    # Pega a primeira frase (ignora tags br e p)
                    # Limpa tags HTML
                    clean_lyric = re.sub(r'<[^>]+>', '\n', lyric_content)
                    lines = [line.strip() for line in clean_lyric.split('\n') if line.strip()]
                    if lines:
                        return lines[0]
            elif response.status_code == 403:
                print(f"  [Vagalume] Bloqueio 403 detectado. Tentando fallback...")
    except Exception as e:
        pass

    # 2. Tenta Lyrics.ovh (Fallback)
    try:
        url = f"https://api.lyrics.ovh/v1/{artist}/{title}"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            lyrics = data.get('lyrics', '')
            if lyrics:
                lines = [line.strip() for line in lyrics.split('\n') if line.strip()]
                for line in lines:
                    if "Paroles de la chanson" not in line:
                        return line
    except:
        pass

    return None

def main():
    if not os.path.exists(SONGS_FILE):
        print(f"Erro: O arquivo {SONGS_FILE} não foi encontrado.")
        return

    if os.path.exists(OUTPUT_FILE):
        print(f"Encontrado arquivo parcial {OUTPUT_FILE}. Retomando de onde parou...")
        with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
            catalog = json.load(f)
    else:
        print("Carregando o catálogo original. Isso pode levar alguns segundos...")
        with open(SONGS_FILE, 'r', encoding='utf-8') as f:
            catalog = json.load(f)
    
    musicas = catalog.get("musicas", [])
    total = len(musicas)
    print(f"Total de músicas no catálogo: {total}\n")
    
    updated_count = 0
    save_interval = 50 # Salva a cada 50 músicas para não perder o progresso se houver erro
    
    print("Iniciando a busca... Pressione Ctrl+C a qualquer momento para parar.")
    
    try:
        for i, musica in enumerate(musicas):
            artist = musica.get("artista", "")
            title = musica.get("titulo", "")
            
            needs_update = False
            
            needs_update = False
            
            # 1. Tenta preencher o Estilo (Apenas se for "0" ou vazio, como você pediu)
            if musica.get("estilo") == "0" or not musica.get("estilo") or musica.get("estilo") == "":
                if not musica.get("_estilo_verificado"):
                    genre = get_genre(artist, title)
                    if genre:
                        musica["estilo"] = genre
                        print(f"[{i+1}/{total}] {artist} - {title} | + Estilo: {genre}")
                    else:
                        musica["estilo"] = "Variados"
                    musica["_estilo_verificado"] = True
                    needs_update = True
                    time.sleep(1)
            
            # 2. Tenta preencher o Início da Letra
            if musica.get("inicioletra") == "0" or not musica.get("inicioletra") or musica.get("inicioletra") == "-":
                # Força a busca se estiver com "-", pois falhou na API antiga e agora temos o Letras.mus
                if not musica.get("_letra_verificada") or musica.get("inicioletra") == "-":
                    first_line = get_lyrics_start(artist, title)
                    
                    if first_line:
                        musica["inicioletra"] = first_line
                        print(f"[{i+1}/{total}] {artist} - {title} | + Início da letra: {first_line}")
                    else:
                        musica["inicioletra"] = "-" 
                    musica["_letra_verificada"] = True
                    needs_update = True
                    time.sleep(1)
                    
            if needs_update:
                updated_count += 1
                
                # Salva o progresso em lotes
                if updated_count % save_interval == 0:
                    print("--> Salvando progresso parcial no arquivo...")
                    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                        json.dump(catalog, f, ensure_ascii=False, indent=2)
                        
            # Mostra que o script está vivo a cada 500 músicas verificadas
            if (i + 1) % 500 == 0:
                print(f"... Verificando [{i+1}/{total}] ...")
            
    except KeyboardInterrupt:
        print("\nBusca interrompida pelo usuário!")
        
    finally:
        print("\nSalvando arquivo final...")
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(catalog, f, ensure_ascii=False, indent=2)
            
        print(f"Processo finalizado! {updated_count} músicas foram atualizadas.")
        print(f"O novo arquivo foi salvo como: {OUTPUT_FILE}")
        print("Mova ou renomeie este arquivo para 'songs.json' quando tiver certeza de que está tudo certo.")

if __name__ == "__main__":
    main()
