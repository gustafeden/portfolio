import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4.0 Configuration
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Gustaf Edén - Portfolio",
    enableSPA: true,
    enablePopovers: false,
    analytics: {
      provider: "google",
      tagId: "", // Add your Google Analytics tag
    },
    locale: "en-US",
    baseUrl: "gustafedn.com",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "created",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Inter",
        body: "Inter",
        code: "JetBrains Mono",
      },
      colors: {
        lightMode: {
          light: "#2F2F2F",
          lightgray: "#6E6E6E", 
          gray: "#8B5E3C",
          darkgray: "#D6C7B0",
          dark: "#D6C7B0",
          secondary: "#6C7A5D",
          tertiary: "#8B5E3C",
          highlight: "rgba(139, 94, 60, 0.15)",
        },
        darkMode: {
          light: "#2F2F2F",
          lightgray: "#6E6E6E",
          gray: "#8B5E3C", 
          darkgray: "#D6C7B0",
          dark: "#D6C7B0",
          secondary: "#6C7A5D",
          tertiary: "#8B5E3C",
          highlight: "rgba(139, 94, 60, 0.15)",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config