# Changelog

## 0.2.6 - 2025-10-27

### ✨ Enhancement

#### **Mermaid Component Improvements**
- **Exit Fullscreen Reset**: Added automatic zoom reset when exiting fullscreen mode in MermaidDiagram component
  - When users exit fullscreen, the diagram now automatically resets to default zoom (100%) and pan position
  - Provides better user experience by showing the complete diagram after fullscreen exit
  - Eliminates the need to manually reset zoom after exiting fullscreen

### 🔧 Internal

#### **Code Quality**
- Enhanced fullscreen state management in `MermaidDiagram.vue`
- Improved user interaction flow for diagram zoom controls

---

## 0.2.5 - 2025-10-13

### ✨ Release

#### **Quick Notes**
- Bumped package version to `0.2.5`.
- See placeholder below for changes — update with actual release notes before publishing.

---

## 0.2.7 - 2025-11-06

### ✨ Patch

- Release: publish small fixes and packaging/type improvements
  - Fix: package `types`/exports path corrected so TypeScript consumers can find declarations
  - Internal: bump version to 0.2.7

---

## 0.2.4 - 2025-10-09

### 🐛 Bug Fixes

#### **Mermaid Diagram Fullscreen Height Fix**
- **Fixed**: SVG max-height constraint now properly adjusted in fullscreen mode
- **Fullscreen**: Max-height set to `100vh` (full viewport height)
- **Normal mode**: Max-height limited to `600px` to prevent excessive display
- **Impact**: Fullscreen diagrams can now utilize full viewport height while maintaining reasonable constraints

---

## 0.2.3 - 2025-10-09

### 🚀 Performance Improvements

#### **Mermaid Diagram Lossless Zoom** 🔍
- **Vector-based Scaling**: Reimplemented zoom using SVG `viewBox` manipulation instead of CSS transforms
  - Maintains perfect clarity at all zoom levels (no pixelation or blurring)
  - SVG vector graphics remain sharp from 10% to 500% zoom
- **Mouse-centered Zoom**: Fixed zoom center point calculation
  - Zoom now precisely centers on mouse cursor position
  - Accurate coordinate system transformation chain (screen → SVG element → relative position → SVG coordinates)
  - Maintains zoom point stability during scale changes
- **Initial Height Limit**: Added 600px max-height constraint for initial diagram display
  - Prevents excessively tall diagrams from overwhelming the viewport
  - Maintains full diagram quality while controlling initial presentation

**Technical Details**:
```typescript
// Zoom is now lossless by manipulating viewBox instead of CSS scale
// Example: viewBox="x y width height" dynamically adjusted
// - Smaller viewBox dimensions = larger display (zoom in)
// - Precise pan offset calculations maintain mouse position accuracy
```

---

## 0.2.2 - 2025-10-09

### ✨ New Features

#### **Mermaid Diagram Interactive Features** 🎨
- **Zoom Control**: Mouse wheel zoom with scale limits (0.1x - 5x)
- **Pan & Drag**: Click and drag to move diagram around
- **Reset Zoom**: Button to reset zoom and position to initial state
- **Fullscreen Mode**: Fullscreen preview with dedicated button
- **Zoom Indicator**: Real-time display of current zoom percentage
- **Improved Centering**: Fixed initial diagram positioning to be properly centered

**Usage**:
```typescript
// Mermaid diagrams now support:
// - Mouse wheel to zoom in/out
// - Click and drag to pan
// - Click ⊕ button to reset zoom
// - Click ⛶ button for fullscreen
// - ESC key to exit fullscreen
```

### 🐛 Bug Fixes
- **Mermaid Centering**: Fixed initial diagram alignment from left-aligned to centered

---

## 0.2.1 - 2025-10-06

### ✨ New Features

#### **CodeBlock Plugin Enhancements**
- **HTML Publish Support**: Added `publishUrl` option to enable HTML code publishing
  - Send HTML code to a custom endpoint
  - Optional `onPublished` callback for custom handling
  - Auto-copy URL to clipboard when no callback provided
- **Fullscreen Mode**: New fullscreen button for all code blocks
  - Press ESC to exit fullscreen
  - iframe preview adapts to fullscreen height
- **Tooltip Notifications**: Interactive tooltips for button actions
  - Copy confirmation
  - Publish status updates
  - Uses Vue Teleport to avoid overflow clipping

**Usage**:
```typescript
import { codeBlockPlugin } from 'mio-previewer/plugins';

const customPlugins = [
  { 
    plugin: codeBlockPlugin,
    options: {
      publishUrl: 'https://api.example.com/publish',
      onPublished: (url) => console.log('Published:', url)
    }
  }
];
```

