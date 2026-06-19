import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AsaasService } from '../plugins/asaas/asaas.service';
import type { AsaasWebhookPayload } from '../plugins/asaas/asaas.types';
import { StoreService } from '../store/store.service';

@ApiTags('webhooks')
@ApiExcludeController()
@Controller()
export class PaymentSettlementController {
  constructor(
    private readonly storeService: StoreService,
    private readonly asaas: AsaasService,
  ) {}

  @Post('webhooks/payment-settlement')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook de pagamentos Asaas (TagPlay)' })
  async receive(
    @Body() payload: AsaasWebhookPayload,
    @Headers('asaas-access-token') asaasAccessToken?: string,
  ) {
    const expected = this.asaas.getWebhookToken();
    if (expected && asaasAccessToken !== expected) {
      throw new UnauthorizedException();
    }

    return this.storeService.handleAsaasWebhook(payload);
  }
}
