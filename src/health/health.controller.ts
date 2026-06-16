import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Verificar se a API está no ar',
    description:
      'Endpoint simples para monitoramento e health checks de deploy (Coolify, Docker, etc.).',
  })
  @ApiOkResponse({
    description: 'API respondendo normalmente',
    schema: { example: { status: 'ok' } },
  })
  check() {
    return { status: 'ok' };
  }
}
