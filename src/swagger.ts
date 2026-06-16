import { INestApplication } from '@nestjs/common';
import { OpenAPIObject } from '@nestjs/swagger';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

const API_DESCRIPTION = `
## Visão geral

API de rastreamento GPS para equipamentos **LilyGO T-SIM7080G** e compatíveis.
O firmware envia posições periodicamente; esta API armazena e permite consultar o histórico recente.

## Fluxo

| Etapa | Quem | Ação |
| --- | --- | --- |
| 1 | Rastreador | \`POST /v1/locations\` — envia uma posição |
| 2 | Painel / integração | \`GET /v1/locations/devices/{deviceId}/latest\` — lê as últimas 20 posições |

## Autenticação

Por padrão a API é **pública**. Se o servidor tiver \`API_BEARER_TOKEN\` configurado, inclua o header:

\`\`\`
Authorization: Bearer SEU_TOKEN
\`\`\`

## Payload de envio

**Obrigatórios:** \`device_id\`, \`latitude\`, \`longitude\`, \`recorded_at\`

**Opcionais:** altitude, velocidade, precisão, satélites, IMEI, ICCID, IMSI, operadora e APN.

Use o exemplo **Envio mínimo** no \`POST /v1/locations\` para testar rapidamente.
`.trim();

function patchOpenApiDocument(document: OpenAPIObject): OpenAPIObject {
  document.tags = [
    {
      name: 'locations',
      description:
        'Envio de posições pelo rastreador e consulta das últimas leituras por equipamento.',
      'x-displayName': 'Localizações',
    } as (typeof document.tags)[number],
    {
      name: 'health',
      description: 'Verificação de disponibilidade da API.',
      'x-displayName': 'Saúde',
    } as (typeof document.tags)[number],
  ];

  document['x-tagGroups'] = [
    {
      name: 'Rastreamento',
      tags: ['locations'],
    },
    {
      name: 'Infraestrutura',
      tags: ['health'],
    },
  ];

  return document;
}

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('LiveTracker API')
    .setDescription(API_DESCRIPTION)
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Token',
        description:
          'Opcional — necessário apenas se API_BEARER_TOKEN estiver definido no servidor',
      },
      'bearer',
    )
    .addTag('locations', 'Registro e consulta de posições GPS')
    .addTag('health', 'Verificação de disponibilidade')
    .build();

  const document = patchOpenApiDocument(
    SwaggerModule.createDocument(app, config),
  );

  SwaggerModule.setup('openapi', app, document, {
    jsonDocumentUrl: 'openapi.json',
    swaggerUiEnabled: false,
  });

  app.use(
    '/docs',
    apiReference({
      theme: 'bluePlanet',
      layout: 'modern',
      content: document,
      hideModels: true,
      defaultOpenAllTags: false,
      defaultOpenFirstTag: true,
      operationTitleSource: 'summary',
      searchHotKey: 'k',
      metaData: {
        title: 'LiveTracker API',
        description: 'Documentação interativa — rastreamento GPS',
      },
      authentication: {
        preferredSecurityScheme: 'bearer',
        securitySchemes: {
          bearer: {
            token: '',
          },
        },
      },
    }),
  );
}
