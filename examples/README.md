# AIKit Examples

This directory contains example scripts demonstrating how to use AIKit with different AI providers.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables for the providers you want to use:

### OpenAI

```bash
export OPENAI_API_KEY="your-openai-api-key"
```

### Anthropic

```bash
export ANTHROPIC_API_KEY="your-anthropic-api-key"
```

### Google

```bash
export GOOGLE_API_KEY="your-google-api-key"
```

## Running Examples

### Simple Responses (All Providers)

```bash
# Run with all providers (if API keys are set)
npx tsx examples/simple-responses.ts

# Run with specific provider
npx tsx examples/simple-responses.ts openai
npx tsx examples/simple-responses.ts anthropic
npx tsx examples/simple-responses.ts google
```

### Tool Calls with All Providers

```bash
# Run with all providers (if API keys are set)
npx tsx examples/tools-with-providers.ts

# Run with specific provider
npx tsx examples/tools-with-providers.ts openai
npx tsx examples/tools-with-providers.ts anthropic
npx tsx examples/tools-with-providers.ts google
```

### Individual Provider Examples

```bash
# Anthropic-specific example
npx tsx examples/anthropic.ts

# Advanced OpenAI tools example
npx tsx examples/tools-example.ts
```

## What Each Example Does

- **Simple Responses**: Demonstrates basic text generation (haiku writing) across all three providers using the unified `createProvider` interface
- **Tools with All Providers**: Shows tool calls (weather function) working with OpenAI, Anthropic, and Google Gemini providers
- **Anthropic**: Claude 3.5 Sonnet responding to a question about quantum computing
- **Advanced Tools**: Comprehensive OpenAI-specific tool usage example with detailed conversation flow

## API Keys

To get API keys for each provider:

- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/
- **Google**: https://makersuite.google.com/app/apikey

## Customization

Feel free to modify the examples:

- Change the models by updating the `model` field in generation options
- Adjust parameters like `temperature`, `maxTokens`, etc.
- Modify the conversation messages
- Add more tools to the tool examples
- Switch between providers using the `createProvider` factory function

## Available Models

### OpenAI Models

- `gpt-4o`
- `gpt-4o-mini`
- `gpt-4-turbo`
- `gpt-4`
- `gpt-3.5-turbo`
- `o1-preview`
- `o1-mini`

### Anthropic Models

- `claude-3-5-sonnet-20241022`
- `claude-3-5-haiku-20241022`
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`

### Google Models

- `gemini-2.5-pro-preview-06-05`
- `gemini-2.5-pro-preview-05-06`
- `gemini-2.5-pro-preview-03-25`
- `gemini-2.5-flash-preview-05-20`
- `gemini-2.0-flash`
- `gemini-2.0-flash-lite`
- `gemini-1.5-pro-latest`
- `gemini-1.5-flash-latest`
- `gemini-1.5-pro`
- `gemini-1.5-flash`
- `gemini-1.5-flash-8b`
- `gemini-1.0-pro`
- `gemini-pro`
