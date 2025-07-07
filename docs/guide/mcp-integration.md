---
title: MCP Integration
description: How to use AIKit with Model Context Protocol (MCP) for context-aware AI applications
---

# MCP Integration

Think of AIKit and the Model Context Protocol (MCP) like peanut butter and jelly. They're two great things that work even better together. AIKit handles the connection to AI providers, and MCP handles the connection to your tools and data.

Much like React is an unopinionated view library, AIKit is an unopinionated provider library. It doesn't care _how_ you use MCP. For tool-calling? Great. For context injection? Perfect. You're the architect; we just provide the plumbing.

## Installation

```bash
npm install @chinmaymk/aikit @modelcontextprotocol/sdk
```

> **Note**: Requires Node.js 20+, we're living in the future.

## The "It Just Works" Approach: Native Tools

The most straightforward way to use MCP with AIKit is to convert MCP tools into AIKit's native tool format. This enables seamless, native function-calling without any fuss.

Here’s the core logic, stripped of boilerplate so you can see what’s happening:

```typescript
import { createProvider, createTool, processStream, toolResult, userText } from '@chinmaymk/aikit';
import { createClient } from '@modelcontextprotocol/sdk';

// 1. Configure your clients
const mcpClient = createClient({ url: 'http://localhost:4000' });
const provider = createProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
});

// 2. Convert MCP tools to AIKit's native format
const { tools: mcpTools } = await mcpClient.listTools();
const aikitTools = mcpTools.map(tool => createTool(tool.name, tool.description, tool.inputSchema));

// 3. Get a stream from the provider, making the tools available
const messages = [userText('Use the MCP tool to tell me a joke.')];
const stream = provider(messages, {
  model: 'gpt-4o',
  tools: aikitTools,
});

// 4. Process the stream to handle tool calls
// As chunks arrive, you would identify tool_calls, execute them via your
// MCP client, and insert the results back into the conversation.
// See the `processStream` helper and the full example in `examples/mcp/`
// for a complete implementation.
```

This simple loop lets the AI model natively use any tool your MCP server exposes.

## Beyond Native Tools: You're in Control

Because AIKit is unopinionated, you can implement any pattern you want:

- **Context Injection**: Use an MCP tool to fetch data and stuff it directly into a prompt. No-frills, maximum control.
- **Hybrid Architectures**: Build a complex system that pulls from multiple MCP servers, orchestrates chains of AI and tool calls, and generally does exactly what your grand vision requires.

## See It in Action: A Complete Example

When you're ready to see this in a real application, check out the [`examples/mcp/`] directory. It has a fully working MCP server and an AIKit client that demonstrates these concepts with proper setup and error handling.

## The Bottom Line

AIKit + MCP gives you a flexible foundation. We provide the building blocks; you design the masterpiece. There's no wrong way to do it, only more or less maintainable ways. Happy building! 🚀
