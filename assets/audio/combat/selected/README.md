# Selected free game SFX — five-family trial

This edition replaces weapon swing, hit, shield defence, footsteps and explosions only. 16 variants cover 9 event keys (including the player's club, parry and large explosion). All are new source recordings/designs, not the previous custom mixes.

## Sources and attribution

- **Hove Audio — Sword Combat Sound Effects Pack FREE VERSION**: two Whooshes, two Base Stabs, two Base Metal collisions for the shield, and two Base Wood impacts for the player's blunt weapon. [Official free pack](https://hoveaudio.itch.io/sword-combat-sound-effects-pack-free-version). Publisher permits use in games/films and says credit is not required; credited here nevertheless. Files are integrated game assets, not a sound library for redistribution. No paid/full-pack files are used.
- **swuing — footstep-grass.wav**, mastered into game-ready steps by **congusbongus** for C-Dogs SDL. [Original](https://freesound.org/people/swuing/sounds/38874/), [pack](https://opengameart.org/content/footsteps-on-different-surfaces), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Grass variants 0–5 used.
- **Michel Baradari — 2 High Quality Explosions**, apollo-music.de, submitted by qubodup. [Source](https://opengameart.org/content/2-high-quality-explosions), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). `explodemini.wav` and `explode.wav` used for normal/large explosions. These are authored explosion effects, not claimed to be field recordings of explosives.

Changes: mono 44.1 kHz PCM16 conversion, near-silent padding trimmed, linear gain to 0.78 peak, tiny boundary fades. No pitch shift, low-pass filter, exponential tail, layered household sounds or additional synthesized tone. Full audible source decay is retained. `sources.json` records original paths, input/output SHA-256, exact trims and gains. Rebuild with `python3 tools/prepare_selected_combat_audio.py /path/to/downloaded-and-extracted-sources`.

## Selection notes

- Hove's separate whoosh/base-impact files avoid an extra whoosh after contact; ring/magic/gore combinations are not selected.
- Steps use outdoor grass rather than subway/cave reverberation, with six takes at lower gain than combat.
- Explosion-small is about 1.6 seconds, large about 1.7 seconds: the source's attack and decay remain intact.
- Sonniss was researched but the primary server challenged downloads and its official mirror timed out; no Sonniss assets were used. FilmCow Designed contains predominantly alien/sci-fi cues and was not used. The 5-second HJM boom was rejected for sustained high level/length, rather than cropped to force it to fit.
- Signal checks and event synchronization are validated separately from subjective listening; final aesthetic approval belongs to playtesting.
