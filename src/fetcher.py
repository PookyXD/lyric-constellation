import os
import re
import requests
from dotenv import load_dotenv

load_dotenv()

def get_lyrics(song_title, artist_name):
    token = os.getenv("GENIUS_TOKEN")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    search_url = "https://api.genius.com/search"
    params = {"q": f"{song_title} {artist_name}"}
    
    response = requests.get(search_url, headers=headers, params=params)
    data = response.json()
    
    hits = data["response"]["hits"]
    
    if not hits:
        return None, None, None
    
    result      = hits[0]["result"]
    song_url    = result["url"]
    real_title  = result["title"]
    real_artist = result["primary_artist"]["name"]

    lyrics = scrape_lyrics(song_url, headers)
    return lyrics, real_title, real_artist

def scrape_lyrics(url, headers):
    from bs4 import BeautifulSoup
    
    page = requests.get(url)
    soup = BeautifulSoup(page.content, "html.parser")
    
    containers = soup.find_all("div", attrs={"data-lyrics-container": "true"})
    
    if not containers:
        return None
    
    lyrics = ""
    for container in containers:
        for br in container.find_all("br"):
            br.replace_with("\n")
        lyrics += container.get_text() + "\n"
    
    lyrics = re.sub(r'^\d+\s*Contributor[s]?.*?Lyrics', '', lyrics, flags=re.DOTALL)
    lyrics = re.sub(r'\d+\s*Embed$', '', lyrics.strip())

    return lyrics.strip()

def get_album_art(song_title, artist_name):
    token = os.getenv("GENIUS_TOKEN")
    headers = {"Authorization": f"Bearer {token}"}

    search_url = "https://api.genius.com/search"
    params = {"q": f"{song_title} {artist_name}"}
    
    response = requests.get(search_url, headers=headers, params=params)
    data = response.json()
    
    hits = data["response"]["hits"]
    
    if not hits:
        return None
    
    image_url = hits[0]["result"]["song_art_image_url"]
    
    image_response = requests.get(image_url)
    
    if image_response.status_code == 200:
        os.makedirs("assets", exist_ok=True)
        art_path = "assets/album_art.jpg"
        with open(art_path, "wb") as f:
            f.write(image_response.content)
        return art_path
    
    return None

def get_song_preview(song_title, artist_name):
    search_url = "https://itunes.apple.com/search"
    params = {
        "term": f"{song_title} {artist_name}",
        "media": "music",
        "limit": 1
    }
    
    try:
        response = requests.get(search_url, params=params, timeout=5)
        data     = response.json()
        
        if data["resultCount"] == 0:
            return None
            
        result      = data["results"][0]
        preview_url = result.get("previewUrl")
        artwork_url = result.get("artworkUrl100", "").replace("100x100", "600x600")
        
        return {
            "preview_url": preview_url,
            "artwork_url": artwork_url,
            "track_name":  result.get("trackName"),
            "artist_name": result.get("artistName"),
        }
    except Exception:
        return None