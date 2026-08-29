import { Pool, type PoolConfig } from "pg";

function postgresConfig(max: number): PoolConfig | null {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      max,
      connectionTimeoutMillis: 3_000,
      idleTimeoutMillis: 30_000
    };
  }
  if (
    process.env.PGHOST &&
    process.env.PGPORT &&
    process.env.PGDATABASE &&
    process.env.PGUSER &&
    process.env.PGPASSWORD
  ) {
    return {
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT),
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      max,
      connectionTimeoutMillis: 3_000,
      idleTimeoutMillis: 30_000
    };
  }
  return null;
}

export function createPostgresPool(max: number): Pool | null {
  const config = postgresConfig(max);
  return config ? new Pool(config) : null;
}
