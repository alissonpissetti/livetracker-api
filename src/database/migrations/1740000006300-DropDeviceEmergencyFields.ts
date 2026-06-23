import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class DropDeviceEmergencyFields1740000006300 implements MigrationInterface {
  name = 'DropDeviceEmergencyFields1740000006300';

  public async up(queryRunner: QueryRunner): Promise<void> {
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

  public async down(queryRunner: QueryRunner): Promise<void> {
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
}
