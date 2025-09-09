# Local Development Setup Guide

This guide will help you set up a local development environment to test and develop the portfolio website.

## 🚀 Quick Start

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, or Edge)
- Command line interface (Terminal, PowerShell, or Command Prompt)
- One of the following for a local server:
  - **Python** (usually pre-installed on Mac/Linux)
  - **Node.js** (recommended for web development)
  - **PHP** (if you prefer)
  - **VS Code** with Live Server extension (easiest option)

## 📋 Setup Options

### Option 1: VS Code Live Server (Recommended for Beginners)

**Step 1: Install VS Code**
1. Download from [code.visualstudio.com](https://code.visualstudio.com/)
2. Install the application

**Step 2: Install Live Server Extension**
1. Open VS Code
2. Go to Extensions (Ctrl/Cmd + Shift + X)
3. Search for "Live Server" by Ritwick Dey
4. Click "Install"

**Step 3: Open Project**
1. Open VS Code
2. File → Open Folder → Select your portfolio folder
3. Right-click on `index.html`
4. Select "Open with Live Server"
5. Your browser will automatically open to `http://127.0.0.1:5500`

**Benefits:**
- ✅ Automatic browser refresh on file changes
- ✅ No command line needed
- ✅ Easy to use
- ✅ Built-in file explorer

---

## 🛠️ Development Workflow

### Recommended Development Setup

1. **File Structure Check**
   ```
   portfolio/
   ├── index.html
   ├── about.html
   ├── contact.html
   ├── projects/
   │   └── index.html
   ├── js/
   │   └── app.js
   ├── images/
   ├── manifest.json
   ├── sitemap.xml
   └── robots.txt
   ```

2. **Browser Developer Tools**
   - Open Developer Tools (F12 or Ctrl/Cmd + Shift + I)
   - Use Console tab to check for JavaScript errors
   - Use Network tab to monitor loading performance
   - Use Lighthouse tab for performance auditing

3. **Testing Checklist**
   - ✅ All pages load correctly
   - ✅ Navigation works between pages
   - ✅ Animations play smoothly
   - ✅ Mobile responsive design works
   - ✅ Contact form validation works
   - ✅ Color palette copy functionality works
   - ✅ Search and filtering works on projects page

### Hot Reload Setup (VS Code Live Server)

**Benefits of Live Server:**
- Automatic page refresh when you save files
- Synchronized scrolling across devices
- No need to manually refresh browser
- Real-time CSS changes

**Usage Tips:**
1. Keep Developer Tools open to monitor console
2. Use mobile device simulation (F12 → Toggle Device Toolbar)
3. Test different screen sizes and orientations

## 🧪 Testing Guidelines

### Cross-Browser Testing

**Test in Multiple Browsers:**
- Chrome (primary development)
- Firefox 
- Safari (Mac users)
- Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

**Common Issues to Check:**
- CSS animations work properly
- JavaScript functionality works
- Fonts load correctly
- Images display properly
- Mobile touch interactions work

### Performance Testing

**Lighthouse Audit:**
1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Run audit for:
   - Performance
   - Accessibility  
   - Best Practices
   - SEO

**Target Scores:**
- Performance: >90
- Accessibility: >90
- Best Practices: >90
- SEO: >90

### Mobile Testing

**Responsive Design Testing:**
1. Use Chrome DevTools Device Simulation
2. Test common breakpoints:
   - Mobile: 375px, 414px
   - Tablet: 768px, 1024px
   - Desktop: 1280px, 1920px

**Touch Testing:**
- Ensure buttons are large enough (44px minimum)
- Test swipe gestures
- Check hover states convert to touch properly

## 🔧 Troubleshooting

### Common Issues

**1. "Cannot GET /" Error**
- **Problem**: Direct file opening instead of server
- **Solution**: Use one of the server options above
- **Why**: JavaScript modules and CORS require a server environment

**2. Animations Not Working**
- **Problem**: anime.js not loading from CDN
- **Solution**: Check network connection and console for errors
- **Alternative**: Download anime.js locally

**3. Styles Not Loading**
- **Problem**: Tailwind CSS CDN not loading
- **Solution**: Check network connection
- **Alternative**: Use local Tailwind CSS build

**4. Mobile Navigation Not Working**
- **Problem**: JavaScript errors on mobile
- **Solution**: Check mobile browser console
- **Check**: Touch event handlers in Alpine.js

**5. Images Not Loading**
- **Problem**: Placeholder images from external services
- **Solution**: Replace with local images or check network
- **Note**: Placeholder services may have rate limits

### Debug Mode

**Enable Console Logging:**
Add to any HTML file's `<head>`:
```html
<script>
// Enable verbose logging
window.DEBUG = true;
console.log('Debug mode enabled');
</script>
```

**Performance Monitoring:**
```javascript
// Add to app.js for performance tracking
window.addEventListener('load', () => {
    console.log('Page loaded in:', performance.now(), 'ms');
});
```

## 📱 Mobile Development

### iOS Testing (Mac Required)

**Using Simulator:**
1. Install Xcode from App Store
2. Open Simulator app
3. Choose iPhone/iPad model
4. Open Safari and navigate to `http://YOUR_COMPUTER_IP:8000`

**Finding Your IP:**
```bash
# Mac/Linux
ifconfig | grep inet
# Windows
ipconfig
```

### Android Testing

**Using Android Emulator:**
1. Install Android Studio
2. Create virtual device
3. Open Chrome and navigate to your local server

**Physical Device Testing:**
1. Connect to same WiFi network
2. Navigate to `http://YOUR_COMPUTER_IP:8000`
3. Enable USB debugging for remote inspection

## 🚀 Production Deployment Test

### GitHub Pages Simulation

**Test Production Build:**
1. Ensure all paths are relative (no leading `/`)
2. Test from subdirectory: `http://localhost:8000/portfolio/`
3. Verify all links work with `/portfolio/` prefix

**Pre-deployment Checklist:**
- ✅ All links are relative or absolute URLs
- ✅ Images load from correct paths
- ✅ CSS/JS resources load properly
- ✅ Manifest.json paths are correct
- ✅ Sitemap.xml URLs match final domain

## 💡 Pro Tips

### Development Efficiency

1. **Use Browser Bookmarks**
   - Bookmark `http://localhost:8000` for quick access
   - Create bookmarks for each page

2. **Keyboard Shortcuts**
   - `Ctrl/Cmd + R`: Refresh page
   - `Ctrl/Cmd + Shift + R`: Hard refresh (bypass cache)
   - `F12`: Open Developer Tools

3. **Multi-Monitor Setup**
   - Code editor on one screen
   - Browser with DevTools on another
   - Mobile simulator on third screen (if available)

4. **File Watching**
   - Many servers auto-refresh on file changes
   - VS Code Live Server does this automatically
   - Watch for console errors after changes

### Code Organization

```
Development Workflow:
1. Make changes in VS Code
2. Save file (Ctrl/Cmd + S)
3. Check browser auto-refresh
4. Test functionality
5. Check console for errors
6. Test mobile responsive
7. Commit changes when working
```

---

**Ready to Start Developing!** 🎉

Choose your preferred setup method and start building. Remember to test frequently across different devices and browsers to ensure a great user experience.

For any issues not covered here, check the browser console first - it usually provides helpful error messages and debugging information.