# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **@replyke/node** package - the official Node.js SDK for Replyke. It's designed for server-side Node.js environments where React is not available or needed, such as server actions, backend APIs, scheduled jobs, webhooks, and CLI tools.

**Package Name**: @replyke/node
**Version**: 6.0.0-beta.0
**Type**: Node.js SDK library (published to npm)

## Development Commands

```bash
# Build the package
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

The SDK is organized into 5 main API modules:

```
src/
├── core/
│   └── client.ts           # HTTP client with axios instances
├── interfaces/             # TypeScript type definitions
│   ├── Entity.ts
│   ├── Comment.ts
│   ├── User.ts
│   ├── List.ts
│   ├── HostedApp.ts
│   ├── Connection.ts
│   ├── Follow.ts
│   ├── Mention.ts
│   └── AppNotification.ts
├── modules/
│   ├── entities/           # Entity CRUD operations (8 functions)
│   ├── comments/           # Comment CRUD operations (5 functions)
│   ├── users/              # User operations (2 functions)
│   ├── lists/              # List CRUD operations (8 functions)
│   └── hosted-apps/        # Hosted app operations (1 function)
└── index.ts                # Main entry point with ReplykeClient class
```

### HTTP Client Configuration

The SDK uses three axios instances for different API endpoints:

- **projectInstance**: `https://api.replyke.com/api/v5/{projectId}` - Main project-scoped API
- **internalInstance**: `https://api.replyke.com/internal` - Internal operations (verification, admin)
- **baseInstance**: `https://api.replyke.com` - Base API endpoint

**Authentication Headers**:
- `Authorization: Bearer {apiKey}`
- `X-Replyke-Project-ID: {projectId}`
- `X-Replyke-Internal: true` (for internal operations)

### Initialization Pattern

```typescript
import { ReplykeClient } from '@replyke/node';

const client = await ReplykeClient.init({
    projectId: "your-project-id",
    apiKey: "your-api-key",
    isInternal?: boolean  // optional
});

// Automatically verifies credentials on init via /service/verify endpoint
```

## API Modules & Features

### 1. Entities Module (8 functions)

Entities are the core content objects (posts, articles, products, listings, etc.).

**Functions**:
- `client.entities.createEntity(data)` - Create a new entity
- `client.entities.fetchEntity({ entityId })` - Fetch by ID
- `client.entities.fetchEntityByForeignId({ foreignId })` - Fetch by external system ID
- `client.entities.fetchEntityByShortId({ shortId })` - Fetch by short/shareable ID
- `client.entities.fetchManyEntities(filters)` - Advanced querying with filters
- `client.entities.updateEntity(data)` - Update entity
- `client.entities.incrementEntityViews({ entityId })` - Track view count
- `client.entities.deleteEntity({ entityId })` - Delete entity

**Key Features**:
- Foreign ID support for integration with existing systems
- Geo-location (GeoJSON Point format)
- Upvotes/downvotes with automatic "hotness" scoring
- Comments and replies counting
- Keywords/tags
- Attachments (flexible JSON structure)
- User mentions
- Custom metadata (up to 10KB)
- Top comment caching

**Advanced Filtering** (fetchManyEntities):
- **Sorting**: hot, top, controversial
- **Time frames**: hour, day, week, month, year, all
- **Keywords**: includes/excludes arrays
- **Metadata**: includes/excludes/exists/doesNotExist filters
- **Text search**: title and content filtering
- **Media**: presence/absence of attachments
- **Geo-location**: latitude, longitude, radius filtering
- **User-specific**: filter by userId, followedOnly
- **Pagination**: page and limit parameters

### 2. Comments Module (5 functions)

**Functions**:
- `client.comments.createComment({ userId, entityId, content, ... })` - Create comment or reply
- `client.comments.fetchComment({ commentId })` - Fetch by ID
- `client.comments.fetchCommentByForeignId({ foreignId })` - Fetch by external ID
- `client.comments.updateComment(data)` - Update comment
- `client.comments.deleteComment({ commentId })` - Delete comment (soft delete)

**Key Features**:
- Threaded replies (parentId support)
- Referenced comments for quote-replies
- GIF support with preview URLs and aspect ratios
- User mentions
- Upvotes/downvotes
- Custom metadata
- Foreign ID support
- Soft deletes (deletedAt, parentDeletedAt timestamps)

### 3. Users Module (2 functions)

**Functions**:
- `client.users.fetchUserById({ userId })` - Fetch user by Replyke ID
- `client.users.fetchUserByForeignId({ foreignId })` - Fetch by external system ID

**User Features**:
- Roles: admin, moderator, visitor
- Profile data: email, name, username, avatar, bio (300 char max)
- Birthdate and geo-location
- Reputation score (auto-managed based on activity)
- Verification status
- Active/inactive account status
- Last activity tracking
- Public and secure metadata
- Suspension tracking

