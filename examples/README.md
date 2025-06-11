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

### OpenAI Example

```bash
npx tsx examples/openai.ts
```

### Anthropic Example

```bash
npx tsx examples/anthropic.ts
```

### Google Gemini Example

```bash
npx tsx examples/google.ts
```

### Tools Example

```bash
npx tsx examples/tools-example.ts
```

## What Each Example Does

- **OpenAI**: Demonstrates streaming chat completion using GPT-4o model
- **Anthropic**: Shows Claude 3.5 Sonnet responding to a question about quantum computing
- **Google**: Uses Gemini 1.5 Pro to explain renewable energy benefits

## API Keys

To get API keys for each provider:

- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/
- **Google**: https://makersuite.google.com/app/apikey

## Customization

Feel free to modify the examples:

- Change the models by updating the `model` field in `GenerationOptions`
- Adjust parameters like `temperature`, `maxTokens`, etc.
- Modify the conversation messages
- Add tool usage examples (see provider documentation for tool schemas)

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

- `gemini-1.5-pro`
- `gemini-1.5-flash`
- `gemini-1.0-pro`
- `gemini-pro`
