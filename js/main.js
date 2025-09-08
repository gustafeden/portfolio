// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initCursor();
    initNavigation();
    initScrollAnimations();
    initColorPalette();
    initPageTransitions();
    detectKonamiCode();
});

// Custom Cursor
function initCursor() {
    if (window.innerWidth <= 768) return;
    
    const cursor = document.querySelector('.cursor');
    const follower = document.querySelector('.cursor-follower');
    
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    let followerX = 0, followerY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    // Smooth cursor animation
    const animateCursor = () => {
        cursorX += (mouseX - cursorX) * 0.5;
        cursorY += (mouseY - cursorY) * 0.5;
        
        followerX += (mouseX - followerX) * 0.1;
        followerY += (mouseY - followerY) * 0.1;
        
        cursor.style.left = cursorX - 5 + 'px';
        cursor.style.top = cursorY - 5 + 'px';
        
        follower.style.left = followerX - 15 + 'px';
        follower.style.top = followerY - 15 + 'px';
        
        requestAnimationFrame(animateCursor);
    };
    animateCursor();
    
    // Hover effects
    const hoverElements = document.querySelectorAll('a, button, .project-card, .color-card');
    hoverElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.classList.add('hover');
            follower.classList.add('hover');
        });
        el.addEventListener('mouseleave', () => {
            cursor.classList.remove('hover');
            follower.classList.remove('hover');
        });
    });
    
    // Magnetic effect for buttons
    const magneticElements = document.querySelectorAll('.btn-primary, .social-link');
    magneticElements.forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            el.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
        });
        
        el.addEventListener('mouseleave', () => {
            el.style.transform = '';
        });
    });
}

// Navigation
function initNavigation() {
    const navToggle = document.querySelector('.nav-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-link');
    
    let isOpen = false;
    
    navToggle.addEventListener('click', () => {
        isOpen = !isOpen;
        
        if (isOpen) {
            mobileMenu.classList.add('active');
            
            // Animate toggle to X
            anime({
                targets: '.nav-toggle span:first-child',
                rotate: 45,
                translateY: 7,
                duration: 300,
                easing: 'easeOutExpo'
            });
            
            anime({
                targets: '.nav-toggle span:last-child',
                rotate: -45,
                translateY: -7,
                duration: 300,
                easing: 'easeOutExpo'
            });
            
            // Animate mobile links
            anime({
                targets: mobileLinks,
                opacity: [0, 1],
                translateY: [20, 0],
                delay: anime.stagger(100, {start: 200}),
                duration: 500,
                easing: 'easeOutExpo'
            });
        } else {
            mobileMenu.classList.remove('active');
            
            // Reset toggle
            anime({
                targets: '.nav-toggle span',
                rotate: 0,
                translateY: 0,
                duration: 300,
                easing: 'easeOutExpo'
            });
        }
    });
    
    // Close mobile menu on link click
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            isOpen = false;
            mobileMenu.classList.remove('active');
            anime({
                targets: '.nav-toggle span',
                rotate: 0,
                translateY: 0,
                duration: 300,
                easing: 'easeOutExpo'
            });
        });
    });
    
    // Nav hide/show on scroll
    let lastScroll = 0;
    const nav = document.querySelector('.nav');
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > lastScroll && currentScroll > 100) {
            anime({
                targets: nav,
                translateY: -100,
                duration: 300,
                easing: 'easeOutExpo'
            });
        } else {
            anime({
                targets: nav,
                translateY: 0,
                duration: 300,
                easing: 'easeOutExpo'
            });
        }
        
        lastScroll = currentScroll;
    });
}

