import { AsyncLocalStorage } from 'node:async_hooks';

// The AsyncLocalStorage singleton
export const asyncLocalStorage = new AsyncLocalStorage();
