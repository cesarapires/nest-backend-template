import { existsSync } from 'node:fs';

for (const file of ['.env.test', '.env']) {
  if (existsSync(file)) {
    process.loadEnvFile(file);
  }
}
