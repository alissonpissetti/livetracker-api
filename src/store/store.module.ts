import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AsaasModule } from '../plugins/asaas/asaas.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { User } from '../users/entities/user.entity';
import { VouchersModule } from '../vouchers/vouchers.module';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Order, OrderItem, User]),
    SubscriptionsModule,
    VouchersModule,
    AuthModule,
    AsaasModule,
  ],
  controllers: [StoreController],
  providers: [ProductsService, StoreService],
  exports: [StoreService],
})
export class StoreModule {}
