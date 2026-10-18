# Makes music/audio/<pitch>.mp3 — a short piano-like note for every pitch in music/notes.json — and index.json,
# which maps each note's id (lower case, as speak.js looks it up) to its clip, so Speak.say(note) plays the note.
# Synthesised here (additive partials with a hammer-like attack and a decay), so there is nothing to license.
# Run from the repo root: python3 tools/music/clips.py   (needs numpy and ffmpeg)
import json, pathlib, subprocess, wave
import numpy as np
root = pathlib.Path(__file__).resolve().parents[2]
notes = json.loads((root / 'music' / 'notes.json').read_text())
out = root / 'music' / 'audio'; out.mkdir(parents=True, exist_ok=True)
SR, LEN = 44100, 1.6
NAMES = ['c', 'cs', 'd', 'ds', 'e', 'f', 'fs', 'g', 'gs', 'a', 'as', 'b']
def piano(m):
    f0 = 440 * 2 ** ((m - 69) / 12)
    t = np.arange(int(SR * LEN)) / SR
    y = np.zeros_like(t)
    B = 0.0004   # a little inharmonicity, like a real string
    for k in range(1, 14):
        fk = f0 * k * np.sqrt(1 + B * k * k)
        if fk > SR / 2.2: break
        amp = (1 / k ** 1.3) * (1.0 if k % 2 else 0.7)
        decay = 2.2 + k * 0.9 + f0 / 300   # higher partials and higher notes die away faster
        y += amp * np.sin(2 * np.pi * fk * t + k) * np.exp(-decay * t)
    y += 0.15 * np.sin(2 * np.pi * f0 * 1.003 * t) * np.exp(-1.8 * t)   # a second string slightly out of tune: warmth
    att = np.minimum(1, t / 0.004)
    rel = np.clip((LEN - t) / 0.25, 0, 1)
    y *= att * rel
    return (y / np.abs(y).max() * 0.8 * 32767).astype(np.int16)
index, made = {}, set()
for n in notes:
    m = n['midi']; name = f"{NAMES[m % 12]}{m // 12 - 1}"
    if name not in made:
        wav = out / (name + '.wav')
        with wave.open(str(wav), 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(piano(m).tobytes())
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-ac', '1', '-b:a', '64k', str(out / (name + '.mp3'))], check=True)
        wav.unlink(); made.add(name)
    index[n['id'].lower()] = name + '.mp3'
(out / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=0))
print(len(made), 'clips for', len(index), 'notes')
