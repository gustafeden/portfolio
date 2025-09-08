# Personal Website - Product Requirements Document

## Project Overview

### Purpose
Build a modern, minimalist personal website showcasing projects in a blog-like format with heavy emphasis on smooth, sophisticated animations using anime.js throughout the experience.

### Inspiration
- Primary: https://www.nunonogueira.com (minimal layout, typography-focused, clean navigation)
- Modern designer portfolio trends: experimental typography, fluid animations, interactive elements

### Technical Stack
- **Hosting**: GitHub Pages
- **Type**: Static site (HTML, CSS, JavaScript)
- **Animation Library**: anime.js (use extensively for all animations)
- **Build**: Keep simple for GitHub Pages compatibility

## Core Features & Functionality

### 1. Navigation & Page Transitions
- Smooth page transitions using anime.js
- Animated navigation menu (subtle hover effects, morphing underlines)
- Scroll-triggered animations for content reveal
- Magnetic cursor effects on interactive elements

### 2. Project Showcase
- Blog-style project listing with animated cards
- Each project should have:
  - Title with animated text reveal
  - Preview image with hover parallax effect
  - Brief description with staggered text animation
  - Tags/categories with animated pills
  - Date posted
- Filter projects by category with animated transitions
- Individual project pages with rich media support

### 3. Interactive Design Elements
- **Live Color Palette Display**:
  - Floating color swatches that animate on scroll
  - Click to copy hex codes with animated feedback
  - Color transitions throughout the site
- **Typography Showcase**:
  - Animated type specimens
  - Variable font weight animations
- **Grid System Visualization**:
  - Subtle grid overlay toggle with anime.js fade

### 4. Social Links
- Instagram, GitHub, LinkedIn, etc.
- Animated icon hover states (rotate, scale, color shift)
- Possibly a creative "link tree" style section

## Information Architecture

### Pages Structure

```
/
├── index.html (Home)
├── projects/
│   ├── index.html (All projects)
│   └── [project-name].html (Individual projects)
├── about.html
└── contact.html
```

### Homepage Sections
1. **Hero Section**:
   - Large typographic introduction
   - Animated text reveal on load (letter by letter or word by word)
   - Subtle floating/breathing animation loop
   - Scroll indicator with bounce animation

2. **Featured Projects**:
   - 3-4 latest projects
   - Staggered entrance animations
   - Hover effects revealing project details

3. **About Snippet**:
   - Brief introduction
   - Link to full about page
   - Animated appearance on scroll

4. **Footer**:
   - Social links
   - Copyright
   - Perhaps a fun interactive element

### Projects Page
- Grid or list layout (toggle-able with animated transition)
- Category filter with morphing animation
- Load more with staggered animations
- Search functionality with live filtering

### About Page
- Personal story/background
- Skills visualization (animated charts/bars)
- Timeline with scroll-triggered animations
- Contact CTA

## Design Specifications

### Visual Design
- **Style**: Ultra-minimal, lots of whitespace, typography-focused
- **Layout**: Asymmetric layouts, breaking the grid occasionally
- **Typography**: 
  - Large, bold headlines (possibly variable font)
  - High contrast between heading and body text
  - Experimental type treatments for special sections

### Color Palette
```
Primary Colors:
- Background: #FAFAFA (off-white)
- Text: #0A0A0A (near-black)
- Accent: #4B4BF9 (electric blue) or similar bold color

Secondary Colors:
- Gray-500: #6B7280
- Gray-300: #D1D5DB
- Success: #10B981
- Warning: #F59E0B

(Display these on-site with animated color cards)
```

### Animation Principles
- **Easing**: Use spring physics or custom bezier curves
- **Duration**: Keep most animations between 400-800ms
- **Stagger**: Use delays for group animations (50-100ms between items)
- **Interaction**: Every clickable element should have feedback
- **Performance**: Use transform and opacity for smooth 60fps

## Detailed Animation Specifications

