# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **@replyke/js** package - the official JavaScript SDK for Replyke. It's a lightweight, framework-agnostic SDK designed for JavaScript/TypeScript projects that don't use React or don't need the full React setup from the monorepo packages.

**Package Name**: @replyke/js
**Version**: 5.0.0
**Type**: JavaScript SDK library (published to npm)

## Development Commands

```bash
# Build the package (TypeScript compilation + bundling)
pnpm build

# Generate TypeScript declaration files
pnpm build:types

# Build both (runs before publishing)
pnpm prepare

# Publish to npm with beta tag
pnpm publish-beta

# Publish to npm production
pnpm publish-prod
```

## Core Architecture

### Module Structure

The SDK is organized into 3 main API modules:

```
src/
├── core/
│   └── client.ts        # HTTP client wrapper using axios
├── modules/
│   ├── users/           # User operations (2 functions)
│   │   ├── index.ts
│   │   ├── fetchUserById.ts
│   │   └── fetchUserByForeignId.ts
│   ├── entities/        # Entity CRUD operations (7 functions)
│   │   ├── index.ts
│   │   ├── createEntity.ts
│   │   ├── fetchEntity.ts
│   │   ├── fetchEntityByForeignId.ts
│   │   ├── fetchEntityByShortId.ts
│   │   ├── fetchManyEntities.ts
│   │   ├── updateEntity.ts
│   │   └── deleteEntity.ts
│   └── comments/        # Comment operations (2 functions)
│       ├── index.ts
│       ├── fetchComment.ts
│       └── fetchCommentByForeignId.ts
└── index.ts             # Main entry point with ReplykeClient class
```

### HTTP Client

Uses a custom `ReplykeHttpClient` class that wraps axios with pre-configured base URL:
- **Base URL**: `https://api.replyke.com/api/v5/{projectId}`
- **Headers**: Standard axios configuration
- **Method**: GET/POST/PUT/DELETE operations

### Initialization Pattern

```typescript
import { ReplykeClient } from '@replyke/js';

const client = await ReplykeClient.init({
    projectId: "your-project-id"
});

// Client initializes and returns bound module functions
```

**Factory Pattern**: Uses `ReplykeClient.init()` for initialization, which:
1. Creates an HTTP client instance with the project ID
2. Binds all module functions to the client
3. Returns the client with namespaced API methods

## API Modules & Features

### 1. Users Module (2 functions)

**Functions**:
- `client.users.fetchUserById({ userId })` - Fetch user by Replyke ID
- `client.users.fetchUserByForeignId({ foreignId, name?, username?, avatar?, bio?, metadata?, secureMetadata? })` - Fetch user by external ID with optional user data

**Features**:
- Foreign ID support for external system integration
- Optional user data creation on first fetch
- Support for public and secure metadata

### 2. Entities Module (7 functions)

Entities are the core content objects (posts, articles, products, listings, etc.).

**Functions**:
- `client.entities.createEntity(data)` - Create a new entity
- `client.entities.fetchEntity({ entityId })` - Fetch by Replyke ID
- `client.entities.fetchEntityByForeignId({ foreignId })` - Fetch by external system ID
- `client.entities.fetchEntityByShortId({ shortId })` - Fetch by short/shareable ID
- `client.entities.fetchManyEntities(filters)` - Advanced querying with extensive filters
- `client.entities.updateEntity(data)` - Update entity
- `client.entities.deleteEntity({ entityId })` - Delete entity

**Create Entity Parameters**:
- `foreignId` - External system ID for integration
- `sourceId` - Source identifier (e.g., "blog", "shop")
- `title` - Entity title
- `content` - Main content/body
- `attachments` - Media attachments (flexible structure)
- `keywords` - Tags/categories
- `location` - Geo-location (lat/lng or GeoJSON Point)
- `metadata` - Custom metadata (up to 10KB)
- `userId` - Author/creator ID

**Advanced Filtering** (fetchManyEntities):
Supports extensive filtering options:
- **Sorting**: `hot`, `top`, `controversial`
- **Timeframes**: `hour`, `day`, `week`, `month`, `year`, `all`
- **Pagination**: `page`, `limit`
- **Keywords**:
  - `keywords.includes` - Array of required tags
  - `keywords.excludes` - Array of excluded tags
- **Metadata Filters**:
  - `metadata.includes` - Object of required key-value pairs
  - `metadata.excludes` - Object of excluded key-value pairs
  - `metadata.exists` - Array of required metadata keys
- **Content Filters**:
  - `title.includes` / `title.excludes` - Title text filtering
  - `content.includes` / `content.excludes` - Content text filtering
- **Attachment Filters**:
  - `attachments.has` - Entities with attachments
  - `attachments.hasNot` - Entities without attachments
- **Location Filters**:
  - `location.latitude` / `location.longitude` - Geo-coordinates
  - `location.radius` - Radius in kilometers
- **User Filters**:
  - `userId` - Filter by specific user
  - `followedOnly` - Only from users the current user follows

### 3. Comments Module (2 functions)

**Functions**:
- `client.comments.fetchComment({ commentId })` - Fetch comment by Replyke ID
- `client.comments.fetchCommentByForeignId({ foreignId })` - Fetch comment by external ID

