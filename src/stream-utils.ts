import type { StreamChunk, StreamResult } from './types';

export async function collectDeltas(stream: AsyncIterable<StreamChunk>): Promise<StreamResult> {
  let content = '';
  let reasoning = '';
  let finishReason: StreamChunk['finishReason'];
  let toolCalls: StreamChunk['toolCalls'];
  let usage: StreamChunk['usage'];

  for await (const chunk of stream) {
    content += chunk.delta;
    if (chunk.reasoning) {
      reasoning += chunk.reasoning.delta;
    }
    if (chunk.finishReason) {
      finishReason = chunk.finishReason;
    }
    if (chunk.toolCalls) {
      toolCalls = chunk.toolCalls;
    }
    if (chunk.usage) {
      usage = chunk.usage;
    }
  }

  return {
    content,
    finishReason,
    toolCalls,
    reasoning: reasoning || undefined,
    usage,
  };
}

export async function collectStream(stream: AsyncIterable<StreamChunk>): Promise<StreamResult> {
  let content = '';
  let reasoning = '';
  let finishReason: StreamChunk['finishReason'];
  let toolCalls: StreamChunk['toolCalls'];
  let usage: StreamChunk['usage'];

  for await (const chunk of stream) {
    content = chunk.content;

    if (chunk.reasoning) {
      reasoning = chunk.reasoning.content;
    }

    if (chunk.finishReason) {
      finishReason = chunk.finishReason;
    }

    if (chunk.toolCalls) {
      toolCalls = chunk.toolCalls;
    }

    if (chunk.usage) {
      usage = chunk.usage;
    }
  }

  return {
    content,
    finishReason,
    toolCalls,
    reasoning: reasoning || undefined,
    usage,
  };
}

export async function processStream(
  stream: AsyncIterable<StreamChunk>,
  handlers: {
    onDelta?: (delta: string) => void;
    onContent?: (content: string) => void;
    onToolCalls?: (toolCalls: StreamChunk['toolCalls']) => void;
    onFinish?: (finishReason: StreamChunk['finishReason']) => void;
    onChunk?: (chunk: StreamChunk) => void;
    onReasoning?: (reasoning: { content: string; delta: string }) => void;
    onUsage?: (usage: StreamChunk['usage']) => void;
  } = {}
): Promise<StreamResult> {
  let content = '';
  let reasoning = '';
  let finishReason: StreamChunk['finishReason'];
  let toolCalls: StreamChunk['toolCalls'];
  let usage: StreamChunk['usage'];

  for await (const chunk of stream) {
    processChunkHandlers(chunk, handlers);

    const result = updateStreamState(chunk, content, reasoning);
    content = result.content;
    reasoning = result.reasoning;
    finishReason = result.finishReason || finishReason;
    toolCalls = result.toolCalls || toolCalls;
    usage = result.usage || usage;
  }

  return {
    content,
    finishReason,
    toolCalls,
    reasoning: reasoning || undefined,
    usage,
  };
}

function processChunkHandlers(
  chunk: StreamChunk,
  handlers: {
    onDelta?: (delta: string) => void;
    onContent?: (content: string) => void;
    onToolCalls?: (toolCalls: StreamChunk['toolCalls']) => void;
    onFinish?: (finishReason: StreamChunk['finishReason']) => void;
    onChunk?: (chunk: StreamChunk) => void;
    onReasoning?: (reasoning: { content: string; delta: string }) => void;
    onUsage?: (usage: StreamChunk['usage']) => void;
  }
): void {
  handlers.onChunk?.(chunk);
  handlers.onDelta?.(chunk.delta || '');
  handlers.onContent?.(chunk.content);

  if (chunk.reasoning) {
    handlers.onReasoning?.({ content: chunk.reasoning.content, delta: chunk.reasoning.delta });
  }

  if (chunk.toolCalls) {
    handlers.onToolCalls?.(chunk.toolCalls);
  }

  if (chunk.finishReason) {
    handlers.onFinish?.(chunk.finishReason);
  }

  if (chunk.usage) {
    handlers.onUsage?.(chunk.usage);
  }
}

function updateStreamState(
  chunk: StreamChunk,
  currentContent: string,
  currentReasoning: string
): {
  content: string;
  reasoning: string;
  finishReason?: StreamChunk['finishReason'];
  toolCalls?: StreamChunk['toolCalls'];
  usage?: StreamChunk['usage'];
} {
  return {
    content: chunk.content,
    reasoning: chunk.reasoning ? chunk.reasoning.content : currentReasoning,
    finishReason: chunk.finishReason,
    toolCalls: chunk.toolCalls,
    usage: chunk.usage,
  };
}

const isNodeJS = (): boolean => {
  return (
    typeof process !== 'undefined' && process.stdout && typeof process.stdout.write === 'function'
  );
};

const writeToOutput = (text: string): boolean => {
  if (isNodeJS()) {
    return process.stdout.write(text);
  } else {
    console.log(text);
    return true;
  }
};

const flushOutput = async (): Promise<void> => {
  if (!isNodeJS()) return;

  return new Promise(resolve => {
    if (process.stdout.write('\n')) {
      resolve();
    } else {
      const onDrain = () => {
        process.stdout.removeListener('drain', onDrain);
        resolve();
      };
      process.stdout.once('drain', onDrain);

      setTimeout(() => {
        process.stdout.removeListener('drain', onDrain);
        resolve();
      }, 100);
    }
  });
};

export async function printStream(stream: AsyncIterable<StreamChunk>): Promise<StreamResult> {
  const result = await processStream(stream, {
    onDelta: delta => writeToOutput(delta),
  });

  await flushOutput();
  return result;
}

export async function* filterStream<T>(
  stream: AsyncIterable<T>,
  predicate: (chunk: T) => boolean
): AsyncGenerator<T> {
  for await (const chunk of stream) {
    if (predicate(chunk)) {
      yield chunk;
    }
  }
}

export async function* mapStream<T, U>(
  stream: AsyncIterable<T>,
  mapper: (chunk: T) => U
): AsyncGenerator<U> {
  for await (const chunk of stream) {
    yield mapper(chunk);
  }
}

export function toReadableStream<T>(stream: AsyncIterable<T>): ReadableStream<T> {
  const iterator = stream[Symbol.asyncIterator]();
  return new ReadableStream<T>({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      if (iterator.return) {
        await iterator.return();
      }
    },
  });
}
