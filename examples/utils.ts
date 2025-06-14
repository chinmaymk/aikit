/**
 * Common utilities for AIKit examples
 */

import { createProvider } from '@chinmaymk/aikit';

export function getModelName(providerType: string): string {
  switch (providerType) {
    case 'openai':
      return 'gpt-4o';
    case 'anthropic':
      return 'claude-3-5-sonnet-20241022';
    case 'google':
      return 'gemini-2.0-flash';
    default:
      throw new Error(`Unknown provider type: ${providerType}`);
  }
}

export function printDelimiter(title: string, char = '=') {
  const totalWidth = 50;
  const titlePadding = Math.max(0, (totalWidth - title.length - 2) / 2);
  const leftPadding = Math.floor(titlePadding);
  const rightPadding = Math.ceil(titlePadding);

  console.log(char.repeat(totalWidth));
  console.log(char.repeat(leftPadding) + ` ${title} ` + char.repeat(rightPadding));
  console.log(char.repeat(totalWidth));
  console.log();
}

export function printSectionHeader(title: string) {
  console.log(`\n${'-'.repeat(title.length + 4)}`);
  console.log(`  ${title}  `);
  console.log(`${'-'.repeat(title.length + 4)}`);
}

export function createValidSampleImage(color: string): string {
  // Create properly formatted 1x1 pixel PNG images in base64 format
  const colors: Record<string, string> = {
    red: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    blue: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYGAAAAABAAGKkv7nAAAAAElFTkSuQmCC',
    green:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYP+PBwAEswGAHvyKFAAAAABJRU5ErkJggg==',
    yellow:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/x8AAwAB/wMqDQsAAAAASUVORK5CYII=',
  };

  return colors[color] || colors.red;
}

export function createProviderFromEnv() {
  // Check environment variables in priority order
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: createProvider('openai', { apiKey: process.env.OPENAI_API_KEY }),
      type: 'openai' as const,
      name: 'OpenAI',
    };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: createProvider('anthropic', { apiKey: process.env.ANTHROPIC_API_KEY }),
      type: 'anthropic' as const,
      name: 'Anthropic',
    };
  }

  if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY!;
    return {
      provider: createProvider('google', { apiKey }),
      type: 'google' as const,
      name: 'Google',
    };
  }

  throw new Error(
    'No API keys found. Please set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY environment variable.'
  );
}
