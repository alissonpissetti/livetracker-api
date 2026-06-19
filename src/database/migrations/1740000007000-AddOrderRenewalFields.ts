import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOrderRenewalFields1740000007000 implements MigrationInterface {
  name = 'AddOrderRenewalFields1740000007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const orders = await queryRunner.getTable('orders');
    if (orders && !orders.findColumnByName('order_type')) {
      await queryRunner.addColumn(
        'orders',
        new TableColumn({
          name: 'order_type',
          type: 'varchar',
          length: '16',
          isNullable: false,
          default: "'purchase'",
        }),
      );
    }

    if (orders && !orders.findColumnByName('subscription_id')) {
      await queryRunner.addColumn(
        'orders',
        new TableColumn({
          name: 'subscription_id',
          type: 'varchar',
          length: '36',
          isNullable: true,
        }),
      );
    }

    await queryRunner.query(`
      INSERT INTO products (id, slug, name, description, type, price_cents, subscription_days, active, created_at)
      SELECT UUID(), 'renovacao-6-meses', 'Renovação 6 meses',
        'Plano de renovação por 6 meses de rastreamento (R$ 25,90/mês).',
        'subscription', 15540, 180, 1, NOW()
      WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'renovacao-6-meses')
    `);

    await queryRunner.query(`
      INSERT INTO products (id, slug, name, description, type, price_cents, subscription_days, active, created_at)
      SELECT UUID(), 'renovacao-12-meses', 'Renovação 12 meses',
        'Plano de renovação por 12 meses de rastreamento (R$ 19,90/mês).',
        'subscription', 23880, 365, 1, NOW()
      WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'renovacao-12-meses')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const orders = await queryRunner.getTable('orders');
    if (orders?.findColumnByName('subscription_id')) {
      await queryRunner.dropColumn('orders', 'subscription_id');
    }
    if (orders?.findColumnByName('order_type')) {
      await queryRunner.dropColumn('orders', 'order_type');
    }
  }
}
