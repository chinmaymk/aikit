/**
 * Setup file for smoke tests
 *
 * This file is run before all smoke tests to set up necessary environment
 * and handle test configuration.
 */

jest.setTimeout(60000);

const requiredEnvVars = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY'];

beforeAll(() => {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn(
      `Warning: Missing environment variables: ${missingVars.join(', ')}. ` +
        'Some tests may be skipped.'
    );
  }
});
