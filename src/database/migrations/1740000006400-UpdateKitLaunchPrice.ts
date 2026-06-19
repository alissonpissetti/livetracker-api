import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateKitLaunchPrice1740000006400 implements MigrationInterface {
  name = 'UpdateKitLaunchPrice1740000006400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE products
      SET price_cents = 47880
      WHERE slug = 'kit-tsim7080g'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE products
      SET price_cents = 44900
      WHERE slug = 'kit-tsim7080g'
    `);
  }
}
