import re
import csv
import os
from transformers import pipeline
from src.models import LyricLine, Song
from rich.console import Console

_console = Console()
_console.print("[grey50]Loading emotion model...[/]")

sentiment_pipeline = pipeline(
    "text-classification",
    model="SamLowe/roberta-base-go_emotions",
    top_k=3,
)

_console.print("[green3]Model ready.[/]\n")

# go_emotions labels mapped to -1 to +1 scale
EMOTION_SCORES = {
    "admiration":    0.7,
    "amusement":     0.6,
    "anger":        -0.8,
    "annoyance":    -0.4,
    "approval":      0.5,
    "caring":        0.6,
    "confusion":    -0.2,
    "curiosity":     0.2,
    "desire":        0.5,
    "disappointment":-0.6,
    "disapproval":  -0.5,
    "disgust":      -0.7,
    "embarrassment":-0.4,
    "excitement":    0.8,
    "fear":         -0.6,
    "gratitude":     0.8,
    "grief":        -0.9,
    "joy":           1.0,
    "love":          0.9,
    "nervousness":  -0.3,
    "optimism":      0.7,
    "pride":         0.7,
    "realization":   0.1,
    "relief":        0.5,
    "remorse":      -0.6,
    "sadness":      -0.7,
    "surprise":      0.3,
    "neutral":       0.0,
}


def clean_lyrics(raw_lyrics):
    lines   = raw_lyrics.split("\n")
    cleaned = []
    for line in lines:
        line = line.strip()
        if line == "":
            continue
        cleaned.append(line)
    return cleaned


def extract_sections(cleaned_lines):
    sections        = []
    current_section = "Intro"
    for line in cleaned_lines:
        if re.match(r'^\[.+\]$', line):
            current_section = line.strip("[]")
            continue
        sections.append((line, current_section))
    return sections


def score_to_compound(label, score):
    base = EMOTION_SCORES.get(label.lower(), 0.0)

    if base == 0.0:
        return round((score - 0.5 ) * 0.2,4)
    return round(base * score, 4)


def analyze_lyrics(song_title, artist_name, raw_lyrics):
    cleaned  = clean_lyrics(raw_lyrics)
    sections = extract_sections(cleaned)

    song = Song(song_title, artist_name)

    lines_text = [line for line, _ in sections]
    labels_sec = [sec  for _, sec  in sections]

    results = sentiment_pipeline(
        lines_text,
        truncation=True,
        max_length=128,
        batch_size=16,
    )
    for r in results[:3]:
        print(r)

    for i, result in enumerate(results):
        # result is list of top 3 — pick most emotionally significant
        best_label = "neutral"
        best_score = 0.0
        best_compound = 0.0

        for prediction in result:
            label    = prediction["label"]
            score    = prediction["score"]
            compound = score_to_compound(label, score)
            if abs(compound) > abs(best_compound):
                best_label    = label
                best_score    = score
                best_compound = compound

        lyric_line          = LyricLine(lines_text[i], labels_sec[i])
        lyric_line.compound = best_compound
        lyric_line.positive = best_score if EMOTION_SCORES.get(best_label.lower(), 0) > 0 else 0.0
        lyric_line.negative = best_score if EMOTION_SCORES.get(best_label.lower(), 0) < 0 else 0.0
        lyric_line.neutral  = best_score if best_label.lower() == "neutral" else 0.0
        lyric_line.emotion  = best_label.lower()

        song.add_line(lyric_line)

    return song


def export_to_csv(song):
    os.makedirs("output", exist_ok=True)

    filename = f"output/{song.title}_{song.artist}.csv".replace(" ", "_")

    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["line", "section", "positive",
                         "negative", "neutral", "compound"])

        for lyric_line in song.lines:
            writer.writerow([
                lyric_line.text,
                lyric_line.section,
                lyric_line.positive,
                lyric_line.negative,
                lyric_line.neutral,
                lyric_line.compound,
            ])

    _console.print(f"[grey50]CSV exported to {filename}[/]")
    return filename