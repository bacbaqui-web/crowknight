# Dual-grid painted terrain v3

2026-10-27. Built-in image_gen generated six independent base materials using the original side-view background release-assets/de38b634107dd3e115d1784bbb81477d4c7edab2f7ff00562283c1e5a71d81e0.webp as a style reference. Originals remain in the generated_images folder. Derived WebP: 512px, quality 88.

Five corner-rule sets × sixteen masks = 80 derived tile configurations, not 80 independently generated artworks. The game bakes these rules and globally sampled materials into its cached ground texture. The preview exports five 16-tile PNG sheets. Mirrored texture sampling removes source-image wrap seams. Water remains traversable scenery.

References: https://doc.mapeditor.org/en/stable/manual/terrain/ and https://github.com/jess-hammer/dual-grid-tilemap-system-godot and https://github.com/Wangscape/Wangscape . The JavaScript implementation is original; no external implementation was copied and Wangscape was not executed.

## grass

Reference image is STYLE ONLY, do not reproduce its scene. Create ONE square seamless TOP DOWN ground material for same 2D painted game. Low flat sage olive meadow, sparse short angular blue-green grass strokes, broad areas of quiet muted olive green. Not bright green, no detailed realistic blades. Match reference's FLAT naive gouache silhouettes, coarse visible dry-brush edges, restricted dusty sage teal olive ochre palette, low contrast, simplified painterly forms. No realism, no 3D highlights, no shading relief, no objects, no horizon, no perspective, no text. Entire square filled with material, edges tile. Keep ground visually quieter than characters.

## earth

Reference image is STYLE ONLY, do not reproduce its scene. Create ONE square seamless TOP DOWN ground material for same 2D painted game. Bare dusty gray ochre earth with broad matte dry brush areas. Desaturated tan olive brown, NOT orange. No grass. Match reference's FLAT naive gouache silhouettes, coarse visible dry-brush edges, restricted dusty sage teal olive ochre palette, low contrast, simplified painterly forms. No realism, no 3D highlights, no shading relief, no objects, no horizon, no perspective, no text. Entire square filled with material, edges tile. Keep ground visually quieter than characters.

## tile

Reference image is STYLE ONLY, do not reproduce its scene. Create ONE square seamless TOP DOWN ground material for same 2D painted game. Broken ancient flat slate flagstones with irregular missing corners and small soil-filled gaps. Few muted blue gray stone slabs. No bricks, no neat rectangular wall pattern. Match reference's FLAT naive gouache silhouettes, coarse visible dry-brush edges, restricted dusty sage teal olive ochre palette, low contrast, simplified painterly forms. No realism, no 3D highlights, no shading relief, no objects, no horizon, no perspective, no text. Entire square filled with material, edges tile. Keep ground visually quieter than characters.

## road

Reference image is STYLE ONLY, do not reproduce its scene. Create ONE square seamless TOP DOWN ground material for same 2D painted game. Worn path of small irregular buried slate pebbles with abundant ochre earth between. Sparse stones, not densely packed cobblestone pavement. Match reference's FLAT naive gouache silhouettes, coarse visible dry-brush edges, restricted dusty sage teal olive ochre palette, low contrast, simplified painterly forms. No realism, no 3D highlights, no shading relief, no objects, no horizon, no perspective, no text. Entire square filled with material, edges tile. Keep ground visually quieter than characters.

## water

Reference image is STYLE ONLY, do not reproduce its scene. Create ONE square seamless TOP DOWN ground material for same 2D painted game. Quiet opaque desaturated dark teal pond surface. Very sparse broad pale sage horizontal ripples. No white foam, no ocean waves, no saturated cyan. Match reference's FLAT naive gouache silhouettes, coarse visible dry-brush edges, restricted dusty sage teal olive ochre palette, low contrast, simplified painterly forms. No realism, no 3D highlights, no shading relief, no objects, no horizon, no perspective, no text. Entire square filled with material, edges tile. Keep ground visually quieter than characters.

## shore

Reference image is STYLE ONLY, do not reproduce its scene. Create ONE square seamless TOP DOWN ground material for same 2D painted game. Dry muddy pale ochre shore ground, sparse small slate pebbles. Flat desaturated gray tan, no water, no grass. Match reference's FLAT naive gouache silhouettes, coarse visible dry-brush edges, restricted dusty sage teal olive ochre palette, low contrast, simplified painterly forms. No realism, no 3D highlights, no shading relief, no objects, no horizon, no perspective, no text. Entire square filled with material, edges tile. Keep ground visually quieter than characters.

