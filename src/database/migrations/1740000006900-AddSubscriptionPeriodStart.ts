import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSubscriptionPeriodStart1740000006900 implements MigrationInterface {
  name = 'AddSubscriptionPeriodStart1740000006900';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('subscriptions');
    if (!table?.findColumnByName('current_period_start')) {
      await queryRunner.addColumn(
        'subscriptions',
        new TableColumn({
          name: 'current_period_start',
          type: 'datetime',
          isNullable: true,
        }),
      );
    }

    await queryRunner.query(`
      UPDATE subscriptions
      SET current_period_start = created_at
      WHERE current_period_start IS NULL
    `);

    await queryRunner.query(`
      UPDATE subscriptions
      SET current_period_end = DATE_ADD(
        COALESCE(current_period_start, created_at),
        INTERVAL 365 DAY
      )
      WHERE TIMESTAMPDIFF(
        DAY,
        COALESCE(current_period_start, created_at),
        current_period_end
      ) <= 31
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('subscriptions');
    if (table?.findColumnByName('current_period_start')) {
      await queryRunner.dropColumn('subscriptions', 'current_period_start');
    }
  }
}
