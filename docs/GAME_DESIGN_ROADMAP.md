# Natural Disasters: Survival 101 — From Prototype to Full Vision

The original design brief for this project describes an AAA-scale game:
20+ photorealistic open-world maps, 100-player multiplayer, advanced NPC
and animal AI, full vehicle simulation, VR support, and a live-service
economy. That is a multi-year, multi-hundred-person studio effort — not
something buildable in a coding session, and not what lives in this repo
(`youtubeauto`, a YouTube video-generation automation tool).

What exists today, in [`game/`](../game/), is a scoped **vertical slice**:
a browser-based wildfire evacuation prototype proving out the core
survival loop (gather → manage stats → react to a spreading disaster →
reach safety) in a single map with placeholder art.

## Section-by-section status

| GDD Section | Status | Notes |
| --- | --- | --- |
| 1. Game Vision | Partial | Core survival loop (gather/build/manage stats/evacuate) implemented for one disaster. |
| 2. Personalized Starting System | Not implemented | No accounts, geolocation, or region-based scenario selection. |
| 3. World Design (20+ biomes) | Not implemented | One procedurally generated foothill map. |
| 4. Graphics/4K Photorealism | Not implemented | Flat-color 2D canvas placeholder art. |
| 5. Player Gameplay (vehicles, exploration) | Partial | On-foot movement + gather/build/douse actions only. No vehicles, climbing, swimming. |
| 6. Survival Systems | Partial | Health, hunger, thirst, stamina, smoke implemented. No disease, bleeding, broken bones. |
| 7. Character Progression | Not implemented | No skill trees or leveling. |
| 8. Multiplayer | Not implemented | Single-player only. |
| 9. Advanced NPC AI | Not implemented | No NPCs. |
| 10. Animal System | Not implemented | No animals. |
| 11. Economy | Not implemented | No trading/economy. |
| 12. Vehicle System | Not implemented | No vehicles. |
| 13. Disaster Simulation Engine | Partial | One disaster (wildfire) with wind-driven cellular-automaton spread. No chained disasters, seasons, day/night. |
| 14. Base Building | Not implemented | Only single-tile firebreaks, no structures. |
| 15. Difficulty Modes | Not implemented | Single fixed difficulty. |
| 16. Long-Term Progression | Not implemented | No meta-progression across runs. |
| 17. VR | Not implemented | Desktop browser only. |
| 18. Monetization | Not applicable | Prototype, not a shipped product. |
| 19. Accessibility | Partial | Keyboard controls only; no colorblind mode, subtitles, or controller support yet. |
| 20. Ultimate Vision | Directional | This slice is a proof of concept for the core loop the larger vision would build on. |

## What growing this toward the full vision would actually require

Roughly, in order of leverage:

1. **Engine migration.** Canvas/vanilla-JS is fine for a single-screen
   tile prototype; a real open world needs Unreal/Unity (or a serious
   WebGL/WebGPU engine) for 3D rendering, physics, and asset pipelines.
2. **A second disaster type**, to prove the systems (stats, resource
   economy, evac-goal structure) generalize beyond wildfire — e.g.
   earthquake or flood — before building out 20+ biomes.
3. **A real backend** for accounts, region-based scenario selection,
   and eventually multiplayer state sync.
4. **Content pipeline & team**, for 3D art, animation, and audio at the
   fidelity the brief describes — this is the actual bottleneck for
   "AAA realism," not any single system's logic.

This roadmap exists so future work has an honest reference point: what's
real today, and what's aspirational.
