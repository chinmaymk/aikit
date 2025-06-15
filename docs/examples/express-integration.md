# Express Integration Example

This example demonstrates how to use AIKit in a full-stack application with an Express backend and frontend client using the **Proxy Provider**.

## Architecture Overview

- **Frontend**: Uses `createProxy()` to create a proxy provider that forwards requests to your Express backend.
- **Backend**: Uses `callProxyProvider()` to handle proxy requests and stream Server-Sent Events (SSE) back to the client.
- **Benefits**: API key security, simplified integration, and a consistent AIKit interface across the stack.

## Backend Setup

### Express Server (`server.js`)

The backend is responsible for securely managing API keys and forwarding requests to the appropriate AI provider.

```javascript
import express from 'express';
import cors from 'cors';
import { callProxyProvider } from '@chinmaymk/aikit';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend files

// A simple map to retrieve API keys from environment variables
const API_KEYS = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  google: process.env.GOOGLE_API_KEY,
  // Add other providers here
};

// Proxy endpoint for all AIKit requests
app.post('/ai/proxy', async (req, res) => {
  try {
    const { providerType } = req.body;
    const apiKey = API_KEYS[providerType];

    if (!apiKey) {
      return res.status(400).json({
        error: `API key not configured for provider: ${providerType}`,
      });
    }

    // Augment the request with the API key
    const requestWithApiKey = {
      ...req.body,
      providerOptions: { ...req.body.providerOptions, apiKey },
    };

    // Set headers for SSE streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Use callProxyProvider to get the SSE stream and pipe it to the response
    const stream = callProxyProvider(requestWithApiKey);
    for await (const chunk of stream) {
      res.write(chunk);
    }

    res.end();
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: 'An internal server error occurred.',
      details: error.message,
    });
  }
});

// Health check endpoint to see available providers
app.get('/health', (req, res) => {
  const availableProviders = Object.keys(API_KEYS).filter(key => !!API_KEYS[key]);
  res.json({
    status: 'healthy',
    providers: availableProviders,
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  const available = Object.keys(API_KEYS).filter(key => !!API_KEYS[key]);
  console.log(`Available providers: ${available.join(', ')}`);
});
```

### Package.json for Backend

```json
{
  "name": "aikit-express-backend",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@chinmaymk/aikit": "latest",
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
```

## Frontend Setup

### HTML Client (`public/index.html`)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AIKIT Express Chat</title>
    <script type="module" src="https://unpkg.com/@chinmaymk/aikit@latest/dist/index.js"></script>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        background-color: #f5f5f5;
      }
      .chat-container {
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }
      .messages {
        height: 400px;
        overflow-y: auto;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 15px;
        background-color: #fafafa;
      }
      .message {
        margin-bottom: 15px;
        padding: 10px;
        border-radius: 8px;
      }
      .user-message {
        background-color: #007bff;
        color: white;
        margin-left: 50px;
      }
      .assistant-message {
        background-color: #e9ecef;
        color: #333;
        margin-right: 50px;
      }
      .input-container {
        display: flex;
        gap: 10px;
      }
      #messageInput {
        flex: 1;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 16px;
      }
      #sendButton {
        padding: 12px 24px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
      }
      #sendButton:hover {
        background-color: #0056b3;
      }
      #sendButton:disabled {
        background-color: #6c757d;
        cursor: not-allowed;
      }
      .controls {
        margin-bottom: 20px;
        display: flex;
        gap: 10px;
        align-items: center;
      }
      select {
        padding: 8px;
        border-radius: 4px;
        border: 1px solid #ddd;
      }
    </style>
  </head>
  <body>
    <div class="chat-container">
      <h1>AIKIT Express Chat Demo</h1>

      <div class="controls">
        <label for="providerSelect">Provider:</label>
        <select id="providerSelect">
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="google">Google</option>
          <option value="xai">xAI</option>
          <option value="together">Together</option>
        </select>
      </div>

      <div class="messages" id="messagesContainer"></div>

      <div class="input-container">
        <input
          type="text"
          id="messageInput"
          placeholder="Type your message here..."
          autocomplete="off"
        />
        <button id="sendButton">Send</button>
      </div>
    </div>

    <script src="chat.js"></script>
  </body>
</html>
```

### Frontend JavaScript (`public/chat.js`)

```javascript
import { createProxy, userText, generate } from '@chinmaymk/aikit';

class ChatApp {
  constructor() {
    this.messages = [];
    this.isGenerating = false;
    this.providers = {};

    this.initializeUI();
    this.checkServerHealth();
  }

