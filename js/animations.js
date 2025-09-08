// Hero Animations
document.addEventListener('DOMContentLoaded', () => {
    animateHero();
    initParallax();
    initTextEffects();
});

function animateHero() {
    // Animate hero title words
    anime({
        targets: '.hero-title .word',
        translateY: [100, 0],
        opacity: [0, 1],
        duration: 1200,
        delay: anime.stagger(100, {start: 300}),
        easing: 'easeOutExpo'
    });
    
    // Animate subtitle words
    anime({
        targets: '.hero-subtitle .fade-word',
        translateY: [20, 0],
        opacity: [0, 1],
        duration: 800,
        delay: anime.stagger(50, {start: 800}),
        easing: 'easeOutQuad'
    });
    
    // Animate scroll indicator
    anime({
        targets: '.scroll-indicator',
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 1000,
        delay: 1500,
        easing: 'easeOutQuad'
    });
}

// Parallax Effects
function initParallax() {
    const parallaxElements = document.querySelectorAll('.project-image img, .hero-title');
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        
        parallaxElements.forEach(el => {
            const speed = el.dataset.speed || 0.5;
            const yPos = -(scrolled * speed);
            
            if (isInViewport(el)) {
                el.style.transform = `translateY(${yPos}px)`;
            }
        });
    });
}

// Text Effects
function initTextEffects() {
    // Split text animation
    const splitTexts = document.querySelectorAll('.split-text');
    
    splitTexts.forEach(text => {
        const content = text.textContent;
        text.innerHTML = '';
        
        [...content].forEach((char, i) => {
            const span = document.createElement('span');
            span.classList.add('char');
            span.textContent = char === ' ' ? '\u00A0' : char;
            span.style.animationDelay = `${i * 30}ms`;
            text.appendChild(span);
        });
    });
    
    // Typewriter effect
    const typewriters = document.querySelectorAll('.typewriter');
    
    typewriters.forEach(el => {
        const text = el.textContent;
        el.textContent = '';
        let i = 0;
        
        const type = () => {
            if (i < text.length) {
                el.textContent += text.charAt(i);
                i++;
                setTimeout(type, 100);
            }
        };
        
        if (isInViewport(el)) {
            type();
        } else {
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    type();
                    observer.disconnect();
                }
            });
            observer.observe(el);
        }
    });
    
    // Glitch effect on hover
    const glitchTexts = document.querySelectorAll('.glitch');
    
    glitchTexts.forEach(el => {
        el.dataset.text = el.textContent;
    });
}

// Advanced Animations
function morphingShapes() {
    anime({
        targets: '.morph-shape',
        d: [
            {value: 'M50,50 C50,28 72,28 72,50 C72,72 50,72 50,50'},
            {value: 'M50,50 C28,50 28,72 50,72 C72,72 72,50 50,50'},
            {value: 'M50,50 C50,28 72,28 72,50 C72,72 50,72 50,50'}
        ],
        duration: 6000,
        loop: true,
        easing: 'easeInOutQuad'
    });
}

// Staggered Grid Animation
function animateGrid() {
    anime({
        targets: '.grid-item',
        scale: [0, 1],
        opacity: [0, 1],
        delay: anime.stagger(100, {grid: [4, 4], from: 'center'}),
        duration: 1000,
        easing: 'easeOutElastic(1, 0.5)'
    });
}

// 3D Card Flip
function init3DCards() {
    const cards = document.querySelectorAll('.flip-card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            anime({
                targets: card,
                rotateY: 180,
                duration: 600,
                easing: 'easeInOutQuad'
            });
        });
        
        card.addEventListener('mouseleave', () => {
            anime({
                targets: card,
                rotateY: 0,
                duration: 600,
                easing: 'easeInOutQuad'
            });
        });
    });
}

// Liquid Button Effect
function liquidButton() {
    const buttons = document.querySelectorAll('.liquid-button');
    
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            btn.appendChild(ripple);
            
            anime({
                targets: ripple,
                scale: [0, 20],
                opacity: [1, 0],
                duration: 1000,
                easing: 'easeOutExpo',
                complete: () => ripple.remove()
            });
        });
    });
}

// SVG Path Animation
function animateSVGPaths() {
    const paths = document.querySelectorAll('.animated-path');
    
    paths.forEach(path => {
        const length = path.getTotalLength();
        path.style.strokeDasharray = length;
        path.style.strokeDashoffset = length;
        
        anime({
            targets: path,
            strokeDashoffset: [length, 0],
            duration: 2000,
            easing: 'easeInOutQuad',
            loop: true,
            direction: 'alternate'
        });
    });
}

// Particle System
function createParticles() {
    const container = document.querySelector('.particle-container');
    if (!container) return;
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.width = Math.random() * 5 + 'px';
        particle.style.height = particle.style.width;
        container.appendChild(particle);
        
        anime({
            targets: particle,
            translateX: anime.random(-200, 200),
            translateY: anime.random(-200, 200),
            scale: [1, 0],
            opacity: [1, 0],
            duration: anime.random(3000, 5000),
            loop: true,
            easing: 'easeOutQuad'
        });
    }
}

// Utility function
function isInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Time-based greeting
function timeBasedGreeting() {
    const hour = new Date().getHours();
    let greeting;
    
    if (hour < 12) greeting = 'Good Morning';
    else if (hour < 18) greeting = 'Good Afternoon';
    else greeting = 'Good Evening';
    
    const greetingEl = document.querySelector('.greeting');
    if (greetingEl) {
        greetingEl.textContent = greeting;
        
        anime({
            targets: greetingEl,
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 1000,
            easing: 'easeOutQuad'
        });
    }
}

// Initialize time-based features
timeBasedGreeting();