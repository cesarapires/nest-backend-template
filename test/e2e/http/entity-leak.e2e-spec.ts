import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { HttpConfig } from '@/config/http.config.js';
import { AbstractEntity } from '@/database/abstract-entity.js';
import { AbstractResponseDto } from '@/http/abstract-response.dto.js';

class AtletaTeste extends AbstractEntity {

  nome: string;

  cpf: string;
}

class AtletaTesteResponseDto extends AbstractResponseDto {

  readonly nome: string;

  constructor(atleta: AtletaTeste) {
    super(atleta);
    this.nome = atleta.nome;
  }
}

const atleta = Object.assign(new AtletaTeste(), {
  id: '7',
  publicId: '6a3e9f0c-1b2d-4e5f-8a9b-0c1d2e3f4a5b',
  createdAt: new Date('2026-10-04T12:00:00Z'),
  updatedAt: new Date('2026-10-04T12:00:00Z'),
  deletedAt: null,
  version: 1,
  nome: 'Ana',
  cpf: '52998224725',
});

@Controller('atletas-teste')
class AtletasTesteController {

  @Get('dto')
  comDto() {
    return new AtletaTesteResponseDto(atleta);
  }

  @Get('entidade')
  comEntidade() {
    return atleta;
  }
}

describe('Vazamento de entidade (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AtletasTesteController],
    }).compile();

    app = moduleFixture.createNestApplication();
    HttpConfig.apply(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('deve responder o DTO com o public_id como id e sem dados não mapeados', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/atletas-teste/dto').expect(200);

    expect(response.body).toEqual({
      id: '6a3e9f0c-1b2d-4e5f-8a9b-0c1d2e3f4a5b',
      createdAt: '2026-10-04T12:00:00.000Z',
      updatedAt: '2026-10-04T12:00:00.000Z',
      nome: 'Ana',
    });
  });

  it('deve responder 500 genérico quando uma entidade é devolvida sem DTO', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/atletas-teste/entidade').expect(500);

    expect(response.body.detail).toBe('Erro interno no servidor');
    expect(JSON.stringify(response.body)).not.toContain('52998224725');
  });
});
