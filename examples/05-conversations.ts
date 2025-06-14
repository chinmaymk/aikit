/**
 * Conversation Management
 *
 * This example demonstrates different conversation patterns and management techniques:
 * 1. Basic conversation flow
 * 2. Context preservation across multiple exchanges
 * 3. Memory management for long conversations
 * 4. Structured conversation patterns
 */

import { conversation, generate, userText, assistantText } from '@chinmaymk/aikit';
import { getModelName, printDelimiter, printSectionHeader, createProviderFromEnv } from './utils';

async function basicConversationExample() {
  printSectionHeader('Basic Conversation Flow');

  const { provider, type, name } = createProviderFromEnv();
  console.log(`Using ${name} for conversation examples\n`);

  const modelName = getModelName(type!);

  // Start with a conversation builder
  const messages = conversation()
    .system('You are a helpful programming tutor. Keep your answers concise but informative.')
    .user('What is the difference between var, let, and const in JavaScript?')
    .build();

  console.log('User: What is the difference between var, let, and const in JavaScript?');

  // First response
  const response1 = await generate(provider!, messages, {
    model: modelName,
    maxOutputTokens: 200,
    temperature: 0.7,
  });

  console.log('AI:', response1.content);

  // Continue the conversation
  messages.push(assistantText(response1.content));
  messages.push(userText('Can you give me a practical example of when to use each one?'));

  console.log('\nUser: Can you give me a practical example of when to use each one?');

  const response2 = await generate(provider!, messages, {
    model: modelName,
    maxOutputTokens: 250,
    temperature: 0.7,
  });

  console.log('AI:', response2.content);

  // Final follow-up
  messages.push(assistantText(response2.content));
  messages.push(userText('What happens if I try to reassign a const variable?'));

  console.log('\nUser: What happens if I try to reassign a const variable?');

  const response3 = await generate(provider!, messages, {
    model: modelName,
    maxOutputTokens: 150,
    temperature: 0.5,
  });

  console.log('AI:', response3.content);
  console.log();
}

async function contextPreservationExample() {
  printSectionHeader('Context Preservation Example');

  const { provider, type } = createProviderFromEnv();
  const modelName = getModelName(type!);

  // Create a conversation with rich context
  const messages = conversation()
    .system(
      'You are a helpful assistant. Remember the context of our conversation and refer back to previous information when relevant.'
    )
    .user('My name is Alice and I am a software engineer working on a React project.')
    .build();

  console.log('User: My name is Alice and I am a software engineer working on a React project.');

  const response1 = await generate(provider!, messages, {
    model: modelName,
    maxOutputTokens: 100,
    temperature: 0.6,
  });

  console.log('AI:', response1.content);

  // Test context preservation
  messages.push(assistantText(response1.content));
  messages.push(userText('I am having trouble with state management. What would you recommend?'));

  console.log('\nUser: I am having trouble with state management. What would you recommend?');

  const response2 = await generate(provider!, messages, {
    model: modelName,
    maxOutputTokens: 200,
    temperature: 0.6,
  });

  console.log('AI:', response2.content);

  // Test if it remembers the name and context
  messages.push(assistantText(response2.content));
  messages.push(userText('What was my name again, and what kind of project am I working on?'));

  console.log('\nUser: What was my name again, and what kind of project am I working on?');

  const response3 = await generate(provider!, messages, {
    model: modelName,
    maxOutputTokens: 100,
    temperature: 0.3,
  });

  console.log('AI:', response3.content);
  console.log();
}

async function conversationWithMemoryLimitsExample() {
  printSectionHeader('Conversation with Memory Management');

  const { provider, type } = createProviderFromEnv();
  const modelName = getModelName(type!);

  // Simulate a long conversation that needs memory management
  const messages = conversation()
    .system(
      'You are a helpful assistant. Keep track of the conversation but focus on the most recent context.'
    )
    .build();

  const topics = [
    'What is machine learning?',
    'How does neural network training work?',
    'What are the different types of machine learning?',
    'Can you explain supervised learning?',
    'What about unsupervised learning?',
    'How do I get started with machine learning?',
  ];

  console.log('Simulating a long conversation with memory management...\n');

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    console.log(`User: ${topic}`);

    messages.push(userText(topic));

    // If conversation gets too long, keep only system message + last 4 messages
    if (messages.length > 6) {
      const systemMessage = messages[0];
      const recentMessages = messages.slice(-4);
      messages.length = 0;
      messages.push(systemMessage, ...recentMessages);
      console.log('(Trimmed conversation history for memory management)');
    }

    const response = await generate(provider!, messages, {
      model: modelName,
      maxOutputTokens: 120,
      temperature: 0.6,
    });

    console.log(`AI: ${response.content}\n`);
    messages.push(assistantText(response.content));
  }

  // Test if it still has relevant context
  messages.push(userText('What was the first question I asked you?'));
  console.log('User: What was the first question I asked you?');

  const finalResponse = await generate(provider!, messages, {
    model: modelName,
    maxOutputTokens: 100,
    temperature: 0.3,
  });

  console.log(`AI: ${finalResponse.content}`);
  console.log();
}

async function structuredConversationExample() {
  printSectionHeader('Structured Conversation Flow');

  const { provider, type } = createProviderFromEnv();
  const modelName = getModelName(type!);

  // Simulate a structured interview/questionnaire
  const messages = conversation()
    .system(
      'You are conducting a brief interview about programming experience. Ask follow-up questions based on responses.'
    )
    .user('I want to improve my programming skills.')
    .build();

  console.log('User: I want to improve my programming skills.');

  const stages = [
    'Initial response and first question',
    'Follow-up based on experience level',
    'Specific recommendations',
  ];

  for (let i = 0; i < stages.length; i++) {
    console.log(`\n--- ${stages[i]} ---`);

    const response = await generate(provider!, messages, {
      model: modelName,
      maxOutputTokens: 150,
      temperature: 0.7,
    });

    console.log('AI:', response.content);
    messages.push(assistantText(response.content));

    // Simulate user responses for demo purposes
    let userResponse: string;
    switch (i) {
      case 0:
        userResponse =
          'I have some experience with JavaScript and Python, but I want to get better at building full applications.';
        break;
      case 1:
        userResponse = 'I particularly struggle with backend development and databases.';
        break;
      default:
        userResponse = "That sounds great, I'll start with those suggestions!";
    }

    console.log('User:', userResponse);
    if (i < stages.length - 1) {
      messages.push(userText(userResponse));
    }
  }

  console.log();
}

async function main() {
  printDelimiter('Conversation Management Examples');

  try {
    await basicConversationExample();
    await contextPreservationExample();
    await conversationWithMemoryLimitsExample();
    await structuredConversationExample();

    printDelimiter('Conversation Examples Complete!', '-');
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
