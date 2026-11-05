import * as bufferModule from 'node:buffer';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Polyfill SlowBuffer for Node.js 25+ environments where Buffer.SlowBuffer was removed
if (typeof (bufferModule as unknown as { SlowBuffer?: unknown }).SlowBuffer === 'undefined') {
  (bufferModule as unknown as { SlowBuffer: typeof Buffer }).SlowBuffer = Buffer;
}

let aiInstance: ReturnType<typeof genkit> | null = null;

export function getAi(): ReturnType<typeof genkit> {
  if (!aiInstance) {
    aiInstance = genkit({
      plugins: [googleAI()],
      model: 'googleai/gemini-2.5-flash',
    });
  }
  return aiInstance;
}

export const ai = new Proxy({} as ReturnType<typeof genkit>, {
  get(_target, prop) {
    const instance = getAi();
    const val = (instance as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof val === 'function') {
      return (val as (...args: unknown[]) => unknown).bind(instance);
    }
    return val;
  },
});
