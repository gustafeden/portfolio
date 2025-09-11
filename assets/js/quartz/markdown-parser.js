class MarkdownParser {
    constructor() {
        this.cache = {};
    }

    async parseMarkdown(content) {
        // Convert markdown to HTML with Quartz-style features
        let html = content;

        // Headers
        html = html.replace(/^# (.+)$/gm, '<h1 class="text-3xl font-light mb-8 text-sand-beige">$1</h1>');
        html = html.replace(/^## (.+)$/gm, '<h2 class="text-2xl font-light mt-12 mb-4 text-sand-beige">$1</h2>');
        html = html.replace(/^### (.+)$/gm, '<h3 class="text-xl font-light mt-8 mb-3 text-sand-beige">$1</h3>');

        // Paragraphs
        html = html.replace(/^([^#\-\*\>\|\n].+)$/gm, '<p class="text-stone-gray mb-4 leading-relaxed">$1</p>');

        // Bold and italic
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-sand-beige font-medium">$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em class="text-sand-beige">$1</em>');

        // Code blocks
        html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre class="bg-stone-gray/10 rounded-lg p-4 mb-4 overflow-x-auto"><code class="text-sm text-sand-beige">${this.escapeHtml(code.trim())}</code></pre>`;
        });

        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code class="bg-stone-gray/20 px-2 py-1 rounded text-sm text-sand-beige">$1</code>');

        // Links - handle both external and internal project links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
            // Check if it's a project link (projects/slug format)
            if (url.startsWith('projects/')) {
                const projectSlug = url.replace('projects/', '');
                return `<a href="#" onclick="router.navigateToProject('${projectSlug}')" class="text-clay-brown hover:text-sand-beige transition underline">${text}</a>`;
            }
            // Regular external link
            return `<a href="${url}" class="text-clay-brown hover:text-sand-beige transition underline">${text}</a>`;
        });

        // Blockquotes
        html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-clay-brown pl-6 py-2 mb-4 italic text-sand-beige bg-stone-gray/5">$1</blockquote>');

        // Unordered lists
        html = html.replace(/^- (.+)$/gm, '<li class="text-stone-gray mb-2">$1</li>');
        html = html.replace(/(<li.*<\/li>)/s, '<ul class="list-disc list-inside space-y-2 mb-4 ml-4">$1</ul>');
        html = html.replace(/(<\/li>\s*<li)/g, '$1');

        // Horizontal rules
        html = html.replace(/^---$/gm, '<hr class="border-stone-gray/20 my-8">');

        // Clean up empty paragraphs
        html = html.replace(/<p class="[^"]*"><\/p>/g, '');

        // Tech stack highlighting
        html = html.replace(/\*\*Tech Stack:\*\* (.+)/g, (match, stack) => {
            const techs = stack.split(',').map(tech => tech.trim());
            const techTags = techs.map(tech => `<span class="px-2 py-1 bg-stone-gray/20 rounded text-xs">${tech}</span>`).join(' ');
            return `<div class="mt-4 mb-6"><span class="text-sand-beige font-medium">Tech Stack:</span><div class="flex flex-wrap gap-2 mt-2">${techTags}</div></div>`;
        });

        // Project metadata (role and year)
        html = html.replace(/\*(.+?) \| (.+?)\*/g, '<div class="text-sm text-stone-gray mb-2"><span class="text-sand-beige">$1</span> | $2</div>');

        // Clean up line breaks
        html = html.replace(/\n\n+/g, '\n').replace(/\n/g, ' ');

        return html;
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