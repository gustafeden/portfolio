// Alpine.js component
function portfolio() {
    return {
        // State
        mobileMenuOpen: false,
        scrollY: 0,
        scrollingDown: false,
        lastScrollY: 0,
        cursorX: -100,
        cursorY: -100,
        followerX: -100,
        followerY: -100,
        cursorScale: 1,
        followerScale: 1,
        isMobile: window.innerWidth < 768,
        konamiCode: [],
        konamiPattern: ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'],
        
        // Projects data
        featuredProjects: [
            {
                id: 1,
                title: 'E-Commerce Platform',
                category: 'Web Development',
                description: 'A modern e-commerce solution with real-time inventory management and seamless checkout experience.',
                image: '',
                date: '2024-03-15',
                link: '/projects/ecommerce.html'
            },
            {
                id: 2,
                title: 'Brand Identity Design',
                category: 'Design',
                description: 'Complete brand identity package including logo design, color palette, and brand guidelines.',
                image: '',
                date: '2024-02-28',
                link: '/projects/brand-identity.html'
            },
            {
                id: 3,
                title: 'Mobile Banking App',
                category: 'Mobile Development',
                description: 'Intuitive mobile banking application with biometric authentication and real-time transactions.',
                image: '',
                date: '2024-01-20',
                link: '/projects/mobile-banking.html'
            }
        ],
        
        // Color palette
        colorPalette: [
            { name: 'Near Black', hex: '#0A0A0A', delay: 0 },
            { name: 'Electric Blue', hex: '#4B4BF9', delay: 200 },
            { name: 'Success', hex: '#10B981', delay: 400 },
            { name: 'Warning', hex: '#F59E0B', delay: 600 }
        ],
        
        // Initialize
        init() {
            this.setupEventListeners();
            this.animateHero();
            this.setupScrollAnimations();
            this.setupKonamiCode();
            
            // Check if mobile
            window.addEventListener('resize', () => {
                this.isMobile = window.innerWidth < 768;
            });
        },
        
        // Setup event listeners
        setupEventListeners() {
            // Scroll tracking
            window.addEventListener('scroll', () => {
                this.scrollY = window.scrollY;
                this.scrollingDown = this.scrollY > this.lastScrollY && this.scrollY > 100;
                this.lastScrollY = this.scrollY;
            });
            
            // Custom cursor
            if (!this.isMobile) {
                document.addEventListener('mousemove', (e) => {
                    this.cursorX = e.clientX - 4;
                    this.cursorY = e.clientY - 4;
                    this.followerX = e.clientX - 16;
                    this.followerY = e.clientY - 16;
                });
                
                // Hover effects for cursor
                document.querySelectorAll('a, button, .hover-lift').forEach(el => {
                    el.addEventListener('mouseenter', () => {
                        this.cursorScale = 2;
                        this.followerScale = 1.5;
                    });
                    el.addEventListener('mouseleave', () => {
                        this.cursorScale = 1;
                        this.followerScale = 1;
                    });
                });
            }
        },
        
        // Animate hero section
        animateHero() {
            // Hero title animation
            anime({
                targets: [this.$refs.heroWord1, this.$refs.heroWord2, this.$refs.heroWord3, this.$refs.heroWord4],
                translateY: [100, 0],
                opacity: [0, 1],
                duration: 1200,
                delay: anime.stagger(150, {start: 300}),
                easing: 'easeOutExpo'
            });
            
            // Subtitle animation
            anime({
                targets: this.$refs.heroSubtitle,
                opacity: [0, 1],
                translateY: [30, 0],
                duration: 1000,
                delay: 1000,
                easing: 'easeOutQuad'
            });
            
            // Scroll indicator
            anime({
                targets: this.$refs.scrollIndicator,
                opacity: [0, 1],
                translateY: [20, 0],
                duration: 1000,
                delay: 1500,
                easing: 'easeOutQuad'
            });
        },
        
        // Setup scroll animations
        setupScrollAnimations() {
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const target = entry.target;
                        
                        // Animate based on element type
                        if (target.classList.contains('animate-on-scroll')) {
                            anime({
                                targets: target,
                                opacity: [0, 1],
                                translateY: [30, 0],
                                duration: 800,
                                easing: 'easeOutExpo'
                            });
                        }
                        
                        observer.unobserve(target);
                    }
                });
            }, observerOptions);
            
            // Observe elements
            document.querySelectorAll('.animate-on-scroll').forEach(el => {
                observer.observe(el);
            });
            
            // About section animation
            if (this.$refs.aboutTitle) {
                observer.observe(this.$refs.aboutTitle);
                observer.observe(this.$refs.aboutText);
            }
        },
        
        // Navigate to project
        navigateToProject(link) {
            anime({
                targets: this.$refs.pageTransition,
                scaleY: [0, 1],
                duration: 500,
                easing: 'easeInOutExpo',
                complete: () => {
                    window.location.href = link;
                }
            });
        },
        
        // Format date
        formatDate(dateString) {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            return new Date(dateString).toLocaleDateString(undefined, options);
        },
        
        // Copy color to clipboard
        async copyColor(hex) {
            try {
                await navigator.clipboard.writeText(hex);
                
                // Show toast notification
                this.showToast(`Copied ${hex} to clipboard!`);
                
                // Animate the color card
                const card = event.currentTarget;
                anime({
                    targets: card.querySelector('div'),
                    scale: [1, 1.2, 1],
                    rotate: [0, 360],
                    duration: 600,
                    easing: 'easeOutExpo'
                });
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        },
        
        // Show toast notification
        showToast(message) {
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-dark text-white px-6 py-3 rounded-full shadow-xl z-[9999]';
            toast.textContent = message;
            document.body.appendChild(toast);
            
            anime({
                targets: toast,
                translateY: [20, 0],
                opacity: [0, 1],
                duration: 300,
                easing: 'easeOutQuad',
                complete: () => {
                    setTimeout(() => {
                        anime({
                            targets: toast,
                            translateY: [0, 20],
                            opacity: [1, 0],
                            duration: 300,
                            easing: 'easeInQuad',
                            complete: () => toast.remove()
                        });
                    }, 2000);
                }
            });
        },
        
        // Konami Code Easter Egg
        setupKonamiCode() {
            document.addEventListener('keydown', (e) => {
                this.konamiCode.push(e.key);
                
                // Keep only the last 10 keys
                if (this.konamiCode.length > 10) {
                    this.konamiCode.shift();
                }
                
                // Check if pattern matches
                if (this.konamiCode.join(',') === this.konamiPattern.join(',')) {
                    this.triggerEasterEgg();
                    this.konamiCode = [];
                }
            });
        },
        
        // Trigger Easter Egg
        triggerEasterEgg() {
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
                confetti.style.borderRadius = '50%';
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
            
            // Show message
            const message = document.createElement('div');
            message.innerHTML = '🎉 <span class="gradient-text">You found the secret!</span>';
            message.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-5xl font-black z-[10000] pointer-events-none';
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
    }
}

// Time-based greeting
document.addEventListener('DOMContentLoaded', () => {
    const hour = new Date().getHours();
    let greeting;
    
    if (hour < 12) greeting = 'Good Morning';
    else if (hour < 18) greeting = 'Good Afternoon';
    else greeting = 'Good Evening';
    
    // Add greeting if element exists
    const greetingEl = document.querySelector('.greeting');
    if (greetingEl) {
        greetingEl.textContent = greeting;
    }
});