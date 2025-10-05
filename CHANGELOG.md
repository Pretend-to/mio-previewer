# Changelog

## 0.1.4 - 2025-10-05

### Breaking Changes
- **AlertPlugin API Change**: Refactored from `CustomPlugin` to markdown-it plugin for simpler usage
  - Before: Required separate imports for custom plugin and markdown-it container configs
  - After: Single import `{ plugin: AlertPlugin }` in `markdownItPlugins` array
  - Usage now consistent with other markdown-it plugins like `katexPlugin`

### Features
- **Simplified Plugin API**: AlertPlugin now uses same pattern as katexPlugin
  - One import, one config instead of split custom/markdown-it plugins
  - Removes need for `createAllAlertContainers` helper in most cases
  
### Improvements
- **KaTeX Output Format**: Changed from `html` to `mathml` output
  - Only keeps MathML representation, removes redundant HTML portion
  - Cleaner rendered output without duplicate content
- **CodeBlock Component**: Import Prism theme CSS directly in component
  - Ensures proper syntax highlighting styling is always included
  - Better out-of-box experience
  
### Developer Experience
- Added `createAlertPlugins` convenience helper for migration compatibility
- Updated demo to showcase new simplified plugin usage
- Cleaner imports in plugin demo file

## 0.1.3 - 2025-10-05

- Reworked package exports: main renderer available as default import `mio-previewer` and
	unified plugin entry points under `mio-previewer/plugins/custom` and
	`mio-previewer/plugins/markdown-it` for easier named imports.
- Added `mio-previewer` root CSS class to the renderer for simpler external styling.
- Updated package.json exports and types for the new subpath entries.

## 0.1.2 - 2025-01-05

- Apply GitHub markdown styles by default in MdRenderer component
- Users no longer need to manually import CSS for GitHub-style rendering

## 0.1.1 - 2025-01-05

- On-demand plugin imports with subpath exports
- Remove plugins aggregate; prefer individual plugin imports for tree-shaking
- Streamlined package structure (only dist/ published)
- CI optimizations (Node 20, skip Puppeteer downloads)
- Fix CI publish workflow (disable git-checks for detached HEAD)

## 0.1.0 - Initial release

- Plugin-based markdown renderer
- KaTeX support (inline and block delimiters)
- Mermaid diagrams with dark/light theme handling
- CodeBlock component with Prism highlighting
- Streaming-friendly rendering (skip mermaid while streaming)
- Documentation updates
