# Outlaw Movies

Jaymes Outlaw’s film and series library.

Live site: https://cydpixl.github.io/bogart/

Includes Buddy, Clown Panic, and The Traitors Season 5 episodes 1–5. Media streams from the public R2 library.
# October 15 streaming update

The uploaded Buddy, Clown Panic and The Traitors S5E1–E5 files retain their existing R2 URLs and native player. Other catalog titles use CineSrc or MoviesAPI. The settings switch **Enable advertisements**, applied with **Save and reload**, allows four additional sources and removes iframe popup restrictions. With ads disabled, only the two primary sources are offered in a sandbox; in-player ads may still appear.

The catalog includes search, provider filtering, sorting, pagination, title details, trailers, cast, recommendations and season/episode browsing. Native uploads take priority over external playback for matching titles and episodes. Lists and viewing progress stay in this browser.

The GitHub Pages base is `/bogart/`. For the Cloudflare Pages release, use an HTML base tag of `/` and retain SPA redirects. `catalog-worker/` contains the metadata-only gateway; it reads the preserved Connections catalog across accounts and cannot route uploads or media mutations. No R2 files or existing account records are replaced.

## Outlaw Movies release 2026.10.15.3

The existing URLs are unchanged. No account is required. Includes named browser-local lists with JSON import/export and share links; history editing; watched episode/season marks and episode ratings; appearance themes, episode grid/carousel, page/modal details, spoiler mode, reduced motion; native SRT/WebVTT subtitles with size/color/timing; speed, video adjustments and sleep timer menus; trailer Shorts; optional PeerJS two-device watch-party interface. Cross-device party playback requires an available signaling service and source playback API.

VidRift is intentionally unsandboxed and available only with advertisements enabled. A user observed the sandboxed provider become a white screen and request sandbox removal after initially playing.

Separate Outlaw account storage, public community lists/comments/votes, Trakt/Simkl OAuth and integrated person filmographies are not included in this release. Personal data is browser-local; export a backup to transfer it. Cast opens a biography link. External subtitles/audio/quality use the selected source's controls. No third-party controls are represented as working cross-origin APIs when unsupported.
