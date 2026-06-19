import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserGatewayFields1740000006800 implements MigrationInterface {
  name = 'AddUserGatewayFields1740000006800';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const users = await queryRunner.getTable('users');
    if (users) {
      if (!users.findColumnByName('cpf')) {
        await queryRunner.addColumn(
          'users',
          new TableColumn({
            name: 'cpf',
            type: 'varchar',
            length: '14',
            isNullable: true,
          }),
        );
      }
      if (!users.findColumnByName('asaas_customer_id')) {
        await queryRunner.addColumn(
          'users',
          new TableColumn({
            name: 'asaas_customer_id',
            type: 'varchar',
            length: '64',
            isNullable: true,
          }),
        );
      }
    }

    const orders = await queryRunner.getTable('orders');
    if (orders) {
      if (!orders.findColumnByName('customer_cpf')) {
        await queryRunner.addColumn(
          'orders',
          new TableColumn({
            name: 'customer_cpf',
            type: 'varchar',
            length: '14',
            isNullable: true,
          }),
        );
      }
      if (!orders.findColumnByName('customer_phone')) {
        await queryRunner.addColumn(
          'orders',
          new TableColumn({
            name: 'customer_phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const orders = await queryRunner.getTable('orders');
    if (orders) {
      for (const name of ['customer_phone', 'customer_cpf']) {
        if (orders.findColumnByName(name)) {
          await queryRunner.dropColumn('orders', name);
        }
      }
    }

    const users = await queryRunner.getTable('users');
    if (users) {
      for (const name of ['asaas_customer_id', 'cpf']) {
        if (users.findColumnByName(name)) {
          await queryRunner.dropColumn('users', name);
        }
      }
    }
  }
}
