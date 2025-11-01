# Replyke's New Component Distribution Approach - Documentation Brief

**Audience**: Agent writing public-facing documentation
**Purpose**: Complete technical and conceptual understanding of Replyke's new CLI-based component distribution system

---

## Executive Summary

Replyke has fundamentally changed how developers add comment systems to their applications. We've moved from the traditional **npm package approach** (install, import, style with props) to a **shadcn-inspired CLI approach** (copy source code into your project and customize directly).

---

## The Old Approach (Pre-CLI)

### How It Worked Before

**Installation:**
```bash
npm install @replyke/comments-threaded
# or
npm install @replyke/comments-social
```

**Usage:**
```tsx
import { ThreadedCommentSection } from '@replyke/comments-threaded';

function App() {
  return (
    <ThreadedCommentSection
      entityId="my-entity"
      // Styling was done via callback props
      styleCallbacks={{
        commentContainer: (theme) => ({
          backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
          padding: '12px',
          borderRadius: '8px'
        }),
        authorName: (theme) => ({
          color: theme === 'dark' ? '#60A5FA' : '#2563EB',
          fontWeight: 'bold'
        })
        // ... dozens of style callback functions
      }}
    />
  );
}
```

### Problems With The Old Approach

1. **Opaque Abstraction**: Components were black boxes. Users couldn't see or modify the internal structure, logic, or sub-components
2. **Limited Customization**: Only surfaces exposed via `styleCallbacks` prop could be customized
3. **Callback Hell**: Styling required passing dozens of callback functions, creating verbose and hard-to-maintain code
4. **No Layout Control**: Users couldn't rearrange, remove, or add UI elements without forking the entire package
5. **Version Lock-In**: Updates required npm updates, risking breaking changes
6. **Bundle Bloat**: Users got all variations whether they needed them or not
7. **No True Ownership**: The code lived in node_modules, not in the user's source control

---

## The New Approach (CLI-Based)

### Philosophy: "Own Your Components"

The new approach is inspired by shadcn/ui's philosophy:

> **Copy, paste, customize. Not install and configure.**

Users get **source code**, not packages. They **own** their components and can modify anything.

### How It Works Now

**Step 1: Initialize Replyke in your project**
```bash
npx @replyke/cli init
```

This command:
- Detects your project type (React, React Native, or Expo)
- Asks for styling preference (Tailwind CSS or Inline Styles)
- Asks where to install components (default: `src/components`)
- Creates a `replyke.json` configuration file
- Checks for required peer dependencies (@replyke/react-js, @replyke/ui-core-react-js)
- Optionally installs missing dependencies

**Step 2: Add a component**
```bash
npx @replyke/cli add comments-threaded
# or
npx @replyke/cli add comments-social
```

This command:
- Reads your `replyke.json` config
- Fetches the component from the registry (local during dev, GitHub in production)
- Copies all source files into your project at `src/components/comments-threaded/`
- Transforms imports to work with your project structure
- Creates a barrel export `index.ts` for clean imports
- Shows required dependencies and usage examples

**Step 3: Use in your app**
```tsx
import { ThreadedCommentSection } from './components/comments-threaded';

function App() {
  return <ThreadedCommentSection entityId="my-entity" />;
}
```

**Step 4: Customize directly**

Open `src/components/comments-threaded/components/threaded-comment-section.tsx` and edit the source code directly.

Change colors, layouts, add features, remove elements - it's YOUR code now.

---

## What Gets Installed

### File Structure After Installation

When you run `npx @replyke/cli add comments-threaded`, you get this structure:

