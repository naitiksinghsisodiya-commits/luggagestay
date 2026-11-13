import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import path from "path";
import { pathToFileURL } from "url";

const url =
  process.env.DATABASE_URL || pathToFileURL(path.join(__dirname, "../../dev.db")).href;

export const sqlite = createClient({ url });
export const db = drizzle(sqlite, { schema });
