# Factory Functions

AIKit provides several factory functions to create AI provider instances. These functions ensure type safety and provide a consistent interface across all providers.

## createProvider()

The recommended generic factory function that supports all providers with full type safety.

```typescript
function createProvider<T extends 'openai' | 'anthropic' | 'google'>(
  type: T,
  config: T extends 'openai' ? OpenAIConfig : T extends 'anthropic' ? AnthropicConfig : GoogleConfig
): AIProvider
```

### Example

```typescript
import { createProvider } from 'aikit';

// TypeScript will infer the correct config type
const openai = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
  organization: 'org-123', // OpenAI-specific option
  maxRetries: 3
});

const anthropic = createProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY!,
  beta: ['tools-2024-04-04'] // Anthropic-specific option
});

const google = createProvider('google', {
  apiKey: process.env.GOOGLE_API_KEY!
});
```

## Provider-Specific Functions

For when you know exactly which provider you're using, these functions provide a more direct approach.

### createOpenAI()

```typescript
function createOpenAI(config: OpenAIConfig): AIProvider
```

**Config Options:**
- `apiKey` (required) - Your OpenAI API key
- `baseURL` (optional) - Custom API endpoint
- `organization` (optional) - OpenAI organization ID
- `project` (optional) - OpenAI project ID
- `timeout` (optional) - Request timeout in milliseconds
- `maxRetries` (optional) - Maximum retry attempts

```typescript
import { createOpenAI } from 'aikit';

const provider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  organization: 'org-123',
  timeout: 30000,
  maxRetries: 3
});
```

### createAnthropic()

```typescript
function createAnthropic(config: AnthropicConfig): AIProvider
```

**Config Options:**
- `apiKey` (required) - Your Anthropic API key
- `baseURL` (optional) - Custom API endpoint
- `timeout` (optional) - Request timeout in milliseconds
- `maxRetries` (optional) - Maximum retry attempts
- `beta` (optional) - Array of beta features to enable

```typescript
import { createAnthropic } from 'aikit';

const provider = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  beta: ['tools-2024-04-04'],
  timeout: 60000
});
```

### createGoogle()

```typescript
function createGoogle(config: GoogleConfig): AIProvider
```

**Config Options:**
- `apiKey` (required) - Your Google AI API key

```typescript
import { createGoogle } from 'aikit';

const provider = createGoogle({
  apiKey: process.env.GOOGLE_API_KEY!
});
```

## Error Handling

All factory functions will throw an error if:
- Required configuration is missing
- API key is invalid format
- Provider-specific validation fails

```typescript
try {
  const provider = createProvider('openai', {
    apiKey: 'invalid-key'
  });
} catch (error) {
  console.error('Failed to create provider:', error.message);
}
```

## Type Safety

The factory functions provide full TypeScript support:

```typescript
// ✅ Correct - TypeScript knows this needs OpenAIConfig
const openai = createProvider('openai', {
  apiKey: 'sk-...',
  organization: 'org-123' // OpenAI-specific
});

// ❌ Error - TypeScript will catch this
const anthropic = createProvider('anthropic', {
  apiKey: 'sk-...',
  organization: 'org-123' // Error: not valid for Anthropic
});
``` 