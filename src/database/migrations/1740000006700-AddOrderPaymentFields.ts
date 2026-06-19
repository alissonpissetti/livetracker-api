import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOrderPaymentFields1740000006700 implements MigrationInterface {
  name = 'AddOrderPaymentFields1740000006700';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('orders');
    if (!table) {
      return;
    }

    const columns: TableColumn[] = [
      new TableColumn({
        name: 'payment_method',
        type: 'varchar',
        length: '16',
        isNullable: true,
      }),
      new TableColumn({
        name: 'payment_status',
        type: 'varchar',
        length: '16',
        isNullable: true,
      }),
      new TableColumn({
        name: 'payment_discount_cents',
        type: 'int',
        isNullable: false,
        default: 0,
      }),
      new TableColumn({
        name: 'installment_count',
        type: 'int',
        isNullable: true,
      }),
      new TableColumn({
        name: 'asaas_customer_id',
        type: 'varchar',
        length: '64',
        isNullable: true,
      }),
      new TableColumn({
        name: 'asaas_payment_id',
        type: 'varchar',
        length: '64',
        isNullable: true,
      }),
      new TableColumn({
        name: 'paid_at',
        type: 'datetime',
        isNullable: true,
      }),
    ];

    for (const column of columns) {
      if (!table.findColumnByName(column.name)) {
        await queryRunner.addColumn('orders', column);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('orders');
    if (!table) {
      return;
    }

    for (const name of [
      'paid_at',
      'asaas_payment_id',
      'asaas_customer_id',
      'installment_count',
      'payment_discount_cents',
      'payment_status',
      'payment_method',
    ]) {
      if (table.findColumnByName(name)) {
        await queryRunner.dropColumn('orders', name);
      }
    }
  }
}
