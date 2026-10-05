export class EnvUtils {

  public static getRequired(key: string): string {
    const value = process.env[key];

    if (!value) {
      throw new Error(`Variável de ambiente ${key} não definida`);
    }

    return value;
  }

  public static getOptional(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
  }
}
