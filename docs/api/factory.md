# Factory Functions

Create AI provider instances with full type safety.

## createProvider()

Generic factory function supporting all providers.

```typescript
function createProvider<T extends 'openai' | 'anthropic' | 'google'>(
  type: T,
  config: T extends 'openai' ? OpenAIConfig : T extends 'anthropic' ? AnthropicConfig : GoogleConfig
): AIProvider;
```

### Usage

```typescript
import { createProvider } from 'aikit';

const openai = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
  organization: 'org-123',
  maxRetries: 3,
});

const anthropic = createProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY!,
  beta: ['tools-2024-04-04'],
});

const google = createProvider('google', {
  apiKey: process.env.GOOGLE_API_KEY!,
});
```

## Provider-Specific Functions

### createOpenAI()

```typescript
function createOpenAI(config: OpenAIConfig): AIProvider;
```

**Options:**

- `apiKey` (required) - OpenAI API key
- `baseURL` - Custom API endpoint
- `organization` - Organization ID
- `project` - Project ID
- `timeout` - Request timeout in ms
- `maxRetries` - Maximum retry attempts

```typescript
import { createOpenAI } from 'aikit';

const provider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  organization: 'org-123',
  timeout: 30000,
});
```

### createAnthropic()

```typescript
function createAnthropic(config: AnthropicConfig): AIProvider;
```

**Options:**

- `apiKey` (required) - Anthropic API key
- `baseURL` - Custom API endpoint
- `timeout` - Request timeout in ms
- `maxRetries` - Maximum retry attempts
- `beta` - Beta features to enable

```typescript
import { createAnthropic } from 'aikit';

const provider = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  beta: ['tools-2024-04-04'],
});
```

### createGoogle()

```typescript
function createGoogle(config: GoogleConfig): AIProvider;
```

**Options:**

- `apiKey` (required) - Google AI API key

```typescript
import { createGoogle } from 'aikit';

const provider = createGoogle({
  apiKey: process.env.GOOGLE_API_KEY!,
});
```

## Error Handling

Factory functions throw errors for invalid configuration:

```typescript
try {
  const provider = createProvider('openai', {
    apiKey: 'invalid-key',
  });
} catch (error) {
  console.error('Failed to create provider:', error.message);
}
```

## Type Safety

Full TypeScript support with provider-specific configuration:

```typescript
// ✅ Correct
const openai = createProvider('openai', {
  apiKey: 'sk-...',
  organization: 'org-123', // OpenAI-specific
});

// ❌ Error - TypeScript catches this
const anthropic = createProvider('anthropic', {
  apiKey: 'sk-...',
  organization: 'org-123', // Invalid for Anthropic
});
```
