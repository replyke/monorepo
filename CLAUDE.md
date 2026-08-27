# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building
- `pnpm run react:build-all` - Builds the react-family packages (core, react-js, react-native, expo) in dependency order
- Individual package builds: `pnpm --filter @sublay/[package-name] run build`
- Each package builds to ESM and CJS formats using TypeScript

### Publishing
Scripts are grouped by publish group, and every group carries a `{group}:` prefix — no group is the unprefixed default.
- `pnpm run react:publish-prod` / `react:publish-beta` - Publishes the react-family packages
- `pnpm run ui-core:publish-prod` / `ui-core:publish-beta` - Publishes the ui-core packages
- Add `:patch` or `:minor` to version first, e.g. `pnpm run react:publish-beta:patch`

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