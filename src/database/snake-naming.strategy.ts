import { DefaultNamingStrategy, type NamingStrategyInterface } from 'typeorm';
import { snakeCase } from 'typeorm/util/StringUtils.js';

export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {

  override tableName(targetName: string, userSpecifiedName: string | undefined): string {
    return userSpecifiedName ?? snakeCase(targetName);
  }

  override columnName(propertyName: string, customName: string | undefined, embeddedPrefixes: string[]): string {
    const prefix = embeddedPrefixes.map((embeddedPrefix) => `${snakeCase(embeddedPrefix)}_`).join('');
    return prefix + (customName ?? snakeCase(propertyName));
  }

  override relationName(propertyName: string): string {
    return snakeCase(propertyName);
  }

  override joinColumnName(relationName: string, referencedColumnName: string): string {
    return snakeCase(`${relationName}_${referencedColumnName}`);
  }

  override joinTableName(firstTableName: string, secondTableName: string, firstPropertyName: string): string {
    return snakeCase(`${firstTableName}_${firstPropertyName.replaceAll('.', '_')}_${secondTableName}`);
  }

  override joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return snakeCase(`${tableName}_${columnName ?? propertyName}`);
  }
}
