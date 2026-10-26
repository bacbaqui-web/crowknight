# Dry combat effects, edition 2

All 39 gameplay sound events now use this library of 43 newly rendered mono PCM WAV files. No old melodic pickup, vocal magic, pot resonance, game-jam explosion, or runtime pitch randomization is used. Original assets remain available for provenance.

Weapon swishes, bow release and weapon collisions use Ben Jaszczak & Brian Nelson's recorded medieval weapons. Cloth/leather, dirt footsteps and body impacts use Kenney and artisticdude foley. Fire and balloon recordings are credited below. Explosions are **designed foley composites**, not recordings of actual explosives: qubodup's pressure-release pop (opening dough packaging), wood/body impacts and fire. Tank movement similarly layers dry haft impacts and armor movement rather than engine recordings.

All input sources are CC0-1.0:

- [Medieval weapon textures — Ben Jaszczak & Brian Nelson](https://opengameart.org/content/medieval-sound-effects-weapon-textures)
- [Medieval weapon impacts — Ben Jaszczak & Brian Nelson](https://opengameart.org/content/medieval-sound-effects-weapon-impacts)
- [Impact Sounds — Kenney](https://kenney.nl/assets/impact-sounds)
- [RPG Audio — Kenney](https://kenney.nl/assets/rpg-audio)
- [RPG Sound Pack — artisticdude](https://opengameart.org/content/rpg-sound-pack)
- [Fire crackling — AntumDeluge](https://opengameart.org/content/fire-crackling)
- [Balloon sounds — Gniffelbaf / AntumDeluge](https://opengameart.org/content/balloon-sounds)
- [Dull explosion — qubodup](https://opengameart.org/content/dull-explosion)

Rebuild: `python3 tools/prepare_dry_combat_audio.py /path/to/source-packs`.
Per-output sources, authors, source hashes, delays, filter cutoffs, decay and output hashes are in `sources.json`. Processing uses 44.1 kHz mono, 55 Hz high-pass, event-specific low-pass, silence trimming, natural-speed mixing, exponential tail damping, edge fades and a 0.7 full-scale peak limit. Playback gain leaves further headroom and retains the shared compressor and voice cap. No pitched oscillator or melodic tone is synthesized.
