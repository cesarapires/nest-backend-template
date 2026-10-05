import { Column, DataSource, Entity } from 'typeorm';
import { AbstractEntity } from '@/database/abstract-entity.js';
import { TypeOrmConfigService } from '@/database/typeorm-config.service.js';

@Entity()
class InscricaoTeste extends AbstractEntity {

  @Column({ type: 'varchar' })
  public nomeAtleta: string;
}

describe('AbstractEntity (e2e)', () => {
  const SCHEMA = `teste_${Date.now()}`;

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({ ...TypeOrmConfigService.createConnectionOptions(), schema: SCHEMA, entities: [InscricaoTeste] });
    await dataSource.initialize();
    await dataSource.query(`CREATE SCHEMA "${SCHEMA}"`);
    await dataSource.synchronize();
  });

  afterAll(async () => {
    await dataSource.query(`DROP SCHEMA "${SCHEMA}" CASCADE`);
    await dataSource.destroy();
  });

  function salvar(nomeAtleta: string) {
    return dataSource.getRepository(InscricaoTeste).save({ nomeAtleta });
  }

  it('deve criar as colunas em snake_case com os tipos esperados', async () => {
    const colunas: { column_name: string; data_type: string }[] = await dataSource.query(
      'SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
      [SCHEMA, 'inscricao_teste'],
    );

    expect(Object.fromEntries(colunas.map((coluna) => [coluna.column_name, coluna.data_type]))).toEqual({
      id: 'bigint',
      public_id: 'uuid',
      created_at: 'timestamp with time zone',
      updated_at: 'timestamp with time zone',
      deleted_at: 'timestamp with time zone',
      version: 'integer',
      nome_atleta: 'character varying',
    });
  });

  it('deve gerar id sequencial e public_id uuid ao salvar', async () => {
    const primeira = await salvar('Ana');
    const segunda = await salvar('Bruno');

    expect(BigInt(segunda.id)).toBe(BigInt(primeira.id) + 1n);
    expect(primeira.publicId).toMatch(UUID);
    expect(segunda.publicId).toMatch(UUID);
    expect(segunda.publicId).not.toBe(primeira.publicId);
  });

  it('deve preencher as datas de criação e atualização', async () => {
    const inscricao = await salvar('Carla');

    expect(inscricao.createdAt).toBeInstanceOf(Date);
    expect(inscricao.updatedAt).toBeInstanceOf(Date);
  });

  it('deve impedir dois registros com o mesmo public_id', async () => {
    const inscricao = await salvar('Daniel');

    await expect(dataSource.getRepository(InscricaoTeste).insert({ nomeAtleta: 'Eva', publicId: inscricao.publicId })).rejects.toThrow(/duplicate key/);
  });

  it('deve começar na versão 1 e incrementar a cada alteração', async () => {
    const inscricao = await salvar('Fábio');

    expect(inscricao.version).toBe(1);

    inscricao.nomeAtleta = 'Fábio Souza';
    const atualizada = await dataSource.getRepository(InscricaoTeste).save(inscricao);

    expect(atualizada.version).toBe(2);
  });

  it('deve ocultar das buscas o registro apagado com soft delete', async () => {
    const repositorio = dataSource.getRepository(InscricaoTeste);
    const inscricao = await salvar('Gabi');

    await repositorio.softDelete({ id: inscricao.id });

    expect(await repositorio.findOneBy({ id: inscricao.id })).toBeNull();

    const apagada = await repositorio.findOne({ where: { id: inscricao.id }, withDeleted: true });

    expect(apagada?.deletedAt).toBeInstanceOf(Date);
  });

  it('deve voltar a encontrar o registro restaurado', async () => {
    const repositorio = dataSource.getRepository(InscricaoTeste);
    const inscricao = await salvar('Hugo');

    await repositorio.softDelete({ id: inscricao.id });
    await repositorio.restore({ id: inscricao.id });

    const restaurada = await repositorio.findOneBy({ id: inscricao.id });

    expect(restaurada?.deletedAt).toBeNull();
  });

  it('deve usar UTC como fuso horário da sessão', async () => {
    const [{ TimeZone }]: { TimeZone: string }[] = await dataSource.query('SHOW timezone');

    expect(TimeZone).toBe('UTC');
  });
});
