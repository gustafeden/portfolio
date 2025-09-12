class Router {
    constructor() {
        this.currentSection = 'front';
        this.contentArea = null;
        this.sections = ['front', 'about', 'stuff', 'photos', 'contact'];
        this.markdownSections = ['about', 'stuff']; // Sections that use markdown
        this.cache = {};
        this.markdownParser = new MarkdownParser();
        this.isInitialLoad = true;
        // Define different images for each section
        this.sectionImages = {
            'front': '/assets/img/Photo06_7.jpeg',
            'about': '/assets/img/IMG_4051.jpeg',
            'stuff': '/assets/img/Photo06_7.jpeg',
            'photos': '/assets/img/IMG_4051.jpeg'
        };
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
        this.updateBackgroundOpacity(section);
        this.updateSidebarPhoto(section);
        await this.loadContent(section);
        this.currentSection = section;
        this.updateURL(section, subRoute);
        this.animateContentSwitch();

        // Clear initial load flag after first navigation
        if (this.isInitialLoad) {
            this.isInitialLoad = false;
        }

        if (window.mobileMenuOpen) {
            window.mobileMenuOpen = false;
            document.querySelector('.mobile-menu')?.classList.remove('open');
        }
    }

    updateBackgroundOpacity(section) {
        const bgImage = document.querySelector('.front-image-bg');
        if (bgImage) {
            if (section === 'front') {
                // Full opacity on front page
                bgImage.style.opacity = '1';
            } else {
                // Reduced opacity on other pages
                bgImage.style.opacity = '0.15';
            }
        }
    }

    updateSidebarPhoto(section) {
        const sidebarPhoto = document.getElementById('sidebar-photo');
        if (sidebarPhoto && this.sectionImages[section]) {
            // Add smooth transition if image changes
            if (sidebarPhoto.src !== window.location.origin + this.sectionImages[section]) {
                sidebarPhoto.style.opacity = '0.5';
                setTimeout(() => {
                    sidebarPhoto.src = this.sectionImages[section];
                    sidebarPhoto.style.opacity = '1';
                }, 200);
            }
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
        switch (section) {
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

    // Image transitions removed - background is now always visible

    /*handleImageTransition(fromSection, toSection) {
        if (typeof anime === 'undefined') return;

        // Check if we're on mobile (screen width < 1024px for lg breakpoint)
        const isMobile = window.innerWidth < 1024;

        // Clean up any existing transitioning images
        document.querySelectorAll('.transitioning-image').forEach(el => el.remove());

        const frontImageBg = document.querySelector('.front-image-bg');
        const sidebarPhoto = isMobile ? document.getElementById('mobile-sidebar-photo') : document.getElementById('sidebar-photo');

        // Cancel any ongoing animations
        if (frontImageBg) anime.remove(frontImageBg);
        if (sidebarPhoto) anime.remove(sidebarPhoto);
        anime.remove('.transitioning-image');

        // On mobile, keep sidebar photo always visible
        if (isMobile && sidebarPhoto) {
            sidebarPhoto.style.opacity = '1';
        }

        // Handle front background image transitions
        if (frontImageBg) {
            if (fromSection === 'front' && toSection !== 'front') {
                // Fade out and hide background image
                anime({
                    targets: frontImageBg,
                    opacity: [1, 0],
                    duration: 400,
                    easing: 'easeOutCubic',
                    complete: () => {
                        frontImageBg.style.display = 'none';
                    }
                });
            } else if (fromSection !== 'front' && toSection === 'front') {
                // Show and fade in background image
                frontImageBg.style.display = 'block';
                frontImageBg.style.opacity = '0';
                anime({
                    targets: frontImageBg,
                    opacity: [0, 1],
                    duration: 400,
                    easing: 'easeOutCubic',
                    delay: 100
                });
            }
        }

        // Skip desktop-specific animations on mobile
        if (isMobile) return;
        
        // Desktop animations for sidebar photo
        if (!sidebarPhoto) return;

        // Desktop animations - simplified for full-screen background
        if (fromSection === 'front' && toSection !== 'front') {
            // Simply fade in sidebar photo
            sidebarPhoto.style.opacity = '0';
            anime({
                targets: sidebarPhoto,
                opacity: [0, 1],
                scale: [0.95, 1],
                duration: 600,
                delay: 200,
                easing: 'easeOutCubic',
                complete: () => {
                    // Start floating animation for sidebar photo
                    anime({
                        targets: '#sidebar-photo',
                        translateY: [0, -5, 0],
                        duration: 4000,
                        loop: true,
                        easing: 'easeInOutSine'
                    });
                }
            });

        } else if (fromSection !== 'front' && toSection === 'front') {
            // Stop floating animation and fade out sidebar photo
            anime.remove('#sidebar-photo');
            sidebarPhoto.style.transform = 'translateY(0)';
            anime({
                targets: sidebarPhoto,
                opacity: [1, 0],
                scale: [1, 0.95],
                duration: 400,
                easing: 'easeOutCubic'
            });
        }
    }*/

    /*animateFrontSection() {
        if (typeof anime === 'undefined') return;

        // Handle the unified background image
        const frontImageBg = document.querySelector('.front-image-bg');
        if (frontImageBg) {
            frontImageBg.style.display = 'block';
            frontImageBg.style.opacity = '0';
            
            if (this.isInitialLoad) {
                setTimeout(() => {
                    anime({
                        targets: frontImageBg,
                        opacity: [0, 1],
                        duration: 600,
                        easing: 'easeOutCubic'
                    });
                }, 50);
            } else {
                // If not initial load, just show it immediately (coming from another page)
                frontImageBg.style.opacity = '1';
            }
        }
    }*/

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
            delay: (_, i) => 200 + i * 100,
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
            delay: (_, i) => i * 100,
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
        const indicator = document.getElementById('nav-indicator');
        const links = Array.from(document.querySelectorAll('[data-nav]'));

        // Get current active index before removing classes
        const currentActiveIndex = this.getCurrentActiveIndex(links);
        const newActiveIndex = links.findIndex(link => link.dataset.nav === section);

        // Handle collision avoidance BEFORE changing active states
        if (section !== 'front' && currentActiveIndex !== -1 && currentActiveIndex !== newActiveIndex) {
            this.handleCollisionAvoidance(links, currentActiveIndex, newActiveIndex);
        }

        // Remove active class from all links
        links.forEach(link => link.classList.remove('active'));

        if (section === 'front') {
            // Hide indicator on front page
            indicator.classList.remove('active');
            // Reset any collision animations
            links.forEach(link => {
                if (!link.style.transform.includes('translateX(12px)')) {
                    link.style.transform = '';
                }
            });
        } else {
            // Find the active link and add active class
            const activeLink = document.querySelector(`[data-nav="${section}"]`);
            if (activeLink) {
                activeLink.classList.add('active');

                // Calculate position and height for the indicator
                const nav = activeLink.parentElement;
                const linkRect = activeLink.getBoundingClientRect();
                const navRect = nav.getBoundingClientRect();

                const top = linkRect.top - navRect.top;
                const height = linkRect.height;

                // Position and show the indicator
                indicator.style.top = `${top}px`;
                indicator.style.height = `${height}px`;
                indicator.classList.add('active');
            }
        }
    }

    handleCollisionAvoidance(links, currentIndex, newIndex) {
        // Calculate which items are between current and new position
        const start = Math.min(currentIndex, newIndex);
        const end = Math.max(currentIndex, newIndex);

        // Reset all transforms first except for items we're about to animate
        links.forEach((link, i) => {
            if (i < start + 1 || i >= end) {
                link.style.transform = '';
                link.style.transition = '';
            }
        });

        // Move intermediate items aside temporarily
        for (let i = start + 1; i < end; i++) {
            const link = links[i];
            link.style.transform = 'translateX(15px)';
            link.style.transition = 'transform 0.15s ease-out';

            // Reset after animation completes
            setTimeout(() => {
                link.style.transform = '';
                link.style.transition = 'transform 0.3s ease-in';
            }, 200);
        }
    }

    getCurrentActiveIndex(links) {
        for (let i = 0; i < links.length; i++) {
            if (links[i].classList.contains('active')) {
                return i;
            }
        }
        return -1;
    }

    updateURL(section, detail = null) {
        const url = detail ? `#${section}/${detail}` : `#${section}`;
        window.history.pushState({ section, detail }, '', url);
    }

    handleInitialRoute() {
        const hash = window.location.hash.slice(1);
        const [section, detail] = hash.split('/');

        // Set initial background opacity and sidebar photo based on starting section
        const startSection = (section && this.sections.includes(section)) ? section : 'front';
        this.updateBackgroundOpacity(startSection);
        this.updateSidebarPhoto(startSection);

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