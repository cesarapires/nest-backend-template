import '@/config/load-env.js';
import { DatabaseSeeder } from './database-seeder.js';
import { DevelopmentUsers } from './development-users.js';

const created = await DatabaseSeeder.run();

process.stdout.write(created.length > 0 ? `Usuários criados: ${created.join(', ')}\n` : 'Usuários de desenvolvimento já existiam\n');
process.stdout.write(`Senha de todos: ${DevelopmentUsers.PASSWORD}\n`);
