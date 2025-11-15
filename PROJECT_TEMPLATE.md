# Adding New Projects - Step-by-Step Guide

## Quick Overview
This portfolio uses markdown files for project content. Each project is a standalone markdown file that gets dynamically loaded and rendered with custom styling.

## Project Structure Requirements

### 1. Create Project Markdown File
**Location**: `/content/markdown/projects/your-project-name.md`

**Naming Convention**: Use lowercase with hyphens (e.g., `climate-analyzer.md`, `my-awesome-app.md`)

### 2. Standard Project Format

```markdown
# Project Title

**Tech Stack**: Technology 1 | Technology 2 | Technology 3

Brief one-paragraph introduction describing what the project is and its primary purpose.

## Overview
Detailed description of the project, its goals, and what problem it solves.

## Key Features
- Feature 1 with description
- Feature 2 with description
- Feature 3 with description

## Technical Implementation
Details about how you built it, challenges faced, interesting solutions.

## Code Example (Optional)
\`\`\`javascript
// Example code showing key functionality
function example() {
  return "formatted code block";
}
\`\`\`

## Results/Outcome
What the project achieved, metrics, learnings, or impact.

## Links
- [Live Demo →](https://your-url.com)
- [GitHub Repository →](https://github.com/username/repo)
```

### 3. Update Project Overview Page
**File**: `/content/markdown/stuff.md`

Add your project to the list with this format:

```markdown
### [Project Title](projects/your-project-name)
Brief 1-2 sentence description of the project.

**Tech**: Technology 1, Technology 2, Technology 3
```

## Adding Images to Projects

### Option 1: Inline Images in Markdown
```markdown
![Image Description](../../assets/img/projects/your-project/screenshot.jpg)
```

### Option 2: HTML for More Control
```markdown
<img src="../../assets/img/projects/your-project/screenshot.jpg"
     alt="Description"
     class="w-full rounded-lg shadow-lg my-4">
```

### Image Organization
1. **Create project folder**: `/assets/img/projects/your-project-name/`
2. **Add images**: Place all project images in this folder
3. **Naming**: Use descriptive names (e.g., `hero-screenshot.jpg`, `feature-demo.png`)
4. **Formats**: Use `.jpg` for photos, `.png` for UI/screenshots with transparency
5. **Optimization**: Keep images under 500KB when possible

### Example Image Structure
```
assets/
└── img/
    └── projects/
        └── climate-analyzer/
            ├── hero-screenshot.jpg
            ├── dashboard-view.png
            ├── graph-example.jpg
            └── mobile-view.png
```

## Supported Markdown Features

The custom parser (`assets/js/quartz/markdown-parser.js`) supports:

### Headers
```markdown
# Main Title (h1 - used for project title)
## Section Header (h2)
### Subsection (h3)
```

### Lists
```markdown
- Unordered list item
- Another item
  - Nested item (indented with 2 spaces)
```

### Text Formatting
```markdown
**Bold text**
*Italic text* (basic support)
`inline code`
```

### Links
```markdown
[Link Text](https://external-url.com)
[Internal Project Link](projects/other-project)
[View Project →](https://demo.com) // Common pattern with arrow
```

### Code Blocks
````markdown
```javascript
function example() {
  console.log("Syntax highlighting supported");
}
```
````

### Tech Stack Badges
```markdown
**Tech Stack**: React | Node.js | PostgreSQL | AWS
```
This gets automatically styled with amber badges.

### Blockquotes
```markdown
> Important note or quote
> Can span multiple lines
```

### Horizontal Rules
```markdown
---
```

## Color Palette Reference
When adding custom HTML/styling, use these portfolio colors:

```css
bg-[#0E0E0E]      /* Shadow black - backgrounds */
text-[#ECE7E1]    /* Porcelain white - text */
bg-[#D9A441]      /* Amber glow - accents/buttons */
text-[#B5636F]    /* Film burn rose - hover states */
text-[#5FA9A8]    /* Cyan mist - cool accents */
```

