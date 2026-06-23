import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({
    summary: 'Verificar se a API e o banco estão no ar',
    description:
      'Endpoint para monitoramento e health checks de deploy (Coolify, Docker, etc.).',
  })
  @ApiOkResponse({
    description: 'API e banco respondendo normalmente',
    schema: {
      example: { status: 'ok', database: 'up' },
    },
  })
  async check() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', database: 'up' };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'database unreachable';
      throw new ServiceUnavailableException({
        status: 'degraded',
        database: 'down',
        error: message,
      });
    }
  }
}
