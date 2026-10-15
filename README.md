# Bogart Films

Jaymes Outlaw’s film and series library.

Live site: https://cydpixl.github.io/bogart/

Includes Buddy, Clown Panic, and The Traitors Season 5 episodes 1–5. Media streams from the public R2 library.
# October 15 streaming update

The uploaded Buddy, Clown Panic and The Traitors S5E1–E5 files retain their existing R2 URLs and native player. Other catalog titles use CineSrc or MoviesAPI. The settings switch **Enable advertisements**, applied with **Save and reload**, allows four additional sources and removes iframe popup restrictions. With ads disabled, only the two primary sources are offered in a sandbox; in-player ads may still appear.

The catalog includes search, provider filtering, sorting, pagination, title details, trailers, cast, recommendations and season/episode browsing. Native uploads take priority over external playback for matching titles and episodes. Lists and viewing progress stay in this browser.

The GitHub Pages base is `/bogart/`. For the Cloudflare Pages release, remove the HTML base tag and retain SPA redirects. `catalog-worker/` contains the metadata-only gateway; it reads the preserved Connections catalog across accounts and cannot route uploads or media mutations. No R2 files or existing account records are replaced.
