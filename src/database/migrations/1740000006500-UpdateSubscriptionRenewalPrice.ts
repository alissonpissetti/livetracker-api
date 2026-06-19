import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSubscriptionRenewalPrice1740000006500
  implements MigrationInterface
{
  name = 'UpdateSubscriptionRenewalPrice1740000006500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE products
      SET
        price_cents = 1990,
        description = 'Monitoramento em tempo real, histórico de rotas e alertas. A partir do 2º ano: R$ 19,90/mês por equipamento.'
      WHERE slug = 'assinatura-mensal'
    `);

    await queryRunner.query(`
      UPDATE products
      SET description = 'Kit completo com rastreador, antena e chip já configurados para o LIVRE TRACKER. Inclui 12 meses de uso sem mensalidade. A partir do 2º ano, renove por R$ 19,90/mês.'
      WHERE slug = 'kit-tsim7080g'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE products
      SET
        price_cents = 2990,
        description = 'Monitoramento em tempo real, histórico de rotas e alertas. Renovação mensal por equipamento.'
      WHERE slug = 'assinatura-mensal'
    `);
  }
}