## Step-by-Step Checklist

### For a New Project:
- [ ] Create markdown file: `/content/markdown/projects/project-name.md`
- [ ] Write content following the standard format above
- [ ] Create image folder: `/assets/img/projects/project-name/`
- [ ] Add optimized images to the folder
- [ ] Reference images in markdown with correct relative paths
- [ ] Update `/content/markdown/stuff.md` with project entry
- [ ] Test locally: Navigate to `#stuff` then click your project link
- [ ] Verify all images load correctly
- [ ] Check markdown renders properly (headers, lists, code)
- [ ] Test on mobile view

## Example Complete Project Entry

**File**: `/content/markdown/projects/example-app.md`

```markdown
# Example App

**Tech Stack**: React | Firebase | Tailwind CSS | Vercel

A modern web application that helps users track their daily habits with beautiful visualizations and streak tracking.

## Overview
Example App was built to solve the problem of habit tracking being too complicated. Most apps have too many features and become overwhelming. This app focuses on simplicity and visual feedback.

## Key Features
- **Streak Tracking**: Visual calendar showing your consistency
- **Smart Reminders**: Gentle notifications at your chosen times
- **Beautiful UI**: Clean, minimal interface with smooth animations
- **Data Export**: Download your progress as CSV or JSON

## Technical Implementation
Built with React for the frontend and Firebase for real-time data sync. Used Tailwind CSS for rapid UI development and Anime.js for smooth transitions.

![Dashboard Screenshot](../../assets/img/projects/example-app/dashboard.jpg)

The biggest challenge was implementing offline-first functionality. Solved this using Firebase's local persistence and conflict resolution.

```javascript
// Example: Habit completion logic
const completeHabit = async (habitId) => {
  const today = new Date().toISOString().split('T')[0];
  await updateDoc(doc(db, 'habits', habitId), {
    [`completions.${today}`]: true,
    streak: increment(1)
  });
};
```

## Results
- 500+ active users in first month
- 4.8/5 average rating on Product Hunt
- Featured in "Best Productivity Apps 2024" article

## Links
- [Live Demo →](https://example-app.vercel.app)
- [GitHub Repository →](https://github.com/username/example-app)
```

**Update**: `/content/markdown/stuff.md`

```markdown
### [Example App](projects/example-app)
A simple, beautiful habit tracker with streak visualization and offline support.

**Tech**: React, Firebase, Tailwind CSS
```

## Common Mistakes to Avoid

1. **Wrong file paths**: Use `../../assets/img/` for images from project markdown
2. **Inconsistent naming**: Stick to lowercase-with-hyphens
3. **Forgetting to update stuff.md**: Your project won't appear in the overview
4. **Large images**: Optimize before adding (use tools like TinyPNG)
5. **Missing alt text**: Always add descriptions for accessibility
6. **Broken links**: Test all external and internal links
7. **Inconsistent formatting**: Follow the standard structure

## Testing Your Project

1. **Start dev server**: `npm run dev`
2. **Navigate to**: `http://localhost:3000/#stuff`
3. **Click your project**: Should load without errors
4. **Check console**: Look for 404s or loading errors
5. **Test images**: All should load and display correctly
6. **Test links**: Click all external and internal links
7. **Mobile view**: Resize browser to check responsive layout
8. **Back navigation**: Click browser back button - should work smoothly

## Notes for Claude Code

When asked to create a new project:

1. Ask the user for:
   - Project name/title
   - Technologies used
   - Brief description
   - Key features or highlights
   - Any links (GitHub, live demo, etc.)
   - Whether they have images ready

2. Create the markdown file with proper structure
3. Update stuff.md with the new project entry
4. If images are provided, create the folder structure
5. Provide the user with the image folder path for their files
6. Test the routing by checking router.js handles the path correctly

The router automatically handles `/projects/project-name` URLs, no code changes needed for new projects!
