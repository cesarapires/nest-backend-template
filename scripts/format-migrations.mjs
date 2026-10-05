import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIRECTORY = 'src/database/migrations';
const NAME_WITHOUT_VISIBILITY = /^(\s+)name = /m;

for (const file of readdirSync(MIGRATIONS_DIRECTORY).filter((name) => name.endsWith('.ts'))) {
  const path = join(MIGRATIONS_DIRECTORY, file);
  const content = readFileSync(path, 'utf8');

  if (NAME_WITHOUT_VISIBILITY.test(content)) {
    writeFileSync(path, content.replace(NAME_WITHOUT_VISIBILITY, '$1public name = '));
  }
}
