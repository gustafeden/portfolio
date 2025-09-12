class Router {
    constructor() {
        this.currentSection = 'front';
        this.contentArea = null;
        this.sections = ['front', 'about', 'stuff', 'photos', 'contact'];
        this.markdownSections = ['about', 'stuff']; // Sections that use markdown
        this.cache = {};
        this.markdownParser = new MarkdownParser();
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.contentArea = document.getElementById('main-content');
            this.setupNavigation();
            this.handleInitialRoute();
            window.addEventListener('popstate', (e) => this.handlePopState(e));
        });
    }

    setupNavigation() {
        document.querySelectorAll('[data-nav]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.nav;
                this.navigate(section);
            });
        });
        
        // Add click handler for name to go to front page
        document.querySelector('a[href="#front"]')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.navigate('front');
        });
    }

    async navigate(section, subRoute = null) {
        if (!this.sections.includes(section)) return;
        
        this.updateActiveNav(section);
        await this.loadContent(section);
        this.currentSection = section;
        this.updateURL(section, subRoute);
        this.animateContentSwitch();
        
        if (window.mobileMenuOpen) {
            window.mobileMenuOpen = false;
            document.querySelector('.mobile-menu')?.classList.remove('open');
        }
    }

    async loadContent(section) {
        if (this.cache[section]) {
            this.contentArea.innerHTML = this.cache[section];
            this.initializeSectionScripts(section);
            return;
        }

        try {
            let html;
            
            // Check if this section should load from markdown
            if (this.markdownSections.includes(section)) {
                html = await this.markdownParser.loadMarkdownContent(section);
            } else {
                // Load traditional HTML content
                const response = await fetch(`content/${section}.html`);
                html = await response.text();
            }
            
            this.cache[section] = html;
            this.contentArea.innerHTML = html;
            this.initializeSectionScripts(section);
        } catch (error) {
            console.error('Error loading content:', error);
            this.contentArea.innerHTML = '<div class="error">Failed to load content</div>';
        }
    }

    initializeSectionScripts(section) {
        switch(section) {
            case 'front':
                this.animateFrontSection();
                break;
            case 'photos':
                this.loadPhotoCollections();
                break;
            case 'contact':
                this.setupContactForm();
                break;
            case 'about':
                this.animateAboutSection();
                break;
            case 'stuff':
                this.animateStuffSection();
                break;
        }
    }

    animateStuffSection() {
        // Animate project cards if they exist
        setTimeout(() => {
            this.animateCards('.project-card, .work-section > *');
        }, 100);
    }

    loadPhotoCollections() {
        const grid = document.getElementById('photo-collections-grid');
        if (!grid) return;
        
        const collectionsHTML = window.photoCollectionsData.map(collection => `
            <div class="photo-card relative group cursor-pointer" 
                 onclick="router.navigateToPhotoCollection(${collection.id})">
                <img src="${collection.cover}" alt="${collection.title}" class="w-full h-64 object-cover rounded-lg">
                <div class="absolute inset-0 bg-gradient-to-t from-charcoal-black/80 to-transparent opacity-0 group-hover:opacity-100 transition rounded-lg">
                    <div class="absolute bottom-0 left-0 p-4">
                        <h3 class="text-xl font-light">${collection.title}</h3>
                        <p class="text-sm text-stone-gray">${collection.count} photos</p>
                    </div>
                </div>
            </div>
        `).join('');
        
        grid.innerHTML = collectionsHTML;
        this.animateCards('.photo-card');
    }

    async navigateToProject(projectSlug) {
        try {
            const html = await this.markdownParser.loadMarkdownContent(`projects/${projectSlug}`);
            this.contentArea.innerHTML = `
                <div class="project-detail">
                    <button onclick="router.navigate('stuff')" class="mb-6 text-stone-gray hover:text-sand-beige transition">
                        ← Back to Work
                    </button>
                    ${html}
                </div>
            `;
            this.currentSection = 'project-detail';
            this.updateURL('stuff', projectSlug);
            this.animateContentSwitch();
        } catch (error) {
            console.error('Error loading project:', error);
            this.contentArea.innerHTML = `
                <div class="project-detail">
                    <button onclick="router.navigate('stuff')" class="mb-6 text-stone-gray hover:text-sand-beige transition">
                        ← Back to Work
                    </button>
                    <div class="text-red-400">Error loading project content</div>
                </div>
            `;
        }
    }

    navigateToPhotoCollection(collectionId) {
        const collection = window.photoCollectionsData.find(c => c.id === collectionId);
        if (!collection) return;
        
        const html = `
            <div class="photo-collection-view">
                <button onclick="router.navigate('photos')" class="mb-6 text-stone-gray hover:text-sand-beige transition">
                    ← Back to Collections
                </button>
                <h2 class="text-3xl font-light mb-8">${collection.title}</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${collection.photos.map(photo => `
                        <img src="${photo.src}" alt="${photo.caption}" class="w-full rounded-lg">
                    `).join('')}
                </div>
            </div>
        `;
        
        this.contentArea.innerHTML = html;
        this.updateURL('photos', collectionId);
    }

    setupContactForm() {
        const form = document.getElementById('contact-form');
        if (!form) return;
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Contact form submitted! (This is a demo)');
        });
    }

    animateFrontSection() {
        if (typeof anime === 'undefined') return;
        
        anime({
            targets: '.front-image',
            opacity: [0, 1],
            scale: [0.95, 1],
            duration: 800,
            easing: 'easeOutCubic'
        });
    }

    animateAboutSection() {
        if (typeof anime === 'undefined') return;
        
        anime({
            targets: '.about-content .section-title',
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 600,
            easing: 'easeOutCubic'
        });
        
        anime({
            targets: '.about-content .about-text',
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 600,
            delay: (el, i) => 200 + i * 100,
            easing: 'easeOutCubic'
        });
        
        anime({
            targets: '.about-content .skills-title',
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 600,
            delay: 600,
            easing: 'easeOutCubic'
        });
        
        anime({
            targets: '.about-content .skills-list',
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 600,
            delay: 800,
            easing: 'easeOutCubic'
        });
    }

    animateCards(selector) {
        if (typeof anime === 'undefined') return;
        
        anime({
            targets: selector,
            scale: [0.9, 1],
            opacity: [0, 1],
            duration: 600,
            delay: (el, i) => i * 100,
            easing: 'easeOutCubic'
        });
    }

    animateContentSwitch() {
        if (typeof anime === 'undefined') return;
        
        anime({
            targets: this.contentArea,
            opacity: [0, 1],
            translateX: [-20, 0],
            duration: 400,
            easing: 'easeOutCubic'
        });
    }

    updateActiveNav(section) {
        document.querySelectorAll('[data-nav]').forEach(link => {
            link.classList.remove('active');
            // Only add active class if it's not the front page
            if (section !== 'front' && link.dataset.nav === section) {
                link.classList.add('active');
            }
        });
    }

    updateURL(section, detail = null) {
        const url = detail ? `#${section}/${detail}` : `#${section}`;
        window.history.pushState({section, detail}, '', url);
    }

    handleInitialRoute() {
        const hash = window.location.hash.slice(1);
        const [section, detail] = hash.split('/');
        
        if (section && this.sections.includes(section)) {
            this.navigate(section, detail);
        } else {
            this.navigate('front');
        }
        
        // Ensure initial active state is set
        setTimeout(() => {
            this.updateActiveNav(this.currentSection);
        }, 100);
    }

    handlePopState(e) {
        if (e.state) {
            this.navigate(e.state.section, e.state.detail);
        }
    }
}

const router = new Router();