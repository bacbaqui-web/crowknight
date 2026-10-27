"""Extract the user-selected fourth and fifth swipes without pitch or gain changes."""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / 'assets/audio/combat/pixabay'
SOURCE = AUDIO / 'originals/sword-swipes-7174.mp3'
CUTS = [(4, 3.49, 3.82), (5, 4.07, 4.55)]

if __name__ == '__main__':
    for number, start, end in CUTS:
        subprocess.run([
            'ffmpeg', '-y', '-v', 'error', '-i', str(SOURCE),
            '-af', f'atrim=start={start}:end={end},asetpts=PTS-STARTPTS',
            '-c:a', 'pcm_s16le', str(AUDIO / f'sword-swipe-{number}.wav'),
        ], check=True)
