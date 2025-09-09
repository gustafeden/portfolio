# Gustaf Eden - Personal Portfolio

A sophisticated dark-themed portfolio website built with modern web technologies, featuring smooth animations and elegant design.

## 🎨 Design Philosophy

This portfolio follows a "sophisticated restraint" philosophy with:
- **Dark aesthetic** optimized for comfortable viewing
- **Subtle animations** that enhance rather than distract
- **Warm color accents** (clay brown, olive green) that humanize the dark palette
- **Performance-first approach** with fast loading times

## 🛠 Technologies Used

- **Tailwind CSS** - Utility-first CSS framework via CDN
- **Alpine.js** - Lightweight reactive framework via CDN
- **anime.js** - Smooth animation library via CDN
- **Google Fonts** - Inter font family
- **Vanilla JavaScript** - Custom interactions and logic

## 🎨 Color Palette

```css
--stone-gray: #6E6E6E     /* Primary text, subtle elements */
--clay-brown: #8B5E3C     /* Warm accents, links, highlights */
--olive-green: #6C7A5D    /* Secondary accents, tags, states */
--sand-beige: #D6C7B0     /* Light text, borders, dividers */
--charcoal-black: #2F2F2F /* Background, cards, containers */
--charcoal-lighter: #3A3A3A /* Secondary backgrounds */
```

## 📁 Project Structure

```
/
├── index.html          # Homepage with hero and featured projects
├── projects.html       # Projects showcase with filtering
├── about.html         # About page with skills and experience
├── contact.html       # Contact form with FAQ section
├── css/
│   └── main.css       # Custom styles and utilities
├── js/
│   ├── animations.js  # anime.js animation implementations
│   └── app.js        # Alpine.js components and interactions
├── images/           # Optimized assets (placeholder structure)
└── project/         # Individual project pages (future expansion)
```

## ✨ Key Features

### Animation System
- **Micro-animations**: Subtle hover effects and state transitions
- **Scroll-triggered reveals**: Content appears as user scrolls
- **Staggered entrances**: Elements animate in sequence
- **Performance optimized**: 60fps animations, respects `prefers-reduced-motion`

### Interactive Components
- **Responsive navigation** with mobile hamburger menu
- **Project filtering** on projects page
- **Contact form validation** with Alpine.js
- **Accordion FAQ section**
- **Skill progress bars** with animated fills

### Accessibility & Performance
- **Semantic HTML** structure
- **ARIA labels** and proper headings
- **Reduced motion support** for accessibility
- **Fast loading** with CDN resources
- **Mobile-first responsive** design

## 🚀 Getting Started

### Local Development

1. Clone or download the project
2. Open a terminal in the project directory
3. Start a local server:
   ```bash
   # Python 3
   python3 -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   
   # Node.js
   npx http-server
   ```
4. Open `http://localhost:8000` in your browser

### GitHub Pages Deployment

This site is ready for GitHub Pages deployment:

1. Push to a GitHub repository
2. Go to Settings > Pages
3. Select source branch (usually `main`)
4. Your site will be available at `https://username.github.io/repository-name`

## 🎯 Performance Targets

- **Load time**: < 2s on 3G connection
- **Animation performance**: Consistent 60fps
- **Bundle size**: 
  - Tailwind CSS: ~30KB (via CDN)
  - Alpine.js: ~15KB (via CDN)
  - anime.js: ~17KB (via CDN)
  - Custom assets: < 20KB

## 🔧 Customization

### Updating Content
- Edit HTML files directly for content changes
- Modify placeholder images in project cards
- Update social media links in footer
- Customize contact information

### Styling Changes
- Color palette can be modified in the Tailwind config within each HTML file
- Additional custom styles in `css/main.css`
- Animation timing and easing in `js/animations.js`

### Adding Projects
- Add new project cards to `projects.html`
- Include appropriate `data-category` attributes for filtering
- Create individual project pages in the `/project` directory

## 📱 Browser Support

- **Modern browsers**: Chrome, Firefox, Safari, Edge (last 2 versions)
- **Mobile browsers**: iOS Safari, Chrome Mobile
- **Graceful degradation**: Works without JavaScript, enhanced with it

## 🎨 Animation Inventory

### Micro-Animations (Always Present)
- Text reveals on scroll (opacity + translateY)
- Navigation hover underlines (scaleX animation)
- Button hover effects (subtle scale + translateY)
- Project card hover (image scale + border color)

### Signature Animations (Selective Use)
- Hero text letter-by-letter reveal
- Staggered project card entrances
- Skill bar progress animations
- Page load sequences

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Feel free to fork this project and customize it for your own portfolio. If you make improvements, pull requests are welcome!

## 📞 Contact

- **Email**: hello@gustafeden.com
- **LinkedIn**: linkedin.com/in/gustafeden
- **GitHub**: github.com/gustafeden

---

Built with ❤️ using modern web technologies and a focus on performance and accessibility.