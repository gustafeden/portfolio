# Personal Website - Product Requirements Document (Revised v3)

## Project Overview

### Purpose
Build a unique single-page experience with split-screen/dynamic content loading. Left side: static navigation and identity. Right side: dynamic content that loads without page refreshes.

### Inspiration Analysis
- **felixdorner.de/concepts**: Split screen - static left sidebar with personal info, dynamic right content area
- **justinjay.wang**: Single scroll page with sections, but clicking items loads detailed views inline
- **Our Approach**: Hybrid - static left identity panel, dynamic right content that can be sections OR detailed views

### Technical Stack (CDN Only)
```html
<!-- All libraries via CDN -->
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js"></script>
```

## Unique Page Structure

### Layout Concept
```
┌─────────────────┬──────────────────────────┐
│                 │                          │
│   LEFT PANEL    │     RIGHT CONTENT        │
│   (Static)      │     (Dynamic)           │
│                 │                          │
│   - Name        │   - Default: About       │
│   - Photo       │   - Projects List        │
│   - Navigation  │   - Individual Project   │
│   - Social      │   - Contact Form         │
│                 │   - Photo Collections    │
│                 │                          │
└─────────────────┴──────────────────────────┘
```

### Left Panel (Fixed - ~35% width)
- **Name**: Large, minimalist typography with subtle anime.js effect
- **Portrait**: Professional photo, subtle hover animation
- **Navigation**: About, Work, Photos, Contact
- **Social Links**: Minimal icons
- **Background**: Charcoal Black with subtle texture/grain

### Right Panel (Dynamic - ~65% width)
- **Default State**: About section visible on load
- **Content Types**:
  - About (personal story)
  - Work overview (project grid)
  - Individual project details
  - Photo collections
  - Contact information

## Content Structure & Navigation Flow

### Navigation States
```javascript
// Default state
/
├── Left: Name + Nav + Photo
└── Right: About section

// Navigation clicks load new right content
/work
├── Left: (unchanged)
└── Right: Project grid

/work/project-name
├── Left: (unchanged) 
└── Right: Detailed project view

/photos
├── Left: (unchanged)
└── Right: Photo collection grid

/photos/collection-name
├── Left: (unchanged)
└── Right: Photo gallery view

/contact
├── Left: (unchanged)
└── Right: Contact form + info
```

### Left Panel Content

#### Name Section
```html
<!-- Animated name reveal -->
<div class="name-container">
  <h1 class="text-4xl font-light text-sand-beige">
    <span class="letter">Y</span>
    <span class="letter">o</span>
    <span class="letter">u</span>
    <span class="letter">r</span>
    <!-- etc -->
  </h1>
  <p class="text-stone-gray">Designer & Developer</p>
</div>
```

#### Navigation Menu
```html
<nav x-data="navigation" class="space-y-4">
  <a @click="loadSection('about')" class="nav-link active">About</a>
  <a @click="loadSection('work')" class="nav-link">Work</a>
  <a @click="loadSection('photos')" class="nav-link">Photos</a>
  <a @click="loadSection('contact')" class="nav-link">Contact</a>
</nav>
```

### Right Panel Content Types

#### About Section (Default)
- Brief personal story (3-4 paragraphs)
- Current focus/availability
- Skills/tools (minimal list)
- Animated text reveals on load

#### Work Section
- Grid of project thumbnails
- Each clickable to load detailed view
- Filter by type (optional)
- Hover animations with anime.js

#### Individual Project View
- Hero image
- Project description
- Role, timeline, tools
- Image gallery
- Link to live site
- "Back to Work" or "Next Project" navigation

#### Photos Section
- Grid of photo collections
- Each collection has cover image
- Click to view full collection

#### Photo Collection View  
- Large image display
- Navigation between photos
- Image metadata/captions
- Back to collections link

#### Contact Section
- Contact form
- Email, social links
- Current availability status
- Location (if relevant)

## Animation Inventory (Enhanced)

