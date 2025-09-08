# Gustaf Eden - Portfolio Website

A modern, minimalist portfolio website showcasing creative projects with smooth animations and interactive elements.

## 🚀 Tech Stack

- **Tailwind CSS** - Utility-first CSS framework
- **Alpine.js** - Lightweight JavaScript framework  
- **Anime.js** - Animation library for smooth effects
- **GitHub Pages** - Static site hosting

## ✨ Features

- **Responsive Design** - Mobile-first approach with seamless desktop experience
- **Smooth Animations** - Professional animations using anime.js
- **Interactive Elements** - Custom cursor, hover effects, and micro-interactions
- **Project Showcase** - Dynamic project filtering and search
- **Contact Form** - Functional contact form with validation
- **Color Palette Display** - Interactive color swatches with copy-to-clipboard
- **SEO Optimized** - Semantic HTML, meta tags, and sitemap
- **Performance Focused** - Optimized loading and smooth 60fps animations
- **Accessibility** - Proper ARIA labels and keyboard navigation

## 🎨 Design Features

- **Typography-focused** design with Inter font family
- **Asymmetric layouts** breaking traditional grid patterns  
- **Experimental typography** with animated text reveals
- **Color-coded project categories** with smooth transitions
- **Konami Code easter egg** with confetti animation
- **Time-based greetings** that change throughout the day

## 📁 Project Structure

```
/
├── index.html              # Homepage
├── about.html             # About page
├── contact.html           # Contact page
├── projects/
│   └── index.html         # Projects listing
├── js/
│   └── app.js             # Main Alpine.js application
├── images/                # Project images and assets
├── sitemap.xml           # SEO sitemap
├── robots.txt            # Search engine instructions
└── README.md             # This file
```

## 🛠️ Development

### Prerequisites

- Modern web browser
- Local web server (optional, for development)

### Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/gustafeden/portfolio.git
   cd portfolio
   ```

2. Open `index.html` in your browser, or serve with a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (http-server)
   npx http-server
   
   # Using Live Server (VS Code extension)
   # Right-click index.html → "Open with Live Server"
   ```

3. Visit `http://localhost:8000` to view the site

### Customization

#### Colors
Update the Tailwind config in each HTML file:
```javascript
tailwind.config = {
    theme: {
        extend: {
            colors: {
                'accent': '#4B4BF9',    // Primary accent color
                'dark': '#0A0A0A',      // Near black text
                'light': '#FAFAFA',     // Off-white background
            }
        }
    }
}
```

#### Content
- **Projects**: Edit the `allProjects` array in `projects/index.html`
- **Skills**: Modify skill arrays in `about.html`
- **Contact Info**: Update contact details in `contact.html`
- **Social Links**: Change URLs in footer sections

#### Animations
Customize animations in `js/app.js`:
```javascript
anime({
    targets: '.element',
    translateY: [30, 0],
    opacity: [0, 1],
    duration: 800,
    easing: 'easeOutExpo'
});
```

## 🚀 Deployment

### GitHub Pages

1. Push to GitHub repository
2. Go to repository Settings → Pages  
3. Select source branch (usually `main`)
4. Site will be available at `https://username.github.io/repository-name`

### Other Platforms

- **Netlify**: Drag and drop the project folder
- **Vercel**: Connect GitHub repository  
- **Surge.sh**: Run `surge` in project directory

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)  
- Safari (latest)
- Edge (latest)

## ⚡ Performance

- **Lighthouse Score**: 90+ across all metrics
- **First Contentful Paint**: < 1s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1

## 🎯 Key Interactions

- **Custom Cursor** - Follows mouse with smooth animation (desktop only)
- **Navigation** - Hide/show on scroll with smooth transitions
- **Project Cards** - Hover effects with image scaling and shadow
- **Color Palette** - Click to copy hex codes with visual feedback
- **Mobile Menu** - Smooth slide-in animation with staggered links
- **Konami Code** - ↑↑↓↓←→←→BA for confetti easter egg

## 🔧 Maintenance

### Adding New Projects

Edit `projects/index.html` and add to the `allProjects` array:

```javascript
{
    id: 9,
    title: 'New Project',
    category: 'web development',
    description: 'Project description...',
    image: 'path/to/image.jpg',
    date: '2024-01-15',
    tags: ['React', 'TypeScript', 'Tailwind'],
    featured: true
}
```

### Updating Skills

Modify skill arrays in `about.html`:

```javascript
frontendSkills: [
    { name: 'New Framework', level: 85, animated: false }
]
```

## 📄 License

MIT License - feel free to use this as a template for your own portfolio!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes  
4. Submit a pull request

## 📞 Contact

- **Email**: hello@gustafeden.com
- **LinkedIn**: [linkedin.com/in/gustafeden](https://linkedin.com/in/gustafeden)
- **GitHub**: [github.com/gustafeden](https://github.com/gustafeden)

---

Built with ❤️ using modern web technologies