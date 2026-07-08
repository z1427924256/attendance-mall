interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: unknown;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[]; success: boolean; meta: unknown }>;
  run<T = unknown>(): Promise<{ success: boolean; meta: unknown }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: { sql: string; params?: unknown[] }[]): Promise<{ results: T[]; success: boolean }[]>;
}

interface Env {
  DB: D1Database;
}
