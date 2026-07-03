import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.join(__dirname, '../node_modules/kysely/dist/index.js');

let content;
try {
  content = readFileSync(indexPath, 'utf8');
} catch {
  console.log('[patch-kysely] kysely not found, skipping');
  process.exit(0);
}

const patch = `\n// patch: re-export migration constants required by @better-auth/kysely-adapter\nexport { DEFAULT_MIGRATION_TABLE, DEFAULT_MIGRATION_LOCK_TABLE } from './migration/migrator.js';\n`;

if (content.includes('DEFAULT_MIGRATION_TABLE')) {
  console.log('[patch-kysely] already patched, skipping');
} else {
  writeFileSync(indexPath, content + patch);
  console.log('[patch-kysely] patched kysely/dist/index.js');
}
