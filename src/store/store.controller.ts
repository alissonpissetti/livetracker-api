import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VoucherPreviewDto } from '../vouchers/dto/voucher.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { RenewalCheckoutDto } from './dto/renewal-checkout.dto';
import { IdentifyClientDto, PayOrderDto } from './dto/pay-order.dto';
import {
  CheckoutResponseDto,
  ProductResponseDto,
} from './dto/store-response.dto';
import { StoreService } from './store.service';

@ApiTags('store')
@Controller('v1/store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get('products')
  @ApiOperation({ summary: 'Listar produtos e planos' })
  @ApiOkResponse({ type: ProductResponseDto, isArray: true })
  async products() {
    return this.storeService.listProducts();
  }

  @Get('renewal/plans')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Planos de renovação disponíveis na conta' })
  async renewalPlans() {
    return { plans: await this.storeService.listRenewalPlans() };
  }

  @Post('renewal/checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Iniciar checkout de renovação',
    description: 'Cria pedido de renovação para estender o vencimento do equipamento.',
  })
  async renewalCheckout(
    @CurrentUser() user: AuthUser,
    @Body() dto: RenewalCheckoutDto,
  ) {
    return this.storeService.createRenewalCheckout(user, dto);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar pedido',
    description: 'Cria pedido aguardando pagamento (mesmo fluxo TagPlay).',
  })
  @ApiCreatedResponse({ type: CheckoutResponseDto })
  async checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.storeService.checkout(user, dto);
  }

  @Get('orders/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Detalhes do pedido para pagamento' })
  async getOrder(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ) {
    return this.storeService.getOrderForUser(user.id, orderId);
  }

  @Post('orders/:orderId/identify-client')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Identificar comprador no pedido' })
  async identifyClient(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Body() dto: IdentifyClientDto,
  ) {
    return this.storeService.identifyClient(user.id, orderId, dto);
  }

  @Post('orders/:orderId/pay')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Processar pagamento no gateway Asaas' })
  async payOrder(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Body() dto: PayOrderDto,
    @Req() req: Request,
  ) {
    const fwd = req.headers['x-forwarded-for'];
    const remoteIp =
      typeof fwd === 'string'
        ? fwd.split(',')[0].trim()
        : req.ip || req.socket?.remoteAddress || '';
    return this.storeService.payOrder(user.id, orderId, dto, remoteIp);
  }

  @Get('orders/:orderId/pix')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'QR Code PIX do pedido' })
  async pix(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ) {
    return this.storeService.getPixQr(user.id, orderId);
  }

  @Post('orders/:orderId/check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Consultar confirmação do pagamento' })
  async checkPayment(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ) {
    return this.storeService.checkPayment(user.id, orderId);
  }

  @Post('orders/:orderId/cancel-pending-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar cobrança pendente no gateway' })
  async cancelPendingPayment(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ) {
    return this.storeService.cancelPendingPayment(user.id, orderId);
  }

  @Post('voucher/preview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Simular desconto de voucher',
    description: 'Valida o código sem consumir uso. Requer conta logada.',
  })
  async voucherPreview(@Body() dto: VoucherPreviewDto) {
    return this.storeService.previewVoucher(
      dto.items,
      dto.voucher_code,
      dto.payment_method ?? 'pix',
    );
  }
}
