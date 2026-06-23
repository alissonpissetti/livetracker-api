import { ApiProperty } from '@nestjs/swagger';

export class DeviceConfigDto {
  @ApiProperty({ example: 10 })
  report_interval_sec: number;

  @ApiProperty({ example: 10 })
  config_poll_interval_sec: number;

  @ApiProperty({ example: 40 })
  stop_distance_m: number;

  @ApiProperty({ example: 3 })
  stop_samples_required: number;

  @ApiProperty({
    description:
      'PIN de 6 dígitos para validar SMS de comando recebidos pelo equipamento.',
    example: '482913',
  })
  sms_command_pin: string;
}
