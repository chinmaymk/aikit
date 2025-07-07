#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const server = new Server(
  { name: 'filesystem-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Register available tools
server.setRequestHandler(
  ListToolsRequestSchema,
  async (): Promise<any> => ({
    tools: [
      {
        name: 'read_file',
        description: 'Read the contents of a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file to read (relative to current directory)',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'write_file',
        description: 'Write content to a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to write the file to (relative to current directory)',
            },
            content: {
              type: 'string',
              description: 'Content to write to the file',
            },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'list_directory',
        description: 'List contents of a directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Directory path to list (relative to current directory)',
              default: '.',
            },
          },
        },
      },
      {
        name: 'get_file_info',
        description: 'Get information about a file or directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to get info about (relative to current directory)',
            },
          },
          required: ['path'],
        },
      },
    ],
  })
);

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request: any): Promise<any> => {
  const { name, arguments: args } = request.params;

  try {
    // Resolve path safely (prevent directory traversal)
    const safePath = resolve(args.path || '.');
    const cwd = process.cwd();
    if (!safePath.startsWith(cwd)) {
      throw new Error('Access denied: path outside working directory');
    }

    switch (name) {
      case 'read_file': {
        const content = readFileSync(safePath, 'utf-8');
        return {
          content: [
            {
              type: 'text',
              text: content,
            },
          ],
        };
      }

      case 'write_file': {
        writeFileSync(safePath, args.content, 'utf-8');
        return {
          content: [
            {
              type: 'text',
              text: `Successfully wrote ${args.content.length} characters to ${args.path}`,
            },
          ],
        };
      }

      case 'list_directory': {
        const files = readdirSync(safePath);
        const fileList = files
          .map(file => {
            try {
              const fullPath = join(safePath, file);
              const stats = statSync(fullPath);
              const type = stats.isDirectory() ? 'directory' : 'file';
              const size = stats.isFile() ? ` (${stats.size} bytes)` : '';
              return `${file} [${type}]${size}`;
            } catch {
              return `${file} [unknown]`;
            }
          })
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: fileList || '(empty directory)',
            },
          ],
        };
      }

      case 'get_file_info': {
        const stats = statSync(safePath);
        const info = {
          path: args.path,
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime.toISOString(),
          created: stats.birthtime.toISOString(),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(info, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP filesystem server running');
}

main().catch(console.error);
