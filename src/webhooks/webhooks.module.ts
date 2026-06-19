import { Module } from '@nestjs/common';
import { AsaasModule } from '../plugins/asaas/asaas.module';
import { StoreModule } from '../store/store.module';
import { PaymentSettlementController } from './payment-settlement.controller';

@Module({
  imports: [StoreModule, AsaasModule],
  controllers: [PaymentSettlementController],
})
export class WebhooksModule {}