### Global Animations
1. **Page Load**:
   - Fade in with slight upward movement
   - Staggered content reveal
   - Logo/name animation

2. **Scroll Animations**:
   - Parallax effects on images
   - Text reveals as elements enter viewport
   - Progress indicator

3. **Cursor**:
   - Custom cursor with smooth follow
   - Grows on hover of interactive elements
   - Changes color/shape based on context

### Component-Specific Animations

#### Navigation
```javascript
// Example animation concept
- Menu items slide in from top
- Underline grows from 0 to 100% width on hover
- Active state with persistent underline
- Mobile menu with curtain reveal
```

#### Project Cards
```javascript
// Hover state
- Image scales 1.05
- Overlay fades in
- Text slides up
- Shadow grows
```

#### Color Palette Display
```javascript
// Interactive behavior
- Colors float independently
- Click to expand with color details
- Copy animation with checkmark morph
- Rainbow wave effect on special trigger
```

## Content Structure

### Project Post Format
```markdown
---
title: "Project Name"
date: "2024-MM-DD"
category: "Web Design / Development / etc"
thumbnail: "/images/project-thumb.jpg"
featured: true/false
---

Project description...
```

### Required Content Sections
1. **Bio/Introduction** (2-3 sentences)
2. **Project Descriptions** (3-5 sentences each)
3. **Contact Information**
4. **Social Media Links**:
   - Instagram
   - GitHub
   - LinkedIn
   - Twitter/X (optional)
   - Dribbble/Behance (optional)

## Technical Requirements

### Performance
- Lighthouse score > 90
- Smooth 60fps animations
- Lazy load images
- Minimize anime.js animations on mobile for performance

### Responsive Design
- Mobile-first approach
- Breakpoints: 640px, 768px, 1024px, 1280px
- Touch-friendly interaction areas
- Reduced animations on mobile (respect prefers-reduced-motion)

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge - last 2 versions)
- Graceful degradation for older browsers
- Fallbacks for CSS features

### SEO & Meta
- Semantic HTML5
- OpenGraph tags
- Twitter cards
- Structured data for projects
- Sitemap.xml

## Implementation Priorities

### Phase 1 (MVP)
1. Basic site structure and navigation
2. Homepage with hero and projects
3. Project listing page
4. Essential anime.js animations
5. Mobile responsive

### Phase 2 (Enhancements)
1. Individual project pages
2. Advanced animations (cursor, parallax)
3. Color palette display
4. Category filtering
5. About page

### Phase 3 (Polish)
1. Page transitions
2. Search functionality
3. Dark mode toggle
4. Performance optimizations
5. Additional experimental features

## Special Features to Consider

1. **Konami Code** or similar easter egg triggering a special animation
2. **Time-based Greetings** with animated text
3. **Visitor Counter** with retro flip animation
4. **Theme Switcher** with morphing animation between themes
5. **Audio Reactive Elements** (optional, might be too much)

## File Structure
```
/
├── index.html
├── css/
│   ├── main.css
│   └── animations.css
├── js/
│   ├── main.js
│   ├── animations.js
│   └── projects.js
├── projects/
│   └── [project-files].html
├── images/
│   └── [project-images]
└── data/
    └── projects.json
```

## Success Metrics
- Smooth animations without jank
- Fast load times (< 3s on 3G)
- Intuitive navigation
- Memorable design that showcases creativity
- Easy to update with new projects

## Notes for Development
- Use CSS custom properties for easy theming
- Keep anime.js animations modular and reusable
- Comment code well for future updates
- Use semantic HTML throughout
- Implement a simple build process if needed for GitHub Pages
- Consider using CSS Grid and Flexbox for layouts
- Ensure all animations can be disabled for accessibility

---

*This document serves as the complete specification for building the personal website. The focus should be on creating a memorable, smooth experience that showcases both the projects and technical/design capabilities through thoughtful use of anime.js animations.*