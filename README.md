# Gustaf Edén - Portfolio

A modern, markdown-driven portfolio website with dynamic content loading and Quartz 4 integration.

## 📁 Project Structure

```
portfolio/
├── index.html                  # Main portfolio page
├── content/
│   ├── markdown/               # Markdown content files
│   │   ├── about.md           # About page content
│   │   ├── stuff.md           # Work overview page
│   │   └── projects/          # Individual project details
│   │       ├── design-system.md
│   │       ├── e-commerce-platform.md
│   │       ├── mobile-banking-app.md
│   │       └── data-visualization-dashboard.md
│   ├── contact.html           # Contact page HTML
│   └── photos.html           # Photos page HTML
├── assets/
│   ├── css/
│   │   └── style.css         # Global styles
│   ├── js/
│   │   ├── data.js           # Photo collections data
│   │   ├── router.js         # Content routing system
│   │   └── quartz/
│   │       └── markdown-parser.js  # Markdown processing
│   ├── img/                  # Image assets
│   └── icons/               # Icon assets
├── package.json             # Dependencies and scripts
├── quartz.config.ts        # Quartz 4 configuration
└── README.md              # This file
```

## 🚀 Getting Started

### Prerequisites
- Modern web browser
- Local web server (Live Server, Python HTTP server, etc.)

### Running Locally
1. Clone or download the portfolio
2. Serve the files using a local web server:
   ```bash
   # Using Live Server (VS Code extension)
   # Right-click index.html → "Open with Live Server"
   
   # Or using Python
   python -m http.server 3000
   
   # Or using Node.js
   npx serve .
   ```
3. Open your browser to the local server URL

## ✍️ Adding New Projects

### 1. Create a Project Markdown File

Create a new file in `content/markdown/projects/` with a descriptive filename:

```bash
content/markdown/projects/my-new-project.md
```

### 2. Project Markdown Template

Use this template for new projects:

```markdown
# Project Title

*Your Role | Year*

Brief project description that appears in the overview.

## Project Overview

Detailed description of the project, its goals, and context.

## Key Features

- **Feature 1** - Description of what this does
- **Feature 2** - Another important feature
- **Feature 3** - More functionality

## Technical Challenges

Describe the main technical challenges you faced and how you solved them.

### Architecture Decisions

Explain your technical choices:
- **Frontend**: Technology choices and reasoning
- **Backend**: Server-side decisions
- **Database**: Data storage approach
- **Infrastructure**: Deployment and scaling

## Results & Impact

### Quantitative Results
- **Metric 1** - Specific improvement numbers
- **Metric 2** - Performance gains
- **Metric 3** - Business impact

### Qualitative Benefits
- Improved user experience
- Better team collaboration
- Enhanced system reliability

## Lessons Learned

### What Worked Well
- Success factors and best practices

### Areas for Improvement
- Things you'd do differently next time

**Tech Stack:** List, of, technologies, used

---

*Optional closing statement about the project's significance.*
```

### 3. Update the Stuff Overview

Edit `content/markdown/stuff.md` to include your new project in the featured projects section:

```markdown
### My New Project
*Your Role | Year*

Brief description of the new project and its impact.

**Highlights:**
- Key achievement 1
- Key achievement 2
- Key achievement 3

**Tech Stack:** Technologies used

[View Project →](projects/my-new-project)
```

### 4. Navigation

Projects automatically become accessible through:
- **Direct link**: `#stuff/my-new-project`
- **From stuff page**: Click the "View Project →" link
- **Back navigation**: "← Back to Work" button

## 📸 Adding Photos

The photo system uses JavaScript data objects. Here's how to add new photo collections:

### 1. Update Photo Data

Edit `assets/js/data.js` and uncomment/modify the `photoCollectionsData` array:

