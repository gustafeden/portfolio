// Animation configurations and implementations using anime.js

// Check for reduced motion preference
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Global animation configuration
const animationConfig = {
    duration: 600,
    easing: 'easeOutCubic',
    delay: (el, i) => i * 50
};

// Initialize animations when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (!prefersReducedMotion) {
        initHeroAnimations();
        initScrollAnimations();
        initProjectCardAnimations();
    }
});

// Hero section animations
function initHeroAnimations() {
    // Animate hero text words
    anime({
        targets: '.hero-text span',
        translateY: [30, 0],
        opacity: [0, 1],
        duration: 800,
        delay: (el, i) => i * 150,
        easing: 'easeOutExpo'
    });
    
    // Animate subtitle
    anime({
        targets: '.hero-subtitle',
        translateY: [20, 0],
        opacity: [0, 1],
        duration: 600,
        delay: 600,
        easing: 'easeOutCubic'
    });
    
    // Animate CTA button
    anime({
        targets: '.hero-cta',
        translateY: [20, 0],
        opacity: [0, 1],
        duration: 600,
        delay: 900,
        easing: 'easeOutCubic'
    });
}

// Scroll-triggered animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                
                // Section titles
                if (target.classList.contains('section-title')) {
                    anime({
                        targets: target,
                        translateY: [30, 0],
                        opacity: [0, 1],
                        duration: 800,
                        easing: 'easeOutCubic'
                    });
                }
                
                // About section
                if (target.classList.contains('about-title')) {
                    anime({
                        targets: target,
                        translateY: [20, 0],
                        opacity: [0, 1],
                        duration: 600,
                        easing: 'easeOutCubic'
                    });
                }
                
                if (target.classList.contains('about-text')) {
                    anime({
                        targets: target,
                        translateY: [20, 0],
                        opacity: [0, 1],
                        duration: 600,
                        delay: 200,
                        easing: 'easeOutCubic'
                    });
                }
                
                // Contact section
                if (target.classList.contains('contact-title')) {
                    anime({
                        targets: target,
                        translateY: [20, 0],
                        opacity: [0, 1],
                        duration: 600,
                        easing: 'easeOutCubic'
                    });
                }
                
                if (target.classList.contains('contact-text')) {
                    anime({
                        targets: target,
                        translateY: [20, 0],
                        opacity: [0, 1],
                        duration: 600,
                        delay: 150,
                        easing: 'easeOutCubic'
                    });
                }
                
                if (target.classList.contains('contact-cta')) {
                    anime({
                        targets: target,
                        translateY: [20, 0],
                        opacity: [0, 1],
                        duration: 600,
                        delay: 300,
                        easing: 'easeOutCubic'
                    });
                }
                
                // View all button
                if (target.classList.contains('view-all-btn')) {
                    anime({
                        targets: target,
                        translateY: [20, 0],
                        opacity: [0, 1],
                        duration: 600,
                        easing: 'easeOutCubic'
                    });
                }
                
                observer.unobserve(target);
            }
        });
    }, observerOptions);
    
    // Observe elements
    document.querySelectorAll('.section-title, .about-title, .about-text, .contact-title, .contact-text, .contact-cta, .view-all-btn').forEach(el => {
        observer.observe(el);
    });
}

// Project card animations
function initProjectCardAnimations() {
    const projectObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const cards = document.querySelectorAll('.project-card');
                anime({
                    targets: cards,
                    translateY: [40, 0],
                    opacity: [0, 1],
                    duration: 600,
                    delay: (el, i) => i * 100,
                    easing: 'easeOutCubic'
                });
                projectObserver.disconnect();
            }
        });
    }, { threshold: 0.1 });
    
    const firstCard = document.querySelector('.project-card');
    if (firstCard) {
        projectObserver.observe(firstCard);
    }
}

// Parallax effect for images (subtle)
if (!prefersReducedMotion) {
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.parallax-img');
        
        parallaxElements.forEach(el => {
            const speed = 0.5;
            const yPos = -(scrolled * speed);
            el.style.transform = `translateY(${yPos}px)`;
        });
    });
}