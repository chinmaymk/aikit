import type { Message } from './types';
import { userText, systemText, assistantText, userImage, toolResult } from './message-helpers';

export class ConversationBuilder {
  private messages: Message[] = [];

  system(text: string): this {
    this.messages.push(systemText(text));
    return this;
  }

  user(text: string): this {
    this.messages.push(userText(text));
    return this;
  }

  userWithImage(text: string, imageData: string): this {
    this.messages.push(userImage(text, imageData));
    return this;
  }

  assistant(text: string): this {
    this.messages.push(assistantText(text));
    return this;
  }

  tool(toolCallId: string, result: string): this {
    this.messages.push(toolResult(toolCallId, result));
    return this;
  }

  addMessage(message: Message): this {
    this.messages.push(message);
    return this;
  }

  build(): Message[] {
    return [...this.messages];
  }

  clear(): this {
    this.messages = [];
    return this;
  }
}

export const conversation = () => new ConversationBuilder();
