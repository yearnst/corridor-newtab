# Corridor · Art New Tab

<sub>v1.23.0</sub>

**English** · [简体中文](README.zh-CN.md)

Turns every new tab into a wall in an art museum. 106 public-domain masterpieces (93 on display by default), bilingual curatorial notes,
five display modes, works that change automatically or by hand, images fetched once and stored locally so it works offline, and a few more works added on its own every day.
Connect your own model and the interface and artwork information can switch to **any two languages in the world** — one native, one foreign.

---

## 1. Installation

### From the Chrome Web Store (recommended)

**[▸ Corridor · Art New Tab](https://chromewebstore.google.com/detail/mnllopjjkbkoeljonbgmlabijamcjlam)** — once it's installed, just open a new tab; from then on it updates itself.

### Loading in developer mode (for when you want to modify the source)

1. Open Chrome, type `chrome://extensions/` in the address bar and press Enter
2. Turn on **Developer mode** in the top right corner
3. Click **Load unpacked**
4. Select the `corridor-newtab/` folder (the level that contains `manifest.json`)
5. Open a new tab and you're done

> A new tab opens automatically on first install. If the new tab page doesn't change, check whether another extension is also taking over the new tab page.
> Edge / Brave / Arc and other Chromium-based browsers work the same way.

To uninstall or disable: go back to `chrome://extensions/` and switch it off or remove it; the local cache is cleared along with the extension.

---

## 2. Interface and controls

### Five display modes (the first button at the top right cycles through them, or press `M`)

| Mode | Description |
|---|---|
| **Gallery Wall** | Simulates a real gallery room: wall color and finish, spotlights from above, ten frames, matting with a linen liner or a mat, a shadow cast onto the wall, and a wall label at the bottom right. **The wall label always carries two lines of title**: on top, the name in the current interface language; below it, one size smaller, the original name in the other language — exactly how real museum labels do it. |
| **Circular Gallery** | A Cover-flow-style rotating 3D gallery: the center work faces you, and the works on either side turn away, darken and fall out of focus one after another. **By default it turns to the next work every 4.2 seconds** (adjustable); you can also **hold the mouse button and drag left or right** (with fling momentum; on release it snaps to the nearest work), or use `← →` or the scroll wheel. Click the center work to enlarge it. The whole queue is driven by a floating-point offset, and each step recycles only the card that drops off the outermost edge; the images of the other six are not reloaded, so scrolling doesn't flicker or jitter. |
| **Filmstrip** | **One focus image**: the frame at the very center lies perfectly flat, faces you squarely, and is the largest and brightest (the gate's flat top covers that one frame alone, and a pool of projector light lies on the film base at its foot). On either side runs **a smooth, long band that winds toward you and away again**: once out of the gate, the frames twist steadily back and outward over one long transition (2.1 frame heights) (approaching 46°), the two wings lift gently into a shallow valley, and the frames turn sideways, shrink, darken and blur one after another until, at both edges of the screen, they recede into the darkness of the projection booth — the angle changes gradually from frame to frame (≤16° between neighbors), and **about 8–9 works are visible in full on screen at once** (a frame is 26% of the window height, capped at 300px). The film base is a glossy black, and distant frames are given discrete blur levels by distance (0.5 / 0.9 / 1.3px). Five film stocks, adjustable pace (Step / Continuous). Drag to wind the film by hand, use `← →` or the scroll wheel to move frame by frame, and click the frame in the gate to enlarge it. |
| **Immersive** | The work fills the entire screen. Landscape-format works close to the screen's proportions fill it completely; portrait-format and ultra-wide works switch automatically to “Show whole work”, with a soft-focus enlargement of the same painting laid behind them. |
| **Masonry** | A whole wall of works drifts slowly upward in columns, each column at a slightly different speed to create depth; hovering over a work pauses it and brings up its details, and clicking takes you straight into Immersive. The scroll wheel lets you scroll by hand. |

**In any mode, the pointer turns into a magnifying glass over a painting, and one click shows you the detail** — Gallery Wall, Circular Gallery, Filmstrip and Immersive alike.
(Circular Gallery and Filmstrip set pointer capture for dragging, so the browser retargets the click event to the whole stage;
that is why clicks in these two modes are resolved by hit-testing coordinates, not by an onclick attached to each item.)

The frame setting carries over to the other modes as well — the frame you picked on the Gallery Wall is the one they hang with.

> **The Circular Gallery label** (v1.7 redesign): it no longer borrows the info card that floats in a corner in Immersive;
> instead, as in a real gallery, **the label sits directly beneath the current work** —
> a short hairline rule, movement and date, the title (with the title in the other language in italics below it), artist, collection, and finally a one-line curatorial note.
> The label's position is computed from the actual bottom edge of the current painting, so it moves up and down as portrait and landscape works alternate, always staying with the painting.
> Meanwhile the center work is **scaled up to 1.22×** and slightly brightened and saturated, lit from above, with a darker frame edge and a very fine warm inner ring;
> the works on either side recede further, progressively darkened, desaturated and blurred, with a fade at the far left and right — attention settles naturally on the one in the middle.
>
> **The label text follows the painting** (v1.7.1): it used to wait for the easing to settle before changing, and an exponential ease with tau=240 takes ~1.3 seconds to get within the threshold,
> so the painting had long since come to rest before the text finally showed up. Now it looks at **how far it still is from the nearest slot**: as soon as the painting moves, the text exits with it;
> past the halfway point the content is swapped at once (while it is still invisible), and as the painting slides through its last little stretch, the text rises back in line by line.
> (Also, that fade-out had never actually worked — `#carousel.lit .ccap` outweighed `.ccap.swap` in specificity, so the text was hard-cut.)

### Ten frames (lit and rendered offline, modeled on real mouldings)

The frames are not CSS borders. Each moulding starts as a height field built from a real profile — **outer lip → cove → bead → inner-edge moulding**,
with sharp breaks kept between the segments (the arrises of a real frame are crisp, not mushy) — then relief ornament is layered on and the normals are solved,
and it is lit with Lambert diffuse + Blinn-Phong specular + **ray-marched shadows** + ambient occlusion (the light comes from above and slightly to the left, matching the gallery spotlights).

The coloring distinguishes **water gilding from oil gilding**: the smooth top surfaces are burnished water gilding, with sharp, cool highlights; the carved areas are oil gilding, matte and warmer;
wear on the high points exposes the red **bole** underneath, ochre-brown antiquing settles in the recesses, and the surface has fine craquelure.
The result is output as a 9-slice texture and laid out with `border-image ... round`, which miters the four corners at 45° automatically.

| Style | Moulding and ornament | Default matting |
|---|---|---|
| **Laurel gilt** | Band of laurel leaves + berries at the outer edge, wide cove, beading at the inner edge | Linen liner |
| **Salon gold** | Dentils at the outer edge, a broad water-gilt cove, egg-and-dart at the inner edge | Linen liner |
| **Baroque gilt** | The widest; heavy acanthus scrolls, deeply antiqued | None (straight into the rabbet) |
| **Rococo blue** | Navy lacquered body + gilded shell ornament + corner flourishes | None |
| **Ebony & gold** | Black-lacquered stepped profile + gilded inner edge line | Mat |
| **Walnut** | S-profile moulding, with the grain running along the frame | Mat |
| **Limed oak** | White-rubbed oak, open pores | Mat |
| **Matte black** | Matte black box profile | Wide matting |
| **Thin gold** | Very slim, warm gold | Wide matting |
| **Float frame** | Dark tray frame, with a floating gap between it and the canvas | None |
| **Frameless** | Just the canvas and its shadow on the wall | None |

### The matting between picture and frame

This is what decides whether it looks “professional”. The rules come from real framing conventions:

- **Oil paintings in gilt frames get no mat** — the canvas drops straight into the rabbet, with at most a **linen liner** in between,
  that is, a narrow linen-covered flat with a gold line pressed along its inner edge. Laurel gilt and Salon gold do this by default.
- **Only works on paper get a mat** (mount) — a window cut in white mat board, with a 45° bevel that shows the white core.
  Matte black and Thin gold default to **wide matting**: the contemporary framing seen in the uploaded reference, “a small picture with a very wide white border”.
- The bevel of the mat window, the thin shadow the mat casts onto the picture, and the dark rim around the canvas itself are all rendered.

In settings, the matting style (“Mount”) can be set by hand to: Auto / Linen / Mount / Wide / None.

There is also a separate **“Mount width” slider** (0.40× – 2.00×) that widens or narrows the current matting style as a whole,
and the picture follows live as you drag. If you like the contemporary-museum way of hanging, “small picture, extremely wide white border”, push it above 1.6×.

### Wall color and finish

Ten gallery paint colors: Charcoal, Graphite, Dove gray, Warm gray, Plaster, Gallery white, Museum green, Burgundy, Prussian blue, Terracotta.

**Twenty-five wall finishes**, rebuilt in v1.5 to follow how real gallery walls are made.

First, how gallery walls are actually built in real life: a museum wall is usually **half-inch plywood backing + drywall** (the plywood is there so a nail will hold wherever you hang a picture);
after the joints are filled, **the whole surface gets a full skim coat** — the **Level 5** finish. Only a fully skimmed wall keeps its seams from showing under the raking light of grazing spotlights;
the topcoat is matte latex, repainted two or three times a year as exhibitions change, so the wall builds up a thin film of paint, along with patched nail holes and roller lap marks.
So a real “gallery wall” is not knock-down texture or decorative paint, but **a matte white that is nearly flat, yet still shows extremely fine undulations in raking light**.

Historic house museums follow another tradition: the galleries of the Isabella Stewart Gardner Museum are still hung with fabric today,
**damask is smooth and so reflects light, velvet absorbs it, and brocatelle's uneven surface scatters it** — three weaves tuning the light within the same room.
Twentieth-century modern museums favored **hessian-wrapped panels**. Digital and immersive galleries are another story again: acoustic felt, matte black boxes, LED walls, micro-perforated acoustic panels, projection screens.

Every finish is a relief rendered by solving normals from a height field and then lighting it, with strictly periodic band-limited noise generated via FFT so the seams stay invisible;
after rendering, the luminance is **normalized by standard deviation** to each finish's target contrast (Level-5 skim σ=0.009, Board-formed concrete σ=0.033) — subtle, without losing fidelity.

**v1.7 rebuilt the two groups “Gallery walls” and “Stone & hard finishes” from scratch**, because they looked blurry. It turned out to be three problems stacked on top of each other:

1. **The textures were 512px but displayed scaled up to 640–820px** — blurry from birth. These two groups now render at **1024px, and the display size is always smaller than that**, so they are always downsampled.
2. **The angle parameter for scratches was written but never used**, so the “cross-sanding marks” didn't cross at all, and the trowel strokes in Venetian plaster came out as a row of horizontal stripes.
   A directional filter in the frequency domain is now used instead, so the angle really takes effect, and it is still seamless.
3. **The band-limited noise cut the spectrum into a square**; the autocorrelation of a square spectrum is a sinc, which leaves faint diagonal ripples on the wall (most visible on Microcement). It now uses a smooth radial cutoff.

It also adds the things you only see up close: **air-bubble voids** and form-tie holes in the concrete, **vessel pores** and medullary rays in the wood, voids in the travertine clustered along its bedding,
**a different color for every brick** in the brick wall, and sedimentary color bands in the sandstone. Features like wood grain, brick color and concrete mottling — **variations in color itself, which lighting cannot produce** —
are layered in through a separate albedo channel.

The finest layer, the paint-film grain, **has been split out into a single shared texture** (`grain.webp`, 256px, always tiled at 128px):
pure noise has no landmarks, so a small repeating tile goes unnoticed, yet it gives every wall finish a fine 1–2px grain;
meanwhile the 14 structure textures no longer have to carry incompressible white noise, and their size dropped from ~3.5 MB to ~1.1 MB.
The swatches you pick a finish from have the same grain layered on, so what you see is what you get.

| Group | Finishes |
|---|---|
| **Gallery walls** | Level-5 skim (one full skim coat; only the faintest trowel undulations and sanding marks remain) · Matt rolled (roller orange peel + patched nail holes + lap marks) · Trowelled skim · Venetian · Marmorino (polished plaster) · Knock-down · Microcement · Diatom clay · Eggshell |
| **Fabric-lined** | Hessian · Linen · Silk · Velvet · **Damask** (ground and pattern in the same color; the image comes from satin weaves running in opposite warp and weft directions catching the light) · **Brocatelle** (the motifs stand out in relief; the uneven surface scatters light) |
| **Digital exhibition** | Acoustic felt · Black box · LED wall (fine-pitch pixel array) · Micro-perf · Projection screen |
| **Stone & hard finishes** | Board-formed concrete (formwork seams + form-tie holes + aggregate) · Wood panel · Travertine · Brick · Sandstone |

> On a dark wall the relative modulation of the overlay is 2·b·s, a completely different order of magnitude from a light wall:
> **the structure needs more contrast to be visible, while the grain has to be pushed down, or it turns into snow**.
> So on dark walls the texture is boosted in three tiers according to its own contrast (the flattest, Level-5 skim / Eggshell / Matt rolled, by 3.6×;
> knock-down, concrete, brick and sandstone, which have plenty of contrast to begin with, by only 2.0×), and the grain layer is reduced across the board to 42%.
> Only then does the weave show when Velvet hangs on Museum green or Damask on Burgundy.

When you choose a light wall, the interface automatically switches to dark icons and dark text.

### Clock

Two styles, and neither ever sits on top of the painting:

- **In bar**: `11:00 · Thu · August 20`, set in fine type at the right of the top bar; it takes no space from the painting in any mode.
- **Grand**: appears only in Immersive, a thin serif + a hairline divider; when it is on, “Show whole work” automatically leaves room at the top,
  and the painting moves down, so the two never overlap. Switching to Gallery Wall mode automatically downgrades it to the top-bar style.

Press `C` to cycle through the three states.

### Keyboard shortcuts

| Key | Action |
|---|---|
| `←` `→` | Previous / next work |
| `Space` | Pause / resume automatic rotation |
| `F` | Add to / remove from favorites |
| `X` | Remove this work (out of the rotation and no longer listed in the Library; can be undone within five seconds) |
| `Q` | Pause Gallery / back on show (instead of paintings, it shows the sites you visit often) |
| `Z` | View in detail (scroll to zoom, drag to pan, double-click to fit) |
| `I` | Artwork details (the full curatorial note, medium and dimensions, source and license). The panel has a language button at its top right: one click switches the whole page to the other language, and closing and reopening it brings back your native language |
| `L` | The Library (All / Favorites / History + filters and search) |
| `S` | Settings drawer |
| `C` | Switch clock style |
| `M` | Switch display mode |
| `D` | Download the current work |
| `Esc` | Close panel |

### Removing a work (the crossed-out eye at the bottom right, or press `X`)

The opposite of favoriting. Click it and this work **leaves the rotation and is no longer listed in the Library** —
Work-safe mode only “skips it during rotation” and the Library still lists everything; “Remove” is the only thing that makes a work disappear from the Library.

It is not deletion: all that is stored is a list, and not a single byte of the artwork data is touched.
**Settings → Storage → Removed** lists every removed work; you can “Put back” works one at a time, or “Put them all back”.

No confirmation dialog appears after you click; instead a bar lights up at the bottom, “Removed ‘XX’ · Undo”, and **you can change your mind within five seconds** —
so tidying up the collection in one go isn't interrupted by a string of confirmation dialogs, and a slip of the hand can still be undone.

### Pause Gallery: switching Corridor off for a while (the power button to the left of Settings, or press `Q`)

Press it and this page stops showing paintings and becomes a quiet landing spot instead, with the few sites you visit most;
press it again to go back on show. The state **syncs across tabs and stays off even after you restart the browser**, until you press it again.

> Why not “really switch the extension off”: Chrome's new-tab takeover is all or nothing;
> once an extension has taken over, it cannot step aside from within the page and give way to the original one. Really stepping aside would mean going to
> `chrome://extensions` and disabling the whole extension, which is hardly “temporary”.

**Three layouts** (Settings → Display → Pause Gallery):

| | What it looks like |
|---|---|
| **Wall of labels** (default) | The wall is still there and the lights are still on, but what hangs on it is labels, not paintings. They are staggered, and lift slightly when you point at one |
| **Closed notice** | The paintings are gone and the wall is bare; in the middle, “Paused” in large letters and a gold rule, with two columns of numbered entries below |
| **Index** | Like the index on the last page of an exhibition catalog: site name on the left, URL on the right, joined by a dotted leader |

- **Wall of labels comes in two skins**: **Plain** (the same cream paper as the artwork labels) and **Swatches**
  (the row of labels fans out from left to right like a color-swatch deck, coral red → amber → green → teal → blue → violet).
- **Closed notice and Index let you pick the background**: Follow settings / Light / Dark.
  These two don't hang on the gallery wall and lay down their own background, so light or dark is chosen separately; the background of Wall of labels is the wall itself.

**Where the sites come from — three sources, merged**:

- **Pinned by you** — add them by hand in settings, or just click the last card on the wall, “＋ Pin a site”,
  which opens a small form right there. Stored on this machine, no permissions needed, listed first.
- **Chrome's most-visited sites** — needs the `topSites` permission.
- **Tabs you have open** — needs the `tabs` permission. It reads the tabs in **all windows** of this profile,
  taking only titles and URLs; **several tabs on the same site fold into one entry**, with the count appended (`zhihu.com · 3`),
  and sites with more tabs open come first. With just one tab open, the entry points to that page itself; with several, it points to the site's home page.

The last two are **optional permissions**: nothing is requested and nothing pops up at install; permission is requested once, the first time you turn one on,
and can be revoked at any time in the same panel. It works even with neither granted, showing only your pinned sites.

Duplicates are removed by domain, with pinned sites taking priority. **“How many to show” trims only the automatic entries; your pinned sites always show**;
the two automatic sources take turns, so neither gets crowded out by the other.

**When most-visited sites and open tabs both have entries, the screen is split into three groups by source** (Pinned / Most visited / Open tabs),
each with a very light subheading. When only one source has entries it isn't split — a lone heading is more of an eyesore than no grouping at all.

#### Reordering and removing

- **Drag to reorder**: labels can be dragged to new positions. When grouped, they can only move within their own group; ungrouped, you can drag them anywhere on the wall.
  The order is saved on this machine, so it looks the same the next time you open it.
- **Remove one**: point at it and an × appears at the top right (on the right side in Closed notice and Index). The ones after it move up.
  Pinned sites are deleted straight from your list; automatic ones are recorded under “Removed sites”.
- **Remove several at once**: click “Tidy” below the wall. Each label gets a checkbox, and clicking a label ticks it
  (clicking a label won't take you away at this point); when you're done, click “Remove selected”. There's also “Select all / Select none”.
- **Close tabs while you're at it**: if what you ticked in Tidy includes open tabs, an extra “Close those tabs” button appears.
  The × only affects the wall; this one really closes the browser tabs. They are two separate buttons so you don't hit the wrong one.

#### When removed sites come back

**Removal is temporary.** The moment you remove a site, two numbers are recorded: its rank on Chrome's most-visited list,
and how many tabs were open on it at the time. If it later ranks higher, or more tabs are open on it, it evidently matters again, and it comes back on its own.
In Settings → Display → Pause → **Removed sites** you can also put sites back by hand, or all at once.

For a site you really never want to see again, click the × at the end of its row to move it into **Never again**. That list never comes back on its own,
and “Put all back” doesn't touch it; entries can only be unblocked in settings, one by one or all at once.

> **Two things it deliberately doesn't do.** No site icons: icons would take one more permission, or a third-party icon service
> — which would amount to reporting the sites you visit to someone else. **This screen sends no network requests at all.**
> No browsing history: all it reads is the list Chrome has already computed and the tabs open right now;
> it cannot see when you visited a site or how many times.

> **One gap**: `topSites` returns Chrome's own “most visited” list,
> which **does not include** the shortcuts you pinned by hand on the built-in new tab page — Chrome doesn't expose those through the API.
> If you want them to appear, add them again under “Pinned by you”.

Every entry is a real link, so middle-click, Cmd-click and right-click → “Open link in new tab” all work as usual.

### Filtering and search (in the Library)

- **Movement**: Tang & Five Dynasties, Song, Yuan, Ukiyo-e, Renaissance, Baroque, Dutch Golden Age, Rococo, Neoclassicism, Romanticism, Realism, Pre-Raphaelite, Impressionism, Post-Impressionism, Symbolism, Secession, Expressionism, Abstraction…
- **Country · Region** (a group of its own since v1.4): France, United Kingdom, United States, Netherlands, Italy, China, Spain, Germany, Austria, Japan, Russia, Belgium, Vatican City, Poland, Norway, Puerto Rico, Sweden, Switzerland — sorted by number of works, each followed by its count
- **Region**: Europe / East Asia / Americas
- **Subject**: Portrait, Landscape, Night, Sea, Still life, Myth, Religion, War, Dance…
- **By color**: filter directly by a work's dominant color (Red / Gold / Yellow / Green / Teal / Blue / Purple / Pink / Neutral)
- **Search box**: title, artist, museum, date — in Chinese or English

### Palette

The color strip at the bottom left of each work holds six dominant colors extracted from the painting itself (sorted by how much of the area they cover).
Click any swatch to copy its hex value — handy for putting color schemes together.

---

### The wall label flips over

In Gallery Wall mode, the wall label at the bottom right **sizes its width to its content** — longer ones naturally come out wider, shorter ones narrower,
and for ordinary works every line fits; only a really long title of sixty-plus characters wraps.
In the layout, the label occupies a slot of **constant width**; it stays anchored to the left edge of that slot and grows or shrinks to the right with its content,
so when the work changes or the language flips, **the painting to its left doesn't move at all**, and the left end of the label always keeps the same distance from the frame.

**Click the wall label and it flips like a flash card to the other language** (a half turn about the vertical axis, with the content swapped the instant it is edge-on) —
the front is your **native language** and the back your **foreign language**, with title, artist, medium and museum all flipping together. Click again to flip it back.
A flipped label has a small dot in its top right corner, so you can tell.

By default the two sides are Chinese and English. Once you switch to other languages (see section 5b, “Speak your language”),
the label becomes a **language flash card** — with Chinese as the native language and French as the foreign one, “星月夜” (*The Starry Night*) on the front and *La Nuit étoilée* on the back.
If a work hasn't been translated into the foreign language yet, the back falls back to English, so the two sides are never identical.

---
## 3. Settings

The settings drawer has **five tabs**: Display / Room / Rotation / Sources / Storage. Each tab is made up of several **groups**;
**click a group heading to collapse it**; the current value is shown to the right of the heading (so you know what it's set to even when collapsed),
and in groups that are switched on and off as a whole (daily additions, custom library, AI enrichment) the master switch sits right on the heading row.
On the right of the title bar is a row of **sun / moon · This mode / All · Reset · Close** — four controls with the same height, corner radius and font size.
“This mode” (the default) lists only the settings the current presentation mode can use — in Gallery Wall mode you won't see the film stock and transport settings,
and in Filmstrip mode you won't see frames and matting; choose “All” and everything is listed. The choice is remembered.
The sun / moon switches the settings panel to a light theme.
It switches only the panel — the picture, the frame and the wall color are never touched, because they are the gallery room, not the interface.
At the top is a **search box**: type any keyword and all five tabs are spread out together and filtered,
with each result marked with the tab it comes from — you no longer need to remember which tab a setting is on.
You can search in Chinese or English, and it also recognizes English words such as `api`, `cache` and `frame` (this works in the Chinese interface too).

**Display** Presentation mode (one of five) · Framing: Smart / Fill screen / Show whole work ·
**Language** (native · foreign · which one the interface follows; once an endpoint has tested OK you can pick from 78 languages, plus translation of the artwork info and the interface text) ·
Clock (Off / In bar / Grand) · Slow drift (Ken Burns) · Pan handscrolls horizontally ·
**Hide interface when idle** (nine separate items; whichever you check fades out: Toolbars / Clock / Counter /
Title / Artist / Date & medium / Museum / Highlight / Palette; check all four artwork items and the whole wall label card is put away too) ·
**Film stock** (Color positive / Color negative / Black & white / Slide mounts / Cine 35mm) · Edge print & frame numbers · Transport

**Room** Frame (11 kinds) · Mount (the matting style, 5 kinds) · Mount width slider ·
**Wall color (15, in three groups, plus Custom)** · **Fine tune (Saturation, Temperature)** ·
**Wall texture (31 finishes in five groups: Gallery walls / Fabric-lined / Digital exhibition / Stone & hard finishes / Metal panels)** ·
**Lighting (Lamps 0–4, Brightness, Angle, Warmth)** · Film stock (5 kinds)

**Sources** Daily additions · Custom library · **AI enrichment** (see section 5a)

**Storage** Offline cache · Export as image files · Where the cache lives · Chrome footer · About

**Rotation** **New work on every new tab (a switch of its own)** ·
Timed rotation: Manual only / 1, 5, 15 minutes / **25 minutes (Pomodoro)** / 1, 6 hours / daily (**timed rotation applies only to Gallery Wall and Immersive**) ·
**Circular Gallery pace** and **Film transport** (Off / 3, 5, 10, 15, 30 seconds / 1, 3, 5, 10, 30 minutes / Custom; the Circular Gallery defaults to 15 seconds, the Filmstrip to **3 seconds**) ·
Order: Shuffled / Chronological · Show from: Whole collection / Favorites only / Current filters ·
**Work-safe mode** (the 13 works containing nudity are left out of the rotation, but can still be opened individually in the Library) · Image quality

> “New work on every new tab” and “Timed rotation” are two independent rules and can both be on at once:
> opening a new tab switches to another work immediately, and while the page sits untouched the timer keeps rotating.
> Masonry and Circular Gallery have continuous motion of their own and don't use the timer.

**Image quality** Auto (by screen resolution) / Data saver 1280 / High 1920 / Maximum 3840

> Settings open in a **drawer that slides in from the right**: the picture narrows to the left instead of being covered, so a change of frame or wall color shows right away.
> In the drawer, **hovering over a frame or wall color tries it on**; move away and it reverts, and only a click saves. Press `S` to open and close it.
> Every tab uses the same layout: group heading (collapsible, current value shown on the right) → title + description → control,
> with switches laid out as right-aligned single rows of equal width.
> When you change a setting, the drawer **stays where it is** instead of jumping back to the top; only switching tabs takes you back to the top.

**Offline cache** See how many works are cached and how much space they take, cache every work in one click, clear the cache, set the cache limit (200 MB – 2 GB, default 400 MB),
**Export as image files**, **Open folder**, and see the cache's actual path on disk, with one-click copy

> You can also change the main settings under `chrome://extensions/` → Corridor → **Extension options**.

### Default settings

Out of the box you get a fully arranged gallery room — complete without changing a single setting. **Reset** at the top right of the settings drawer brings this setup back at any time.

| | |
|---|---|
| Presentation mode | Gallery Wall |
| Interface language | Follows the browser: Chinese for a Chinese browser, English for any other |
| Clock | In bar |
| Hide interface when idle | On |
| Frame | Ebony & gold |
| Mount (matting style) | Mount (a card mat) |
| Mount width | 0.90× |
| Wall color | Terracotta |
| Wall texture | Velvet |
| New work on every new tab | On |
| Timed rotation | 25 minutes (Pomodoro) |
| Work-safe mode | On |
| Show from | Whole collection |
| Daily additions | On (3 a day) |
| Settings panel theme | Dark |
| Settings shown | This mode |
| AI enrichment | Off |
| Cache limit | 400 MB |

> **The language follows your browser on a new install**: a browser set to Chinese gets a Chinese interface with English as the second language;
> any other browser gets English, with Chinese as the second language. To change it: Settings → Display → Language · Clock.
> **Reset** puts everything else back but leaves your languages as they are.

---

## 4. The collection and daily additions

**106 hand-picked works** are built in, and **93** are shown by default — **Work-safe mode is on by default**, and it keeps the 13 works that contain nudity out of the rotation
(`106 − 13 = 93`). Those 13 can still be seen and opened in the Library; they just won't come up on your screen by themselves.
To bring them all into the rotation, turn off “Settings → Rotation → Work-safe (hide works with nudity)”.

Since v1.5 the Library also **grows on its own**:

- Once a day, the extension goes to curated Wikimedia Commons categories (Featured pictures, Quality images, the painting categories of major museums, categories of major artists)
  and picks **3 more** public-domain works to add; it keeps at most 150 and deletes the oldest when full.
- The crawl **walks the category tree breadth-first**, keeps a local note of where it got to, and carries on from there the next day — so every day you see a new stretch:
  today it reaches Hokusai, tomorrow it may be on to Morisot or Friedrich.
- It only reads Commons' public API, needs no account and uploads nothing. Once a work is fetched, its dominant-color palette and placeholder are computed locally,
  and it is presented the same way as the built-in works.
- What gets filtered out: anything not in the public domain, less than 1400px wide or too extreme in aspect ratio; details and technical shots with words like detail / verso / x-ray in the file name;
  on-site photos taken by Wikimedia users themselves (Credit: Own work); and news agency photos.
- These works have **a page of their own in the Library, “Daily additions”**, and their cards note that the metadata comes from Commons and that there is no curatorial note written by this project —
  only the 106 built-in works have a note written for each one.
- **The way in is on the top bar**: a portfolio icon; when there are new works you haven't seen, a gold ring around it quietly breathes and a small dot appears. Click it to open “Today's Selection” —
  a few pictures, as if just drawn from the portfolio, land on the table one after another with a slight random tilt and a shadow. Click any one to go straight to the Gallery Wall and see it large.
- **You can choose the portfolio's background color**: Settings → Sources → Daily additions → Today's Selection background. Three options: Follow the wall, Dark, or Pick one.
  “Pick one” uses the same swatches as the wall, or you can type in a hex code. If you pick a light color, the heading and captions automatically turn dark.
- **How both Chinese and English are covered**: Commons' structured data records “which artwork this image represents” (P6243) and the creator (P170);
  following those to Wikidata yields Chinese and English labels. **Artist names nearly always come with a Chinese form** (e.g. Katsushika Hokusai → 葛饰北斋, his name in Chinese),
  and the same goes for museums and media; titles depend on whether Wikidata has a Chinese name — if not, the original is kept and the details say so.
  One update sends only three read-only requests.
- **Once there are 150**: **anything you've favorited always stays**; the rest leave in the order they were added, oldest first, to make room for new arrivals.
  So to keep a particular work for good, just favorite it.
- Don't want it? Turn it off: Settings → Sources → Daily additions. Next to it are “Fetch now” and “Clear daily additions”.

---

## 5. Your own library (hang your own pictures)

Settings → Sources → **Custom library**. You can add **several sources**, of two kinds:

| | |
|---|---|
| **+ Folder** | A folder on this computer. It uses the browser's File System Access API; the directory handle is stored locally and reused directly the next time you open a new tab. Chrome occasionally asks you to confirm read access again, and the card tells you when. **The images always stay on your own disk** — the extension doesn't copy them, upload them or put them in the cache; it reads each one only at the moment it's displayed. |
| **+ URL** | An online gallery. A directory index page, an ordinary gallery page, a JSON list, a plain-text file with one URL per line, or simply a single image — it accepts them all. The first scan asks you for access to that domain; the images it fetches go through the normal cache, so you can still see them offline. |

One card per source: the icon shows folder or URL, and on the right it says how many images it holds. **Click a card's title to expand it**;
inside are that source's own filters and “Rescan / Pick another folder / Delete”. Sources don't interfere with one another —
rescan one and not a single image in the others is touched; delete one and only the works under it go with it.

### Filters: import only the ones you want

Each source has its own set:

| | |
|---|---|
| **Include** | Keeps what matches. `*.jpg`, `IMG_?`, or simply `cat` |
| **Exclude** | Drops what matches. `thumb`, `*_preview.*` |
| **regex** | When on, patterns are read as regular expressions (`^IMG_\d{4}$`); when off, `*` and `?` are wildcards, and a pattern with neither is read as “the file name contains these characters” |
| **Formats** | jpg / jpeg / png / webp / avif / gif / bmp, each checked individually |
| **Min. side** | Keeps out icons and thumbnails. Default 200px, or “any” for no limit |

A few places where it's deliberately lenient:

- A pattern is compared against both **the file name with its extension** and **the name without it** —
  someone writing `*.png` has the former in mind, someone writing `^IMG_\d{4}$` the latter, and both work.
- If a pattern **contains a forward slash**, it's compared against the whole relative path instead, so `2024/` means “only the 2024 subfolder”.
  (Backslashes don't count — regexes are full of `\d` and `\.`.)
- **A broken regex doesn't crash anything**; the card shows exactly which pattern is wrong and where.

Everything else is as before: up to 800 images per source, including four levels of subfolders, skipping hidden folders and thumbnail folders;
**the file name becomes the title** (numbering prefixes like `01_` are removed automatically), **the parent folder's name becomes the artist**
(for a URL source, the source's name is used); aspect ratio, dominant-color palette and placeholder are all computed locally,
and the images are presented the same way as the built-in works (palette, filters and favorites all work).
“Show from” gains two options: **My library** and **Daily additions**.

---

## 5a. AI enrichment (optional, off by default)

The entries that “Daily additions” fetches from Commons mostly have an empty movement, medium, dimensions and curatorial note;
the “Custom library” has it even worse — the title is just the file name, the artist just the parent folder's name, and a name like `IMG_2043`
doesn't look good hanging on the Gallery Wall. This version lets you **connect your own multimodal model**, have it take a look at each image and fill in those fields.

**Settings → Sources → AI enrichment**, then fill in four things: API format, Endpoint, API key, Model.

| | |
|---|---|
| API format | **Auto** / OpenAI / Anthropic. If the address contains `anthropic` or `/messages`, it's treated as Anthropic; anything else as OpenAI |
| Endpoint | Going as far as `/v1` is enough, or you can paste in the full address. For a local model, e.g. `http://localhost:11434/v1` (Ollama) or `http://localhost:1234/v1` (LM Studio) |
| API key | Sent as `Authorization: Bearer` in OpenAI format and as `x-api-key` in Anthropic format. Masked by default; click “Show” to see it in plain text |
| Model | Must be a model that **can see images** |

**One endpoint can also hold several keys and several models.** Put a different value into the key or model box,
and the old one isn't lost — it becomes one of a row of small chips underneath; click a chip to switch back, click the × on it to forget it.
On a chip, a key shows only its first and last few characters (`sk-abc…7f2e`). Each endpoint keeps its own, up to 8 of each.
When you have several keys with different quotas, or want to switch back and forth between a cheap model and a good one, there's no more copying and pasting.

**You can save several endpoint profiles and switch at any time.** The dropdown at the very top lists the saved endpoints; choose “＋ New endpoint” to add another.
Each one has its own name (left blank, the domain is used as the name), format, address, key and model, with “Duplicate” and “Delete” beside it.
If you want a local Ollama during the day and a cloud model at night, or you rotate among several providers, just switch the dropdown —
no more pasting addresses and keys back and forth. Up to 16 can be saved.

When you're done, click **Test connection**. It checks in **two steps**:

1. **Text only first** — it sends one line: “Translate ‘你好’ into English” (你好 is Chinese for “hello”). This step checks that the address, key and model name are right.
2. **Then an image** — it draws a “red circle on white” on the spot, sends it and asks what the model sees. This step checks whether this model can read images.

There's a reason to ask separately: **image enrichment** needs a multimodal model, while **multilingual artwork info** only uses text.
Pass the first step and the whole multilingual block is unlocked; fail the second and it only means the image route is closed —
the status line says it plainly: “Endpoint reachable · text works · multilingual unlocked · but this model cannot see images”.

**Whichever step fails, you get a diagnosis card.** Instead of throwing the endpoint's raw `HTTP 400 · {"error":{"code":"1210"…` at you,
it first works out which of a dozen or so common problems this is, then gives a few suggestions you can simply follow:

| What it recognizes | What it suggests |
|---|---|
| The model doesn't accept images | Explains that image enrichment needs a multimodal model (the name often contains v / vl / vision), lists a few vision-capable models for your provider — **one click puts it into the model box** — and mentions that this doesn't block the multilingual route |
| Unknown model name | Check the spelling, case and prefix (some providers want `vendor/model`); if you've saved other models on this endpoint, it points you to the chips below to switch |
| Key rejected | Copy it again without stray spaces or line breaks; the key must come from the same provider as the address; if the address looks like Anthropic but the OpenAI format is selected, it points that out too |
| No endpoint at that address | Going as far as `/v1` is enough; it also shows **the full address actually requested this time** |
| Can't connect | Click “Allow” first; the address has to allow direct connections from the browser (CORS); a local model needs `OLLAMA_ORIGINS=chrome-extension://*`; `http://` may be blocked as mixed content |
| Rate limit / balance / context too long / content moderation / 5xx | Each gets its own next step: adjust concurrency, check the balance, pack fewer works per request, turn on retries… |

Providers are recognized by address: Zhipu, OpenAI, Anthropic, Tongyi (Qwen), Doubao, Kimi, SiliconFlow, MiniMax,
StepFun, Gemini, OpenRouter, Mistral, Groq, xAI, DeepSeek, and local models on `localhost`.
When it recognizes one, it offers that provider's models **worth trying first**; when it doesn't, it gives general advice.

> **These are candidates, not verdicts.** Which providers have multimodal models, and which models can read images, keeps changing
> — DeepSeek is one example: for a while it had none, then it did. So Corridor never hard-codes “this provider can't”;
> every “can read images” in the interface has to be established by **actually sending a request**. That's what the button below is for.

### Local models (Ollama / LM Studio): that 403 is not a key problem

Enter `http://localhost:11434/v1` as the address, click “Test connection”, and back comes
**`HTTP 403 · unknown error`** — the most common wall people hit with local models, and one that gives no clue why.

**The real cause**: Ollama (and likewise LM Studio and llama.cpp) checks the request's origin (`Origin`) **on the server side**,
and by default accepts only a few “local web page” origins, while the browser stamps every request sent by an **extension** with
`chrome-extension://…`. That's not on the allowlist, so the whole request is refused with a **403 and an empty response body**
— and because the body is empty, all the interface has left to show is “unknown error”.

It has nothing to do with the key or with model permissions. (Incidentally, local models usually don't check the key, so you can leave that field empty.)

**What Corridor does about it**: once you've clicked “Allow”, Corridor rewrites the origin of requests sent to **local addresses**
(`localhost` / `127.x` / `0.0.0.0` / `::1` / `*.local`) to that address itself,
so the local server treats them as its own. In most cases that alone gets it working.
The origin of requests to public endpoints is left completely untouched, and the rule applies only to requests Corridor itself sends.

**If it's still 403**, let the extension in on the Ollama side directly — the diagnosis card gives you the command for your system, ready to copy with one click:

```
macOS     launchctl setenv OLLAMA_ORIGINS "chrome-extension://*"
Windows   setx OLLAMA_ORIGINS "chrome-extension://*"
Linux     OLLAMA_ORIGINS='chrome-extension://*' ollama serve
```

Then restart Ollama. LM Studio doesn't need any of this: just turn on CORS in its Server settings;
start llama.cpp with `--cors`.

> If the address is written as `0.0.0.0` or `::1`, change it to `127.0.0.1` and try again — local servers themselves
> often don't accept those two forms. Also, “Probe models” works regardless (it's a simple GET, and the browser attaches no origin),
> so you can end up in the seemingly contradictory situation of “I can see the model list, but can't connect”.

### Probe models: the test decides which ones can read images

Next to **Test connection** is **Probe models**. Click it and it does three things:

1. `GET {endpoint}/models` — asks the endpoint itself which models it has. If that list can't be fetched, it falls back to “the ones you've saved + the ones worth trying first for this provider”.
2. Puts them in order: models with v / vl / vision in the name are probed first (this affects only the order, not the result);
   embedding, reranking, speech and image-generation models, which aren't chat models at all, are skipped outright so no requests are wasted.
3. Runs each one **for real, twice**: one line of plain text, one small 96×64 image.

The result is a color-coded list:

| | |
|---|---|
| 🟢 Green | Passes both text and vision — this one can be used for enrichment |
| 🟡 Amber | Only text passes — good enough for translation, not for image enrichment |
| 🔴 Red | Doesn't even pass the text test; the endpoint's own words follow |

**Click a row to make it the current model.** The list is stored under this profile and is still there the next time you open it.
At most 14 models are probed per run; you can stop partway through.

Two small touches: a model that fails even the text check is **not** sent an image for nothing;
and a 400 of the “this model doesn't accept images” kind no longer triggers a second try with `response_format` stripped off
— that retry is bound to fail the same way, and skipping it saves half the requests.

### Text and vision can be configured separately

Translation only needs text; enrichment needs to see the image. The two jobs can **each use their own endpoint and model**:

Under **Settings → Sources → Text & vision** there's a switch. Off = both jobs share the current profile (the default);
on = you get two dropdowns:

| | |
|---|---|
| Text | Translating artwork info and the interface language pack |
| Vision | Looking at images to enrich daily additions and the custom library |

A cheap small model for translation, with the expensive multimodal one stirring only when images need enriching, is a natural division of labor;
so is local Ollama for translation and a cloud model for vision. Next to each dropdown hangs a small
**measured / not measured yet** tag — so you can see at a glance whether this profile really works for this job.

**Test results are recorded per profile.** Change the address and the profile's whole record of passed tests is voided; change only the model,
and only the “vision” result is voided (passing the text check has little to do with the particular model, so that one is kept).
Whether “multilingual” is unlocked depends on whether **the text profile** has tested OK — the vision profile has nothing to do with it.

> The example in the screenshot: the address entered is `https://open.bigmodel.cn/api/coding/paas/v4`.
> Besides saying “This model can talk, but it cannot see images”, the diagnosis card adds one more line:
> **`/api/coding/` is the coding-only endpoint; for images, change it to `https://open.bigmodel.cn/api/paas/v4`**.

**Three ways to trigger it**

- **Manual**: click “Run now”; a progress bar and a per-image list appear below the button. Click again to stop.
- **Automatic**: new works are enriched as soon as they arrive. Daily additions are enriched right after they're fetched; the custom library right after a folder is scanned,
  and whatever isn't finished continues the next time you open a new tab.
- **Scheduled**: Off / Hourly / Every 6 hours / Every 12 hours / Daily / Every 3 days / **Custom** (minutes · hours · days, at least 15 minutes). The schedule is for **sweeping up whatever slipped through** —
  daily additions are handled by the background service and run whether or not a tab is open; custom library images can only be read from inside the page
  (the directory handle can't be passed to the background), so that part waits until you next open a new tab.

**What it fills in**

Two sets of prompts, run separately:

- **Daily additions** are cataloged as famous paintings: Chinese title, medium, movement, region, subject, highlight,
  and a curatorial note of 120–200 Chinese characters. What's already known — the original English title, the museum and so on — is **left alone**; only empty fields are filled.
- The **custom library** is treated as **ordinary images** — the very first line of the prompt is “It may be a photo, a screenshot, an illustration,
  a design draft or a scan, or it may be a painting; look carefully at what it actually is first, and don't assume it's a famous painting.”
  The title is required to “say plainly, in one phrase, what is in the picture, eight to sixteen characters, like the name you'd give a photo in an album”,
  and the artist field is **filled only if the picture actually has a signature, watermark or inscription**; otherwise it's better left empty.

**A few rules of restraint** (these decide whether enrichment is any use)

- **The vocabularies are closed.** Movement can only be one of the 21 built in, region one of 7, subject one from the vocabulary
  — labels the model makes up are thrown away. That way the filter panel doesn't sprout a crop of wild tags.
  The custom library gets an extra set of everyday subjects (Architecture / Food / Plants / Sky / Mountains / Forest / Vehicles / Objects /
  Pattern / Typography / Sport / Fashion / Cosmos / Machines); the built-in collection doesn't use them, and they appear only when recognized.
- **By default only empty fields are filled**; whatever is already there is left alone. To overwrite, you have to turn on “Overwrite existing fields” yourself.
- **Titles** has three settings: **Machine names** (the default) only touches `IMG_2043`, `DSC00123`,
  `Screenshot 2024-01-01 at 12.30.45`, `微信图片_20240101` (a WeChat image), `截屏2024-01-01 下午3.20` (a screenshot on a Chinese system)
  and other “prefix + string of digits” names; titles with real content, such as `Photo of a cat` or `奶奶家的院子` (“Grandma's courtyard”), are left alone.
  The other two settings are “Always” (always rewrite) and “Never” (leave titles alone).
- **Artist**: in the custom library the “artist” is really the parent folder's name. Obviously meaningless ones like `Downloads`, `新建文件夹` (Windows' “New folder”) or
  `截图` (“Screenshots”) are cleared; meaningful ones like `2019 京都` (“2019 Kyoto”) are kept.
- **The Work-safe flag only moves in the safe direction**: if the model says “this one isn't suitable for the office”, it gets flagged;
  if it says “suitable”, that won't clear a flag that's already set.
- **Retry on failure**: No retry / 1× / 2× / 3× / Until it works / Custom (max 20).
  Only failures **worth another try** are retried — rate limiting (429), server hiccups (5xx), a brief network drop,
  the model not answering in JSON this time; a wrong key (401), a wrong address (404) or a rejected request (400/422)
  gets not a single extra try — a hundred attempts would end the same way. The wait grows each time (from 0.6 s, ×1.8, capped at 20 s);
  “Until it works” goes at most 30 rounds, and you can press “Stop” at any time.
- **Retrying a single image**: every row in the enrichment list has a ↻ on its right that redoes just that image.
  It's always shown on failed rows; on successful rows it appears when you hover (handy if a result came out wrong and you want to redo it).
  When the retry is done, the row is replaced in place and the saved log is updated to match.
- Enriched items get a mark so you don't pay for them twice. To start over, click “Clear enrichment marks” (fields already written won't revert).
- An image that can't be read (say, because the system took back the folder permission) **doesn't count as enriched** and will be tried again next time;
  in that case the endpoint isn't even called.

**You can see what's being enriched**

While enrichment runs, there's a progress bar below the button with a per-image list under it that grows as it goes:

```
● Stone steps after the rain       10 fields
  IMG_2043
● The Truman Show movie poster      8 fields
  IMG_2044
● Along the River …
  Couldn't read the image · HTTP 404
```

In each entry, the first line is the name after enrichment and the second the original name (not shown if it wasn't renamed); on the right is how many fields were filled in for that image;
hover to see exactly which fields, and how many tries it took. The ↻ at the far right redoes just that image. A failed entry has a red dot, and its second line states the reason
(URLs are stripped out, leaving the part that's actually useful).

The list doesn't disappear when the run ends — close settings and open them again and it's still there; the latest 200 entries are kept locally. When you're done with it, click “Clear this log”.
Scheduled background runs are recorded in the same list, so the next time you open settings you can see what was enriched overnight.

**The prompts are out in the open**

Settings → Sources → AI enrichment → **Prompts** (click the heading to expand): three boxes, holding exactly the text that gets sent:

| | |
|---|---|
| System prompt | The few hard rules both sets share |
| Artwork prompt | Used for daily additions |
| General image prompt | Used for the custom library |

Anything in curly braces in the boxes is a **placeholder**, replaced with the real thing before sending:

`{title}` `{artist}` `{year}` `{museum}` `{file}` `{folder}` `{dims}` — known clues
`{shape}` — the JSON skeleton the model should output
`{vocab}` — vocabulary constraints (movement / region / subject / format / Work-safe / confidence)
`{movements}` `{regions}` `{tags}` — the individual vocabularies
`{noteLen}` — the required length of the note, which follows the “Write the note” switch

A mistyped placeholder **stays in the text as it is**, so you can see at a glance that it didn't take effect.
Click “Preview” to see **the complete content that would really be sent at this moment** — the clues come from the first work in your library waiting to be enriched,
not a made-up sample; next to it is “Copy”, so you can paste it elsewhere to fine-tune it.

An edited prompt gets an “edited” badge in its top right corner; click “Reset” to go back to the built-in text.
The box always shows **the version actually in use**: if you haven't edited it, that's the built-in original, and if you edit it back to exactly the original, it's treated as unedited
— so when the built-in text is updated later, you'll still get the update.

> Breaking a prompt can't cause a safety problem: **vocabulary filtering is done in code**, so whatever labels the model returns have to pass an allowlist first,
> and nothing you write in a prompt can pollute the filter panel. But delete `{shape}` and the model no longer knows what structure to reply with.
>
> All three prompts are written in Chinese and ask the model for both a Chinese and an English version of the results, so they work just as well with the English interface;
> if you'd rather use English prompts, just rewrite them in the boxes.

**Cost and safeguards**

- What gets sent is **a JPEG scaled down to within 1024px**, not the original.
- Images per run can be 5 / 10 / 20 / 50 / 100 / 200 or **custom** (1–2000), default 20;
  concurrency can be 1–4 or custom (max 8), default 2, with 250 ms between requests.
- The page and the background each have their own runner, and they stay out of each other's way through a **lease** held in storage, so the same batch of images is never enriched twice.
- Some compatible endpoints don't accept `response_format` or `temperature`; when a 400 bounces back, the request is **automatically resent once without them**.
- Models like to wrap the JSON in a code block and add a sentence before or after; all of that is stripped off before parsing.

> **Leave the endpoint address empty and the whole feature is off**: both libraries keep their original rules exactly, and not a single request is sent.

---
## 5b. Speak your language (multilingual, needs an endpoint)

Corridor has only Chinese and English built in. But art shouldn't be open only to people who speak those two languages —
so since v1.15.0, Corridor works with just **two language slots**: one **native** language and one **foreign** language.
Which two they are is up to you: pick from **78 languages**, and if yours isn't there, type in a name yourself.

**Settings → Display → Language · Clock**

| | |
|---|---|
| Your language | Your native language, the one you speak. The interface follows it by default |
| Second language | The foreign language — the other side. It's what you see when you flip a wall label over |
| Interface in | Yours / Second / Follow system (uses whichever of the two is closer to the system language) |

Chinese and English **can be chosen at any time**, with no endpoint needed. To switch to a third language,
you first need **the profile used for text** to pass its test under “Sources → AI enrichment” (passing the text step is enough;
whether the vision step passes makes no difference) —
because the interface text and the artwork information both have to be translated on the spot. Until that test passes, the drop-downs offer only Chinese and English,
with a line of explanation below them and a “Set up the endpoint” button that takes you straight there.

**Two things get translated**

- **Artwork information** — title, artist, medium, museum, location, highlight, the curatorial note,
  plus the qualifiers in dates and life spans such as “c. / century / after”.
  You can set **Which works** (Everything / Built-in collection / Daily additions / Custom library) and **Works per run**,
  as well as **Works per request** (packing more into one request costs less; packing fewer is more reliable).
  While it translates, there's a progress bar and an item-by-item list, the same look as for AI enrichment.
- **Interface text** — the settings panel, button tooltips, and the whole filter vocabulary for movement / region / subject / color family / wall color / wall finish / frame:
  **580 strings** in all. They're sent in batches and **translated only once**, then kept on this machine,
  so switching back and forth never means translating them again.

**A few rules that keep it from going off the rails**

- **The source text is chosen deliberately**: for Chinese, Japanese and Korean targets the translation starts from the Chinese original; everything else goes from the English version —
  the English text was written for the whole world in the first place, and it loses the least on the way into Latin-script languages.
- **Placeholders stay untouched**: the model is explicitly told to keep things like `{n}` `{a}` `<em>` exactly as they are, though they may move to fit the word order.
- **Proper names are not translated**: OpenAI, Ollama, LM Studio, CORS, JSON, `chrome-extension` and the like stay as they are.
- **Only recognized fields are accepted**, and their length is capped — if the model throws in a little essay while it's at it, the essay still doesn't make it into storage.
- **Fallback chain**: current language → the other side → English → Chinese. Wherever a slot has no translation, it drops one step down the chain —
  **never a blank gap**, and never an internal key name showing through.
- **Right-to-left languages** (Arabic, Hebrew, Persian, Urdu) flip the writing direction of the whole page.

**Where the translations are stored** — in a separate “overlay” layer that leaves the original data alone. The built-in collection is read-only static JSON,
and the daily additions and the custom library shouldn't be bloated with translations either; switching languages never touches the original data, and clearing the translations out is a one-step job
(“Clear translations” wipes both the artwork translations and the interface language packs for the two languages in one go).

**New works are picked up on their own** — with “Translate the artwork texts too” switched on, every time you open a new tab,
once enrichment has finished it also translates a small batch (at most 12 works per round), so you don't have to remember to come back and click.

---

## 6. How offline works

After a work's image is shown for the first time, it is stored in the browser's local IndexedDB; the next time you open a new tab it is read locally,
with no network request. Every three hours the background quietly prefetches a few works that aren't cached yet, and each time the picture changes it prefetches the next three.
**What happens when the cache is full**: every time writes add up to 12 MB, usage is checked; when it is over the limit, the cache is cleaned out “**least recently seen goes first**”,
until it is down to 90% of the limit (leaving some headroom, so it doesn't fill up again right after a cleanup). **Works you've favorited are the last to be touched**.
Only the local copy is deleted; it is fetched again the next time it's shown, and your settings, favorites and history are unaffected.

Images and the index are kept in two separate stores: `images` holds only the images, `meta` holds only `{size, last used time, work id}`.
Measuring usage and running eviction both read only `meta`, so hundreds of megabytes of images never get loaded into memory whole just to “work out how much is used” —
and a cache hit only updates the timestamp in meta instead of writing the whole image back.

When you're offline, cached works still display normally; if a work has never been cached at all, it falls back to a tiny built-in placeholder (about 0.5 KB each, bundled with the extension).

To stock up on everything at once: Settings → Offline cache → **Cache every work**. At the default image quality this takes about 300–600 MB.

### Where the cache actually lives on disk

The images are stored in the IndexedDB that Chrome allocates to this extension. The settings page detects your system automatically and shows the actual path, with a “Copy path” button next to it:

| System | Path |
|---|---|
| **Windows** | `%LOCALAPPDATA%\Google\Chrome\User Data\Default\IndexedDB\chrome-extension_<extension ID>_0.indexeddb.leveldb` |
| **macOS** | `~/Library/Application Support/Google/Chrome/Default/IndexedDB/chrome-extension_<extension ID>_0.indexeddb.leveldb` |
| **Linux** | `~/.config/google-chrome/Default/IndexedDB/chrome-extension_<extension ID>_0.indexeddb.leveldb` |

(If you're not using the Default profile, replace `Default` with `Profile 1` or similar. The settings page shows the extension ID in full.)

Those are LevelDB database files, though — **you can't browse them as images**. To get usable images, use this instead:

### One-click image export (works on Windows and macOS)

Settings → Offline cache → **Export cached works**.
Each work is written to **Downloads / Corridor Gallery /** as `Artist - Title (Year).jpg`; file names are sanitized to ASCII,
so nothing goes wrong on either a Chinese or an English system. When the export is done, click **Open folder** next to it, and that folder opens directly in Windows File Explorer / macOS Finder /
your Linux file manager — no need to go hunting for the path yourself.

You can also press `D` at any time to download just the current work.

---

## 6a. Backup and restore (Settings → Storage)

**Upgrading doesn't lose your configuration in the first place.** As long as the extension id stays the same, `chrome.storage.local` is kept intact across version updates —
settings, endpoint profiles (including keys and the measured results of “Test connection”) and favorites all come through intact.

What does get lost is the other case: **removing the extension and reinstalling it**, or moving to another machine — then the extension id changes and storage starts from scratch.
That's what backups are for.

**The format is JSON**. This file is meant for machines to read: Markdown looks nice, but it has no types — arrays, booleans
and nested structures get lost as soon as you convert, and reading it back in would come down to guesswork.

**You tick which parts to take along**: Settings & endpoints / Favorites & removed / History / Artwork translations /
UI language packs / Daily finds / Gallery URL sources. Importing goes by the same set of ticks.

**Three ways to handle API keys**:

| Option | In the file | On import | Good for |
|---|---|---|---|
| Leave out | No keys to be found | Imports directly | You only want to sync settings and will paste the keys in again by hand |
| Encrypt | Ciphertext only | Needs the same passphrase | The recommended default; even if the file ends up on a cloud drive, nothing leaks |
| Plain text | `sk-…` in plain sight | Imports directly | The least hassle, but from then on this json has to be kept like a password file |

Encryption uses the browser's built-in Web Crypto: PBKDF2-SHA256 key derivation (250,000 iterations) + AES-GCM-256.
**Only the key fields are encrypted**; everything else stays readable — so if you forget the passphrase, the rest of the configuration still restores normally,
and you just have to enter the keys again. A wrong passphrase gets a clear “Wrong passphrase, or the file has been altered”,
and **nothing at all is written to storage**: decryption happens before any write.

**Two valid ways to import**:

- **Replace** — each ticked part is swapped wholesale for what's in the backup. Use this to restore after a reinstall.
- **Merge** — adds, never deletes: endpoint profiles are merged by id (a profile that already exists on this machine is kept),
  and favorites, the Removed list and library sources are merged in. Use this to carry your setup over from another machine.

**Two things the backup doesn't include**: the image cache (hundreds of MB; after a reinstall it fetches the images again by itself);
and local-folder libraries — the browser doesn't let a folder permission travel, and another machine couldn't point to the same disk anyway,
so only URL sources are backed up, and folders have to be picked again.

---

## 7. The white footer at the bottom of Chrome

The white bar showing the extension's name and “Customize Chrome” is **not part of this extension's interface**.
Since Chrome 138, whenever the new tab page is taken over by an extension, Chrome adds this official footer at the bottom
to tell you which extension is providing the page — **extensions are not allowed to hide it**; this is browser behavior.

Turning it off takes just one step; either of these two ways works:

1. On a new tab, **right-click the white bar** → choose “Hide footer on New Tab page”
2. Or click “**Customize Chrome**” on the right side of the bar → scroll the side panel to the very bottom → turn off “Show footer on New Tab page”

If the change doesn't take effect right away, restart Chrome once. The settings page includes this explanation too, so you can look it up any time.

---

## 8. About the image sources (please read)

**Google Arts & Culture has no public API for individual developers**; its official interface is open only to partner cultural institutions,
and scraping its pages directly would both violate the terms of service and be liable to break at any time. So this extension takes a route that is just as legitimate and just as high-resolution:

- All images are public-domain high-resolution scans from **Wikimedia Commons**, most of them the very original files released to the public by major museums (including the Google Art Project)
  — *The Starry Night*, for example, uses the Google Art Project's 44567 × 35291 version.
- Every work's detail page carries two external links: **View on Wikimedia Commons** (the original file and license information) and
  **Search on Google Arts & Culture** (jumps to the official site and searches for the same work, where you can see ultra-high zoom and the museum's own curation).
- All 106 works are in the public domain (the artist died more than 70 years ago, or the holding institution released it under CC0).
  The written curatorial notes are original to this project.

Images are requested along Wikimedia's standard size steps (120 / 250 / 330 / 500 / 960 / 1280 / 1920 / 3840 px),
chosen automatically for your screen resolution, so no bandwidth is wasted.

---

## 9. Privacy

- No data is collected or uploaded; there is no analytics code, no account and no remote configuration.
- By default, network requests go only to `upload.wikimedia.org` (fetching images), `commons.wikimedia.org` (the public API and source pages for daily additions) and `www.wikidata.org` (filling in Chinese and English names). Settings, favorites, history, the cache and the custom library are all stored on this machine.
- **The only exception is “AI enrichment”, which you turn on yourself**: once it's on, the images being enriched are shrunk to JPEGs of at most 1024px
  and sent to **the endpoint address you entered yourself**, with no third party in between. The key is stored only on this machine, in `chrome.storage.local`,
  and is sent only with requests to that one address. **Leave the address empty and nothing is sent at all.**
  If your custom library contains private photos, use your own judgment about whether to turn this on, and whether to use a local model
  (something like `http://localhost:11434/v1`, where the images never even leave your computer).
- Permissions: `storage`/`unlimitedStorage` hold settings and the image cache; `alarms` is for background prefetching and scheduled enrichment;
  `downloads` is for “Download original”, exporting images and saving backup files; `host_permissions` is limited to three domains:
  `upload.wikimedia.org`, `commons.wikimedia.org` and `www.wikidata.org`.
  AI enrichment uses **optional permissions**: only when you have entered an endpoint address and click “Test connection / Run now / Allow”
  does the browser pop up and ask whether to allow **that one domain**; if you don't use this feature, it never asks.
- `topSites` and `tabs` (v1.21.0) are both **optional permissions**: nothing is requested and no prompt appears at install.
  Each is requested once, and only when you open the Pause Gallery screen and click “Allow reading most-visited” / “Allow reading open tabs”;
  you can revoke either one at any time in the same panel.
  `topSites` gets only site names and URLs; `tabs` gets only the **titles and URLs** of the tabs open at that moment
  (across all windows of this profile), which are immediately folded into one entry per site — neither can tell when you visited a site or
  how many times, and neither can read page content. This screen also **fetches no site icons and makes no network requests at all** —
  getting icons would mean either adding another permission or reporting the sites you visit most to a third-party icon service, and neither is worth it.
  “Close those tabs” closes only the tabs you ticked yourself in Tidy mode.
- `declarativeNetRequestWithHostAccess` (new in v1.20.0) does exactly one thing: it rewrites the `Origin` header of requests sent to **local addresses**
  (`localhost` / `127.x` / `0.0.0.0` / `::1` / `*.local`) to that address itself,
  so that the origin check in local services such as Ollama lets them through. Its `WithHostAccess` suffix
  means it **only takes effect on addresses you have already granted access to**, so installing it adds no extra permission prompt; the rule is also locked
  to requests sent by this extension itself (`initiatorDomains`), so requests that web pages send to the same port are unaffected.
  The `Origin` of public endpoints is not changed in the slightest.

---

## 10. Project structure

```
corridor-newtab/
├── manifest.json          Extension manifest (MV3)
├── newtab.html            New tab page
├── options.html           Options page
├── data/catalog.json      All the data for the 106 works (about 384 KB)
├── assets/frames/         Nine-slice frame textures (WebP rendered with offline lighting, 10 mouldings)
├── assets/tex/            Wall finishes (seamless relief textures: 31 WebP + shared grain and mottling layers)
├── _locales/              Store name and description (zh_CN / en)
├── src/
│   ├── app.js             Main program: playback, rendering, drawers, zoom
│   ├── modes.js           Masonry / Circular Gallery / Filmstrip
│   ├── daily.js           Daily additions: Commons category crawling, bilingual fill-in from Wikidata, palette calculation
│   ├── local.js           Custom library: directory handles, scanning and indexing, on-demand reads
│   ├── ai.js              AI enrichment: dual-format OpenAI / Anthropic client, editable prompt templates, vocabulary constraints, enrichment report
│   ├── diag.js            Endpoint error diagnosis: turns HTTP 4xx into “what's wrong, and what to do”
│   ├── localnet.js        Local model: rewrites the Origin of requests sent to localhost to the local address
│   ├── backup.js          Backup and restore: collection by part, passphrase-encrypted keys, replace or merge
│   ├── pause.js           Pause Gallery: your own pinned sites + most-visited sites and open tabs (optional permissions), three layouts
│   ├── store.js           Settings / Favorites / History / Removed / IndexedDB image cache
│   ├── i18n.js            Chinese and English strings, movement and subject vocabularies
│   ├── translate.js       Multilingual: artwork translations and interface language packs
│   ├── langs.js           Table of 78 languages
│   ├── tone.js            Wall color: light/dark detection, saturation and color temperature
│   ├── gallery.css        All styles (including every presentation mode, frames and wall finishes)
│   ├── sw.js              Background service worker: scheduled prefetching, daily additions, scheduled enrichment
│   └── options.js         Options page logic
└── icons/                 16 / 32 / 48 / 128
```

## 11. Adding and removing works

Edit `data/catalog.json`. Each entry is structured like this:

```jsonc
{
  "id": "starry-night",
  "title":  { "zh": "星月夜", "en": "The Starry Night" },
  "artist": { "zh": "文森特·梵高", "en": "Vincent van Gogh" },
  "life": "1853–1890",
  "year": "1889", "ys": 1889,                    // ys is used for sorting and filtering by date
  "medium": { "zh": "布面油画", "en": "Oil on canvas" },
  "dims": "73.7 × 92.1 cm",
  "museum": { "zh": "纽约现代艺术博物馆", "en": "Museum of Modern Art" },
  "place":  { "zh": "美国 纽约", "en": "New York, USA" },
  "movement": "post-impressionism",               // see MOVEMENTS in src/i18n.js
  "region": "europe",                             // europe | east-asia | americas
  "tags": ["landscape", "night"],                 // see TAGS in src/i18n.js
  "mature": false,                                // true = hidden in “Work-safe” mode
  "format": "std",                                // std | tall | wide | scroll
  "note": { "zh": "两段导览…\n\n第二段…", "en": "…" },
  "look": { "zh": "一句话看点", "en": "…" },
  "img": {
    "base":  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/文件名.jpg",
    "name":  "文件名.jpg",                         // same as the last segment of base (keep it URL-encoded); 文件名 = file name
    "full":  "https://upload.wikimedia.org/wikipedia/commons/e/ea/文件名.jpg",
    "w": 44567, "h": 35291, "ar": 1.2628,
    "sizes": [120, 250, 330, 500, 960, 1280, 1920, 3840]   // size steps no larger than the original's width
  },
  "src": { "file": "File:…", "page": "https://commons.wikimedia.org/wiki/File:…", "licence": "Public domain" },
  "vis": {
    "accent": "#4a6fa5",                          // accent color
    "lum": 0.31, "sat": 0.42,
    "palette": ["#…", "#…"],                      // six dominant colors, sorted by share
    "weights": [0.31, 0.22],
    "lqip": "data:image/jpeg;base64,…"            // 20px placeholder, the offline fallback
  }
}
```

After editing, reload the extension (at `chrome://extensions/`, click the reload icon on the extension's card) and the changes take effect.

---

## 11a. What changed in each version

See [`CHANGELOG.md`](../CHANGELOG.md) in the repository root: each version lists clearly what was added and what was fixed.

(The more detailed implementation notes — why things were changed the way they were, the trial and error, the pitfalls along the way — stay on the developer's machine and are not part of the repository.)

## 12. Version and copyright

**Corridor** v1.23.0

By **Charles Chern** (**@yearnst**)

- Project site: <https://yearnst.github.io/corridor-newtab/>
- Source repository: <https://github.com/yearnst/corridor-newtab>

Artwork images are public-domain high-resolution scans from Wikimedia Commons; the curatorial notes were written originally for this project.

© 2026 Charles Chern · MIT License

<sub>These two links and the copyright notice also appear under “Settings → About” and at the bottom of the extension's options page; the version number is read automatically from the manifest.</sub>