### 4. Lists Module (8 functions)

Lists allow users to create collections of entities (e.g., "Saved Posts", "Favorites", "Reading List").

**Functions**:
- `client.lists.createNewList({ userId, listId, listName })` - Create new list
- `client.lists.fetchRootList(data)` - Fetch root-level list
- `client.lists.fetchSubLists(data)` - Fetch child lists
- `client.lists.isEntitySaved(data)` - Check if entity is in list
- `client.lists.updateList(data)` - Update list
- `client.lists.addEntityToList(data)` - Add entity to list
- `client.lists.removeEntityFromList(data)` - Remove entity from list
- `client.lists.deleteList({ listId })` - Delete list

**Key Features**:
- Hierarchical structure (parent/child lists)
- User-scoped collections
- Entity membership tracking

### 5. Hosted Apps Module (1 function)

**Functions**:
- `client.hostedApps.fetchHostedApp(data)` - Fetch hosted app information

## Key Design Patterns

### 1. Foreign ID Integration
All major resources support foreign IDs, allowing you to map your existing system's IDs to Replyke IDs. This enables seamless integration on top of existing platforms.

### 2. Metadata Flexibility
Most resources support custom metadata (10KB limit) for storing project-specific data without modifying the core schema.

### 3. Geo-Location Support
Entities and users support geo-location data in GeoJSON Point format for location-based features and filtering.

### 4. Soft Deletes
Resources use `deletedAt` timestamps rather than hard deletes, preserving data integrity and allowing for recovery.

### 5. Module Binding
Functions are bound to the HTTP client instance at initialization, providing a clean API: `client.entities.createEntity(data)` instead of passing the client explicitly.

## Usage Example

```typescript
import { ReplykeClient } from '@replyke/node';

// Initialize client
const client = await ReplykeClient.init({
    projectId: process.env.REPLYKE_PROJECT_ID,
    apiKey: process.env.REPLYKE_API_KEY
});

// Create an entity
const entity = await client.entities.createEntity({
    foreignId: 'post-123',
    title: 'My First Post',
    content: 'This is the content of my post',
    keywords: ['tutorial', 'nodejs'],
    userId: 'user-456',
    metadata: {
        category: 'technology',
        featured: true
    }
});

// Fetch entities with advanced filtering
const trendingPosts = await client.entities.fetchManyEntities({
    sort: 'hot',
    timeframe: 'week',
    keywords: { includes: ['nodejs'] },
    limit: 10,
    page: 1
});

// Create a comment
const comment = await client.comments.createComment({
    entityId: entity.id,
    userId: 'user-789',
    content: 'Great post! Thanks for sharing.'
});

// Fetch user
const user = await client.users.fetchUserById({
    userId: 'user-456'
});
```

## Build & Publishing

### Build Configuration
- **Build Tool**: tsup
- **Output Formats**: CommonJS and ESM (dual package)
- **Type Declarations**: Generated via TypeScript compiler
- **Target**: ESNext
- **Entry Point**: `src/index.ts`

### Output Structure
```
dist/
├── index.js         # Main CommonJS/ESM bundle
└── index.d.ts       # TypeScript declarations
```

### Publishing to npm
```bash
# Beta release
pnpm publish-beta

# Production release
pnpm publish-prod
```

**Package Exports**:
- CommonJS: `dist/index.js`
- ES Modules: `dist/index.js`
- Types: `dist/index.d.ts`

## Use Cases

This SDK is ideal for:

1. **Server-Side Rendering** - Next.js server actions, server components
2. **Backend APIs** - Express, Fastify, Koa backend services
3. **Scheduled Jobs** - Cron jobs, background workers, task queues
4. **CLI Tools** - Command-line utilities for content management
5. **Migration Scripts** - Bulk data operations and imports
6. **Webhooks** - Event handlers for external integrations
7. **Admin Tools** - Moderation dashboards, content management
8. **Edge Functions** - Cloudflare Workers, Vercel Edge Functions

Essentially any Node.js environment where you need to interact with Replyke's social features without a React frontend.

## Technical Details

- **TypeScript**: Strict mode enabled
- **Dependencies**: Only axios for HTTP requests
- **API Version**: Uses v5 API endpoints
- **Authentication**: Bearer token with project ID header
- **Error Handling**: Axios error responses
- **Type Safety**: Full TypeScript support with exported interfaces

## Important Notes

- This SDK is currently in **beta** (v6.0.0-beta.0)
- Requires valid project ID and API key from Replyke dashboard
- Credentials are verified on initialization
- All API calls are project-scoped
- Rate limiting applies based on your Replyke plan
