class MarkdownParser {
    constructor() {
        this.cache = {};
    }

    async parseMarkdown(content) {
        // Convert markdown to HTML with Quartz-style features
        let lines = content.split('\n');
        let html = '';
        let inList = false;
        let listItems = [];
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            
            // Close any open list when we hit a non-list line (except empty lines)
            if (inList && !line.match(/^[\-\*]\s/) && line.trim() !== '') {
                html += '<ul class="list-disc list-inside space-y-2 mb-4 ml-4">' + listItems.join('') + '</ul>';
                listItems = [];
                inList = false;
            }
            
            // Headers
            if (line.match(/^#{1,3}\s/)) {
                if (line.match(/^# (.+)$/)) {
                    html += '<h1 class="text-3xl font-light mb-8 text-amber-glow font-mono">' + line.substring(2) + '</h1>';
                } else if (line.match(/^## (.+)$/)) {
                    html += '<h2 class="text-2xl font-light mt-12 mb-4 text-amber-glow font-mono">' + line.substring(3) + '</h2>';
                } else if (line.match(/^### (.+)$/)) {
                    html += '<h3 class="text-xl font-light mt-8 mb-3 text-amber-glow font-mono">' + line.substring(4) + '</h3>';
                }
            }
            // Lists
            else if (line.match(/^[\-\*]\s/)) {
                inList = true;
                let item = line.substring(2);
                // Process inline formatting in list items
                item = this.processInlineFormatting(item);
                listItems.push('<li class="text-porcelain-white mb-2">' + item + '</li>');
            }
            // Code blocks
            else if (line.startsWith('```')) {
                // Find the end of the code block
                let codeContent = '';
                i++; // Move to next line
                while (i < lines.length && !lines[i].startsWith('```')) {
                    codeContent += lines[i] + '\n';
                    i++;
                }
                html += '<pre class="bg-stone-gray/10 rounded-lg p-4 mb-4 overflow-x-auto"><code class="text-sm text-sand-beige font-mono">' + this.escapeHtml(codeContent.trim()) + '</code></pre>';
            }
            // Blockquotes
            else if (line.match(/^> (.+)$/)) {
                html += '<blockquote class="border-l-4 border-clay-brown pl-6 py-2 mb-4 italic text-sand-beige bg-stone-gray/5">' + line.substring(2) + '</blockquote>';
            }
            // Images
            else if (line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)) {
                const match = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
                const altText = match[1];
                const imageUrl = match[2];
                html += `<img src="${imageUrl}" alt="${altText}" class="w-full rounded-lg shadow-lg my-6">`;
            }
            // Image captions (italicized lines starting with *)
            else if (line.match(/^\*([^*]+)\*$/)) {
                const caption = line.substring(1, line.length - 1);
                html += `<p class="text-sm text-sand-beige/70 italic text-center -mt-4 mb-6">${caption}</p>`;
            }
            // Horizontal rules
            else if (line === '---') {
                html += '<hr class="border-stone-gray/20 my-8">';
            }
            // Empty lines
            else if (line.trim() === '') {
                // Skip empty lines
                continue;
            }
            // Regular paragraphs
            else {
                let para = this.processInlineFormatting(line);
                html += '<p class="text-porcelain-white mb-4 leading-relaxed font-body">' + para + '</p>';
            }
        }
        
        // Close any remaining open list
        if (inList) {
            html += '<ul class="list-disc list-inside space-y-2 mb-4 ml-4">' + listItems.join('') + '</ul>';
        }
        
        return html;
    }
    
    processInlineFormatting(text) {
        // Bold
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-sand-beige font-medium">$1</strong>');
        
        // Inline code
        text = text.replace(/`([^`]+)`/g, '<code class="bg-stone-gray/20 px-2 py-1 rounded text-sm text-sand-beige">$1</code>');
        
        // Links - handle both external and internal project links
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
            // Check if it's a project link (projects/slug format)
            if (url.startsWith('projects/')) {
                const projectSlug = url.replace('projects/', '');
                return `<a href="#" onclick="router.navigateToProject('${projectSlug}')" class="text-clay-brown hover:text-sand-beige transition underline">${linkText}</a>`;
            }
            // Regular external link
            return `<a href="${url}" class="text-clay-brown hover:text-sand-beige transition underline">${linkText}</a>`;
        });
        
        // Tech stack highlighting (for lines that start with **Tech Stack:**)
        if (text.startsWith('**Tech Stack:**')) {
            const stack = text.replace('**Tech Stack:**', '').trim();
            const techs = stack.split(',').map(tech => tech.trim());
            const techTags = techs.map(tech => `<span class="px-2 py-1 bg-stone-gray/20 rounded text-xs">${tech}</span>`).join(' ');
            return `<div class="mt-4 mb-6"><span class="text-sand-beige font-medium">Tech Stack:</span><div class="flex flex-wrap gap-2 mt-2">${techTags}</div></div>`;
        }
        
        return text;
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    async loadMarkdownContent(section) {
        if (this.cache[section]) {
            return this.cache[section];
        }

        try {
            // Handle both top-level sections and project subdirectories
            const path = section.includes('/') ? section : `${section}`;
            const response = await fetch(`content/markdown/${path}.md`);
            const markdown = await response.text();
            const html = await this.parseMarkdown(markdown);
            this.cache[section] = html;
            return html;
        } catch (error) {
            console.error(`Error loading markdown for ${section}:`, error);
            return `<div class="text-red-400">Error loading ${section} content</div>`;
        }
    }
}

// Export for use in router
window.MarkdownParser = MarkdownParser;