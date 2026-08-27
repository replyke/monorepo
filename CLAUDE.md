# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building
- `pnpm run react:build-all` - Builds the react-family packages (core, react-js, react-native, expo) in dependency order
- Individual package builds: `pnpm --filter @sublay/[package-name] run build`
- Each package builds to ESM and CJS formats using TypeScript

### Publishing
Scripts are grouped by publish group, and every group carries a `{group}:` prefix — no group is the unprefixed default. There are five groups: `react`, `ui-core`, `cli`, `node`, `js`.

**Always use the `:patch` / `:minor` form.** The bare `{group}:publish-prod` / `{group}:publish-beta` scripts build (and, for `react`/`node`/`js`, run tests) and then publish — but they never bump the version, and `pnpm publish` silently skips any package whose current version is already on the registry, exiting 0. So running a bare form without having bumped the version separately first *looks* like a successful release and ships nothing. The `:patch` / `:minor` variants are just `{group}:version:{patch,minor} && {group}:publish-{prod,beta}` — the bump and the publish in one command — and are the normal way to release. Reach for a bare form only when you have deliberately bumped the version by hand (or via `{group}:version:patch`) as a separate step.

| Group | Packages | Publish |
|---|---|---|
| `react` | `@sublay/core`, `@sublay/react-js`, `@sublay/react-native`, `@sublay/expo` | `pnpm run react:publish-prod:patch` / `react:publish-prod:minor` (or `react:publish-beta:patch` / `:minor`) |
| `ui-core` | `@sublay/ui-core-react-js`, `@sublay/ui-core-react-native` | `pnpm run ui-core:publish-prod:patch` / `:minor` (or `ui-core:publish-beta:patch` / `:minor`) |
| `cli` | `@sublay/cli` | `pnpm run cli:publish-prod:patch` / `:minor` (or `cli:publish-beta:patch` / `:minor`) |
| `node` | `@sublay/node` | `pnpm run node:publish-prod:patch` / `:minor` (or `node:publish-beta:patch` / `:minor`) |
| `js` | `@sublay/js` | `pnpm run js:publish-prod:patch` / `:minor` (or `js:publish-beta:patch` / `:minor`) |

Every group also exposes `{group}:version:patch` and `{group}:version:minor` for bumping without publishing.

## Architecture Overview

This is a **monorepo** for Sublay, an open-source social features framework. The project uses pnpm workspaces and follows a layered architecture:

### Core Architecture Layers

1. **API Foundation** - All functionality is accessible through REST APIs
2. **Libraries & SDKs** - TypeScript libraries that wrap the API with hooks and utilities
3. **UI Components** - Ready-to-use React/React Native components built on the libraries

### Package Structure

The monorepo is organized into these main packages:

- **`@sublay/core`** - Core hooks, context providers, and utilities for both React and React Native
- **`@sublay/react-js`** - React-specific implementations and re-exports from core
- **`@sublay/react-native`** - React Native-specific implementations with token management
- **`@sublay/expo`** - Expo-specific implementations with secure token storage

### Key Context Providers

The framework uses React Context for state management:
- `SublayProvider` - Root provider with project configuration
- `EntityProvider` - Manages individual entities (posts, articles, etc.)
- `EntityListProvider` - Manages collections of entities with filtering/sorting
- `CommentSectionProvider` - Manages comment threads and interactions
- `AuthProvider` - Handles authentication state
- `ListsProvider` - Manages user-created lists and collections

### Development Patterns

- **Workspace Dependencies**: Packages use `workspace:*` for internal dependencies
- **Build Process**: Each package compiles to both ESM (`dist/esm`) and CJS (`dist/cjs`) formats
- **TypeScript**: All packages use TypeScript with separate configs for ESM/CJS builds
- **Context-Hook Pattern**: UI components get state through context providers and custom hooks
- **Platform Abstraction**: Shared core logic with platform-specific implementations

### Usage Flow

1. Wrap app in `SublayProvider` with project ID and authentication token
2. Use `EntityProvider` to define the content being discussed
3. Add social components like `SocialCommentSection` which self-contain all UI and logic
4. Components automatically handle API calls, state management, and real-time updates

All social features (comments, votes, follows, lists, notifications) follow this same provider + hooks + components pattern.