**Note**: This module currently provides read-only access. Comment creation/updates are available in other SDK packages (@replyke/node) or through direct API calls.

## Key Design Patterns

### 1. Framework-Agnostic
No dependencies on React, Vue, Angular, or any specific framework. Works with vanilla JavaScript, TypeScript, or any JavaScript framework.

### 2. Type Safety
Full TypeScript support with type definitions, though return types are currently `any` with TODOs to add proper entity types in future versions.

### 3. Function Binding
Module functions are bound to the HTTP client at initialization, providing a clean API without manually passing the client.

### 4. Foreign ID Support
Seamless integration with existing systems through foreign ID mapping on all major resources.

### 5. Location Flexibility
Supports both simple `{ lat, lng }` objects and GeoJSON Point format for geo-location data.

## Usage Examples

### Basic Initialization

```typescript
import { ReplykeClient } from '@replyke/js';

const client = await ReplykeClient.init({
    projectId: 'your-project-id'
});
```

### Fetching Entities

```javascript
// Fetch single entity
const entity = await client.entities.fetchEntity({
    entityId: 'entity-123'
});

// Fetch by foreign ID
const post = await client.entities.fetchEntityByForeignId({
    foreignId: 'blog-post-456'
});

// Fetch with advanced filters
const trendingPosts = await client.entities.fetchManyEntities({
    sort: 'hot',
    timeframe: 'week',
    keywords: { includes: ['javascript', 'tutorial'] },
    attachments: { has: true },
    limit: 20,
    page: 1
});
```

### Creating Entities

```javascript
const newEntity = await client.entities.createEntity({
    foreignId: 'my-post-789',
    sourceId: 'blog',
    title: 'Getting Started with JavaScript',
    content: 'In this tutorial, we will learn...',
    keywords: ['javascript', 'tutorial', 'beginner'],
    userId: 'user-123',
    metadata: {
        category: 'programming',
        difficulty: 'beginner',
        readTime: 5
    }
});
```

### Updating Entities

```javascript
await client.entities.updateEntity({
    entityId: 'entity-123',
    title: 'Updated Title',
    content: 'Updated content...',
    keywords: ['updated', 'tags']
});
```

### Geo-Location Filtering

```javascript
// Find entities near a location
const nearbyPosts = await client.entities.fetchManyEntities({
    location: {
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 10  // 10km radius
    },
    limit: 50
});
```

### Working with Users

```javascript
// Fetch user by ID
const user = await client.users.fetchUserById({
    userId: 'user-123'
});

// Fetch or create user by foreign ID
const externalUser = await client.users.fetchUserByForeignId({
    foreignId: 'external-user-456',
    name: 'John Doe',
    username: 'johndoe',
    avatar: 'https://example.com/avatar.jpg',
    metadata: {
        source: 'external-system'
    }
});
```

## Build & Publishing

### Build Configuration
- **Build Tool**: tsup
- **Output Formats**: CommonJS and ESM (dual package)
- **Type Declarations**: Generated via TypeScript compiler
- **Target**: Modern JavaScript (ES modules)
- **Entry Point**: `src/index.ts`

### Output Structure
```
dist/
├── index.js         # Main bundle (CJS/ESM)
└── index.d.ts       # TypeScript declarations
```

### Publishing
```bash
# Beta release
pnpm publish-beta

# Production release
pnpm publish-prod
```

**Package Exports**:
- Main: `dist/index.js`
- Types: `dist/index.d.ts`

## Use Cases

This SDK is ideal for:

1. **Vanilla JavaScript Projects** - Plain JS applications without frameworks
2. **Non-React Frameworks** - Vue, Svelte, Angular, Solid, etc.
3. **Server-Side Rendering** - SSR applications without React
4. **Static Site Generators** - Eleventy, Hugo (with JavaScript), Astro (non-React)
5. **Chrome Extensions** - Browser extensions built with vanilla JS
6. **Electron Apps** - Desktop applications using web technologies
7. **Web Workers** - Background scripts and service workers
8. **Lightweight Integrations** - When you don't need the full React SDK overhead

Essentially any JavaScript/TypeScript project that needs Replyke integration without React dependencies.

## Technical Details

- **TypeScript**: Strict mode enabled
- **Dependencies**: Only axios for HTTP requests
- **API Version**: Uses v5 API endpoints
- **Bundle Size**: Lightweight (no framework dependencies)
- **Browser Support**: Modern browsers (ES6+)
- **Node.js Support**: Yes (v14+)

## Important Notes

- This SDK is **production-ready** (v5.0.0)
- Requires a valid project ID from Replyke dashboard
- Currently uses v5 API endpoints
- Return types are typed as `any` (TODOs exist to add proper types)
- No README.md file exists yet (documentation pending)
- Comment module has limited functionality (read-only)

## Comparison with Other SDKs

- **vs @replyke/node**: This SDK is lighter weight and framework-agnostic, while @replyke/node is optimized for Node.js server environments with more comprehensive API coverage
- **vs @replyke/react-js**: This SDK has no React dependencies, making it suitable for non-React projects or when you don't need React hooks and components
- **vs monorepo packages**: This SDK is standalone and simpler, while monorepo packages provide full React/React Native integration with hooks, contexts, and UI components