```
src/components/comments-threaded/
├── index.ts                              # Barrel export (entry point)
├── components/                           # All UI components (20 files)
│   ├── threaded-comment-section.tsx     # Main component
│   ├── new-comment-form.tsx             # Top-level comment form
│   ├── mention-suggestions.tsx          # @ mention autocomplete
│   ├── comments-feed/
│   │   ├── comments-feed.tsx            # Feed container
│   │   ├── loaded-comments.tsx          # Renders comment list
│   │   ├── fetching-comments-skeletons.tsx  # Loading states
│   │   ├── no-comments-placeholder.tsx  # Empty state
│   │   └── comment-thread/
│   │       ├── comment-thread.tsx       # Thread with replies
│   │       ├── comment-replies.tsx      # Reply list
│   │       ├── action-menu.tsx          # Edit/delete/report menu
│   │       ├── new-reply-form.tsx       # Reply form
│   │       └── single-comment/
│   │           ├── single-comment.tsx   # Individual comment
│   │           ├── vote-buttons.tsx     # Upvote/downvote
│   │           ├── reply-button-and-info.tsx
│   │           ├── toggle-replies-visibility.tsx
│   │           └── indentation-threading-lines.tsx
│   └── modals/
│       ├── comment-menu-modal/          # Report modal (3 files)
│       └── comment-menu-modal-owner/    # Owner actions (1 file)
├── hooks/                                # React hooks (2 files)
│   ├── use-threaded-comments.tsx        # Main comment logic hook
│   └── use-ui-state.tsx                 # UI state management
├── utils/                                # Utilities (1 file)
│   └── prop-comparison.ts               # Memoization helpers
└── context/                              # React context (1 file)
    └── ui-state-context.tsx             # Modal & theme context
```

**Total: ~25 TypeScript/TSX files, all visible and editable**

### For Social Comments

```bash
npx @replyke/cli add comments-social
```

Similar structure but with Instagram-inspired components:
- Heart button (likes) instead of upvote/downvote
- Simpler nesting (only 1 level deep)
- "Top"/"New"/"Old" sorting
- Different visual design

---

## Available Components & Variants

### Component Types

1. **comments-threaded** - Reddit-style threaded comments
   - Upvotes & downvotes with score
   - Unlimited nesting depth
   - Threading lines showing reply hierarchy
   - Edit, delete, report actions
   - @ mentions with autocomplete
   - Highlighted comments (for deep linking)

2. **comments-social** - Instagram-style social comments
   - Heart button (likes, no dislikes)
   - Single-level nesting (replies shown as list)
   - Clean, minimal design
   - "Top"/"New"/"Old" sorting
   - @ mentions with autocomplete

### Platform Support

- **React (Web)**: ✅ Fully supported (threaded & social)
- **React Native**: ✅ Social comments available, threaded in progress
- **Expo**: ✅ Social comments available (same as React Native)

### Styling Variants

Each component comes in TWO styling flavors:

#### 1. Inline Styles (`styled`)
```bash
# During init, select "Inline Styles"
npx @replyke/cli add comments-threaded
```

**Characteristics:**
- All styles are inline `style={{}}` objects in JSX
- No external CSS dependencies
- Colors defined as hex codes directly in components
- Theme support via conditional logic: `theme === 'dark' ? '#1F2937' : '#FFFFFF'`
- Complete color palette documented in file headers
- Easy to find and change any color or style
- Works everywhere (no CSS framework needed)

**Example from component:**
```tsx
<div
  style={{
    backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
    color: theme === 'dark' ? '#F9FAFB' : '#111827',
    padding: '16px',
    borderRadius: '8px',
    border: `1px solid ${theme === 'dark' ? '#4B5563' : '#E5E7EB'}`
  }}
>
```

**Customization:**
- Search for hex colors in files and change them
- Modify style objects directly
- Add/remove CSS properties
- Full control without any tooling

#### 2. Tailwind CSS (`tailwind`)
```bash
# During init, select "Tailwind CSS"
npx @replyke/cli add comments-threaded
```

**Characteristics:**
- Uses Tailwind utility classes
- Requires Tailwind CSS installed in project
- Dark mode via `dark:` prefix (requires `darkMode: 'class'` in tailwind.config.js)
- Standard Tailwind color palette (gray-50 through gray-900, blue-600, red-500, etc.)
- More concise code
- Easy to apply your design system's Tailwind theme

**Example from component:**
```tsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
```

