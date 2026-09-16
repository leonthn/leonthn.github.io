const themeToggle = document.getElementById('theme-toggle');

const currentTheme = localStorage.getItem('theme');
if (currentTheme) {
    document.documentElement.setAttribute('data-theme', currentTheme);
}

themeToggle.addEventListener('click', () => {
    let theme = document.documentElement.getAttribute('data-theme');
    
    
    let newTheme = theme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    
    
    localStorage.setItem('theme', newTheme);
});




const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
        }
    });
});

const timelineItems = document.querySelectorAll('.timeline-item');
timelineItems.forEach((el) => observer.observe(el));

const typewriterElement = document.getElementById('typewriter');

if (typewriterElement) {
    const textToType = "Abiturient. Zukünftiger Dual-Student.";
    let i = 0;

    function typeWriter() {
        if (i < textToType.length) {
            typewriterElement.innerHTML += textToType.charAt(i);
            i++;
            
            setTimeout(typeWriter, 50);
        }
    }
    
    setTimeout(typeWriter, 300);
}