  initializeUI() {
    this.messagesContainer = document.getElementById('messagesContainer');
    this.messageInput = document.getElementById('messageInput');
    this.sendButton = document.getElementById('sendButton');
    this.providerSelect = document.getElementById('providerSelect');

    this.sendButton.addEventListener('click', () => this.sendMessage());
    this.messageInput.addEventListener('keypress', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }

  async checkServerHealth() {
    try {
      const response = await fetch('/health');
      const health = await response.json();
      console.log('Server health:', health);

      // Update provider dropdown based on available providers
      const availableProviders = health.providers || [];
      Array.from(this.providerSelect.options).forEach(option => {
        option.disabled = !availableProviders.includes(option.value);
      });

      // Initialize proxy providers for available providers
      for (const providerType of availableProviders) {
        this.providers[providerType] = this.createProxyProvider(providerType);
      }
    } catch (error) {
      console.error('Health check failed:', error);
      this.addMessage('system', 'Warning: Server connection failed');
    }
  }

  createProxyProvider(providerType) {
    const providerOptions = this.getDefaultProviderOptions(providerType);
    return createProxy(
      providerType,
      { baseURL: `${window.location.origin}/ai/proxy` },
      providerOptions
    );
  }

  getDefaultProviderOptions(providerType) {
    switch (providerType) {
      case 'openai':
        return { model: 'gpt-4o' };
      case 'anthropic':
        return { model: 'claude-3-5-sonnet-20241022' };
      case 'google':
        return { model: 'gemini-1.5-pro' };
      case 'xai':
        return { model: 'grok-beta' };
      case 'together':
        return { model: 'meta-llama/Llama-3.2-3B-Instruct-Turbo' };
      default:
        return {};
    }
  }

  addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    messageDiv.textContent = content;
    this.messagesContainer.appendChild(messageDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

    if (role !== 'system') {
      this.messages.push({ role, content: [{ type: 'text', text: content }] });
    }
  }

  updateLastMessage(content) {
    const messages = this.messagesContainer.querySelectorAll('.assistant-message');
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      lastMessage.textContent = content;
    }
  }

  async sendMessage() {
    const messageText = this.messageInput.value.trim();
    if (!messageText || this.isGenerating) return;

    const providerType = this.providerSelect.value;
    if (!this.providers[providerType]) {
      this.addMessage('system', `Provider ${providerType} not available`);
      return;
    }

    // Add user message
    this.addMessage('user', messageText);
    this.messageInput.value = '';
    this.isGenerating = true;
    this.sendButton.disabled = true;
    this.sendButton.textContent = 'Generating...';

    try {
      await this.handleStreamingResponse(messageText, providerType);
    } catch (error) {
      console.error('Error sending message:', error);
      this.addMessage('system', `Error: ${error.message}`);
    } finally {
      this.isGenerating = false;
      this.sendButton.disabled = false;
      this.sendButton.textContent = 'Send';
    }
  }

  async handleStreamingResponse(messageText, providerType) {
    const messages = [...this.messages, userText(messageText)];
    const provider = this.providers[providerType];

    // Add empty assistant message to update during streaming
    this.addMessage('assistant', '');

    let fullContent = '';

    // Use the proxy provider with generate function
    const stream = generate(provider, messages, {
      temperature: 0.7,
      maxOutputTokens: 1000,
    });

    for await (const chunk of stream) {
      if (chunk.delta) {
        fullContent += chunk.delta;
        this.updateLastMessage(fullContent);
      }
    }
  }
}

// Initialize the chat app when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new ChatApp();
});
```

## Environment Setup

### `.env` file

```bash
# API Keys (set at least one)
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
GOOGLE_API_KEY=your-google-api-key-here
XAI_API_KEY=xai-your-xai-key-here
TOGETHER_API_KEY=your-together-key-here

# Server Configuration
PORT=3000
NODE_ENV=development
```

## Running the Application

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Start the server:**

   ```bash
   node server.js
   ```

4. **Open your browser:**
   ```
   http://localhost:3000
   ```

## Key Features

### New Proxy Provider Benefits

- **Simplified Integration**: Use `createProxy()` on the frontend and `callProxyProvider()` on the backend.
- **Type-Safe**: Provider-specific options are strongly typed.
- **Consistent**: The AIKit interface is the same on both client and server.
- **Secure**: API keys remain on the server and are never exposed to the client.

### API Overview

#### Frontend

```javascript
// Create a proxy provider for any supported AI provider
const openaiProxy = createProxy(
  'openai',
  { baseURL: 'http://localhost:3000/ai/proxy' },
  { model: 'gpt-4o' } // Provider-specific options
);

// Use it with the standard AIKit `generate` function
const stream = generate(openaiProxy, messages, options);
```

#### Backend

```javascript
// Handle proxy requests in your Express endpoint
app.post('/ai/proxy', async (req, res) => {
  const requestWithApiKey = {
    ...req.body,
    providerOptions: {
      ...req.body.providerOptions,
      apiKey: process.env.OPENAI_API_KEY, // Securely fetch API key
    },
  };

  // callProxyProvider returns an SSE stream ready to be sent to the client
  const stream = callProxyProvider(requestWithApiKey);

  res.setHeader('Content-Type', 'text/event-stream');
  for await (const chunk of stream) {
    res.write(chunk);
  }
  res.end();
});
```

### Security Benefits

- API keys are kept secure on the server.
- No client-side exposure of sensitive credentials.
- Centralized request validation, rate limiting, and logging.

### Production Considerations

For a production environment, consider adding the following enhancements:

```javascript
// Add robust middleware for production
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { body, validationResult } from 'express-validator';

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/ai/proxy', limiter);

// Request logging
app.use(morgan('combined'));

// Input validation
app.post(
  '/ai/proxy',
  [
    body('providerType')
      .isIn(['openai', 'anthropic', 'google', 'xai', 'together'])
      .withMessage('Invalid provider type'),
    body('messages').isArray().withMessage('Messages must be an array'),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
);

// Centralized error handling
app.use((error, req, res, next) => {
  console.error(error.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});
```

This updated example demonstrates how to use AIKit's proxy provider system for a clean, secure, and type-safe full-stack AI integration.
