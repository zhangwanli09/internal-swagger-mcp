import { AsyncLocalStorage } from "async_hooks";

const sourceContext = new AsyncLocalStorage<string[]>();

export function runWithSources<T>(sources: string[], fn: () => Promise<T>): Promise<T> {
  return sourceContext.run(sources, fn);
}

export function getCurrentSources(): string[] | undefined {
  return sourceContext.getStore();
}
