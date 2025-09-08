// Projects data and functionality
const projects = [
    {
        id: 1,
        title: 'E-Commerce Platform',
        category: 'Web Development',
        description: 'A modern e-commerce solution with real-time inventory management and seamless checkout experience.',
        image: 'images/project-1.jpg',
        date: '2024-03-15',
        featured: true,
        tags: ['React', 'Node.js', 'MongoDB'],
        link: 'projects/ecommerce.html'
    },
    {
        id: 2,
        title: 'Brand Identity Design',
        category: 'Design',
        description: 'Complete brand identity package including logo design, color palette, and brand guidelines.',
        image: 'images/project-2.jpg',
        date: '2024-02-28',
        featured: true,
        tags: ['Branding', 'UI/UX', 'Figma'],
        link: 'projects/brand-identity.html'
    },
    {
        id: 3,
        title: 'Mobile Banking App',
        category: 'Mobile Development',
        description: 'Intuitive mobile banking application with biometric authentication and real-time transactions.',
        image: 'images/project-3.jpg',
        date: '2024-01-20',
        featured: true,
        tags: ['React Native', 'TypeScript', 'Firebase'],
        link: 'projects/mobile-banking.html'
    },
    {
        id: 4,
        title: 'Data Visualization Dashboard',
        category: 'Web Development',
        description: 'Interactive dashboard for complex data visualization with real-time updates and custom charts.',
        image: 'images/project-4.jpg',
        date: '2024-01-10',
        featured: false,
        tags: ['D3.js', 'Vue.js', 'WebSocket'],
        link: 'projects/data-dashboard.html'
    }
];

// Load featured projects on homepage
function loadFeaturedProjects() {
    const container = document.querySelector('.projects-grid');
    if (!container) return;
    
    const featured = projects.filter(p => p.featured).slice(0, 3);
    
    featured.forEach((project, index) => {
        const card = createProjectCard(project);
        container.appendChild(card);
    });
}

// Create project card element
function createProjectCard(project) {
    const card = document.createElement('article');
    card.className = 'project-card';
    card.innerHTML = `
        <div class="project-image">
            <img src="${project.image}" alt="${project.title}" loading="lazy">
        </div>
        <div class="project-content">
            <span class="project-category">${project.category}</span>
            <h3 class="project-title">${project.title}</h3>
            <p class="project-description">${project.description}</p>
            <time class="project-date">${formatDate(project.date)}</time>
        </div>
    `;
    
    // Add click handler
    card.addEventListener('click', () => {
        navigateToProject(project.link);
    });
    
    // Add hover animation
    card.addEventListener('mouseenter', () => {
        anime({
            targets: card.querySelector('.project-image img'),
            scale: 1.05,
            duration: 300,
            easing: 'easeOutQuad'
        });
    });
    
    card.addEventListener('mouseleave', () => {
        anime({
            targets: card.querySelector('.project-image img'),
            scale: 1,
            duration: 300,
            easing: 'easeOutQuad'
        });
    });
    
    return card;
}

// Navigate to project
function navigateToProject(link) {
    const transition = document.querySelector('.page-transition');
    
    anime({
        targets: transition,
        scaleY: [0, 1],
        duration: 500,
        easing: 'easeInOutExpo',
        complete: () => {
            window.location.href = link;
        }
    });
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Filter projects
function filterProjects(category) {
    const filtered = category === 'all' 
        ? projects 
        : projects.filter(p => p.category.toLowerCase() === category.toLowerCase());
    
    const container = document.querySelector('.projects-grid');
    
    // Animate out existing cards
    anime({
        targets: '.project-card',
        scale: 0,
        opacity: 0,
        duration: 300,
        easing: 'easeInQuad',
        complete: () => {
            container.innerHTML = '';
            
            // Add filtered projects
            filtered.forEach((project, index) => {
                const card = createProjectCard(project);
                card.style.opacity = '0';
                card.style.transform = 'scale(0)';
                container.appendChild(card);
            });
            
            // Animate in new cards
            anime({
                targets: '.project-card',
                scale: [0, 1],
                opacity: [0, 1],
                delay: anime.stagger(100),
                duration: 500,
                easing: 'easeOutQuad'
            });
        }
    });
}

// Search projects
function searchProjects(query) {
    const results = projects.filter(p => 
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase()) ||
        p.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );
    
    displaySearchResults(results);
}

// Display search results
function displaySearchResults(results) {
    const container = document.querySelector('.projects-grid');
    
    if (results.length === 0) {
        container.innerHTML = '<p class="no-results">No projects found matching your search.</p>';
        return;
    }
    
    container.innerHTML = '';
    results.forEach(project => {
        const card = createProjectCard(project);
        container.appendChild(card);
    });
    
    // Animate results
    anime({
        targets: '.project-card',
        translateY: [30, 0],
        opacity: [0, 1],
        delay: anime.stagger(100),
        duration: 500,
        easing: 'easeOutQuad'
    });
}

// Initialize projects
document.addEventListener('DOMContentLoaded', () => {
    loadFeaturedProjects();
    
    // Set up filter buttons if on projects page
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Filter projects
            filterProjects(btn.dataset.category);
        });
    });
    
    // Set up search if on projects page
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            if (query.length > 2) {
                searchProjects(query);
            } else if (query.length === 0) {
                loadFeaturedProjects();
            }
        });
    }
});

// Export for use in other modules
window.projectsData = projects;