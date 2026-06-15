import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Locations (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('POST /v1/locations', () => {
    return request(app.getHttpServer())
      .post('/v1/locations')
      .send({
        device_id: '868123456789012',
        latitude: -23.5505199,
        longitude: -46.6333094,
        altitude: 760.5,
        speed_knots: 0,
        accuracy_m: 3.5,
        satellites_visible: 12,
        satellites_used: 8,
        imei: '868123456789012',
        recorded_at: '2026-06-15T18:30:00Z',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.device_id).toBe('868123456789012');
        expect(res.body.received_at).toBeDefined();
      });
  });
});