### Left Panel Animations
```javascript
// Name reveal on page load
anime({
  targets: '.name-container .letter',
  translateY: [100, 0],
  opacity: [0, 1],
  duration: 800,
  delay: (el, i) => i * 50,
  easing: 'easeOutCubic'
})

// Navigation hover effects
anime({
  targets: '.nav-link:hover',
  translateX: [0, 8],
  duration: 300
})

// Photo subtle float animation
anime({
  targets: '.profile-photo',
  translateY: [0, -5, 0],
  duration: 4000,
  loop: true,
  easing: 'easeInOutSine'
})
```

### Right Panel Transitions
```javascript
// Content switching animation
const switchContent = (newContent) => {
  // Fade out current
  anime({
    targets: '.content-area',
    opacity: [1, 0],
    translateX: [0, 20],
    duration: 300,
    complete: () => {
      // Load new content
      loadNewContent(newContent)
      // Fade in new
      anime({
        targets: '.content-area',
        opacity: [0, 1],
        translateX: [-20, 0],
        duration: 400
      })
    }
  })
}
```

### Project/Photo Grid Animations
```javascript
// Staggered grid entrance
anime({
  targets: '.grid-item',
  scale: [0.8, 1],
  opacity: [0, 1],
  duration: 600,
  delay: (el, i) => i * 100
})

// Hover effects
anime({
  targets: '.project-card:hover .project-image',
  scale: [1, 1.05],
  duration: 400
})
```

## Technical Implementation

### Alpine.js State Management
```javascript
// Global app state
document.addEventListener('alpine:init', () => {
  Alpine.data('app', () => ({
    currentSection: 'about',
    currentProject: null,
    currentPhotoCollection: null,
    
    loadSection(section) {
      this.currentSection = section
      // Trigger content switch animation
      switchContent(section)
    },
    
    loadProject(projectId) {
      this.currentProject = projectId
      this.currentSection = 'project-detail'
      switchContent('project-detail')
    }
  }))
})
```

### URL Management
```javascript
// Update URL without page refresh
const updateURL = (section, detail = null) => {
  const url = detail ? `/${section}/${detail}` : `/${section}`
  window.history.pushState({section, detail}, '', url)
}

// Handle browser back/forward
window.addEventListener('popstate', (e) => {
  if (e.state) {
    loadContent(e.state.section, e.state.detail)
  }
})
```

### Content Loading Strategy
```javascript
// Content templates stored in page or loaded via fetch
const contentTemplates = {
  about: 'about-template',
  work: 'work-grid-template', 
  'project-detail': 'project-detail-template',
  photos: 'photo-collections-template',
  'photo-collection': 'photo-gallery-template',
  contact: 'contact-template'
}
```

## Responsive Strategy

### Desktop (1024px+)
- Split screen layout as described
- Full animation suite

### Tablet (768px - 1023px)  
- Left panel becomes top header (collapsed navigation)
- Right content takes full width
- Reduced animations

### Mobile (< 768px)
- Single column layout
- Name + hamburger menu at top
- Content sections stack vertically
- Minimal animations for performance

## Color Palette Integration
```css
:root {
  --stone-gray: #6E6E6E;
  --clay-brown: #8B5E3C;
  --olive-green: #6C7A5D;
  --sand-beige: #D6C7B0;
  --charcoal-black: #2F2F2F;
}

/* Left panel styling */
.left-panel {
  background: var(--charcoal-black);
  color: var(--sand-beige);
}

/* Navigation active state */
.nav-link.active {
  color: var(--clay-brown);
  border-left: 2px solid var(--clay-brown);
}

/* Right panel */
.content-area {
  background: var(--charcoal-black);
  color: var(--sand-beige);
}
```

## Success Metrics
- Navigation feels instant and smooth
- Content transitions are elegant
- Layout works seamlessly across devices
- Unique enough to be memorable
- Professional enough for client work
- Fast loading despite animations

---

**Core Philosophy**: Create a unique browsing experience that feels like a desktop application. Left side provides consistent identity and navigation. Right side becomes a canvas for dynamic content. Every interaction should feel smooth and intentional.

**The Uniqueness Test**: Can someone describe your site's navigation in one sentence, and would that sentence be different from every other portfolio site they've seen?