# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Mintlify documentation site. Mintlify is a documentation platform that uses MDX (Markdown + JSX) for content and a JSON configuration file for site structure and styling.

## Development Commands

### Local Development
```bash
# Install Mintlify CLI globally (requires Node.js 19+)
npm i -g mint

# Start local development server (runs on http://localhost:3000)
mint dev

# Run on custom port
mint dev --port 3333

# Update Mintlify CLI to latest version
npm mint update

# Validate links in documentation
mint broken-links
```

### Troubleshooting
- If dev environment fails: Run `mint update`
- If encountering unknown errors: Delete `~/.mintlify` folder and run `mint dev` again
- For sharp module errors: Upgrade to Node v19+, reinstall CLI with `npm remove -g mint && npm i -g mint`

## Project Structure

### Core Configuration
- **docs.json**: Central configuration file that defines:
  - Site metadata (name, colors, favicon, logo)
  - Navigation structure (tabs, groups, pages)
  - Theme and branding
  - External links and anchors
  - Contextual menu options

### Content Organization
All content files use `.mdx` format (MDX = Markdown + React components).

Directory structure:
```
├── docs.json                    # Main config file
├── index.mdx                    # Homepage
├── quickstart.mdx              # Getting started guide
├── development.mdx             # Development guide
├── essentials/                 # Core documentation guides
│   ├── markdown.mdx
│   ├── code.mdx
│   ├── images.mdx
│   ├── navigation.mdx
│   ├── settings.mdx
│   └── reusable-snippets.mdx
├── ai-tools/                   # AI tools integration guides
│   ├── cursor.mdx
│   ├── claude-code.mdx
│   └── windsurf.mdx
├── api-reference/              # API documentation
│   ├── introduction.mdx
│   ├── openapi.json           # OpenAPI spec for auto-generated API docs
│   └── endpoint/
├── snippets/                   # Reusable content snippets
├── images/                     # Image assets
└── logo/                       # Logo files (light.svg, dark.svg)
```

## Key Architecture Patterns

### Navigation Structure
Navigation is defined hierarchically in `docs.json`:
- **Tabs**: Top-level navigation sections
- **Groups**: Category groupings within tabs
- **Pages**: Individual MDX files (referenced without `.mdx` extension)

Example:
```json
"tabs": [
  {
    "tab": "Guides",
    "groups": [
      {
        "group": "Getting started",
        "pages": ["index", "quickstart", "development"]
      }
    ]
  }
]
```

### MDX Files
Every MDX file requires frontmatter with at least a `title`:
```mdx
---
title: "Page Title"
description: "Optional description"
icon: "optional-icon-name"
---

Content goes here...
```

### Adding New Pages
1. Create `.mdx` file in appropriate directory
2. Add frontmatter with title/description
3. Add page path to `docs.json` navigation (without `.mdx` extension)
4. Preview changes with `mint dev`

### API Documentation
API docs are auto-generated from OpenAPI specifications:
- Place OpenAPI spec in `api-reference/openapi.json`
- Create endpoint MDX files in `api-reference/endpoint/`
- Mintlify automatically generates interactive API reference

### Reusable Snippets
- Store in `snippets/` directory
- Reference in other files for content reuse
- Helps maintain consistency across documentation

## Deployment

Changes pushed to the main branch automatically deploy to production via Mintlify's GitHub app integration.

## MDX Components

Mintlify provides custom React components for enhanced documentation:
- `<Card>`, `<CardGroup>`: Feature cards
- `<Accordion>`, `<AccordionGroup>`: Collapsible sections
- `<Tip>`, `<Note>`, `<Warning>`, `<Info>`: Callout boxes
- `<Steps>`, `<Step>`: Step-by-step guides
- `<Frame>`: Image containers
- `<Latex>`: LaTeX equation rendering

## File Modification Guidelines

When modifying this documentation:
- Always update `docs.json` when adding/removing pages or changing navigation
- Maintain consistent frontmatter across MDX files
- Use root-relative links (e.g., `/essentials/markdown`) instead of relative links
- Test changes locally with `mint dev` before committing
- Validate links with `mint broken-links` before deployment
