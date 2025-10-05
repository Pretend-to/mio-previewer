# Changelog

## 0.1.8 - 2025-10-05

### Chore
- **Temporary Worker Disable**: Temporarily disabled worker-based parsing by default in `MdRenderer` via `TEMP_DISABLE_WORKER = true`.
  - This is a reversible, short-term change intended to simplify debugging and environments where workers are problematic.
  - To re-enable worker parsing set `TEMP_DISABLE_WORKER = false` in `src/MdRenderer.vue` or remove the temporary guard.

### Notes
- This release contains only behavioral changes (no public API changes) and is safe to upgrade to. The worker code remains in place for easy reversion.

## 0.1.7 - 2025-10-05

### Features
- **Cursor Plugin: Circle Shape**: Added `'circle'` option to cursor plugin
  - New shape option joins existing `'square'` and `'line'` shapes
  - Circle cursor size: 8px × 8px with 50% border-radius
  - Perfect for modern, minimalist designs (especially with black color)

### Improvements
- **Cursor Animation**: Improved blink animation from abrupt visibility toggle to smooth opacity fade
  - Before: Used `step-end` animation causing cursor to suddenly appear/disappear
  - After: Smooth opacity transition (1 → 0.2 → 1) using `ease-in-out` over 1.2s
  - Better visual experience with more natural, eye-friendly animation
- **Simplified Cursor API**: Removed unused `blinkSpeed` option from CursorPluginOptions
  - Standardized animation speed for consistency across all cursor shapes

### Example Usage
```typescript
// Circle cursor with black color (recommended)
{ plugin: cursorPlugin, options: { shape: 'circle', color: '#000' } }

// Circle cursor with custom color
{ plugin: cursorPlugin, options: { shape: 'circle', color: '#0066ff' } }
```

## 0.1.6 - 2025-10-05

### Improvements
- **CodeBlock iframe preview**: Increased max height from 800px to 1000px for better content display
- **Animation performance**: Reduced transition time from 0.2s to 0.1s for snappier iframe height adjustments
- **MdRenderer flexibility**: Removed opinionated container styles (width, padding)
  - Users now have full control over layout through parent components
  - Only github-markdown-css is imported by default

### Refactoring
- Removed redundant CSS constraints in CodeBlock component
- Simplified MdRenderer styles for better composability

## 0.1.5 - 2025-10-05

### Features
- **HTML Preview Auto-Height**: CodeBlock component now auto-adjusts iframe height for HTML previews
  - Uses postMessage API to communicate height between iframe and parent component
  - Supports multiple MdRenderer instances with unique iframe IDs to prevent message conflicts
  - Height constraints: min 100px, max 800px with smooth transitions
  - Monitors content changes via ResizeObserver, MutationObserver, and periodic polling

### Improvements
- **TypeScript Type Safety**: Removed obsolete `types-shims.d.ts` to use official Vue 3 types
  - Fixed type annotations in `CodeBlock.vue` (added return types, proper ref types)
  - Fixed type annotations in `MermaidDiagram.vue` (proper ref generics)
  - Better IDE support and type checking

### Documentation
- Added release workflow documentation to `.github/copilot-instructions.md`
  - Clear 7-step release process for AI agents and contributors
  - Includes version update, changelog, git tagging, and automated npm publishing

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