**Customization:**
- Change Tailwind classes in className props
- Extend your tailwind.config.js to customize colors globally
- Use arbitrary values for one-offs: `bg-[#FF5733]`
- Full Tailwind workflow

---

## Component Props & API

### Minimal Props Philosophy

Unlike the old approach with dozens of styling callbacks, components now have **minimal, essential props**:

### ThreadedCommentSection Props

```tsx
interface ThreadedCommentSectionProps {
  // Entity identification (provide ONE of these)
  entity?: Entity | undefined | null;          // Full entity object
  entityId?: string | undefined | null;        // Entity ID only
  foreignId?: string | undefined | null;       // Foreign ID only
  shortId?: string | undefined | null;         // Short ID only

  // Optional features
  isVisible?: boolean;                         // Show/hide component
  highlightedCommentId?: string | undefined | null;  // Highlight specific comment
  theme?: 'light' | 'dark';                    // Theme (styled variant only)
  children?: React.ReactNode;                  // Custom elements
}
```

**Most common usage:**
```tsx
<ThreadedCommentSection entityId="blog-post-123" />
```

### SocialCommentSection Props

```tsx
interface SocialCommentSectionProps {
  // Same entity identification as threaded
  entity?: Entity | undefined | null;
  entityId?: string | undefined | null;
  foreignId?: string | undefined | null;
  shortId?: string | undefined | null;

  // Optional features
  isVisible?: boolean;
  theme?: 'light' | 'dark';                    // Theme (styled variant only)
  children?: React.ReactNode;
}
```

### Theme Handling

**Styled variant:**
- Uses `theme` prop: `<ThreadedCommentSection entityId="x" theme="dark" />`
- Defaults to 'light' if not provided
- You can wire this to your app's theme state

**Tailwind variant:**
- No `theme` prop needed
- Uses Tailwind's dark mode system
- Add `dark` class to parent/html element to trigger dark mode
- Example: `<html className={isDark ? 'dark' : ''}>`

---

## Required Dependencies

Components are NOT standalone. They depend on Replyke's core libraries for:
- Comment data fetching & caching
- Real-time updates
- Authentication integration
- Vote/like handling
- Moderation actions

### For React (Web)
```json
{
  "dependencies": {
    "@replyke/react-js": "^6.0.0",
    "@replyke/ui-core-react-js": "^6.0.0"
  }
}
```

### For React Native / Expo
```json
{
  "dependencies": {
    "@replyke/react-native": "^6.0.0",  // or @replyke/expo
    "@replyke/ui-core-react-native": "^6.0.0"
  }
}
```

**The CLI checks for these and offers to install them during `init`.**

---

## Customization Guide

### What You Can Customize

**EVERYTHING.** It's your code. But here are common customizations:

### 1. Colors & Theming

**Inline Styles Variant:**

Each component file has a color palette guide in the header:
```tsx
/**
 * ====================
 * THEME COLOR PALETTE
 * ====================
 *
 * BACKGROUNDS:
 * - #FFFFFF → #1F2937 (main background)
 * - #F3F4F6 → #374151 (secondary background, hover states)
 *
 * TEXT:
 * - #111827 → #F9FAFB (primary text)
 * - #6B7280 → #9CA3AF (timestamps, tertiary text)
 *
 * BLUES (links, actions, upvotes):
 * - #3B82F6 → #60A5FA (primary blue)
 * ...
 */
```

To change colors:
1. Read the palette guide to understand color roles
2. Find hex codes in the component with Find & Replace
3. Change `#3B82F6` to your brand blue, etc.
4. Dark theme colors come after the arrow (→)

**Tailwind Variant:**

To change colors globally:
1. Edit your `tailwind.config.js`:
```js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#FF5733',    // Your brand color
        // Components use blue-600, so extend blue palette
        blue: {
          600: '#FF5733',      // Override Tailwind's blue
        }
      }
    }
  }
}
```

