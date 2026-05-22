import os
import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi import Request
from pydantic import BaseModel
from dotenv import load_dotenv
from src.fetcher import get_lyrics, get_album_art, get_song_preview

load_dotenv()

from src.fetcher import get_lyrics, get_album_art
from src.analyzer import analyze_lyrics
from src.visualizer import plot_mood_arc

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

os.makedirs("output", exist_ok=True)
os.makedirs("assets", exist_ok=True)


class SongRequest(BaseModel):
    song_title: str
    artist_name: str


@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse(request, "index.html")


@app.post("/analyze")
async def analyze(song_req: SongRequest):
    try:
        raw_lyrics, real_title, real_artist = get_lyrics(
            song_req.song_title,
            song_req.artist_name
        )

        if raw_lyrics is None:
            return JSONResponse(
                status_code=404,
                content={"error": "Song not found. Check spelling and try again."}
            )

        art_path = get_album_art(real_title, real_artist)

        preview  = get_song_preview(real_title, real_artist)

        song = analyze_lyrics(real_title, real_artist, raw_lyrics)

        filename = plot_mood_arc(song, art_path)

        unique_name = f"output/{uuid.uuid4()}.png"
        os.rename(filename, unique_name)

        return JSONResponse(content={
            "image_url": f"/{unique_name}",
            "title":     real_title,
            "artist":    real_artist,
            "score":     round(
                sum(l.compound for l in song.lines) / len(song.lines), 3
            ),
            "top_line":  max(
                song.lines,
                key=lambda l: abs(l.compound)
            ).text,
            "preview_url": preview["preview_url"] if preview else None,
            "track_name":  preview["track_name"]  if preview else real_title,
        })

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


app.mount("/output", StaticFiles(directory="output"), name="output")