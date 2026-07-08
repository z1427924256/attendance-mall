// Type declarations for Cloudflare Pages Functions (used in /functions directory)
// These types are available at runtime on Cloudflare Pages but not in the local TypeScript check
// When @cloudflare/workers-types is installed, this file can be removed.

declare module "cloudflare:workers" {
  // Placeholder - actual types come from @cloudflare/workers-types
}

// D1 Database types
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  dump(): Promise<ArrayBuffer>;
  exec(query: string, params?: unknown[]): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: {
    changed_db: boolean;
    changes: number;
    duration: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
    size_after: number;
  };
}

interface D1ExecResult {
  count: number;
  duration: number;
}

// Pages Function types
type PagesFunction<Env = unknown> = (context: {
  request: Request;
  env: Env;
  params: Record<string, string | undefined>;
  next: () => Promise<Response>;
  data: unknown;
  waitUntil: (promise: Promise<unknown>) => void;
  passThroughOnException: () => void;
}) => Promise<Response>;
