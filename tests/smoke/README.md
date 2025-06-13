# Smoke Tests

These are smoke tests for AIKit providers that make real API calls to verify all providers work correctly with the AIKit interface.

## What these tests cover

- **Basic text generation** - Simple text generation for all providers and models
- **Tool calling** - Function/tool calling capabilities where supported
- **Reasoning** - Reasoning capabilities for providers that support it (OpenAI O1 models, Anthropic with thinking)
- **Embeddings** - Embedding generation for providers that support it (OpenAI, Google)

## Running the tests

### Prerequisites

You need to set up API keys as environment variables:

```bash
export OPENAI_API_KEY="your-openai-key"
export ANTHROPIC_API_KEY="your-anthropic-key"
export GOOGLE_API_KEY="your-google-key"
```

### Run smoke tests

```bash
# Using npm script
npm run test:smoke

# Or directly with Jest
npx jest --config tests/smoke/jest.config.js --verbose

# Or using the everything.sh script
./everything.sh
```

## Test behavior

- Tests will be **skipped** (not failed) if the corresponding API key is missing
- Tests run **sequentially** (maxWorkers: 1) to avoid rate limiting
- Each test has a **60-second timeout** to accommodate real API calls
- Tests are organized by provider and then by model for clear reporting

## Adding new tests

When adding new providers or capabilities:

1. Update the `PROVIDERS` array in `providers.test.ts`
2. Add new test cases following the existing pattern
3. Use `pending()` to skip tests for unsupported features
4. Ensure proper error handling and meaningful assertions
