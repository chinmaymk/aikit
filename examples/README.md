# AIKit Examples

This directory contains comprehensive examples demonstrating how to use the AIKit library. The examples are organized progressively, from basic usage to advanced features.

## Setup

Before running any examples, you need to set up API keys for the providers you want to use:

```bash
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export GOOGLE_API_KEY="your-google-api-key"
```

You only need to set the API keys for the providers you plan to use.

## Examples

- [`01-getting-started.ts`](./01-getting-started.ts) - Basic usage patterns
- [`02-streaming.ts`](./02-streaming.ts) - Streaming responses
- [`03-multimodal.ts`](./03-multimodal.ts) - Working with images
- [`04-tools-basic.ts`](./04-tools-basic.ts) - Function calling
- [`06-configuration-patterns.ts`](./06-configuration-patterns.ts) - Advanced configuration patterns
- [`07-reasoning-models.ts`](./07-reasoning-models.ts) - Accessing model reasoning process
- [`08-content-accumulation.ts`](./08-content-accumulation.ts) - Accumulating and processing streaming content
- [`09-embeddings.ts`](./09-embeddings.ts) - Working with embeddings
- [`10-usage-tracking.ts`](./10-usage-tracking.ts) - Tracking token usage and costs
- [`11-mutate-headers.ts`](./11-mutate-headers.ts) - Dynamic header manipulation
- [`12-audio-handling.ts`](./12-audio-handling.ts) - Audio input processing
- [`mcp/`](./mcp/) - Model Context Protocol (MCP) integration example

## Running Examples

You can run any example directly with TypeScript:

```bash
npx tsx examples/01-getting-started.ts
npx tsx examples/06-configuration-patterns.ts
cd examples/mcp && npm run demo
```

### MCP Integration Example

The MCP integration example (`examples/mcp/`) demonstrates real Model Context Protocol integration with AIKit:

- **Real MCP server/client**: Uses official MCP SDK
- **Native tool calling**: Converts MCP tools to aikit tools
- **File system operations**: Read, write, list, and analyze files
- **Multi-provider support**: Works with OpenAI, Anthropic, Google

See [`examples/mcp/`](./mcp/) for setup and usage instructions. Run the demo with `npm run demo:mcp` or `sh examples/mcp/run.sh`.
