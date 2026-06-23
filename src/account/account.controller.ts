import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LatestLocationsQueryDto } from '../locations/dto/latest-locations-query.dto';
import { LocationsService } from '../locations/locations.service';
import { Location } from '../locations/entities/location.entity';
import { StoreService } from '../store/store.service';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { DeviceIcon } from '../subscriptions/device-icon';
import { ActivateDeviceDto, UpdateAccountProfileDto, UpdateDeviceAlertsDto, UpdateDeviceChipDto, UpdateDeviceDto } from './dto/account.dto';
import {
  AccountDeviceDto,
  AccountDevicesResponseDto,
  AccountOrdersResponseDto,
} from './dto/account-response.dto';
import { AccountDeviceLocationsResponseDto } from './dto/account-locations-response.dto';
import {
  CreateTrackingShareDto,
  TrackingShareDto,
  TrackingShareListResponseDto,
} from '../tracking-shares/dto/tracking-share.dto';
import { TrackingSharesService } from '../tracking-shares/tracking-shares.service';
import { DevicesService } from '../devices/devices.service';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { UserResponseDto } from '../auth/dto/auth-response.dto';

async function toDeviceDto(
  subscription: Subscription,
  subscriptionsService: SubscriptionsService,
  devicesService: DevicesService,
): Promise<AccountDeviceDto> {
  const isActive = subscriptionsService.isActive(subscription);
  const hardware = await devicesService.findHardwareForSubscription(subscription.device_id);
  const hardwareWithPin = hardware
    ? await devicesService.ensureSmsCommandPin(hardware)
    : null;
  const period = subscriptionsService.buildPeriodInfo(subscription);

  return {
    id: subscription.id,
    label: subscription.label,
    icon: subscription.icon ?? 'vehicle',
    device_id: subscription.device_id,
    status: subscription.status,
    current_period_start: period.current_period_start,
    current_period_end: subscription.current_period_end.toISOString(),
    period_days: period.period_days,
    period_label: period.period_label,
    days_remaining: period.days_remaining,
    is_active: isActive,
    awaiting_activation: !subscription.device_id,
    order_id: subscription.order_id,
    alert_battery_low_enabled: subscription.alert_battery_low_enabled,
    alert_battery_full_enabled: subscription.alert_battery_full_enabled,
    last_battery_percent: hardwareWithPin?.last_battery_percent ?? null,
    last_usb_connected: hardwareWithPin?.last_usb_connected ?? null,
    last_battery_charging: hardwareWithPin?.last_battery_charging ?? null,
    last_power_at: hardwareWithPin?.last_power_at?.toISOString() ?? null,
    sms_command_pin: hardwareWithPin?.sms_command_pin ?? null,
    sim_msisdn: hardwareWithPin?.sim_msisdn ?? null,
  };
}

function toLocationDto(location: Location) {
  return {
    id: location.id,
    latitude: location.latitude,
    longitude: location.longitude,
    speed_knots: location.speed_knots,
    accuracy_m: location.accuracy_m,
    battery_percent: location.battery_percent,
    usb_connected: location.usb_connected ?? undefined,
    battery_charging: location.battery_charging ?? undefined,
    location_source: location.location_source,
    is_valid: location.is_valid,
    recorded_at: location.recorded_at,
    received_at: location.received_at.toISOString(),
  };
}