```javascript
window.photoCollectionsData = [
    {
        id: 1,
        title: 'Collection Name',
        cover: 'path/to/cover-image.jpg',
        count: 8,
        photos: [
            { src: 'path/to/photo1.jpg', caption: 'Photo description' },
            { src: 'path/to/photo2.jpg', caption: 'Another photo' },
            // Add more photos...
        ]
    },
    // Add more collections...
];
```

### 2. Photo File Organization

Organize your photos in the `assets/img/` directory:

```
assets/img/
├── photos/
│   ├── collection-1/
│   │   ├── cover.jpg
│   │   ├── photo-1.jpg
│   │   ├── photo-2.jpg
│   │   └── ...
│   └── collection-2/
│       ├── cover.jpg
│       └── ...
```

### 3. Image Optimization

For best performance:
- **Cover images**: 400x600px recommended
- **Individual photos**: 800x600px recommended  
- **Format**: WebP preferred, JPG fallback
- **Compression**: Optimize for web (70-80% quality)

### 4. Photo Collection Template

```javascript
{
    id: 1,                                    // Unique ID
    title: 'Urban Landscapes',               // Collection name
    cover: 'assets/img/photos/urban/cover.jpg',  // Cover image path
    count: 12,                               // Number of photos
    photos: [
        {
            src: 'assets/img/photos/urban/city-dawn.jpg',
            caption: 'City at dawn'
        },
        {
            src: 'assets/img/photos/urban/street-perspective.jpg', 
            caption: 'Street perspective'
        }
        // Add more photos...
    ]
}
```

## 🎨 Customizing Content

### About Page
Edit `content/markdown/about.md` to update:
- Personal bio and background
- Skills and tools
- Philosophy and approach
- Current focus areas

### Styling
The portfolio uses Tailwind CSS with custom color variables:
- `stone-gray`: #6E6E6E
- `clay-brown`: #8B5E3C
- `olive-green`: #6C7A5D
- `sand-beige`: #D6C7B0
- `charcoal-black`: #2F2F2F

### Contact Information
Edit `content/contact.html` to update:
- Email address
- Location
- Availability status
- Social media links

## 🔧 Advanced Features

### Quartz 4 Integration
For advanced markdown features, install Quartz 4:

```bash
npm install
npx quartz create
npm run build
npm run serve
```

### Custom Markdown Features
The built-in markdown parser supports:
- **Headers** with automatic styling
- **Code blocks** with syntax highlighting
- **Tech stack badges** automatic rendering
- **Project links** internal navigation
- **Blockquotes** for callouts
- **Lists and tables** structured content

### Performance Optimization
- Content is cached after first load
- Images use lazy loading
- Smooth animations with anime.js
- Responsive design for all devices

## 🚀 Deployment

### Static Hosting
The portfolio is a static site that can be deployed to:
- **GitHub Pages**
- **Netlify** 
- **Vercel**
- **AWS S3 + CloudFront**

### Build Process
No build process required for basic setup. For Quartz integration:

```bash
npm run build    # Build optimized site
npm run serve    # Preview built site
```

## 📝 Content Guidelines

### Writing Style
- Use clear, concise language
- Include specific metrics when possible
- Explain technical decisions and trade-offs
- Share lessons learned and insights

### Project Descriptions
- Start with the problem/challenge
- Explain your approach and process
- Highlight key achievements and impact
- Include relevant technical details
- End with lessons learned

### Image Standards
- High-quality, professional images
- Consistent aspect ratios within collections
- Descriptive alt text and captions
- Optimized file sizes for web

## 🔄 Maintenance

### Regular Updates
- Keep project information current
- Add new work as completed
- Update skills and technologies
- Refresh bio and contact information

### Performance Monitoring
- Check loading speeds regularly
- Optimize images as needed
- Monitor for broken links
- Test on various devices and browsers

---

## 📞 Support

For questions about this portfolio system:
- Check the browser console for errors
- Verify file paths are correct
- Ensure local server is running
- Test markdown syntax in individual files

Happy portfolio building! 🎨