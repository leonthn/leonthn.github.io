# leonthn.github.io

Meine persönliche Website: Projekte, Werdegang, Zertifikate und Kontakt auf einer Seite.

**➜ [leonthn.github.io](https://leonthn.github.io/)**

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Die komplette Startseite: Hero, Über mich (Bento-Kacheln), Werkzeugkasten, Projekte, Werdegang, Zertifikate, „Gerade jetzt“, Kontakt |
| `projekt-lehrerkarten.html` | Case Study zum [Lehrerkarten-Projekt](https://leonthn.github.io/projekt-lehrerkarten.html) |
| `style.css` | Design; Farben ganz oben unter `:root` (dunkel) und `[data-theme="light"]` |
| `script.js` | Alle Animationen und Interaktionen |
| `projekte.html`, `ueber-mich.html`, `zertifikate.html`, `kontakt.html` | Weiterleitungen auf die Abschnitte der Startseite, damit alte Links weiter funktionieren |
| `404.html` | Fehlerseite |

## Features

- Intro-Animation beim ersten Besuch pro Sitzung
- Interaktives „neuronales Netz“ im Hero (Canvas), das auf die Maus reagiert
- Wechselnde Rolle mit Scramble-Effekt, Live-Uhrzeit aus Dresden
- Command-Palette mit ⌘K bzw. Strg+K
- Scroll-Animationen: Text Wort für Wort, hochzählende Zahlen, Zeitleiste, die sich füllt
- Spotlight- und 3D-Tilt-Effekt auf Karten, magnetische Buttons, eigener Cursor (nur Desktop)
- Heller und dunkler Modus mit kreisförmigem Übergang (die Wahl wird im Browser gespeichert)
- Kontaktformular über Formspree, ohne Seitenwechsel
- Easter Egg: Konami-Code ↑↑↓↓←→←→BA
- Respektiert „Bewegung reduzieren“ im Betriebssystem

## Technik

- Reines HTML, CSS und JavaScript, ohne Framework oder Build-Schritt
- Gehostet mit GitHub Pages: Jede Änderung auf `main` ist nach etwa einer Minute online

## Lokal ansehen

```bash
python3 -m http.server 8430
```

Dann http://localhost:8430 öffnen.
