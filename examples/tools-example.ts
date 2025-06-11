import { OpenAIProvider } from '../src/providers/openai';
import type { Message, GenerationOptions, Tool } from '../src/types';

// Mock weather function
function getCurrentWeather(location: string, unit: 'celsius' | 'fahrenheit' = 'celsius') {
  // This would normally call a real weather API
  const temperature = unit === 'celsius' ? '22' : '72';
  const unitSymbol = unit === 'celsius' ? '°C' : '°F';
  
  return {
    location,
    temperature: `${temperature}${unitSymbol}`,
    description: 'Partly cloudy',
    humidity: '65%',
    windSpeed: '10 km/h'
  };
}

async function main() {
  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('Please set OPENAI_API_KEY environment variable');
    process.exit(1);
  }

  // Initialize OpenAI provider
  const provider = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Define available tools
  const tools: Tool[] = [
    {
      name: 'getCurrentWeather',
      description: 'Get the current weather for a specific location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city and state, e.g. San Francisco, CA'
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'The temperature unit to use'
          }
        },
        required: ['location']
      }
    }
  ];

  // Create initial messages
  const messages: Message[] = [
    {
      role: 'system',
      content: [{ type: 'text', text: 'You are a helpful assistant that can provide weather information.' }],
    },
    {
      role: 'user',
      content: [{ type: 'text', text: 'What\'s the weather like in London?' }],
    },
  ];

  // Generation options with tools
  const options: GenerationOptions = {
    model: 'gpt-4o',
    maxTokens: 200,
    temperature: 0.7,
    tools,
    toolChoice: 'auto', // Let the model decide when to use tools
  };

  console.log('🛠️  OpenAI Tools Example:');
  console.log('---');

  let conversationComplete = false;
  
  while (!conversationComplete) {
    let assistantMessage = '';
    let toolCalls: any[] = [];

    // Stream the response
    for await (const chunk of provider.generate(messages, options)) {
      assistantMessage += chunk.delta;
      
      if (chunk.toolCalls) {
        toolCalls = chunk.toolCalls;
      }
      
      if (chunk.finishReason) {
        console.log(`\nFinish reason: ${chunk.finishReason}`);
        
        if (chunk.finishReason === 'tool_use' && toolCalls.length > 0) {
          // Add assistant's message with tool calls
          messages.push({
            role: 'assistant',
            content: [{ type: 'text', text: assistantMessage }],
            toolCalls: toolCalls.map(tc => ({
              id: tc.id,
              name: tc.name,
              arguments: tc.arguments
            }))
          });

          // Execute tools and add results
          for (const toolCall of toolCalls) {
            console.log(`\n🔧 Calling tool: ${toolCall.name} with args:`, toolCall.arguments);
            
            if (toolCall.name === 'getCurrentWeather') {
              const result = getCurrentWeather(
                toolCall.arguments.location,
                toolCall.arguments.unit
              );
              
              console.log('📊 Tool result:', result);
              
              // Add tool result to messages
              messages.push({
                role: 'tool',
                content: [{
                  type: 'tool_result',
                  toolCallId: toolCall.id,
                  result: JSON.stringify(result)
                }]
              });
            }
          }
          
          console.log('\n🤖 Assistant response after tool execution:');
        } else {
          conversationComplete = true;
        }
        break;
      }
      
      process.stdout.write(chunk.delta);
    }
  }
  
  console.log('\n---\nConversation complete!');
}

main().catch(console.error); 