import { AbstractEntity } from '@/database/abstract-entity.js';
import { AbstractResponseDto } from '@/http/abstract-response.dto.js';

class EventoTeste extends AbstractEntity {

  nome: string;

  cpfOrganizador: string;
}

class EventoTesteResponseDto extends AbstractResponseDto {

  readonly nome: string;

  constructor(evento: EventoTeste) {
    super(evento);
    this.nome = evento.nome;
  }
}

describe('AbstractResponseDto', () => {
  const evento = Object.assign(new EventoTeste(), {
    id: '42',
    publicId: '0b6f4c1e-2d6a-4c1f-9a7e-5f2f3b1c9d10',
    createdAt: new Date('2026-10-04T12:00:00Z'),
    updatedAt: new Date('2026-10-04T13:00:00Z'),
    deletedAt: null,
    version: 3,
    nome: 'Corrida de Outono',
    cpfOrganizador: '52998224725',
  });

  it('deve expor o public_id com o nome id', () => {
    expect(new EventoTesteResponseDto(evento).id).toBe('0b6f4c1e-2d6a-4c1f-9a7e-5f2f3b1c9d10');
  });

  it('deve devolver só os campos mapeados explicitamente', () => {
    expect(JSON.parse(JSON.stringify(new EventoTesteResponseDto(evento)))).toEqual({
      id: '0b6f4c1e-2d6a-4c1f-9a7e-5f2f3b1c9d10',
      createdAt: '2026-10-04T12:00:00.000Z',
      updatedAt: '2026-10-04T13:00:00.000Z',
      nome: 'Corrida de Outono',
    });
  });
});
