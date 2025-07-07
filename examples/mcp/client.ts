import {
  createProvider,
  userText,
  systemText,
  createTool,
  assistantWithToolCalls,
  toolResult,
  collectStream,
} from '@chinmaymk/aikit';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class AIKitMCPClient {
  private provider: any;
  private mcpClient: Client;
  private transport: StdioClientTransport | null = null;

  constructor(providerType: string, providerOptions: any) {
    this.provider = createProvider(providerType as any, providerOptions);
    this.mcpClient = new Client(
      { name: 'aikit-mcp-client', version: '1.0.0' },
      { capabilities: { sampling: {} } }
    );
  }

  async connect(serverCommand: string[]) {
    this.transport = new StdioClientTransport({
      command: serverCommand[0],
      args: serverCommand.slice(1),
    });

    await this.mcpClient.connect(this.transport);
    console.log(`Connected to MCP server`);
  }

  async convertMCPToolsToAIKit() {
    const { tools } = await this.mcpClient.listTools();
    console.log(`Found ${tools.length} MCP tools:`, tools.map((t: any) => t.name).join(', '));

    return tools.map((tool: any) => createTool(tool.name, tool.description, tool.inputSchema));
  }

  async chat(messages: any[], options: any = {}) {
    const aikitTools = await this.convertMCPToolsToAIKit();

    const result = await collectStream(
      this.provider(messages, {
        ...options,
        tools: aikitTools,
      })
    );

    console.log('\nAssistant:', result.content);

    if (result.toolCalls?.length) {
      messages.push(assistantWithToolCalls(result.content, result.toolCalls));

      for (const toolCall of result.toolCalls) {
        console.log(`\nExecuting: ${toolCall.name}`);

        const mcpResult = await this.mcpClient.callTool({
          name: toolCall.name,
          arguments: toolCall.arguments,
        });

        const toolResultText =
          (mcpResult.content as any)[0]?.text || JSON.stringify(mcpResult.content);
        console.log('Result:', toolResultText);

        messages.push(toolResult(toolCall.id, toolResultText));
      }

      const finalResult = await collectStream(
        this.provider(messages, {
          maxOutputTokens: 200,
        })
      );

      console.log('\nFinal response:', finalResult.content);
      return finalResult;
    }

    return result;
  }

  async disconnect() {
    if (this.transport) {
      await this.mcpClient.close();
      this.transport = null;
      console.log('Disconnected from MCP server');
    }
  }
}

async function runExample(title: string, client: AIKitMCPClient, prompt: string) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`${title}`);
  console.log(`${'='.repeat(50)}`);

  await client.chat(
    [
      systemText(
        'You are a helpful assistant with access to file system tools via MCP. Be concise and helpful.'
      ),
      userText(prompt),
    ],
    {
      model: 'gpt-4o',
      maxOutputTokens: 300,
    }
  );
}

async function main() {
  console.log('AIKit + MCP Integration Demo');
  // Set a timeout to prevent hanging
  const timeout = setTimeout(() => {
    console.log('\nDemo timeout reached (60s). Exiting...');
    process.exit(1);
  }, 60000);

  // Check if API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error('ERROR: OPENAI_API_KEY environment variable is required');
    console.log('TIP: Create a .env file with: OPENAI_API_KEY=your_key_here');
    clearTimeout(timeout);
    process.exit(1);
  }

  const client = new AIKitMCPClient('openai', {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o',
  });

  try {
    // Connect to MCP server (assumes server is running)
    await client.connect(['npx', 'tsx', 'server.ts']);

    console.log('Running demo (2 examples)...\n');

    // Example 1: Read the package.json
    await runExample(
      'Example 1: Read Project Info',
      client,
      'Read the package.json file and tell me about this project'
    );

    // Example 2: List directory contents
    await runExample(
      'Example 2: Directory Exploration',
      client,
      'List the contents of the current directory'
    );
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    clearTimeout(timeout);
    await client.disconnect();
    console.log('\nDemo completed! All examples finished.');
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down...');
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
