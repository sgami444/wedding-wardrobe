# Outfit image folders

Place final outfit photographs in the event and audience folder referenced by
`js/events.js`:

- `sagai/women/` and `sagai/men/`
- `mandap/women/` and `mandap/men/`
- `carnival/women/` and `carnival/men/`
- `garba/women/` and `garba/men/`
- `wedding/women/` and `wedding/men/`

The active transparent site monogram is stored at
`logo/ms-monogram-transparent.png`. The earlier navy-background option remains
at `logo/ms-monogram.jpeg` for quick comparison or rollback. The `florals/`
folder is available for future custom artwork.
Image filenames are not special: the `src` value in `js/events.js` determines
which file appears. Missing files fall back cleanly in the interface.