@ApiTags('account')
@Controller('v1/account')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class AccountController {
  constructor(
    private readonly storeService: StoreService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly locationsService: LocationsService,
    private readonly trackingSharesService: TrackingSharesService,
    private readonly devicesService: DevicesService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Meus dados cadastrais' })
  @ApiOkResponse({ type: UserResponseDto })
  async profile(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.id);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atualizar meus dados',
    description:
      'Permite alterar nome e celular de alerta (também usado para login por SMS).',
  })
  @ApiOkResponse({ type: UserResponseDto })
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateAccountProfileDto,
  ) {
    if (dto.name === undefined && dto.phone === undefined) {
      throw new BadRequestException('Informe ao menos um campo para atualizar');
    }

    await this.usersService.updateProfile(user.id, {
      name: dto.name,
      phone: dto.phone,
    });
    return this.authService.me(user.id);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Meus pedidos' })
  @ApiOkResponse({ type: AccountOrdersResponseDto })
  async orders(@CurrentUser() user: AuthUser) {
    const orders = await this.storeService.listOrdersForUser(user.id);
    return { orders };
  }

  @Get('devices')
  @ApiOperation({
    summary: 'Meus equipamentos',
    description:
      'Lista slots de rastreadores comprados. Ative o IMEI quando receber cada unidade.',
  })
  @ApiOkResponse({ type: AccountDevicesResponseDto })
  async devices(@CurrentUser() user: AuthUser) {
    const subscriptions = await this.subscriptionsService.findByUserId(user.id);
    return {
      devices: await Promise.all(
        subscriptions.map((item) =>
          toDeviceDto(item, this.subscriptionsService, this.devicesService),
        ),
      ),
    };
  }

  @Get('devices/:id')
  @ApiOperation({
    summary: 'Detalhes do equipamento na conta (telemetria de energia, etc.)',
  })
  @ApiParam({ name: 'id', description: 'ID do slot/equipamento na conta' })
  @ApiOkResponse({ type: AccountDeviceDto })
  async device(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const subscription = await this.subscriptionsService.findByIdForUser(id, user.id);
    return toDeviceDto(subscription, this.subscriptionsService, this.devicesService);
  }

  @Patch('devices/:id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ativar IMEI do equipamento recebido' })
  @ApiParam({ name: 'id', description: 'ID do slot/equipamento na conta' })
  @ApiOkResponse({ type: AccountDeviceDto })
  async activateDevice(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ActivateDeviceDto,
  ) {
    const subscription = await this.subscriptionsService.activateDevice(
      id,
      dto.device_id,
      user.id,
    );
    return toDeviceDto(subscription, this.subscriptionsService, this.devicesService);
  }

  @Patch('devices/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Personalizar nome e ícone do rastreador' })
  @ApiParam({ name: 'id', description: 'ID do slot/equipamento na conta' })
  @ApiOkResponse({ type: AccountDeviceDto })
  async updateDevice(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    const subscription = await this.subscriptionsService.updateDeviceProfile(
      id,
      user.id,
      {
        label: dto.label,
        icon: dto.icon as DeviceIcon | undefined,
      },
    );
    return toDeviceDto(subscription, this.subscriptionsService, this.devicesService);
  }

  @Patch('devices/:id/alerts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Configurar alertas por SMS do equipamento' })
  @ApiParam({ name: 'id', description: 'ID do slot/equipamento na conta' })
  @ApiOkResponse({ type: AccountDeviceDto })
  async updateDeviceAlerts(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDeviceAlertsDto,
  ) {
    if (
      dto.alert_battery_low_enabled === undefined &&
      dto.alert_battery_full_enabled === undefined
    ) {
      throw new BadRequestException('Informe ao menos um alerta para atualizar');
    }

    const subscription = await this.subscriptionsService.updateDeviceAlerts(
      id,
      user.id,
      {
        alert_battery_low_enabled: dto.alert_battery_low_enabled,
        alert_battery_full_enabled: dto.alert_battery_full_enabled,
      },
    );
    return toDeviceDto(subscription, this.subscriptionsService, this.devicesService);
  }

  @Patch('devices/:id/chip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cadastrar número do chip para SMS de comando',
    description:
      'Informe o MSISDN do chip M2M quando o equipamento ainda não reportou via +CNUM.',
  })
  @ApiParam({ name: 'id', description: 'ID do slot/equipamento na conta' })
  @ApiOkResponse({ type: AccountDeviceDto })
  async updateDeviceChip(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDeviceChipDto,
  ) {
    const subscription = await this.subscriptionsService.findByIdForUser(id, user.id);

    if (!subscription.device_id) {
      throw new BadRequestException(
        'Ative o IMEI do equipamento antes de cadastrar o número do chip',
      );
    }

    const device = await this.devicesService.ensureExists(subscription.device_id);
    await this.devicesService.updateSimMsisdn(device, dto.sim_msisdn);

    return toDeviceDto(subscription, this.subscriptionsService, this.devicesService);
  }

  @Get('devices/:id/locations')
  @ApiOperation({ summary: 'Histórico de rastreios do equipamento (ordenado por tempo)' })
  @ApiParam({ name: 'id', description: 'ID do slot/equipamento na conta' })
  @ApiOkResponse({ type: AccountDeviceLocationsResponseDto })
  async deviceLocations(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: LatestLocationsQueryDto,
  ) {
    const subscription = await this.subscriptionsService.findByIdForUser(
      id,
      user.id,
    );

    if (!subscription.device_id) {
      throw new BadRequestException(
        'Ative o IMEI do equipamento para visualizar os rastreios',
      );
    }

    const locations = await this.locationsService.findRouteByDevice(
      subscription.device_id,
      {
        limit: query.limit,
        from: query.from,
        to: query.to,
        since: query.since,
        full: query.full,
      },
    );

    return {
      device: await toDeviceDto(
        subscription,
        this.subscriptionsService,
        this.devicesService,
      ),
      locations: locations.map(toLocationDto),
    };
  }

  @Post('devices/:id/share-links')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Gerar link público de rastreio ao vivo' })
  @ApiParam({ name: 'id', description: 'ID do slot/equipamento na conta' })
  @ApiOkResponse({ type: TrackingShareDto })
  async createShareLink(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateTrackingShareDto,
  ) {
    return this.trackingSharesService.createShare(user.id, id, dto);
  }

  @Get('devices/:id/share-links')
  @ApiOperation({ summary: 'Listar links de compartilhamento do equipamento' })
  @ApiParam({ name: 'id', description: 'ID do slot/equipamento na conta' })
  @ApiOkResponse({ type: TrackingShareListResponseDto })
  async listShareLinks(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.trackingSharesService.listShares(user.id, id);
  }

  @Delete('devices/:id/share-links/:shareId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encerrar link de compartilhamento' })
  @ApiOkResponse({ type: TrackingShareDto })
  async revokeShareLink(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('shareId') shareId: string,
  ) {
    return this.trackingSharesService.revokeShare(user.id, id, shareId);
  }

  @Post('devices/:id/share-links/:shareId/dismiss')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover link encerrado da lista (soft delete)' })
  async dismissShareLink(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('shareId') shareId: string,
  ) {
    await this.trackingSharesService.dismissShare(user.id, id, shareId);
    return { ok: true };
  }
}
