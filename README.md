# leonthn.github.io

Meine persönliche Website – Leistungen, Projekte, Werdegang und Kontakt.

**➜ [leonthn.github.io](https://leonthn.github.io/)**

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Startseite |
| `projekt-lehrerkarten.html` | Case Study zum Lehrerkarten-Projekt |
| `style.css` | Design, Farben oben unter `:root` (dunkel) und `[data-theme="light"]` |
| `script.js` | Animationen und Interaktionen |
| `i18n.js` | Englische Texte (Deutsch steht direkt im HTML) |
| `projekte.html`, `ueber-mich.html`, `zertifikate.html`, `kontakt.html` | Weiterleitungen, damit alte Links noch funktionieren |

## Was drinsteckt

- Interaktiver Punkt-Globus im Hero (Canvas, lässt sich mit der Maus drehen)
- Smooth Scrolling mit [Lenis](https://github.com/darkroomengineering/lenis)
- Projekte scrollen horizontal, die Jahreszahl im Werdegang läuft mit
- Zählwerke, Text-Reveals, Laufband, das auf die Scrollgeschwindigkeit reagiert
- Deutsch / Englisch, Hell / Dunkel
- Suche mit ⌘K bzw. Strg+K
- Kontaktformular über Formspree

Reines HTML, CSS und JavaScript ohne Build-Schritt, gehostet mit GitHub Pages.

## Lokal starten

```bash
python3 -m http.server 8430
```
