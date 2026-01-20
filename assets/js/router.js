class Router {
    constructor() {
        this.currentSection = 'front';
        this.contentArea = null;
        this.sections = ['front', 'about', 'projects', 'photos', 'contact'];
        this.markdownSections = ['about', 'projects']; // Sections that use markdown
        this.cache = {};
        this.markdownParser = new MarkdownParser();
        this.isInitialLoad = true;
        // Slideshow state
        this.slideshowPhotos = [];
        this.slideshowIndex = 0;
        this.slideshowInterval = null;
        this.currentSlideshowCollection = null;
        // Track which image element is currently showing (alternates between 'primary' and 'next')
        this.currentSlideElement = 'primary';
        this.mobileSlideElement = 'primary'; // Separate state for mobile
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.contentArea = document.getElementById('main-content');
            this.setupNavigation();
            this.handleInitialRoute();
            this.initSlideshow();
            window.addEventListener('popstate', (e) => this.handlePopState(e));

            // Handle window resize for mobile front content
            window.addEventListener('resize', () => this.handleResize());
        });
    }

    handleResize() {
        // Update mobile front content visibility on resize
        this.updateMobilePreviewVisibility(this.currentSection);
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
        this.updateMobilePreviewVisibility(section);

        // Handle direct links to photo collections
        if (section === 'photos' && subRoute) {
            await this.navigateToPhotoCollection(subRoute);
            return;
        }

        await this.loadContent(section);
        this.currentSection = section;
        this.updateURL(section, subRoute);
        this.animateContentSwitch();

        // Track page view silently
        if (window.trackPageView) {
            window.trackPageView(section);
        }

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
        // Sidebar photo now handled by slideshow - this method is kept for compatibility
    }

    updateMobilePreviewVisibility(section) {
        const mobileFront = document.getElementById('mobile-front-content');
        if (!mobileFront) return;

        // Only show on mobile (< 1024px which is Tailwind's lg breakpoint)
        const isMobile = window.innerWidth < 1024;

        if (section === 'front' && isMobile) {
            // Show on front page (mobile only)
            mobileFront.style.display = 'flex';
            if (typeof anime !== 'undefined') {
                anime({
                    targets: mobileFront,
                    opacity: [0, 1],
                    duration: 400,
                    easing: 'easeOutCubic'
                });
            } else {
                mobileFront.style.opacity = '1';
            }
        } else {
            // Hide on other pages or desktop
            if (typeof anime !== 'undefined' && mobileFront.style.display !== 'none') {
                anime({
                    targets: mobileFront,
                    opacity: [1, 0],
                    duration: 300,
                    easing: 'easeInCubic',
                    complete: () => {
                        mobileFront.style.display = 'none';
                    }
                });
            } else {
                mobileFront.style.display = 'none';
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

    async loadPhotoCollections() {
        const container = document.getElementById('photo-collections-grid');
        if (!container) return;

        // Show loading state
        container.innerHTML = '<p class="text-stone-gray col-span-full">Loading...</p>';

        // Load from Firestore + static data
        if (window.loadAllPhotoCollections) {
            await window.loadAllPhotoCollections();
        }

        if (!window.photoCollectionsData || window.photoCollectionsData.length === 0) {
            container.innerHTML = '<p class="text-stone-gray col-span-full">Coming soon.</p>';
            return;
        }

        // Group collections by year
        const collectionsByYear = {};
        window.photoCollectionsData.forEach(collection => {
            const year = collection.displayYear || new Date().getFullYear();
            if (!collectionsByYear[year]) {
                collectionsByYear[year] = [];
            }
            collectionsByYear[year].push(collection);
        });

        // Sort years newest first
        const sortedYears = Object.keys(collectionsByYear).sort((a, b) => b - a);

        // Sort collections within each year by createdAt (Jan→Dec, oldest first)
        sortedYears.forEach(year => {
            collectionsByYear[year].sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date();
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date();
                return dateA - dateB; // Oldest first within year
            });
        });

        // Build HTML with year headings
        let html = '';
        sortedYears.forEach(year => {
            // Year heading
            html += `<h3 class="col-span-full text-2xl font-light text-porcelain-white/80 mt-8 mb-4 first:mt-0">${year}</h3>`;

            // Collections for this year
            collectionsByYear[year].forEach(collection => {
                const descHtml = collection.description
                    ? `<p class="text-xs text-stone-gray/80 mt-1 line-clamp-2">${collection.description}</p>`
                    : '';
                html += `
                    <div class="photo-card relative group cursor-pointer"
                         onclick="router.navigateToPhotoCollection('${collection.id}')">
                        <img src="${collection.cover}" alt="${collection.title}" class="w-full h-64 object-cover rounded-lg">
                        <div class="absolute inset-0 bg-gradient-to-t from-charcoal-black/80 to-transparent opacity-0 group-hover:opacity-100 transition rounded-lg">
                            <div class="absolute bottom-0 left-0 p-4">
                                <h3 class="text-xl font-light">${collection.title}</h3>
                                <p class="text-sm text-stone-gray">${collection.count} photos</p>
                                ${descHtml}
                            </div>
                        </div>
                    </div>
                `;
            });
        });

        container.innerHTML = html;
        this.animateCards('.photo-card');
    }

    async navigateToProject(projectSlug) {
        try {
            // Update UI state for navigation
            this.updateActiveNav('projects');
            this.updateBackgroundOpacity('projects');
            this.updateMobilePreviewVisibility('projects');

            // Close mobile menu if open
            if (window.mobileMenuOpen) {
                window.mobileMenuOpen = false;
                document.querySelector('.mobile-menu')?.classList.remove('open');
            }

            const html = await this.markdownParser.loadMarkdownContent(`projects/${projectSlug}`);
            this.contentArea.innerHTML = `
                <div class="project-detail">
                    <button onclick="router.navigate('projects')" class="mb-6 text-porcelain-white hover:text-amber-glow transition">
                        ← Back to Projects
                    </button>
                    ${html}
                </div>
            `;
            this.currentSection = 'project-detail';
            this.updateURL('projects', projectSlug);
            this.animateContentSwitch();

            // Load dynamic content for specific projects
            if (projectSlug === 'atelier' && window.renderAtelierStats) {
                window.renderAtelierStats();
            }
            if (projectSlug === 'ourarchive' && window.renderOurArchiveStats) {
                window.renderOurArchiveStats();
            }
            if (projectSlug === 'bifrost' && window.renderBifrostStats) {
                window.renderBifrostStats();
            }

            // Track project page view
            if (window.trackPageView) {
                window.trackPageView(`projects_${projectSlug}`);
            }
        } catch (error) {
            console.error('Error loading project:', error);
            this.contentArea.innerHTML = `
                <div class="project-detail">
                    <button onclick="router.navigate('projects')" class="mb-6 text-porcelain-white hover:text-amber-glow transition">
                        ← Back to Projects
                    </button>
                    <div class="text-red-400">Error loading project content</div>
                </div>
            `;
        }
    }

    async navigateToPhotoCollection(collectionId) {
        // Update UI state for navigation
        this.updateActiveNav('photos');
        this.updateBackgroundOpacity('photos');
        this.updateMobilePreviewVisibility('photos');

        // Close mobile menu if open
        if (window.mobileMenuOpen) {
            window.mobileMenuOpen = false;
            document.querySelector('.mobile-menu')?.classList.remove('open');
        }

        // Support both string IDs (Firestore) and numeric IDs (static data.js)
        let collection = window.photoCollectionsData?.find(c =>
            c.id === collectionId || c.id === parseInt(collectionId)
        );

        // If not found in cached data, try loading directly (works for hidden collections)
        if (!collection && window.loadCollectionById) {
            collection = await window.loadCollectionById(collectionId);
        }

        if (!collection) {
            // Collection not found - show error or redirect to photos
            this.navigate('photos');
            return;
        }

        // Store current collection for lightbox navigation
        this.currentCollection = collection;
        this.currentPhotoIndex = 0;

        const html = `
            <div class="photo-collection-view">
                <button onclick="router.navigate('photos')" class="mb-6 text-stone-gray hover:text-sand-beige transition">
                    ← Back to Collections
                </button>
                <h2 class="text-3xl font-light mb-8">${collection.title}</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${collection.photos.map((photo, index) => `
                        <img src="${photo.src}" alt="${photo.caption}"
                             class="w-full rounded-lg cursor-pointer hover:opacity-90 transition"
                             onclick="router.openLightbox(${index})">
                    `).join('')}
                </div>
            </div>
        `;

        this.contentArea.innerHTML = html;
        this.currentSection = 'photos';
        this.updateURL('photos', collectionId);
        this.animateContentSwitch();
    }

    openLightbox(index) {
        if (!this.currentCollection) return;
        this.currentPhotoIndex = index;

        // Create lightbox if it doesn't exist
        let lightbox = document.getElementById('photo-lightbox');
        if (!lightbox) {
            lightbox = document.createElement('div');
            lightbox.id = 'photo-lightbox';
            lightbox.className = 'fixed inset-0 bg-black/95 z-50 hidden items-center justify-center';
            lightbox.innerHTML = `
                <button class="absolute top-4 right-4 text-white/70 hover:text-white text-4xl z-10" onclick="router.closeLightbox()">×</button>
                <button class="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-5xl z-10 px-4" onclick="router.prevPhoto()">‹</button>
                <button class="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-5xl z-10 px-4" onclick="router.nextPhoto()">›</button>
                <img id="lightbox-image" class="max-h-[90vh] max-w-[90vw] object-contain" src="" alt="">
                <div id="lightbox-caption" class="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm"></div>
            `;
            document.body.appendChild(lightbox);

            // Close on background click
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox) this.closeLightbox();
            });

            // Keyboard navigation
            document.addEventListener('keydown', (e) => {
                if (lightbox.classList.contains('hidden')) return;
                if (e.key === 'Escape') this.closeLightbox();
                if (e.key === 'ArrowLeft') this.prevPhoto();
                if (e.key === 'ArrowRight') this.nextPhoto();
            });
        }

        this.updateLightboxImage();
        lightbox.classList.remove('hidden');
        lightbox.classList.add('flex');
        document.body.style.overflow = 'hidden';
    }

    updateLightboxImage() {
        const photo = this.currentCollection.photos[this.currentPhotoIndex];
        const img = document.getElementById('lightbox-image');
        const caption = document.getElementById('lightbox-caption');

        // Track photo view
        if (window.trackPhotoView && photo.src) {
            window.trackPhotoView(photo.src, this.currentCollection?.title);
        }

        if (img) img.src = photo.src;

        if (caption) {
            let text = photo.caption || '';

            // Add EXIF info if enabled
            if (photo.showExif && photo.exif) {
                const exif = photo.exif;
                const parts = [];
                if (exif.aperture) parts.push(exif.aperture);
                if (exif.shutter) parts.push(exif.shutter);
                if (exif.iso) parts.push(`ISO ${exif.iso}`);
                if (exif.focalLength) parts.push(exif.focalLength);

                if (parts.length > 0) {
                    const exifStr = parts.join(' · ');
                    text = text ? `${text}\n${exifStr}` : exifStr;
                }
            }

            caption.innerHTML = text.replace(/\n/g, '<br>');
        }
    }

    closeLightbox() {
        const lightbox = document.getElementById('photo-lightbox');
        if (lightbox) {
            lightbox.classList.add('hidden');
            lightbox.classList.remove('flex');
            document.body.style.overflow = '';
        }
    }

    prevPhoto() {
        if (!this.currentCollection) return;
        this.currentPhotoIndex = (this.currentPhotoIndex - 1 + this.currentCollection.photos.length) % this.currentCollection.photos.length;
        this.updateLightboxImage();
    }

    nextPhoto() {
        if (!this.currentCollection) return;
        this.currentPhotoIndex = (this.currentPhotoIndex + 1) % this.currentCollection.photos.length;
        this.updateLightboxImage();
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

        // Set initial mobile front content visibility (without animation on load)
        const mobileFront = document.getElementById('mobile-front-content');
        const isMobile = window.innerWidth < 1024;
        if (mobileFront) {
            if (startSection === 'front' && isMobile) {
                mobileFront.style.display = 'flex';
                mobileFront.style.opacity = '1';
            } else {
                mobileFront.style.display = 'none';
            }
        }

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

    // ============ Sidebar Slideshow ============

    async initSlideshow() {
        // Load collections first
        if (window.loadAllPhotoCollections) {
            await window.loadAllPhotoCollections();
        }

        // Check for featured collection
        let featuredSetting = null;
        if (window.loadFeaturedSetting) {
            featuredSetting = await window.loadFeaturedSetting();
        }

        if (featuredSetting?.collectionId) {
            // Featured mode - load that collection's photos
            const collection = window.photoCollectionsData?.find(c => c.id === featuredSetting.collectionId);
            if (collection && collection.photos?.length > 0) {
                this.slideshowPhotos = collection.photos.map(photo => ({
                    src: photo.src,
                    thumbnailSrc: photo.thumbnailSrc || null,
                    caption: photo.caption || '',
                    collectionId: collection.id,
                    collectionTitle: collection.title,
                }));
                this.currentSlideshowCollection = collection;
            }
        }

        // Random mode - gather all photos from all visible collections
        if (this.slideshowPhotos.length === 0 && window.photoCollectionsData?.length > 0) {
            this.slideshowPhotos = [];
            window.photoCollectionsData.forEach(collection => {
                if (collection.photos?.length > 0) {
                    collection.photos.forEach(photo => {
                        this.slideshowPhotos.push({
                            src: photo.src,
                            thumbnailSrc: photo.thumbnailSrc || null,
                            caption: photo.caption || '',
                            collectionId: collection.id,
                            collectionTitle: collection.title,
                        });
                    });
                }
            });
            // Shuffle for random mode
            this.slideshowPhotos = this.shuffleArray(this.slideshowPhotos);
        }

        // Start slideshow if we have photos
        if (this.slideshowPhotos.length > 0) {
            this.slideshowIndex = 0;
            this.updateSidebarSlide();
            this.slideshowInterval = setInterval(() => {
                this.slideshowIndex = (this.slideshowIndex + 1) % this.slideshowPhotos.length;
                this.updateSidebarSlide();
            }, 10000); // 10 seconds
        }
    }

    updateSidebarSlide() {
        if (this.slideshowPhotos.length === 0) return;

        const photo = this.slideshowPhotos[this.slideshowIndex];

        // Use thumbnail if available, otherwise full image
        const imageSrc = photo.thumbnailSrc || photo.src;

        // Update desktop sidebar
        this.updateDesktopSlide(photo, imageSrc);

        // Update mobile preview
        this.updateMobileSlide(photo, imageSrc);

        // Preload next image in background
        this.preloadNextSlide();
    }

    updateDesktopSlide(photo, imageSrc) {
        const img = document.getElementById('sidebar-photo');
        const imgNext = document.getElementById('sidebar-photo-next');
        const loading = document.getElementById('sidebar-loading');
        const grain = document.getElementById('sidebar-grain');
        const collectionName = document.getElementById('sidebar-collection-name');
        const caption = document.getElementById('sidebar-photo-caption');

        if (!img) return;

        // Update text immediately
        if (collectionName) {
            collectionName.textContent = photo.collectionTitle;
        }
        if (caption) {
            caption.textContent = photo.caption || '';
        }

        // Check if this is the first load
        const isFirstLoad = !img.src ||
                           img.src === window.location.href ||
                           img.src === window.location.origin + '/' ||
                           img.classList.contains('invisible') ||
                           img.naturalWidth === 0;

        if (isFirstLoad) {
            if (loading) loading.style.display = 'block';
            if (!imageSrc) return;

            const showImage = () => {
                if (loading) loading.style.display = 'none';
                img.classList.remove('invisible');
                img.style.opacity = '1';
            };

            const preloader = new Image();
            preloader.onload = () => {
                img.src = imageSrc;
                setTimeout(showImage, 50);
            };
            preloader.onerror = () => {
                if (loading) loading.style.display = 'none';
            };
            preloader.src = imageSrc;
        } else {
            this.transitionGrainPulse(imageSrc, img, imgNext, loading, grain, 'desktop');
        }
    }

    updateMobileSlide(photo, imageSrc) {
        const img = document.getElementById('mobile-photo');
        const imgNext = document.getElementById('mobile-photo-next');
        const collectionName = document.getElementById('mobile-collection-name');
        const caption = document.getElementById('mobile-photo-caption');

        if (!img) return;

        // Update text immediately
        if (collectionName) {
            collectionName.textContent = photo.collectionTitle;
        }
        if (caption) {
            caption.textContent = photo.caption || '';
        }

        // Check if this is the first load
        const isFirstLoad = !img.src ||
                           img.src === window.location.href ||
                           img.src === window.location.origin + '/' ||
                           img.classList.contains('invisible') ||
                           img.naturalWidth === 0;

        if (isFirstLoad) {
            if (!imageSrc) return;

            const preloader = new Image();
            preloader.onload = () => {
                img.src = imageSrc;
                img.classList.remove('invisible');
                img.style.opacity = '1';
            };
            preloader.src = imageSrc;
        } else {
            this.transitionGrainPulse(imageSrc, img, imgNext, null, null, 'mobile');
        }
    }

    // Crossfade with Grain Pulse - alternates between two images, no swap back
    // target: 'desktop' or 'mobile' to use separate state tracking
    transitionGrainPulse(imageSrc, img, imgNext, loading, grain, target = 'desktop') {
        // Determine which is current and which is next based on state
        const stateKey = target === 'mobile' ? 'mobileSlideElement' : 'currentSlideElement';
        const currentImg = this[stateKey] === 'primary' ? img : imgNext;
        const nextImg = this[stateKey] === 'primary' ? imgNext : img;

        // Preload the new image
        const preloader = new Image();
        preloader.onload = () => {
            if (loading) loading.style.display = 'none';

            // Trigger grain burst (desktop only)
            if (grain) {
                grain.classList.remove('grain-burst');
                void grain.offsetWidth;
                grain.classList.add('grain-burst');
            }

            if (typeof anime !== 'undefined') {
                // Set up next image
                nextImg.src = imageSrc;
                nextImg.classList.remove('invisible');
                nextImg.style.opacity = '0';

                // True crossfade - fade out current while fading in next
                anime({
                    targets: currentImg,
                    opacity: [1, 0],
                    duration: 400,
                    easing: 'easeInOutQuad'
                });

                anime({
                    targets: nextImg,
                    opacity: [0, 1],
                    duration: 400,
                    easing: 'easeInOutQuad',
                    complete: () => {
                        // Just toggle which element is current - no swap back
                        this[stateKey] = this[stateKey] === 'primary' ? 'next' : 'primary';
                    }
                });
            } else {
                // Fallback - simple src swap
                nextImg.src = imageSrc;
                nextImg.style.opacity = '1';
                currentImg.style.opacity = '0';
                this[stateKey] = this[stateKey] === 'primary' ? 'next' : 'primary';
            }
        };
        preloader.onerror = () => {
            if (loading) loading.style.display = 'none';
        };
        preloader.src = imageSrc;
    }

    preloadNextSlide() {
        if (this.slideshowPhotos.length <= 1) return;
        const nextIndex = (this.slideshowIndex + 1) % this.slideshowPhotos.length;
        const nextPhoto = this.slideshowPhotos[nextIndex];
        // Preload thumbnail if available, otherwise full image
        const preloader = new Image();
        preloader.src = nextPhoto.thumbnailSrc || nextPhoto.src;
    }

    navigateToSidebarCollection() {
        if (this.slideshowPhotos.length === 0) return;
        const photo = this.slideshowPhotos[this.slideshowIndex];
        if (photo?.collectionId) {
            this.navigateToPhotoCollection(photo.collectionId);
        }
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

const router = new Router();
window.router = router;