Or change classes directly in component files:
```tsx
// Change this:
<button className="bg-blue-600 hover:bg-blue-700">

// To this:
<button className="bg-purple-600 hover:bg-purple-700">
```

### 2. Layout & Structure

**Add elements:**
```tsx
// In threaded-comment-section.tsx
return (
  <div>
    {/* Add custom header */}
    <h2>Comments ({totalCount})</h2>

    <NewCommentForm ... />
    <CommentsFeed ... />

    {/* Add custom footer */}
    <footer>Powered by Replyke</footer>
  </div>
);
```

**Remove elements:**
```tsx
// Don't want vote buttons? Remove or comment out:
// <VoteButtons ... />
```

**Rearrange:**
```tsx
// Move reply button above comment body instead of below
<ReplyButton />
<CommentBody />
// instead of
<CommentBody />
<ReplyButton />
```

### 3. Functionality Changes

**Example: Add confirmation dialog before delete:**
```tsx
// In comment-menu-modal-owner.tsx
const handleDelete = () => {
  if (window.confirm('Are you sure you want to delete this comment?')) {
    // existing delete logic
  }
};
```

**Example: Auto-collapse old threads:**
```tsx
// In comment-thread.tsx
const [isCollapsed, setIsCollapsed] = useState(
  new Date(comment.createdAt) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  // Auto-collapse if older than 7 days
);
```

### 4. Typography & Spacing

**Inline Styles:**
```tsx
// Change font sizes, weights, spacing directly
<div style={{
  fontSize: '18px',      // was 14px
  lineHeight: '1.8',     // was 1.5
  padding: '20px',       // was 16px
  fontFamily: 'Inter, sans-serif'  // add custom font
}}>
```

**Tailwind:**
```tsx
// Change utility classes
<div className="text-lg leading-relaxed p-5 font-inter">
```

### 5. Icons & Assets

Components use text-based icons (arrows, hearts, dots) or Unicode symbols. Replace with your icon library:

```tsx
// Before
<span>▲</span>  {/* Upvote arrow */}

// After
<YourIconLibrary.ArrowUp />
```

---

## User Workflows

### First-Time Setup

1. **Install CLI** (or use npx)
   ```bash
   npm install -g @replyke/cli
   # or just use npx (no install needed)
   ```

2. **Initialize in your project**
   ```bash
   cd my-react-app
   npx @replyke/cli init
   ```

   Prompts:
   - Platform? → React (Web)
   - Styling? → Tailwind CSS
   - Components path? → src/components

   Creates: `replyke.json`

3. **Add a component**
   ```bash
   npx @replyke/cli add comments-threaded
   ```

   Output:
   - ✅ Successfully installed 25 files!
   - 📁 Files added to src/components/comments-threaded
   - 📦 Required dependencies: @replyke/react-js@^6.0.0
   - 📖 Usage: import { ThreadedCommentSection } from './components/comments-threaded'

4. **Use in your app**
   ```tsx
   import { ThreadedCommentSection } from './components/comments-threaded';

   function BlogPost() {
     return (
       <article>
         <h1>My Blog Post</h1>
         <p>Content here...</p>

         <ThreadedCommentSection entityId="blog-post-123" />
       </article>
     );
   }
   ```

5. **Customize** (optional)
   - Open files in `src/components/comments-threaded/`
   - Edit colors, layout, logic as needed
   - Changes are immediate (just your source code)

### Adding Another Component

```bash
npx @replyke/cli add comments-social
```

Now you have both:
- `src/components/comments-threaded/`
- `src/components/comments-social/`

Use whichever fits your UI better, or use different ones on different pages.

### Switching Styles

If you initialized with inline styles but want Tailwind:

1. Delete existing components: `rm -rf src/components/comments-*`
2. Edit `replyke.json`: Change `"style": "styled"` to `"style": "tailwind"`
3. Re-add: `npx @replyke/cli add comments-threaded`

(In future, we may add a `diff` command to help update components)

---

## Registry & Distribution

### How Components Are Stored

Components live in a **registry** structure:

