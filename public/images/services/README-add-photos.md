# Adding real photos to the site

The code now looks for real photos in two places:

## 1. Homepage hero (the big photo at the top of the site)
```
public/images/hero-binding.jpg
```
Until this file exists, the homepage shows a matching illustrated placeholder
instead — so the hero never looks broken while you're sourcing a photo.

Good search terms: "bookbinding workshop", "thesis binding close up",
"student with printed thesis", "hardcover binding process".

## 2. Service cards

The code now looks for real photos here:

```
public/images/services/printing.jpg   → "Printing" cards
public/images/services/thesis.jpg     → "Thesis" cards
public/images/services/books.jpg      → "Books" cards
public/images/services/posters.jpg    → "Posters" cards
```

If a file isn't there yet, the card automatically falls back to the old
illustration — so the site never breaks, you can add photos one at a time.

## Where to get free, real photos (no attribution required)

Pexels and Pixabay photos are free for commercial use, no login needed to download.

- Printing:  https://www.pexels.com/search/printing%20press/
- Thesis / graduation: https://www.pexels.com/search/graduation%20cap%20book/
- Books / binding: https://www.pexels.com/search/hardcover%20books/
- Posters: https://www.pexels.com/search/poster%20printing/

(Pixabay works the same way: https://pixabay.com/images/search/printing/ etc.)

## Steps
1. Open a link above, pick a photo you like.
2. Download it (free download button, no account required).
3. Rename it to match the filename table above (e.g. `printing.jpg`).
4. Drop it into `public/images/services/`.
5. Refresh the site — the real photo replaces the illustration automatically.

Tip: landscape photos around 800×600px or larger look best — the card
crops to fill the space (`object-fit: cover`), so exact size doesn't matter,
just make sure it's wider than it is tall.
