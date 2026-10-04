import { SnakeNamingStrategy } from '@/database/snake-naming.strategy.js';

describe('SnakeNamingStrategy', () => {
  const strategy = new SnakeNamingStrategy();

  describe('tableName', () => {
    it('deve converter o nome da classe para snake_case', () => {
      expect(strategy.tableName('InscricaoAtleta', undefined)).toBe('inscricao_atleta');
    });

    it('deve manter o nome definido manualmente', () => {
      expect(strategy.tableName('InscricaoAtleta', 'inscricoes')).toBe('inscricoes');
    });
  });

  describe('columnName', () => {
    it('deve converter o nome da propriedade para snake_case', () => {
      expect(strategy.columnName('dataNascimento', undefined, [])).toBe('data_nascimento');
    });

    it('deve manter o nome definido manualmente', () => {
      expect(strategy.columnName('dataNascimento', 'nascimento', [])).toBe('nascimento');
    });

    it('deve prefixar colunas de objetos embutidos', () => {
      expect(strategy.columnName('nomeContato', undefined, ['emergencia'])).toBe('emergencia_nome_contato');
    });
  });

  describe('relacionamentos', () => {
    it('deve gerar a chave estrangeira em snake_case apontando para o id', () => {
      expect(strategy.joinColumnName('eventoEsportivo', 'id')).toBe('evento_esportivo_id');
    });

    it('deve gerar o nome da tabela de junção em snake_case', () => {
      expect(strategy.joinTableName('evento', 'categoria', 'categoriasPermitidas')).toBe('evento_categorias_permitidas_categoria');
    });

    it('deve gerar as colunas da tabela de junção em snake_case', () => {
      expect(strategy.joinTableColumnName('evento', 'id')).toBe('evento_id');
    });
  });
});
