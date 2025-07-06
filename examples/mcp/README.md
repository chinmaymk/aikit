# AIKit + MCP Integration Example

This example demonstrates how to integrate AIKit with the Model Context Protocol (MCP) to create AI applications that can access external data sources and tools in real-time. Think of it as teaching your AI to use actual tools instead of just talking about them.

## What's Included

- `server.mjs` - MCP server providing file system tools (the worker)
- `client.ts` - AIKit client that connects to the MCP server (the boss)
- `package.json` - Dependencies and scripts (the bureaucracy)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up your OpenAI API key:
   ```bash
   # Create .env file in the examples/mcp directory
   echo "OPENAI_API_KEY=your_key_here" > .env
   ```

## Running the Example

### Option 1: Run demo (recommended)

```bash
npm run demo
```

Runs 2 examples and automatically stops when complete.

### Option 2: Run manually

Terminal 1 - Start MCP server:

```bash
npm run server
```

Terminal 2 - Run AIKit client:

```bash
npm run client
```

## What It Does

The example demonstrates:

1. **Real MCP Connection**: Uses the official MCP SDK to connect client and server (no fake it till you make it here)
2. **Tool Discovery**: Automatically discovers tools from the MCP server (like a treasure hunt, but useful)
3. **Native AIKit Integration**: Converts MCP tools to aikit tools for seamless function calling
4. **File System Operations**: Read files, write files, list directories, get file info (basically file system superpowers)
5. **Multi-Provider Support**: Works with any aikit provider (OpenAI, Anthropic, Google - we don't discriminate)

## Available Tools

The MCP server provides these tools:

- `read_file` - Read file contents (like peek, but legitimate)
- `write_file` - Write content to a file (careful with this one)
- `list_directory` - List directory contents (digital spelunking)
- `get_file_info` - Get detailed file/directory information (the full biography)

All tools are automatically converted to native aikit tools for proper function calling.

## Security

The server includes path traversal protection - it only allows access to files within the current working directory. We've learned from the mistakes of others (looking at you, early web servers).

## Extending

You can easily extend this example by:

1. Adding more tools to `server.mjs` (unleash your creativity)
2. Creating specialized MCP servers (database, API, etc.)
3. Using different AIKit providers in `client.ts`
4. Connecting to existing MCP servers (standing on the shoulders of giants)

## Architecture

```
┌─────────────┐    JSON-RPC     ┌─────────────┐
│             │    over stdio   │             │
│ AIKit       ├─────────────────┤ MCP Server  │
│ Client      │                 │             │
│             │                 │             │
└─────────────┘                 └─────────────┘
      │                                │
      │                                │
   Native                         File System
   Tool Calls                     Operations
```

This creates a clean separation where:

- The MCP server handles specific operations (file system, database, etc.)
- The AIKit client handles AI interactions with native tool calling
- Communication happens via standardized JSON-RPC protocol (because standards matter, even if they're sometimes boring)
