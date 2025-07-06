---
title: MCP Integration
description: How to use AIKit with Model Context Protocol (MCP) for context-aware AI applications
---

# MCP Integration

AIKit seamlessly integrates with the Model Context Protocol (MCP) to enable AI applications that can access external data sources and tools in real-time using native tool calling. Finally, your AI can do more than just chat about doing things.

## Quick Start

Install MCP SDK alongside AIKit:

```bash
npm install @chinmaymk/aikit @modelcontextprotocol/sdk
```

> **Note**: Make sure you have Node.js 18+ as the MCP SDK requires modern Node.js features.

## Native Tool Integration

### Converting MCP Tools to AIKit Tools

The best approach is to convert MCP tools to native aikit tools, enabling proper function calling instead of manual JSON parsing (because nobody enjoys parsing JSON by hand):

```typescript
import {
  createProvider,
  userText,
  systemText,
  createTool,
  generate,
  assistantWithToolCalls,
  toolResult,
} from '@chinmaymk/aikit';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class AIKitMCPClient {
  private client: Client;
  private provider: any;

  constructor(providerType: string, providerOptions: any) {
    this.provider = createProvider(providerType, providerOptions);
    this.client = new Client(
      { name: 'aikit-mcp', version: '1.0.0' },
      { capabilities: { sampling: {} } }
    );
  }

  async connect(serverCommand: string[]) {
    const transport = new StdioClientTransport({
      command: serverCommand[0],
      args: serverCommand.slice(1),
    });
    await this.client.connect(transport);
  }

  // Convert MCP tools to aikit tools
  private async convertMCPToolsToAIKitTools() {
    const { tools } = await this.client.listTools();
    return tools.map(tool => createTool(tool.name, tool.description, tool.inputSchema));
  }

  async chatWithTools(messages: any[], options: any = {}) {
    // Get aikit-compatible tools
    const aikitTools = await this.convertMCPToolsToAIKitTools();

    // Generate with native tool support
    const result = await generate(this.provider, messages, {
      ...options,
      tools: aikitTools,
    });

    console.log('Assistant:', result.content);

    // Handle tool calls using native aikit flow
    if (result.toolCalls?.length) {
      messages.push(assistantWithToolCalls(result.content, result.toolCalls));

      for (const toolCall of result.toolCalls) {
        // Execute MCP tool
        const mcpResult = await this.client.callTool({
          name: toolCall.name,
          arguments: toolCall.arguments,
        });

        // Add result back to conversation
        const toolResultText = mcpResult.content[0].text;
        messages.push(toolResult(toolCall.id, toolResultText));
      }

      // Generate final response
      const finalResult = await generate(this.provider, messages, {
        maxOutputTokens: 200,
      });

      return finalResult;
    }

    return result;
  }
}
```

### Usage Example

```typescript
async function main() {
  const client = new AIKitMCPClient('openai', {
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o',
  });

  await client.connect(['node', 'your-mcp-server.js']);

  await client.chatWithTools(
    [
      systemText('You are a helpful assistant with access to external tools.'),
      userText('Read package.json and summarize the project'),
    ],
    { model: 'gpt-4o', maxOutputTokens: 300 }
  );
}
```

## Complete Working Example

For a full working example with real MCP server/client integration, see the [`examples/mcp/`](../../examples/mcp/) directory which includes:

- **Real MCP server** (`server.mjs`) with file system tools
- **AIKit client** (`client.ts`) with native tool calling
- **Setup instructions** and dependencies
- **Multiple examples** demonstrating various use cases

This example shows the complete implementation including proper error handling, security considerations, and multi-provider support.

This native integration approach provides a much cleaner and more maintainable way to use MCP tools with aikit, leveraging the library's built-in tool calling capabilities instead of manual JSON parsing. Your future self will thank you for choosing the path of least resistance.
