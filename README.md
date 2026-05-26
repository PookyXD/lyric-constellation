# ✦ Lyric Constellation

<img width="1318" height="840" alt="image" src="https://github.com/user-attachments/assets/6bcf3c9e-67b8-4b2d-a37e-2884d7fc86eb" />

> every song has an emotional fingerprint. this is yours.

![Python](https://img.shields.io/badge/Python-3.11-gold?style=flat-square)
![FastAPI](https://img.shields.io/badge/FastAPI-backend-gold?style=flat-square)
![HuggingFace](https://img.shields.io/badge/HuggingFace-Transformers-gold?style=flat-square)

---

## What is this

You've seen Spotify Wrapped. You've seen Last.fm stats.
But you've never seen a song's emotional fingerprint — until now.

Lyric Constellation fetches any song's lyrics automatically,
runs every single line through a transformer emotion model,
and generates a unique constellation map where each star
represents a lyric line sized by emotional intensity,
connected across the song's journey.

Every song produces a completely different constellation.

---

## Demo

<video src="https://youtu.be/YR7M9aOXv2M" controls width="100%"></video>

---

## Features

- Automatic lyrics fetching via Genius API
- 28-emotion detection using SamLowe RoBERTa model
- Constellation visualization — stars sized by emotional intensity
- Emotional score from -1.0 to +1.0 per song
- Most emotional line quoted at the bottom
- 30 second song preview with CRT audio distortion
- Retro CRT themed web interface with boot sequence
- Pixel sword cursor and retro Windows 98 music player

---

## How it works

Song title + artist
↓
Genius API → fetches lyrics
↓
SamLowe Roberta → scores every line by emotion
↓
Constellation generator → maps emotion to stars
↓
PNG poster exported

---

## Setup

### 1. Clone

```bash
git clone https://github.com/yourusername/lyric-constellation.git
cd lyric-constellation
```

### 2. Virtual environment

```bash
python -m venv venv
source venv/Scripts/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Download emotion model

Download from:
**huggingface.co/SamLowe/roberta-base-go_emotions**

Place all files in `models/emotions/`

### 5. Genius API key

Create `.env` file:
GENIUS_TOKEN=your_token_here

### 6. Run

```bash
uvicorn main:app --reload
```

Open `http://127.0.0.1:8000`

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI |
| Lyrics | Genius API + BeautifulSoup |
| Emotion | SamLowe RoBERTa go_emotions |
| Visualization | Matplotlib, Pillow |
| Frontend | HTML, CSS, JavaScript |
| CRT Effects | ScreenEffect.js |
| Audio | Web Audio API |
| Preview | iTunes Search API |

---

*Built Summer 2026*