```
registry/
├── react/
│   ├── comments-threaded/
│   │   ├── styled/
│   │   │   ├── registry.json       # Metadata
│   │   │   ├── files/              # All .tsx components
│   │   │   ├── hooks/              # React hooks
│   │   │   ├── utils/              # Utilities
│   │   │   └── context/            # Context providers
│   │   └── tailwind/
│   │       └── (same structure)
│   └── comments-social/
│       ├── styled/
│       └── tailwind/
└── react-native/
    └── comments-social/
        └── styled/
```

### Registry Metadata (registry.json)

```json
{
  "name": "comments-threaded",
  "platform": "react",
  "style": "styled",
  "version": "1.0.0",
  "description": "Threaded comment system with upvotes/downvotes, nested replies, and moderation",
  "dependencies": [
    "@replyke/react-js@^6.0.0",
    "@replyke/ui-core-react-js@^6.0.0"
  ],
  "files": [
    {
      "path": "files/threaded-comment-section.tsx",
      "type": "component",
      "description": "Main entry component for threaded comments"
    },
    // ... all 25 files listed
  ],
  "registryUrl": "https://raw.githubusercontent.com/replyke/cli/main/registry/react/comments-threaded/styled",
  "exports": {
    "mainComponent": "ThreadedCommentSection",
    "mainFile": "threaded-comment-section",
    "typeExports": ["ThreadedStyleCallbacks"]
  }
}
```

### Where Registry Lives

**During Development:**
- Local filesystem: `cli/registry/`
- CLI reads from local files

**In Production (npx usage):**
- GitHub repository: `https://github.com/replyke/cli`
- CLI fetches from GitHub raw URLs
- Example: `https://raw.githubusercontent.com/replyke/cli/main/registry/react/comments-threaded/styled/registry.json`

Users don't need to know this - CLI handles it automatically.

---

## Comparison: Old vs New

| Aspect | Old Approach (npm packages) | New Approach (CLI) |
|--------|---------------------------|-------------------|
| **Installation** | `npm install @replyke/comments-threaded` | `npx @replyke/cli add comments-threaded` |
| **Code Location** | `node_modules/` (hidden) | `src/components/` (visible) |
| **Ownership** | Library code, can't modify | Your code, full control |
| **Customization** | Via `styleCallbacks` prop (limited surfaces) | Edit source code directly (unlimited) |
| **Styling API** | Dozens of callback functions | Minimal props, style in code |
| **Version Control** | Not in your repo (package.json only) | In your repo (actual source files) |
| **Updates** | `npm update` (may break things) | Re-run `add` or manual merge (you control) |
| **Layout Changes** | Not possible without forking | Rearrange JSX freely |
| **Adding Features** | Not possible without forking | Add logic directly to components |
| **Removing Features** | Not possible | Delete unwanted code |
| **Bundle Size** | All variants shipped | Only what you use |
| **TypeScript** | Type definitions from package | Full source with types inline |
| **Debugging** | Minified/compiled code | Your readable source |
| **Learning Curve** | Learn `styleCallbacks` API | Learn component structure (one-time) |
| **Framework** | Works anywhere | Works anywhere |

---

## Migration From Old to New

### For Existing Users

If you're currently using `@replyke/comments-threaded` from npm:

**Step 1: Install CLI version alongside (for testing)**
```bash
npx @replyke/cli init
npx @replyke/cli add comments-threaded
```

**Step 2: Update your import**
```tsx
// Old
import { ThreadedCommentSection } from '@replyke/comments-threaded';

// New
import { ThreadedCommentSection } from './components/comments-threaded';
```

**Step 3: Remove styleCallbacks prop**
```tsx
// Old
<ThreadedCommentSection
  entityId="my-post"
  styleCallbacks={{
    commentContainer: (theme) => ({ backgroundColor: '#F3F4F6' }),
    authorName: (theme) => ({ color: '#2563EB', fontWeight: 'bold' }),
    // ... 50 more callbacks
  }}
/>

// New
<ThreadedCommentSection entityId="my-post" />
```

