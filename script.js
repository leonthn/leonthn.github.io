// Wir suchen den Button mit der ID "theme-toggle"
const themeToggle = document.getElementById('theme-toggle');

// Wir prüfen, ob der Nutzer schon mal hier war und eine Präferenz gespeichert ist
const currentTheme = localStorage.getItem('theme');
if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
}

// Was passiert, wenn man auf den Button klickt?
themeToggle.addEventListener('click', () => {
    let theme = document.documentElement.getAttribute('data-theme');
    
    // Wenn es dunkel ist, mach es hell. Sonst mach es dunkel.
    let newTheme = theme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Wir speichern die Einstellung im Browser, damit sie beim Seitenwechsel bleibt
    localStorage.setItem('theme', newTheme);
});

// --- SCROLL ANIMATION FÜR DEN ZEITSTRAHL ---

// Der Observer beobachtet, ob Elemente auf dem Bildschirm sichtbar werden
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        // Wenn das Element in den sichtbaren Bereich scrollt
        if (entry.isIntersecting) {
            entry.target.classList.add('show'); // Füge die CSS-Klasse "show" hinzu
        }
    });
});

// Suche alle Elemente mit der Klasse "timeline-item" und beobachte sie
const timelineItems = document.querySelectorAll('.timeline-item');
timelineItems.forEach((el) => observer.observe(el));

// --- SCHREIBMASCHINEN EFFEKT (Nur auf der Startseite) ---
const typewriterElement = document.getElementById('typewriter');

// Wir prüfen, ob wir auf der Startseite sind (nur da gibt es die ID 'typewriter')
if (typewriterElement) {
    const textToType = "Tech-Enthusiast. Abiturient. Zukünftiger Dual-Student.";
    let i = 0;

    function typeWriter() {
        if (i < textToType.length) {
            typewriterElement.innerHTML += textToType.charAt(i);
            i++;
            // Geschwindigkeit des Tippens (50ms pro Buchstabe)
            setTimeout(typeWriter, 50);
        }
    }
    
    // Startet die Animation nach einer kurzen Verzögerung (300ms)
    setTimeout(typeWriter, 300);
}