// Scroll Animations
function initScrollAnimations() {
    // Intersection Observer for scroll-triggered animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                
                if (el.classList.contains('section-title')) {
                    el.classList.add('visible');
                }
                
                if (el.classList.contains('project-card')) {
                    anime({
                        targets: el,
                        opacity: [0, 1],
                        translateY: [30, 0],
                        duration: 800,
                        easing: 'easeOutExpo',
                        delay: el.dataset.delay || 0
                    });
                }
                
                if (el.classList.contains('about-title') || 
                    el.classList.contains('about-text') || 
                    el.classList.contains('text-link')) {
                    anime({
                        targets: el,
                        opacity: [0, 1],
                        translateY: [30, 0],
                        duration: 800,
                        easing: 'easeOutExpo'
                    });
                }
                
                if (el.classList.contains('color-card')) {
                    anime({
                        targets: el,
                        opacity: [0, 1],
                        translateY: [30, 0],
                        rotate: [5, 0],
                        duration: 800,
                        easing: 'easeOutExpo',
                        delay: el.dataset.delay || 0
                    });
                }
                
                observer.unobserve(el);
            }
        });
    }, observerOptions);
    
    // Observe elements
    document.querySelectorAll('.section-title, .project-card, .about-title, .about-text, .text-link, .color-card').forEach((el, index) => {
        if (el.classList.contains('project-card') || el.classList.contains('color-card')) {
            el.dataset.delay = index * 100;
        }
        observer.observe(el);
    });
}

// Color Palette
function initColorPalette() {
    const colorCards = document.querySelectorAll('.color-card');
    
    colorCards.forEach(card => {
        card.addEventListener('click', async () => {
            const color = card.dataset.color;
            
            try {
                await navigator.clipboard.writeText(color);
                
                // Success animation
                card.classList.add('copied');
                
                anime({
                    targets: card.querySelector('.color-swatch'),
                    scale: [1, 1.2, 1],
                    rotate: [0, 360],
                    duration: 600,
                    easing: 'easeOutExpo'
                });
                
                // Change text temporarily
                const valueEl = card.querySelector('.color-value');
                const originalText = valueEl.textContent;
                valueEl.textContent = 'Copied!';
                
                setTimeout(() => {
                    card.classList.remove('copied');
                    valueEl.textContent = originalText;
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        });
        
        // Floating animation
        anime({
            targets: card.querySelector('.color-swatch'),
            translateY: [-5, 5, -5],
            duration: 3000,
            loop: true,
            easing: 'easeInOutSine',
            delay: Math.random() * 1000
        });
    });
}

// Page Transitions
function initPageTransitions() {
    const links = document.querySelectorAll('a[href^="/"], a[href^="./"], a[href^="../"]');
    const transition = document.querySelector('.page-transition');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.hostname === window.location.hostname && !link.hash) {
                e.preventDefault();
                const target = link.href;
                
                anime({
                    targets: transition,
                    scaleY: [0, 1],
                    duration: 500,
                    easing: 'easeInOutExpo',
                    complete: () => {
                        window.location.href = target;
                    }
                });
            }
        });
    });
}

// Konami Code Easter Egg
function detectKonamiCode() {
    const pattern = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let current = 0;
    
    document.addEventListener('keydown', (e) => {
        if (e.key === pattern[current]) {
            current++;
            
            if (current === pattern.length) {
                triggerEasterEgg();
                current = 0;
            }
        } else {
            current = 0;
        }
    });
}

function triggerEasterEgg() {
    // Create confetti elements
    const colors = ['#4B4BF9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    const confettiCount = 100;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * window.innerWidth + 'px';
        confetti.style.top = '-10px';
        confetti.style.zIndex = '9999';
        document.body.appendChild(confetti);
        
        anime({
            targets: confetti,
            translateY: window.innerHeight + 10,
            translateX: anime.random(-200, 200),
            rotate: anime.random(0, 360),
            duration: anime.random(2000, 4000),
            easing: 'easeInQuad',
            complete: () => confetti.remove()
        });
    }
    
    // Fun message
    const message = document.createElement('div');
    message.textContent = '🎉 You found the secret!';
    message.style.position = 'fixed';
    message.style.top = '50%';
    message.style.left = '50%';
    message.style.transform = 'translate(-50%, -50%)';
    message.style.fontSize = '3rem';
    message.style.fontWeight = 'bold';
    message.style.color = '#4B4BF9';
    message.style.zIndex = '10000';
    message.style.pointerEvents = 'none';
    document.body.appendChild(message);
    
    anime({
        targets: message,
        scale: [0, 1.2, 1],
        rotate: [0, 360],
        duration: 1000,
        easing: 'easeOutExpo',
        complete: () => {
            setTimeout(() => {
                anime({
                    targets: message,
                    opacity: [1, 0],
                    scale: [1, 0],
                    duration: 500,
                    easing: 'easeInExpo',
                    complete: () => message.remove()
                });
            }, 2000);
        }
    });
}