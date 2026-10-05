import { Body, Controller, Get, INestApplication, NotFoundException, Post } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsNotEmpty, IsString, Matches, Min, ValidateNested } from 'class-validator';
import { LoggerModule } from 'nestjs-pino';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { HttpConfig } from '@/config/http.config.js';
import { LoggerConfig } from '@/logger/logger.config.js';

class AtletaTesteDto {

  @IsString()
  @IsNotEmpty()
  public nome: string;

  @Matches(/^\d{11}$/)
  public cpf: string;
}

class InscricaoTesteDto {

  @IsEmail()
  public email: string;

  @IsInt()
  @Min(1)
  public quantidade: number;

  @ValidateNested()
  @Type(() => AtletaTesteDto)
  public atleta: AtletaTesteDto;
}

@Controller('teste')
class TesteController {

  @Post()
  public criar(@Body() inscricao: InscricaoTesteDto) {
    return { recebido: inscricao, instanciaDoDto: inscricao instanceof InscricaoTesteDto };
  }

  @Get('nao-encontrado')
  public naoEncontrado() {
    throw new NotFoundException('Evento não encontrado');
  }

  @Get('erro-inesperado')
  public erroInesperado() {
    throw new Error('falha interna com senha=123');
  }
}

describe('Problem Details (e2e)', () => {
  let app: INestApplication<App>;

  const inscricaoValida = { email: 'ana@exemplo.com', quantidade: 1, atleta: { nome: 'Ana', cpf: '52998224725' } };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule.forRoot(LoggerConfig.createParams())],
      controllers: [TesteController],
    }).compile();

    app = moduleFixture.createNestApplication();
    HttpConfig.apply(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('deve aceitar um corpo válido e entregar uma instância do DTO', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/teste').send(inscricaoValida).expect(201);

    expect(response.body).toEqual({ recebido: inscricaoValida, instanciaDoDto: true });
  });

  it('deve responder 400 no formato Problem Details com os campos inválidos', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/teste')
      .set('x-request-id', 'teste-validacao')
      .send({ ...inscricaoValida, email: 'invalido', quantidade: 0 })
      .expect(400);

    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(Object.keys(response.body)).toEqual(['type', 'title', 'status', 'detail', 'instance', 'requestId', 'errors']);
    expect(response.body).toEqual({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: 'Os dados enviados são inválidos',
      instance: '/api/v1/teste',
      requestId: 'teste-validacao',
      errors: [
        { field: 'email', message: 'email must be an email' },
        { field: 'quantidade', message: 'quantidade must not be less than 1' },
      ],
    });
  });

  it('deve indicar o caminho completo dos campos inválidos em objetos aninhados', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/teste')
      .send({ ...inscricaoValida, atleta: { nome: '', cpf: '123' } })
      .expect(400);

    expect(response.body.errors.map((error: { field: string }) => error.field)).toEqual(['atleta.nome', 'atleta.cpf']);
  });

  it('deve recusar campos que não existem no DTO', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/teste')
      .send({ ...inscricaoValida, admin: true })
      .expect(400);

    expect(response.body.errors).toEqual([{ field: 'admin', message: 'property admin should not exist' }]);
  });

  it('deve recusar JSON malformado com 400', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/teste').set('content-type', 'application/json').send('{"email":').expect(400);

    expect(response.body).toMatchObject({ status: 400, title: 'Bad Request', instance: '/api/v1/teste' });
  });

  it('deve responder 404 no formato Problem Details para rota inexistente', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/nao-existe').expect(404);

    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body).toMatchObject({ status: 404, title: 'Not Found', instance: '/api/v1/nao-existe' });
  });

  it('deve manter a mensagem de erros HTTP lançados pela aplicação', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/teste/nao-encontrado').expect(404);

    expect(response.body.detail).toBe('Evento não encontrado');
  });

  it('deve responder 500 genérico sem vazar detalhes de erros inesperados', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/teste/erro-inesperado').expect(500);

    expect(response.body).toMatchObject({ status: 500, title: 'Internal Server Error', detail: 'Erro interno no servidor' });
    expect(JSON.stringify(response.body)).not.toContain('senha');
  });
});
