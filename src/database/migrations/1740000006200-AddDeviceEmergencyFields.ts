import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDeviceEmergencyFields1740000006200 implements MigrationInterface {
  name = 'AddDeviceEmergencyFields1740000006200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('devices');
    if (!table) {
      return;
    }

    if (!table.findColumnByName('emergency_until')) {
      await queryRunner.addColumn(
        'devices',
        new TableColumn({
          name: 'emergency_until',
          type: 'datetime',
          isNullable: true,
        }),
      );
    }

    if (!table.findColumnByName('emergency_activated_at')) {
      await queryRunner.addColumn(
        'devices',
        new TableColumn({
          name: 'emergency_activated_at',
          type: 'datetime',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('devices');
    if (!table) {
      return;
    }

    if (table.findColumnByName('emergency_activated_at')) {
      await queryRunner.dropColumn('devices', 'emergency_activated_at');
    }

    if (table.findColumnByName('emergency_until')) {
      await queryRunner.dropColumn('devices', 'emergency_until');
    }
  }
}
