import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const url = process.env.DATABASE_URL ?? 'file:./data/school.db';

declare global {
  // eslint-disable-next-line no-var
  var __libsql: ReturnType<typeof createClient> | undefined;
}

const client = globalThis.__libsql ?? createClient({ url });
if (process.env.NODE_ENV !== 'production') globalThis.__libsql = client;

export const db = drizzle(client, { schema });
export { schema };
