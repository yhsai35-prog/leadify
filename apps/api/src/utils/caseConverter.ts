/**
 * Converts between the snake_case Postgres row shape and the camelCase wire
 * format defined in packages/shared/src/types/domain.ts. Centralizing this
 * here means repositories never hand-map fields (a common source of drift
 * bugs) -- they call toCamel/toSnake and let the domain type check the rest.
 */

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function snakeToCamelKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function camelToSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

export function toCamel<T = Record<string, unknown>>(input: unknown): T {
  if (Array.isArray(input)) {
    return input.map((item) => toCamel(item)) as unknown as T;
  }
  if (isPlainObject(input)) {
    const result: PlainObject = {};
    for (const [key, value] of Object.entries(input)) {
      result[snakeToCamelKey(key)] = toCamel(value);
    }
    return result as T;
  }
  return input as T;
}

export function toSnake<T = Record<string, unknown>>(input: unknown): T {
  if (Array.isArray(input)) {
    return input.map((item) => toSnake(item)) as unknown as T;
  }
  if (isPlainObject(input)) {
    const result: PlainObject = {};
    for (const [key, value] of Object.entries(input)) {
      result[camelToSnakeKey(key)] = toSnake(value);
    }
    return result as T;
  }
  return input as T;
}
