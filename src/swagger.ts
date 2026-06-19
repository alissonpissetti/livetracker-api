import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAPIObject } from '@nestjs/swagger';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

const API_DESCRIPTION = `
## Visão geral

API de rastreamento GPS para equipamentos **LIVRE TRACKER**.
O firmware envia posições periodicamente; esta API armazena e permite consultar o histórico recente.

## Fluxo

| Etapa | Quem | Ação |
| --- | --- | --- |
| 1 | Rastreador | \`POST /v1/locations\` — envia uma posição (por \`device_id\`) |
| 2 | Painel / integração | \`GET /v1/locations/devices/{deviceId}/latest\` — histórico recente |
| 3 | Administração | \`PATCH /v1/admin/devices/{deviceId}/block\` — bloqueia IMEI |
| 4 | Cliente logado | \`POST /v1/auth/register\` e \`POST /v1/auth/login\` |
| 5 | Loja | \`POST /v1/store/checkout\` — cria pedido e slots (aceita \`voucher_code\`) |
| 6 | Conta | \`GET /v1/account/orders\` e \`PATCH /v1/account/devices/:id/activate\` |
| 7 | Admin | \`GET /v1/admin/users\`, vouchers, equipamentos (role admin) |

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
      name: 'auth',
      description: 'Cadastro e login de clientes.',
      'x-displayName': 'Conta',
    } as (typeof document.tags)[number],
    {
      name: 'store',
      description: 'Catálogo e checkout autenticado.',
      'x-displayName': 'Loja',
    } as (typeof document.tags)[number],
    {
      name: 'account',
      description: 'Pedidos, equipamentos e ativação de IMEI.',
      'x-displayName': 'Minha conta',
    } as (typeof document.tags)[number],
    {
      name: 'admin',
      description: 'Gestão interna — contas, equipamentos e pedidos.',
      'x-displayName': 'Administração',
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
      tags: ['locations', 'auth', 'store', 'account'],
    },
    {
      name: 'Administração',
      tags: ['admin'],
    },
    {
      name: 'Infraestrutura',
      tags: ['health'],
    },
  ];

  return document;
}

export function setupSwagger(app: INestApplication): void {
  const config = app.get(ConfigService);
  const enabled =
    config.get<string>('API_DOCS_ENABLED', 'false').toLowerCase() === 'true';

  if (!enabled) {
    return;
  }

  const builder = new DocumentBuilder()
    .setTitle('LIVRE TRACKER API')
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
    .addTag('auth', 'Cadastro e login')
    .addTag('store', 'Loja e checkout')
    .addTag('account', 'Pedidos e equipamentos do cliente')
    .addTag('admin', 'Gestão interna LIVRE TRACKER')
    .addTag('health', 'Verificação de disponibilidade')
    .build();

  const document = patchOpenApiDocument(
    SwaggerModule.createDocument(app, builder),
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
        title: 'LIVRE TRACKER API',
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
