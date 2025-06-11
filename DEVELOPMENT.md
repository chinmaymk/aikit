# Development Guide

This guide covers how to set up the development environment and contribute to AIKit.

## Prerequisites

- Node.js 18+ 
- npm

## Setup

1. **Clone the repository**:
```bash
git clone https://github.com/chinmaymk/aikit.git
cd aikit
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables** for testing:
```bash
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export GOOGLE_API_KEY="your-google-api-key"
```

## Development Commands

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:basic
npm run test:compatibility
npm run test:all
```

### Code Quality
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Type check
npm run typecheck
```

### Building
```bash
# Build the library
npm run build
```

### Documentation
```bash
# Generate API documentation from source
npm run docs:generate

# Start documentation dev server
npm run docs:dev

# Build documentation
npm run docs:build

# Preview built documentation
npm run docs:preview
```

## Project Structure

```
aikit/
├── src/                    # Source code
│   ├── providers/          # Provider implementations
│   ├── types.ts           # Type definitions
│   ├── factory.ts         # Factory functions
│   └── index.ts           # Main exports
├── tests/                 # Test files
├── examples/              # Usage examples
├── docs/                  # Documentation
└── dist/                  # Built output
```

## API Keys for Testing

To run tests and examples, you'll need API keys from:

- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/
- **Google**: https://makersuite.google.com/app/apikey

## Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Add tests** for new functionality
5. **Run the test suite**: `npm test`
6. **Ensure code quality**: `npm run lint && npm run format:check`
7. **Commit your changes**: `git commit -m 'Add amazing feature'`
8. **Push to the branch**: `git push origin feature/amazing-feature`
9. **Open a Pull Request**

## Code Style

- Use TypeScript for all code
- Follow the existing code style (enforced by Prettier)
- Add JSDoc comments for public APIs
- Write tests for new features
- Ensure 100% type safety (no `any` types)

## Release Process

1. Update version in `package.json`
2. Update changelog
3. Create a git tag: `git tag v1.0.0`
4. Push tags: `git push --tags`
5. GitHub Actions will handle the rest

## Documentation

The documentation is automatically generated from:
- TypeScript source code (via TypeDoc)
- Manual documentation in `docs/`
- JSDoc comments in the source

When you add new features:
1. Add comprehensive JSDoc comments
2. Update relevant documentation pages
3. Add examples if applicable

## Architecture

AIKit uses a unified interface pattern:

1. **Factory Functions** (`src/factory.ts`) - Create provider instances
2. **Provider Classes** (`src/providers/`) - Implement the `AIProvider` interface
3. **Type System** (`src/types.ts`) - Shared types across all providers
4. **Examples** (`examples/`) - Working code samples

Each provider translates the unified interface to provider-specific APIs while maintaining consistent behavior. 