# AIKit Documentation

This directory contains the documentation website for AIKit, built with VitePress.

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

1. Install dependencies:

```bash
npm install
```

2. Generate API documentation from source:

```bash
npm run docs:generate
```

3. Start the development server:

```bash
npm run docs:dev
```

The documentation will be available at `http://localhost:5173`.

### Building

To build the documentation for production:

```bash
npm run docs:build
```

The built files will be in `docs/.vitepress/dist`.

### Preview

To preview the built documentation:

```bash
npm run docs:preview
```

## Structure

- `index.md` - Homepage
- `guide/` - User guides and tutorials
- `api/` - Manual API documentation
- `api/generated/` - Auto-generated API docs from TypeScript source
- `examples/` - Code examples
- `.vitepress/` - VitePress configuration

## Auto-Generated Documentation

The API documentation is automatically generated from the TypeScript source code using TypeDoc. The generation happens during the build process and includes:

- Type definitions
- Interface documentation
- Function signatures
- JSDoc comments

## Deployment

The documentation is automatically deployed to GitHub Pages via GitHub Actions when changes are pushed to the main branch.

## Configuration

The VitePress configuration is in `.vitepress/config.ts`. Key settings:

- Base URL: `/aikit/` (for GitHub Pages)
- Theme configuration
- Navigation and sidebar
- Search configuration
