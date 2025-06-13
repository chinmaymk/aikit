# Configuration Guide

AIKit uses a flexible configuration system that consolidates API credentials and generation options into single interfaces per provider. This approach offers maximum flexibility while maintaining type safety and consistency across all providers.

## Overview

The configuration system provides:

- **Single interface per provider**: `OpenAIOptions`, `AnthropicOptions`, `GoogleOptions`
- **Provider-specific type safety**: Each provider has its own typed interface preventing configuration errors
- **Flexible configuration**: Options can be provided at construction time, generation time, or both
- **Override capability**: Generation-time options take precedence over construction-time defaults
- **Full TypeScript support**: Compile-time validation and excellent IDE support
- **Consistent API**: Same patterns across all providers

## Basic Configuration Patterns

### Pattern 1: Everything at Generation Time

The simplest approach - provide only the API key at construction and all generation options at runtime:

```typescript
import { createProvider, userText, generate } from 'aikit';

// Minimal construction with just API key
const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

// All generation options provided at generation time
const result = await generate(provider, [userText('Explain TypeScript in one sentence.')], {
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 100,
});
```

### Pattern 2: Defaults at Construction

Set common defaults at construction time and override specific options when needed:

```typescript
// Set default model and generation options at construction time
const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
  temperature: 0.5,
  maxTokens: 150,
});

// Use defaults
const defaultResult = await generate(
  provider,
  [userText('What is machine learning?')]
  // No options provided - uses construction defaults
);

// Override specific options at generation time
const overrideResult = await generate(
  provider,
  [userText('What is machine learning? Be very creative.')],
  {
    temperature: 0.9, // Override temperature
    maxTokens: 50, // Override maxTokens
    // model: 'gpt-4o' (uses default from construction)
  }
);
```

## Provider-Specific Configuration

### OpenAI Configuration

OpenAI supports the most comprehensive set of configuration options. Use the `OpenAIOptions` type for full type safety:

```typescript
import type { OpenAIOptions } from 'aikit';

const config: OpenAIOptions = {
  // Required
  apiKey: process.env.OPENAI_API_KEY!,

  // Generation options
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 200,
  topP: 0.9,
  stopSequences: ['END'],

  // OpenAI-specific options
  presencePenalty: 0.1,
  frequencyPenalty: 0.1,
  user: 'example-user-123',

  // API configuration
  baseURL: 'https://api.openai.com/v1', // Custom endpoint
  organization: 'org-123456789', // Organization ID
  project: 'proj-123456789', // Project ID
  timeout: 30000, // 30 seconds
  maxRetries: 3,

  // Advanced features
  parallelToolCalls: true,
  background: false,
  store: false,
  reasoning: { effort: 'medium' },
  serviceTier: 'default',

  // Response formatting
  text: {
    format: {
      type: 'json_object', // or 'text', 'json_schema'
    },
  },
};

const provider = createProvider('openai', config);
```

### Anthropic Configuration

Anthropic has its own set of provider-specific options. Use the `AnthropicOptions` type for type safety:

```typescript
import type { AnthropicOptions } from 'aikit';

const config: AnthropicOptions = {
  // Required
  apiKey: process.env.ANTHROPIC_API_KEY!,

  // Generation options
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.6,
  maxTokens: 100,
  topP: 0.8,
  topK: 40,

  // API configuration
  baseURL: 'https://api.anthropic.com', // Custom endpoint
  timeout: 60000, // 60 seconds
  maxRetries: 2,
  anthropicVersion: '2023-06-01', // API version

  // Anthropic-specific options
  beta: ['computer-use-2024-10-22'], // Enable beta features

  // Advanced options
  container: 'my-container-id', // Container for reuse across requests
  mcpServers: [
    {
      name: 'my-mcp-server',
      url: 'https://my-server.com/mcp',
      authorization_token: 'token123',
      tool_configuration: {
        enabled: true,
        allowed_tools: ['search', 'calculator'],
      },
    },
  ],
  metadata: {
    user_id: 'user-12345', // External user identifier
  },
  serviceTier: 'auto', // 'auto' or 'standard_only'
  thinking: {
    type: 'enabled',
    budget_tokens: 2048, // Tokens for extended thinking
  },
};

const provider = createProvider('anthropic', config);
```

### Google Configuration

Google Gemini has specific options for multi-candidate generation. Use the `GoogleOptions` type for type safety:

```typescript
import type { GoogleOptions } from 'aikit';

const config: GoogleOptions = {
  // Required
  apiKey: process.env.GOOGLE_API_KEY!,

  // Generation options
  model: 'gemini-1.5-pro',
  temperature: 0.8,
  maxTokens: 120,
  topP: 0.8,
  topK: 20,

  // Google-specific options
  candidateCount: 1, // Number of response candidates to generate
};

const provider = createProvider('google', config);
```

