import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Garante colunas usadas por POST /v1/devices/:id/registry e updatePowerFromReading.
 * Idempotente — seguro se 7300/7400 já tiverem rodado.
 */
export class EnsureDeviceRegistryColumns1740000007500 implements MigrationInterface {
  name = 'EnsureDeviceRegistryColumns1740000007500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('devices');
    if (!table) {
      return;
    }

    const addColumnIfMissing = async (column: TableColumn) => {
      if (!table.findColumnByName(column.name)) {
        await queryRunner.addColumn('devices', column);
      }
    };

    await addColumnIfMissing(
      new TableColumn({
        name: 'last_usb_connected',
        type: 'boolean',
        isNullable: true,
      }),
    );

    await addColumnIfMissing(
      new TableColumn({
        name: 'last_battery_charging',
        type: 'boolean',
        isNullable: true,
      }),
    );

    await addColumnIfMissing(
      new TableColumn({
        name: 'last_power_at',
        type: 'datetime',
        isNullable: true,
      }),
    );

    await addColumnIfMissing(
      new TableColumn({
        name: 'sim_msisdn',
        type: 'varchar',
        length: '20',
        isNullable: true,
      }),
    );

    await addColumnIfMissing(
      new TableColumn({
        name: 'sms_command_pin',
        type: 'varchar',
        length: '8',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('devices');
    if (!table) {
      return;
    }

    for (const name of [
      'sms_command_pin',
      'sim_msisdn',
      'last_power_at',
      'last_battery_charging',
      'last_usb_connected',
    ]) {
      if (table.findColumnByName(name)) {
        await queryRunner.dropColumn('devices', name);
      }
    }
  }
}
