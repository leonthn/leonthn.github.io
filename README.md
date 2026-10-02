# leonthn.github.io

Meine persönliche Website – Leistungen, Projekte, Werdegang, Kontakt und ein kleines Spiel.

**➜ [leonthn.github.io](https://leonthn.github.io/)**

## Seiten

| Datei | Inhalt |
|---|---|
| `index.html` | Start mit Globus, Kurzvorstellung und Überblick |
| `leistungen.html` | Websites für Vereine und Unternehmen, Ablauf, FAQ |
| `projekte.html` | Projekte mit Filter |
| `projekt-lehrerkarten.html` | Case Study zum Lehrerkarten-Projekt |
| `ueber-mich.html` | Interessen, Werdegang, Zertifikate |
| `kontakt.html` | Kontaktformular (Formspree) |
| `spiel.html` + `game.js` | **Stack** – Blöcke so genau wie möglich stapeln |

`style.css` enthält das Design (Farben oben unter `:root` und `[data-theme="light"]`), `script.js` die Interaktionen, `i18n.js` die englischen Texte.

## Was drinsteckt

- Seitenwechsel über die View Transitions API, interne Seiten werden beim Überfahren vorgeladen
- Punkt-Globus mit Dresden im Hero (Canvas, lässt sich drehen)
- Animationen nur beim Einblenden, kein Scroll-Hijacking
- Deutsch / Englisch, Hell / Dunkel, Suche mit ⌘K bzw. Strg+K
- Stack: isometrisch gezeichnet, Überstände werden abgeschnitten, Rekord bleibt gespeichert

Reines HTML, CSS und JavaScript ohne Build-Schritt, gehostet mit GitHub Pages.

## Lokal starten

```bash
python3 -m http.server 8430
```
