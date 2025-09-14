# Gustaf Edén Portfolio - Development Guide

## Project Overview
A modern, single-page portfolio website with markdown-driven content, dynamic routing, and smooth animations. Built with vanilla JavaScript, Tailwind CSS, and a custom markdown parser.

## Tech Stack
- **Frontend**: Vanilla JavaScript, Tailwind CSS (CDN), Anime.js
- **Content**: Markdown files, HTML templates
- **Build**: Live Server for development, Quartz 4 integration (optional)
- **Deployment**: Static site (GitHub Pages compatible)

## Color Palette (Current)
```css
shadow-black: #0E0E0E      /* Primary background */
porcelain-white: #ECE7E1   /* Primary text */
amber-glow: #D9A441        /* Accent/buttons */
film-burn-rose: #B5636F    /* Secondary accents (hover) */
cyan-mist: #5FA9A8         /* Cool balancing accent */
```

## Project Structure
```
portfolio/
├── index.html              # Main entry point with Tailwind config
├── assets/
│   ├── css/
│   │   └── style.css      # Custom styles, animations, scrollbar
│   ├── js/
│   │   ├── router.js      # SPA routing, navigation logic
│   │   ├── data.js        # Photo collections data
│   │   └── quartz/
│   │       └── markdown-parser.js  # Markdown to HTML converter
│   └── img/
│       ├── Photo06_7.jpeg # Main background image
│       └── IMG_4051.jpeg  # Secondary image
├── content/
│   ├── markdown/
│   │   ├── about.md       # About page content
│   │   ├── stuff.md       # Work/projects overview
│   │   └── projects/      # Individual project files
│   ├── front.html         # Landing page (minimal)
│   ├── photos.html        # Photo collections page
│   └── contact.html       # Contact form
└── package.json           # Dependencies and scripts
```

## Key Components

### 1. Router System (router.js)
- **Single Page Application**: All navigation handled client-side
- **Sections**: front, about, stuff, photos, contact
- **Features**:
  - Dynamic content loading with caching
  - URL hash-based routing (#section/subsection)
  - Animated transitions between sections
  - Background opacity control (full on front, 15% elsewhere)
  - Sidebar photo changes per section
  - Mobile menu support

### 2. Markdown Parser (markdown-parser.js)
- **Converts markdown to HTML** with Tailwind classes
- **Supports**:
  - Headers (h1-h3)
  - Lists (unordered)
  - Code blocks with syntax highlighting
  - Inline formatting (bold, code)
  - Links (internal project links and external)
  - Tech stack badges
  - Blockquotes
  - Horizontal rules

### 3. Navigation Features
- **Active nav indicator**: Yellow vertical line that animates
- **Collision avoidance**: Items move aside when indicator passes
- **Mobile responsive**: Hamburger menu on small screens
- **Smooth animations**: Using Anime.js library

## Development Commands
```bash
# Start development server
npm run dev          # Uses live-server on port 3000

# Quartz commands (optional)
npm run build        # Build with Quartz
npm run serve        # Serve built site
npm run preview      # Build and serve on port 8080
```

## Adding New Content

### Add a New Project
1. Create markdown file: `content/markdown/projects/project-name.md`
2. Update overview in: `content/markdown/stuff.md`
3. Link format: `[View Project →](projects/project-name)`

### Update About Section
Edit `content/markdown/about.md` with personal information, skills, and philosophy.

### Add Photo Collections
Edit `assets/js/data.js`:
```javascript
window.photoCollectionsData = [
  {
    id: 1,
    title: 'Collection Name',
    cover: 'path/to/cover.jpg',
    count: 12,
    photos: [
      { src: 'path/to/photo.jpg', caption: 'Description' }
    ]
  }
];
```

## Styling System

### Tailwind Configuration
Located in `index.html` script tag:
- Custom colors defined in tailwind.config
- Using Inter font family
- Responsive breakpoints: mobile (<768px), tablet, desktop (>1024px)

### Custom CSS (style.css)
- Navigation indicator animations
- Profile photo floating animation
- Scrollbar styling
- Mobile menu transitions
- Background image controls

## Animation System
- **Anime.js**: Handles all animations
- **Key animations**:
  - Content fade-in on route change
  - Nav indicator sliding
  - Cards scale-up on load
  - Profile photo floating effect
  - Section-specific animations

## Mobile Considerations
- Responsive navigation menu
- Touch-friendly interface
- Optimized image loading
- Simplified animations on mobile
- Proper viewport settings

## Performance Optimizations
- Content caching after first load
- Lazy loading for images
- CDN for libraries (Tailwind, Anime.js)
- Minimal JavaScript bundle
- CSS animations for smooth transitions

## Common Tasks

### Change Colors
1. Update Tailwind config in `index.html` (lines 18-30)
2. Update CSS variables in `style.css`
3. Update class names in HTML/JS files

### Modify Navigation
- Edit nav links in `index.html` (lines 85-90)
- Update sections array in `router.js` (line 5)
- Add new content files in `content/` directory

### Update Images
- Replace files in `assets/img/`
- Update paths in `router.js` sectionImages object (lines 11-16)
- For profile photos: 48x64 aspect ratio recommended

## Testing Checklist
- [ ] All navigation links work
- [ ] Content loads correctly
- [ ] Animations are smooth
- [ ] Mobile menu functions
- [ ] Background opacity changes
- [ ] Markdown renders properly
- [ ] Images load and display
- [ ] URL routing works
- [ ] Back button navigation

## Deployment Notes
- Static site - no server required
- Ensure all paths are relative
- Test on multiple browsers
- Verify mobile responsiveness
- Check console for errors
- Optimize images before deploy

## Known Issues & Solutions
1. **Content not loading**: Check file paths and console errors
2. **Animations choppy**: Reduce animation complexity on mobile
3. **Images not showing**: Verify paths are relative to root
4. **Mobile menu stuck**: Check toggleMobileMenu function
5. **Markdown not rendering**: Verify markdown syntax

## Future Enhancements
- [ ] Add dark/light theme toggle
- [ ] Implement image gallery lightbox
- [ ] Add blog/article system
- [ ] Integrate with CMS
- [ ] Add search functionality
- [ ] Implement contact form backend
- [ ] Add analytics tracking
- [ ] Create admin panel for content

## Quick Reference

### File Locations
- **Main HTML**: `/index.html`
- **Routing Logic**: `/assets/js/router.js`
- **Styles**: `/assets/css/style.css`
- **Content**: `/content/markdown/`
- **Images**: `/assets/img/`

### Key Functions
- `router.navigate(section)`: Navigate to section
- `router.navigateToProject(slug)`: Open project detail
- `markdownParser.parseMarkdown(content)`: Convert MD to HTML
- `toggleMobileMenu()`: Toggle mobile navigation

### CSS Classes
- `.nav-link`: Navigation items
- `.nav-indicator`: Active nav indicator
- `.profile-photo`: Sidebar photo
- `.content-area`: Main content container
- `.mobile-menu`: Mobile navigation panel

## Contact & Support
For questions about the portfolio system, check:
1. Browser console for errors
2. Network tab for failed requests
3. File paths and permissions
4. Local server is running
5. Markdown syntax validity