## Advanced Configuration Patterns

### Dynamic Configuration Based on Use Case

Configure providers differently based on the type of task:

```typescript
const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
  // Base configuration without specific generation settings
});

// Creative writing configuration
const creativeResult = await generate(provider, [userText('Write a haiku about programming.')], {
  temperature: 0.9, // High creativity
  maxTokens: 60,
});

// Analytical configuration
const analyticalResult = await generate(
  provider,
  [userText('Analyze the time complexity of bubble sort.')],
  {
    temperature: 0.2, // Low creativity, more focused
    maxTokens: 150,
    topP: 0.7,
  }
);
```

### Tools Configuration

Configure tools at construction time with the ability to override at generation:

```typescript
const weatherTool = {
  name: 'get_weather',
  description: 'Get current weather information for a location',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'City name or location',
      },
      unit: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        description: 'Temperature unit',
      },
    },
    required: ['location'],
  },
};

// Provider with default tools configuration
const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
  tools: [weatherTool],
  toolChoice: 'auto',
  parallelToolCalls: true,
});

// Use default tool configuration
const result = await generate(provider, [userText("What's the weather like in Tokyo?")]);

// Override tool choice at generation time
const forcedToolResult = await generate(provider, [userText('Tell me about weather systems.')], {
  toolChoice: { name: 'get_weather' }, // Force specific tool use
});
```

### Multi-Provider Consistency

Use the same configuration pattern across different providers:

```typescript
const baseOptions = {
  temperature: 0.6,
  maxTokens: 100,
};

// OpenAI
const openaiProvider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
  ...baseOptions,
});

// Anthropic
const anthropicProvider = createProvider('anthropic', {
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-5-sonnet-20241022',
  ...baseOptions,
});

// Google
const googleProvider = createProvider('google', {
  apiKey: process.env.GOOGLE_API_KEY!,
  model: 'gemini-1.5-pro',
  ...baseOptions,
});

// Same usage pattern for all providers
const question = [userText('Explain recursion in programming.')];
const openaiResult = await generate(openaiProvider, question);
const anthropicResult = await generate(anthropicProvider, question);
const googleResult = await generate(googleProvider, question);
```

## Configuration Option Reference

### Common Options (All Providers)

All providers support these basic generation options:

| Option          | Type                                                 | Description                                                              |
| --------------- | ---------------------------------------------------- | ------------------------------------------------------------------------ |
| `model`         | `string`                                             | The specific model to use (e.g., 'gpt-4o', 'claude-3-5-sonnet-20241022') |
| `maxTokens`     | `number`                                             | Maximum number of tokens to generate                                     |
| `temperature`   | `number`                                             | Sampling temperature (0.0 to 2.0)                                        |
| `topP`          | `number`                                             | Top-p sampling parameter                                                 |
| `stopSequences` | `string[]`                                           | Sequences that will stop generation                                      |
| `tools`         | `Tool[]`                                             | Available tools for the model to use                                     |
| `toolChoice`    | `'auto' \| 'required' \| 'none' \| { name: string }` | Tool selection strategy                                                  |

### OpenAI-Specific Options

| Option              | Type                            | Description                                |
| ------------------- | ------------------------------- | ------------------------------------------ |
| `presencePenalty`   | `number`                        | Penalize tokens based on presence in text  |
| `frequencyPenalty`  | `number`                        | Penalize tokens based on frequency in text |
| `user`              | `string`                        | Unique identifier for the end-user         |
| `organization`      | `string`                        | OpenAI organization ID                     |
| `project`           | `string`                        | OpenAI project ID                          |
| `parallelToolCalls` | `boolean`                       | Enable parallel tool execution             |
| `background`        | `boolean`                       | Run generation in background               |
| `reasoning`         | `object`                        | Configuration for reasoning models         |
| `serviceTier`       | `'auto' \| 'default' \| 'flex'` | Latency tier preference                    |

### Anthropic-Specific Options

| Option             | Type       | Description                                         |
| ------------------ | ---------- | --------------------------------------------------- |
| `topK`             | `number`   | Top-k sampling parameter                            |
| `beta`             | `string[]` | Enable beta features                                |
| `anthropicVersion` | `string`   | API version (default: '2023-06-01')                 |
| `container`        | `string`   | Container identifier for reuse across requests      |
| `mcpServers`       | `array`    | MCP servers configuration for tool execution        |
| `metadata`         | `object`   | Request metadata including user identifier          |
| `serviceTier`      | `string`   | Service tier preference ('auto' or 'standard_only') |
| `thinking`         | `object`   | Extended thinking configuration with budget tokens  |

