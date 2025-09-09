// Alpine.js components and app logic

// Alpine component for project cards with hover state
document.addEventListener('alpine:init', () => {
    Alpine.data('projectCard', () => ({
        hovered: false,
        
        init() {
            // Any initialization logic for project cards
        }
    }));
    
    // Theme switcher component (future enhancement)
    Alpine.data('themeSwitcher', () => ({
        darkMode: true,
        
        toggle() {
            this.darkMode = !this.darkMode;
            // Implementation for theme switching
        }
    }));
    
    // Form validation component for contact form
    Alpine.data('contactForm', () => ({
        formData: {
            name: '',
            email: '',
            message: ''
        },
        errors: {},
        submitted: false,
        
        validateEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },
        
        submitForm() {
            this.errors = {};
            
            if (!this.formData.name) {
                this.errors.name = 'Name is required';
            }
            
            if (!this.formData.email) {
                this.errors.email = 'Email is required';
            } else if (!this.validateEmail(this.formData.email)) {
                this.errors.email = 'Please enter a valid email';
            }
            
            if (!this.formData.message) {
                this.errors.message = 'Message is required';
            }
            
            if (Object.keys(this.errors).length === 0) {
                // Handle form submission
                console.log('Form submitted:', this.formData);
                this.submitted = true;
                
                // Reset form after 3 seconds
                setTimeout(() => {
                    this.formData = { name: '', email: '', message: '' };
                    this.submitted = false;
                }, 3000);
            }
        }
    }));
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Active navigation link highlighting
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        
        if (scrollY >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('text-clay-brown');
        if (link.getAttribute('href').includes(current)) {
            link.classList.add('text-clay-brown');
        }
    });
});