**Step 4: Apply your customizations directly in source files**

Open `src/components/comments-threaded/components/single-comment/single-comment.tsx`:
```tsx
// Find the author name element and edit directly:
<span style={{
  color: '#2563EB',      // Your custom color
  fontWeight: 'bold'     // Your custom weight
}}>
  {author.name}
</span>
```

**Step 5: Test thoroughly, then uninstall old package**
```bash
npm uninstall @replyke/comments-threaded
```

### Mapping styleCallbacks to Source Files

If you had extensive `styleCallbacks` customizations, here's where to apply them:

| Old Callback | New Location |
|--------------|--------------|
| `commentContainer` | `single-comment/single-comment.tsx` - main div style |
| `authorName` | `single-comment/single-comment.tsx` - author span |
| `commentBody` | `single-comment/single-comment.tsx` - body div |
| `voteButton` | `single-comment/vote-buttons.tsx` - button styles |
| `replyButton` | `single-comment/reply-button-and-info.tsx` - button style |
| `threadingLine` | `single-comment/indentation-threading-lines.tsx` - line divs |
| `newCommentForm` | `new-comment-form.tsx` - form & textarea styles |
| `modal` | `modals/comment-menu-modal/comment-menu-modal.tsx` |

Just search for the element and edit its `style={{}}` or `className=""`.

---

## Technical Implementation Details

### Import Transformation

When copying from registry to user's project, the CLI transforms import paths:

**Registry structure:**
```
registry/react/comments-threaded/styled/
├── files/threaded-comment-section.tsx
├── files/comments-feed/comments-feed.tsx
├── hooks/use-threaded-comments.tsx
└── utils/prop-comparison.ts
```

**User's project after install:**
```
src/components/comments-threaded/
├── components/threaded-comment-section.tsx    # was files/
├── components/comments-feed/comments-feed.tsx
├── hooks/use-threaded-comments.tsx
└── utils/prop-comparison.ts
```

**Import transformation:**
```tsx
// In registry files:
import CommentsFeed from '../files/comments-feed/comments-feed';

// Gets transformed to:
import CommentsFeed from '../components/comments-feed/comments-feed';
```

This is handled automatically by `transform.ts` in the CLI.

### Barrel Export Generation

The CLI creates an `index.ts` in the component root:

```tsx
// src/components/comments-threaded/index.ts
export { default as ThreadedCommentSection } from './components/threaded-comment-section';
export * from './components/threaded-comment-section';
```

This allows clean imports:
```tsx
import { ThreadedCommentSection } from './components/comments-threaded';
```

Instead of:
```tsx
import ThreadedCommentSection from './components/comments-threaded/components/threaded-comment-section';
```

### File Exclusions

Development files are automatically excluded during installation:
- `package.json`
- `tsconfig.json`
- `.gitignore`
- Lock files (pnpm-lock.yaml, package-lock.json, yarn.lock)
- `.eslintrc`, `.prettierrc`
- Hidden files (starting with `.`)
- `node_modules/` directories

Only component source files are copied.

---

## Key Messaging for Documentation

### Headline Benefits

1. **"You own your components"** - Not locked into a package, full control
2. **"Customize anything"** - Colors, layout, logic - it's all editable source code
3. **"No configuration hell"** - Minimal props, no callback functions
4. **"Copy, paste, customize"** - shadcn philosophy applied to comment systems
5. **"Start fast, customize later"** - Works great out of the box, customize when needed

### When to Use Which Component

**Use Threaded Comments when:**
- You need Reddit-style discussions
- Comments can have deep nesting (replies to replies to replies)
- Upvoting/downvoting is important (karma, ranking)
- Technical content, forums, developer communities
- Long-form discussions

**Use Social Comments when:**
- You want Instagram-style simplicity
- Flat or single-level nesting is enough
- Likes (no dislikes) fit your community culture
- Social content, photos, short-form posts
- Mobile-first design

**Use Both:**
- Use threaded for blog posts, social for image galleries
- Different pages can use different components