### Google-Specific Options

| Option           | Type     | Description                               |
| ---------------- | -------- | ----------------------------------------- |
| `topK`           | `number` | Top-k sampling parameter                  |
| `candidateCount` | `number` | Number of response candidates to generate |

## Best Practices

### 1. Set Sensible Defaults at Construction

Configure commonly used options at construction time:

```typescript
const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o', // Your preferred model
  temperature: 0.7, // Balanced creativity
  maxTokens: 500, // Reasonable default
  timeout: 30000, // 30 second timeout
  maxRetries: 3, // Retry failed requests
});
```

### 2. Override Only What You Need

When generating, only specify options that differ from your defaults:

```typescript
// Quick creative response
const creative = await generate(provider, messages, {
  temperature: 0.9,
});

// Detailed analytical response
const analytical = await generate(provider, messages, {
  temperature: 0.2,
  maxTokens: 1000,
});
```

### 3. Environment-Based Configuration

Use environment variables for different deployment environments:

```typescript
const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: process.env.OPENAI_BASE_URL, // Optional custom endpoint
  model: process.env.OPENAI_MODEL || 'gpt-4o',
  temperature: parseFloat(process.env.DEFAULT_TEMPERATURE || '0.7'),
  timeout: parseInt(process.env.API_TIMEOUT || '30000'),
});
```

### 4. Type Safety with Provider-Specific Types

Leverage TypeScript with provider-specific types for maximum type safety. Each provider has its own options interface that prevents configuration errors at compile time:

```typescript
import type { OpenAIOptions, AnthropicOptions, GoogleOptions } from 'aikit';

// OpenAI configuration with full type checking
const openaiConfig: OpenAIOptions = {
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
  temperature: 0.7,
  presencePenalty: 0.1, // ✅ OpenAI-specific option
  // beta: ['test'],        // ❌ Compile error: not valid for OpenAI
};

// Anthropic configuration with type safety
const anthropicConfig: AnthropicOptions = {
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-5-sonnet-20241022',
  topK: 40, // ✅ Anthropic-specific option
  beta: ['computer-use-2024-10-22'], // ✅ Anthropic-specific option
  // presencePenalty: 0.1,  // ❌ Compile error: not valid for Anthropic
};

// Google configuration with type safety
const googleConfig: GoogleOptions = {
  apiKey: process.env.GOOGLE_API_KEY!,
  model: 'gemini-1.5-pro',
  candidateCount: 1, // ✅ Google-specific option
  // beta: ['test'],        // ❌ Compile error: not valid for Google
};

const openaiProvider = createProvider('openai', openaiConfig);
const anthropicProvider = createProvider('anthropic', anthropicConfig);
const googleProvider = createProvider('google', googleConfig);
```

**Benefits of Provider-Specific Types:**

- **Compile-time validation**: TypeScript catches invalid options before runtime
- **IDE support**: Better autocomplete and IntelliSense
- **Provider-specific options**: Access to all provider-unique features
- **Prevents errors**: No more runtime failures from invalid configurations

## Migration from Separate Interfaces

If you're migrating from the old system with separate config and generation options:

### Before (Old System)

```typescript
// Old approach with separate interfaces
const provider = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  organization: 'org-123',
});

await provider.generate(messages, {
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 100,
});
```

### After (New System)

```typescript
// New approach with consolidated interface
const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
  organization: 'org-123',
  model: 'gpt-4o', // Can set default here
  temperature: 0.7, // Can set default here
  maxTokens: 100, // Can set default here
});

await generate(provider, messages); // Uses defaults
// or
await generate(provider, messages, { temperature: 0.9 }); // Override specific options
```

## Common Patterns Summary

| Pattern                     | When to Use                                            | Example                                                        |
| --------------------------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| **Minimal Construction**    | When options vary significantly between calls          | `{ apiKey }` only                                              |
| **Default Configuration**   | When you have consistent settings across most calls    | Set model, temperature, etc. at construction                   |
| **Override Pattern**        | When you need to adjust specific options occasionally  | Set defaults, override with `{ temperature: 0.9 }`             |
| **Environment-Based**       | For different deployment environments                  | Use `process.env` values                                       |
| **Type-Safe Configuration** | For large applications with strict typing requirements | Use `OpenAIOptions`, `AnthropicOptions`, `GoogleOptions` types |

The new configuration system provides maximum flexibility while maintaining simplicity and type safety. Choose the pattern that best fits your use case and application architecture.