### 🐛 Bug Fixes
- **Prism Syntax Highlighting**: Re-enabled Prism theme CSS for proper code highlighting
- **Fullscreen iframe**: Fixed iframe height calculation in fullscreen mode
- **Tooltip Positioning**: Fixed tooltip not showing due to overflow hidden clipping
- **Event Target Reference**: Fixed async event.currentTarget becoming null

### 🔄 Breaking Changes
- Renamed `updateUrl` to `publishUrl` in CodeBlockPlugin options (more semantic)

---

## 0.2.0 - 2025-10-05

### ✨ New Features

#### **Image Viewer Plugin** 🖼️
A powerful image preview plugin with full mobile support:
- **Click to Preview**: Click any image in markdown to open lightbox viewer
- **Gallery Navigation**: Browse through all images with keyboard (←/→) or buttons
- **Mobile Gestures**: Pinch-to-zoom, drag, and swipe on mobile devices
- **Rich Controls**: Zoom, rotate, flip, reset, and fullscreen support
- **Streaming Support**: Automatically tracks new images in streaming mode
- **Zero Configuration**: Works out-of-the-box with sensible defaults

**Usage**:
```typescript
import { imageViewerPlugin } from 'mio-previewer/plugins';

const customPlugins = [
  { plugin: imageViewerPlugin }  // That's it!
];
```

**Default Features** (no config needed):
- ✅ Full toolbar (zoom, rotate, flip, reset, navigation)
- ✅ Thumbnail navigation bar
- ✅ Image titles from alt/title attributes
- ✅ Keyboard shortcuts
- ✅ Fullscreen mode
- ❌ Auto-play (off by default)

**Powered by**: [viewerjs](https://github.com/fengyuanchen/viewerjs)

### 🏗️ Architecture Improvements

#### **Plugin System Enhancement**
- **Context Passing**: All custom plugins now receive a `RenderContext` parameter
  - Share state between plugins and renderer
  - Access image list, streaming status, and custom data
  - Type-safe with TypeScript definitions

```typescript
export type RenderContext = {
  images?: Array<{ src: string; alt?: string; title?: string }>;
  isStreaming?: boolean;
  [key: string]: any;
};
```

#### **MdRenderer Enhancements**
- **Image Collection**: Automatically collects all images from AST
- **Image Manager**: Global `useImageViewerManager` composable for unified image handling
- **Provider Pattern**: Uses Vue's provide/inject for clean component communication

### 🔧 Technical Changes

#### **New Components**
- `ImageViewer.vue`: Individual image component with viewer integration
- `useImageViewerManager.ts`: Composable for managing viewer instances

#### **Updated Plugin Signatures**
All existing plugins updated to support context parameter:
- `cursorPlugin` - Adapted to new signature
- `codeBlockPlugin` - Adapted to new signature
- `mermaidPlugin` - Adapted to new signature (uses `context.isStreaming`)
- `emojiPlugin` - Adapted to new signature

#### **RecursiveRenderer**
- Added `context` prop
- Passes context to all plugin render functions

### 📦 Dependencies
- **Added**: `viewerjs@^1.11.7` - Image viewer library

### 📚 Documentation
- **New**: `docs/IMAGE_VIEWER_PLUGIN.md` - Complete usage guide
- **New**: `docs/IMAGE_VIEWER_IMPLEMENTATION.md` - Implementation details
- **Updated**: README.md with imageViewerPlugin reference

### 🎨 Demo
- **New**: `image-viewer-demo.html` - Interactive demo page
- **New**: `App-image-viewer-demo.vue` - Demo component with streaming

### 🐛 Bug Fixes
- Fixed Vue lifecycle hook errors in render functions
  - Previously tried to use `onMounted`/`onUnmounted` directly in render
  - Now uses proper component-based architecture

### 💡 Design Decisions

**Why Global Manager?**
- Each image had independent Viewer instance → couldn't navigate between images
- Solution: Single manager collects all images → enables gallery navigation

**Why Component Instead of Render Function?**
- Vue lifecycle hooks only work in component setup
- Plugins return component instances instead of raw VNodes
- Cleaner separation of concerns

### 🚀 Migration Guide

**From 0.1.x to 0.2.0**:

No breaking changes! Existing plugins continue to work. The new `context` parameter is optional.

**To use the new image viewer**:
```typescript
import { imageViewerPlugin } from 'mio-previewer/plugins';

const customPlugins = [
  { plugin: imageViewerPlugin }
];
```

**To create context-aware plugins**:
```typescript
export function myPlugin(): CustomPlugin {
  return {
    name: 'myPlugin',
    test: (node) => /* ... */,
    render: (node, renderChildren, h, context) => {
      // Access context.images, context.isStreaming, etc.
      return h(/* ... */);
    }
  };
}
```

---

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
