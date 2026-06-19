import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateKitRastreadorLtCatalog1740000006300
  implements MigrationInterface
{
  name = 'UpdateKitRastreadorLtCatalog1740000006300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE products
      SET
        name = 'Kit rastreador LT',
        description = 'Kit completo com rastreador, antena e chip já configurados para o LIVRE TRACKER. Inclui 12 meses de uso sem mensalidade.'
      WHERE slug = 'kit-tsim7080g'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE products
      SET
        name = 'Kit Rastreador T-SIM7080G',
        description = 'Placa LilyGO T-SIM7080G com modem NB-IoT/LTE-M, antena GPS e chip M2M pré-configurado para LIVRE TRACKER.'
      WHERE slug = 'kit-tsim7080g'
    `);
  }
}