### Design Principles to Communicate

1. **Minimal Props**: Components shouldn't require complex configuration. They should work with just `entityId`.

2. **Sensible Defaults**: Out-of-the-box colors, spacing, and behavior should look good and be accessible.

3. **Edit, Don't Configure**: Instead of passing config objects, users edit the source code.

4. **Progressive Disclosure**: Users can ignore the implementation details until they need to customize.

5. **Self-Documenting Code**: Component files have clear names, thorough comments, and color palettes documented in headers.

---

## Future Enhancements (Not Yet Available)

These are planned but not implemented yet:

1. **Diff Command**: `npx @replyke/cli diff comments-threaded` to see what changed in new versions
2. **Update Command**: Smart merging of updates while preserving user customizations
3. **More Platforms**: React Native threaded comments, Vue, Svelte versions
4. **Component Variants**: Compact mode, minimal mode, dark-only variants
5. **Preview Website**: Browse components with live demos before installing

---

## Common Questions to Address in Docs

### "Do I still need @replyke/react-js?"

**Yes.** The CLI components handle UI only. They depend on:
- `@replyke/react-js` - Data layer (fetching, caching, real-time updates)
- `@replyke/ui-core-react-js` - Core hooks and utilities

These remain as npm packages because they don't require customization (they're not UI).

### "Can I use both npm and CLI components?"

**Not recommended.** Pick one approach per project. Mixing them will be confusing.

### "What if I've heavily customized and want to update?"

Currently, you'd re-run `add` to a different directory and manually merge changes. Future `diff` command will help with this.

### "Can I publish my customized version?"

**Yes!** It's Apache 2.0 licensed. You can fork, modify, and even publish your own variant.

### "Does this work with Next.js / Remix / Gatsby?"

**Yes.** It's just React components. Works with any React framework.

### "Does this work with TypeScript?"

**Yes.** All component files are `.tsx` with full type annotations.

### "Can I convert between styled and tailwind?"

Manually, yes (rewrite styles). Automatically, not yet. Choose wisely during init.

---

## Example Documentation Structure

Suggested docs outline:

1. **Introduction**
   - What is Replyke CLI
   - Benefits over traditional npm packages
   - Quick start (3 commands to working comments)

2. **Installation**
   - Prerequisites (React project, Node 18+)
   - `npx @replyke/cli init`
   - Configuration options

3. **Adding Components**
   - `npx @replyke/cli add comments-threaded`
   - `npx @replyke/cli add comments-social`
   - What gets installed

4. **Component Reference**
   - Threaded Comments
     - Props
     - Features
     - File structure
   - Social Comments
     - Props
     - Features
     - File structure

5. **Customization**
   - Changing colors
   - Modifying layout
   - Adding features
   - Styling variants (inline vs Tailwind)

6. **Theming**
   - Light/dark mode
   - Custom color palettes
   - Brand integration

7. **Advanced**
   - Understanding the file structure
   - Hooks and utilities
   - Modifying behavior

8. **Migration Guide**
   - From npm packages to CLI
   - From styled to Tailwind (or vice versa)

9. **Troubleshooting**
   - Common issues
   - Dependency errors
   - Import problems

10. **API Reference**
    - Complete prop documentation
    - Hook APIs (use-threaded-comments, etc.)
    - Context APIs

---

## Tone & Voice for Documentation

- **Empowering**: "You're in control", "It's your code now"
- **Simple**: Avoid jargon, explain clearly
- **Practical**: Show code examples, not just concepts
- **Honest**: Acknowledge limitations (no diff command yet)
- **Confident**: This is a better approach, not just different

---

## This Document's Purpose

Give this document to the documentation agent. They should be able to:
1. Understand the paradigm shift from npm to CLI
2. Explain benefits clearly to users
3. Write accurate installation instructions
4. Create comprehensive customization guides
5. Answer common questions
6. Structure documentation logically

They should NOT need to ask you follow-up questions about how the system works - everything is here.
