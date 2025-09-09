# Personal Website - Product Requirements Document (Revised v2)

## Project Overview

### Purpose
Build a radically simple personal website with a sophisticated dark aesthetic, showcasing projects through graceful animations that enhance rather than distract from the content.

### Inspiration
- Primary: https://www.nunonogueira.com (structure and restraint)
- Dark aesthetic: felixdorner.de, justinjay.wang
- Animation philosophy: Subtle, purposeful, leaves room for one major interactive element

### Technical Stack
- **Hosting**: GitHub Pages
- **Framework**: Tailwind CSS + Alpine.js + anime.js
- **Type**: Static site with progressive enhancement
- **Philosophy**: Fast, accessible, subtly animated

## Design Specifications

### Color Palette
```css
--stone-gray: #6E6E6E     /* Primary text, subtle elements */
--clay-brown: #8B5E3C     /* Warm accents, links, highlights */
--olive-green: #6C7A5D    /* Secondary accents, tags, states */
--sand-beige: #D6C7B0     /* Light text, borders, dividers */
--charcoal-black: #2F2F2F /* Background, cards, containers */
```

### Dark Theme Hierarchy
- **Primary Background**: Charcoal Black (#2F2F2F)
- **Secondary Background**: Slightly lighter for cards/sections
- **Primary Text**: Sand Beige (#D6C7B0)
- **Secondary Text**: Stone Gray (#6E6E6E)
- **Interactive Elements**: Clay Brown (#8B5E3C)
- **Accent Details**: Olive Green (#6C7A5D)

## Animation Philosophy with anime.js

### Core Principles
- **Graceful Enhancement**: Site works perfectly with animations disabled
- **Subtle by Default**: Most animations are barely noticeable micro-interactions
- **Performance First**: 60fps, transform/opacity only, respect reduced-motion
- **Future-Proof**: Reserve visual space and performance budget for one major animation feature

### Animation Inventory

#### Micro-Animations (Always Present)
```javascript
// Text reveals
- Paragraph fade-in on scroll (opacity: 0 → 1, translateY: 20px → 0)
- Staggered list items (50ms delay between items)

// Navigation
- Hover underline growth (scaleX: 0 → 1, transform-origin: left)
- Active page indicator slide

// Interactive feedback
- Button/link hover (subtle scale: 1 → 1.02)
- Project card hover (slight y-movement: 0 → -2px)
```

#### Signature Animations (Selective Use)
```javascript
// Page load
- Hero text: letter-by-letter reveal with slight bounce
- Logo/name: gentle fade-in with delay

// Project showcase
- Cards: entrance from bottom with stagger (translateY: 40px → 0)
- Images: gentle parallax on scroll (subtle translateY movement)

// Page transitions
- Fade overlay between pages (if implementing SPA-style nav)
```

#### Reserved Animation Space
- **Major Interactive Element**: TBD - could be:
  - Hero section with mouse-follow effects
  - Interactive project timeline
  - Animated skill visualization
  - Creative contact form interaction
  - Dynamic background element

### anime.js Implementation Strategy
```javascript
// Global animation settings
const animationConfig = {
  duration: 600,
  easing: 'easeOutCubic',
  delay: (el, i) => i * 50 // Stagger timing
}

// Respect user preferences
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

## Technical Architecture

### Core Stack Integration
- **Tailwind CSS**: Utility-first styling with custom color palette
- **Alpine.js**: Lightweight reactivity for UI states (menu toggles, theme switching)
- **anime.js**: Graceful animations with performance focus

### File Structure
```
/
├── index.html
├── projects.html
├── about.html
├── contact.html
├── project/
│   └── [project-pages].html
├── css/
│   └── main.css (Tailwind + custom properties)
├── js/
│   ├── animations.js (anime.js implementations)
│   └── app.js (Alpine.js components)
└── images/
    └── [optimized assets]
```

### Performance Targets
- **Load time**: < 2s on 3G
- **Animation performance**: Consistent 60fps
- **Bundle size**: 
  - Tailwind: ~30KB (purged)
  - Alpine.js: ~15KB
  - anime.js: ~17KB
  - Total JS: < 50KB

## Core Features & Functionality

### 1. Navigation & Transitions
- Fixed header with subtle background blur on scroll
- Smooth page transitions (if SPA approach)
- Animated navigation indicators
- Mobile-friendly hamburger with elegant open/close

### 2. Project Showcase
```html
<!-- Example project card structure -->
<article x-data="projectCard" class="group cursor-pointer">
  <div class="overflow-hidden rounded-lg bg-charcoal-black/50">
    <img class="parallax-img" src="project-thumb.jpg" alt="">
    <div class="p-6">
      <h3 class="text-sand-beige group-hover:text-clay-brown">Project Name</h3>
      <p class="text-stone-gray">Brief description...</p>
      <span class="text-olive-green text-sm">Web Design</span>
    </div>
  </div>
</article>
```

### 3. Dark Theme Advantages
- Reduced eye strain for portfolio browsing
- Makes colorful project images pop
- Professional, sophisticated aesthetic
- Distinctive in a light-theme dominated web

## Content Structure

### Homepage Sections
1. **Hero**: Large typography introduction with subtle animation
2. **Featured Work**: 3-4 projects with entrance animations
3. **Brief About**: 2-3 sentences with fade-in on scroll
4. **Contact CTA**: Simple, animated call-to-action

### Project Pages
- Hero image with parallax scroll effect
- Project details with staggered text reveals
- Image galleries with subtle hover effects
- Next/previous project navigation with transitions

## Implementation Priorities

### Phase 1 (Foundation)
1. Tailwind setup with custom color palette
2. Basic dark theme implementation
3. Core page structure and navigation
4. Essential Alpine.js interactions

### Phase 2 (Animation Layer)
1. anime.js integration and configuration
2. Micro-animations for all interactive elements
3. Scroll-triggered content reveals
4. Page load animations

### Phase 3 (Signature Feature)
1. Design and implement the major animation element
2. Performance optimization and testing
3. Accessibility enhancements
4. Cross-browser testing

## Unique Differentiators

### What Makes This Special
1. **Sophisticated Dark Aesthetic**: Professional, not gaming/hacker
2. **Restrained Animation**: Enhances usability rather than showing off
3. **Warm Color Accents**: Clay and olive tones humanize the dark palette
4. **Future-Ready**: Architecture supports adding one major interactive feature
5. **Performance Conscious**: Fast loading despite animation library

### Animation Restraint Examples
```javascript
// DON'T: Overwhelming
anime({
  targets: '.project-card',
  rotate: [0, 360],
  scale: [1, 1.2, 1],
  duration: 2000,
  loop: true
})

// DO: Subtle enhancement
anime({
  targets: '.project-card',
  translateY: [20, 0],
  opacity: [0, 1],
  duration: 600,
  delay: (el, i) => i * 100
})
```

## Success Metrics
- Loads fast (< 2s) despite dark background and animations
- Animations feel natural and enhance the experience
- Dark theme is comfortable for extended viewing
- Leaves visitors wanting to see more work
- Provides clear path to contact/hire

---

**Core Philosophy**: Sophisticated restraint. Every animation serves a purpose. The dark palette creates focus. The warm accents add humanity. The site should feel polished and professional, not flashy or gimmicky.

**The Animation Test**: If removing an animation makes the site feel broken, it's essential. If removing it makes no difference, cut it.