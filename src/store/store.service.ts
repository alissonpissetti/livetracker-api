import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../auth/auth-user.interface';
import { AsaasService } from '../plugins/asaas/asaas.service';
import type { AsaasWebhookPayload } from '../plugins/asaas/asaas.types';
import { User } from '../users/entities/user.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { VouchersService } from '../vouchers/vouchers.service';
import { CheckoutDto } from './dto/checkout.dto';
import { IdentifyClientDto } from './dto/pay-order.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order, PaymentMethod } from './entities/order.entity';
import {
  assertValidCpfCnpj,
  computePaymentDiscountCents,
  reaisFromCents,
} from './payment.utils';
import { formatBrl, ProductsService, enrichProductForStore, getHardwareIncludedDays, getRenewalPlanDays, isRenewalPlanSlug, RENEWAL_PLAN_SLUGS } from './products.service';
import { RenewalCheckoutDto } from './dto/renewal-checkout.dto';

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly productsService: ProductsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly vouchersService: VouchersService,
    private readonly asaas: AsaasService,
    private readonly config: ConfigService,
  ) {}

  async listProducts() {
    const products = await this.productsService.findAllActive();
    return products
      .map((product) => enrichProductForStore(product))
      .filter((product) => !isRenewalPlanSlug(product.slug));
  }

  async listRenewalPlans() {
    const plans = [];
    for (const slug of RENEWAL_PLAN_SLUGS) {
      const product = await this.productsService.findBySlug(slug);
      if (!product) {
        continue;
      }
      const months = slug === 'renovacao-6-meses' ? 6 : 12;
      const monthlyCents = Math.round(product.price_cents / months);
      plans.push({
        slug: product.slug,
        name: product.name,
        description: product.description,
        months,
        days: getRenewalPlanDays(product.slug),
        monthly_cents: monthlyCents,
        monthly_label: formatBrl(monthlyCents),
        total_cents: product.price_cents,
        total_label: formatBrl(product.price_cents),
      });
    }
    return plans;
  }

  async createRenewalCheckout(user: AuthUser, dto: RenewalCheckoutDto) {
    if (!isRenewalPlanSlug(dto.plan_slug)) {
      throw new BadRequestException('Plano de renovação inválido');
    }

    await this.subscriptionsService.findByIdForUser(dto.subscription_id, user.id);

    const product = await this.productsService.findBySlug(dto.plan_slug);
    if (!product) {
      throw new NotFoundException('Plano de renovação não encontrado');
    }

    const orderItem = this.orderItemsRepository.create({
      product_id: product.id,
      product_slug: product.slug,
      product_name: product.name,
      quantity: 1,
      unit_price_cents: product.price_cents,
    });

    if (!this.asaas.isConfigured() && this.isCheckoutMock()) {
      return this.renewalCheckoutMock(user, dto, product, orderItem);
    }

    const order = await this.ordersRepository.save(
      this.ordersRepository.create({
        user_id: user.id,
        customer_name: user.name,
        customer_email: user.email,
        status: 'pending',
        order_type: 'renewal',
        subscription_id: dto.subscription_id,
        subtotal_cents: product.price_cents,
        discount_cents: 0,
        payment_discount_cents: 0,
        total_cents: product.price_cents,
        voucher_code: null,
        payment_status: 'pending',
        items: [orderItem],
      }),
    );

    return {
      order_id: order.id,
      status: 'pending' as const,
      order_type: 'renewal' as const,
      subscription_id: dto.subscription_id,
      plan_slug: dto.plan_slug,
      message: 'Renovação criada. Prossiga para o pagamento.',
      redirect_to: `/pagar/${order.id}`,
    };
  }

  private async renewalCheckoutMock(
    user: AuthUser,
    dto: RenewalCheckoutDto,
    product: Awaited<ReturnType<ProductsService['findBySlug']>>,
    orderItem: OrderItem,
  ) {
    if (!product) {
      throw new NotFoundException('Plano de renovação não encontrado');
    }

    const order = await this.ordersRepository.save(
      this.ordersRepository.create({
        user_id: user.id,
        customer_name: user.name,
        customer_email: user.email,
        status: 'paid',
        order_type: 'renewal',
        subscription_id: dto.subscription_id,
        subtotal_cents: product.price_cents,
        discount_cents: 0,
        payment_discount_cents: 0,
        total_cents: product.price_cents,
        payment_method: 'pix',
        payment_status: 'paid',
        paid_at: new Date(),
        items: [orderItem],
      }),
    );

    await this.fulfillOrder(order.id);

    return {
      order_id: order.id,
      status: 'paid' as const,
      order_type: 'renewal' as const,
      subscription_id: dto.subscription_id,
      plan_slug: dto.plan_slug,
      message: 'Renovação confirmada! O período do equipamento foi estendido.',
      redirect_to: '/conta',
    };
  }

  async buildCartTotals(items: CheckoutDto['items']) {
    if (!items?.length) {
      throw new BadRequestException('Informe ao menos um item no pedido');
    }

    const orderItems: OrderItem[] = [];
    let subtotalCents = 0;
    let hardwareUnits = 0;
    let subscriptionDaysTotal = 0;

    for (const item of items) {
      const product = await this.productsService.findBySlug(item.product_slug);
      if (!product) {
        throw new NotFoundException(`Produto ${item.product_slug} não encontrado`);
      }

      subtotalCents += product.price_cents * item.quantity;

      if (product.type === 'hardware') {
        hardwareUnits += item.quantity;
      }

      if (product.type === 'subscription' && product.subscription_days) {
        subscriptionDaysTotal += product.subscription_days * item.quantity;
      }

      orderItems.push(
        this.orderItemsRepository.create({
          product_id: product.id,
          product_slug: product.slug,
          product_name: product.name,
          quantity: item.quantity,
          unit_price_cents: product.price_cents,
        }),
      );
    }

    if (hardwareUnits === 0) {
      throw new BadRequestException(
        'Adicione ao menos um kit de rastreador ao pedido',
      );
    }

    return {
      orderItems,
      subtotalCents,
      hardwareUnits,
      subscriptionDaysTotal,
    };
  }

  private isCheckoutMock(): boolean {
    return (
      this.config.get<string>('CHECKOUT_MOCK', 'false').toLowerCase() === 'true'
    );
  }

  private async resolveDaysPerSlot(
    orderItems: Array<{ product_slug: string; quantity: number }>,
    hardwareUnits: number,
  ): Promise<number> {
    let totalDays = 0;

    for (const item of orderItems) {
      const product = await this.productsService.findBySlug(item.product_slug);
      if (!product) {
        continue;
      }

      if (product.type === 'subscription' && product.subscription_days) {
        totalDays += product.subscription_days * item.quantity;
      }

      if (product.type === 'hardware') {
        totalDays += getHardwareIncludedDays(product.slug) * item.quantity;
      }
    }

    if (hardwareUnits > 0 && totalDays > 0) {
      return Math.max(30, Math.round(totalDays / hardwareUnits));
    }

    return 365;
  }

  private payableAfterVoucherCents(order: Order): number {
    return Math.max(0, order.subtotal_cents - order.discount_cents);
  }

  private buildChargeQuote(payableCents: number, paymentMethod: PaymentMethod) {
    const pixDiscountPercent = this.asaas.getPixDiscountPercent();
    const paymentDiscountCents = computePaymentDiscountCents(
      payableCents,
      paymentMethod,
      pixDiscountPercent,
    );
    const totalCents = Math.max(0, payableCents - paymentDiscountCents);
    return { paymentDiscountCents, totalCents, pixDiscountPercent };
  }

  private mapOrder(order: Order) {
    const payableCents = this.payableAfterVoucherCents(order);
    return {
      id: order.id,
      status: order.status,
      order_type: order.order_type,
      subscription_id: order.subscription_id,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_cpf: order.customer_cpf,
      customer_phone: order.customer_phone,
      subtotal_cents: order.subtotal_cents,
      subtotal_label: formatBrl(order.subtotal_cents),
      discount_cents: order.discount_cents,
      discount_label:
        order.discount_cents > 0 ? formatBrl(order.discount_cents) : null,
      payment_discount_cents: order.payment_discount_cents,
      payment_discount_label:
        order.payment_discount_cents > 0
          ? formatBrl(order.payment_discount_cents)
          : null,
      payable_cents: payableCents,
      payable_label: formatBrl(payableCents),
      total_cents: order.total_cents,
      total_label: formatBrl(order.total_cents),
      voucher_code: order.voucher_code,
      installment_count: order.installment_count,
      created_at: order.created_at.toISOString(),
      items: (order.items ?? []).map((item) => ({
        product_slug: item.product_slug,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
        line_total_cents: item.unit_price_cents * item.quantity,
        line_total_label: formatBrl(item.unit_price_cents * item.quantity),
      })),
    };
  }

  async previewVoucher(
    items: CheckoutDto['items'],
    voucherCode?: string,
    paymentMethod: PaymentMethod = 'pix',
  ) {
    const cart = await this.buildCartTotals(items);

    if (!voucherCode?.trim()) {
      const quote = this.buildChargeQuote(cart.subtotalCents, paymentMethod);
      return {
        valid: false,
        subtotal_cents: cart.subtotalCents,
        discount_cents: 0,
        payment_discount_cents: quote.paymentDiscountCents,
        total_cents: quote.totalCents,
        subtotal_label: formatBrl(cart.subtotalCents),
        discount_label: formatBrl(0),
        payment_discount_label: formatBrl(quote.paymentDiscountCents),
        total_label: formatBrl(quote.totalCents),
        voucher_code: null,
        payment_method: paymentMethod,
        pix_discount_percent:
          paymentMethod === 'pix' ? quote.pixDiscountPercent : null,
        message: 'Informe um código de voucher',
      };
    }

    const voucherQuote = await this.vouchersService.quote(
      voucherCode,
      cart.subtotalCents,
    );
    const payable = Math.max(
      0,
      voucherQuote.subtotal_cents - voucherQuote.discount_cents,
    );
    const quote = this.buildChargeQuote(payable, paymentMethod);

    return {
      valid: true,
      subtotal_cents: voucherQuote.subtotal_cents,
      discount_cents: voucherQuote.discount_cents,
      payment_discount_cents: quote.paymentDiscountCents,
      total_cents: quote.totalCents,
      subtotal_label: voucherQuote.subtotal_label,
      discount_label: voucherQuote.discount_label,
      payment_discount_label: formatBrl(quote.paymentDiscountCents),
      total_label: formatBrl(quote.totalCents),
      voucher_code: voucherQuote.voucher.code,
      payment_method: paymentMethod,
      pix_discount_percent:
        paymentMethod === 'pix' ? quote.pixDiscountPercent : null,
      message: `Desconto de ${voucherQuote.discount_label} aplicado`,
    };
  }

  async checkout(user: AuthUser, dto: CheckoutDto) {
    const cart = await this.buildCartTotals(dto.items);

    let discountCents = 0;
    let voucherCode: string | null = null;

    if (dto.voucher_code?.trim()) {
      const voucherQuote = await this.vouchersService.quote(
        dto.voucher_code,
        cart.subtotalCents,
      );
      discountCents = voucherQuote.discount_cents;
      voucherCode = voucherQuote.voucher.code;
    }

    const payableCents = Math.max(0, cart.subtotalCents - discountCents);

    if (!this.asaas.isConfigured() && this.isCheckoutMock()) {
      return this.checkoutMock(user, dto, cart, discountCents, voucherCode);
    }

    const order = await this.ordersRepository.save(
      this.ordersRepository.create({
        user_id: user.id,
        customer_name: user.name,
        customer_email: user.email,
        status: 'pending',
        order_type: 'purchase',
        subtotal_cents: cart.subtotalCents,
        discount_cents: discountCents,
        payment_discount_cents: 0,
        total_cents: payableCents,
        voucher_code: voucherCode,
        payment_status: 'pending',
        items: cart.orderItems,
      }),
    );

    return {
      order_id: order.id,
      status: 'pending' as const,
      message: 'Pedido criado. Prossiga para o pagamento.',
      redirect_to: `/pagar/${order.id}`,
    };
  }

  private async checkoutMock(
    user: AuthUser,
    dto: CheckoutDto,
    cart: Awaited<ReturnType<StoreService['buildCartTotals']>>,
    discountCents: number,
    voucherCode: string | null,
  ) {
    let voucherToRedeem = null;
    if (dto.voucher_code?.trim()) {
      const voucherQuote = await this.vouchersService.quote(
        dto.voucher_code,
        cart.subtotalCents,
      );
      voucherToRedeem = voucherQuote.voucher;
    }

    const payableCents = Math.max(0, cart.subtotalCents - discountCents);
    const daysPerSlot = await this.resolveDaysPerSlot(
      cart.orderItems,
      cart.hardwareUnits,
    );

    const order = await this.ordersRepository.save(
      this.ordersRepository.create({
        user_id: user.id,
        customer_name: user.name,
        customer_email: user.email,
        status: 'paid',
        order_type: 'purchase',
        subtotal_cents: cart.subtotalCents,
        discount_cents: discountCents,
        payment_discount_cents: 0,
        total_cents: payableCents,
        voucher_code: voucherCode,
        payment_method: 'pix',
        payment_status: 'paid',
        paid_at: new Date(),
        items: cart.orderItems,
      }),
    );

    if (voucherToRedeem) {
      await this.vouchersService.redeem(voucherToRedeem);
    }

    const subscriptions = await this.subscriptionsService.createPendingSlots({
      user,
      orderId: order.id,
      quantity: cart.hardwareUnits,
      daysPerSlot,
      labelPrefix: 'Rastreador',
    });

    return {
      order_id: order.id,
      status: 'paid' as const,
      message:
        'Pedido confirmado! Quando receber cada equipamento, ative o identificador na sua conta.',
      devices_created: subscriptions.length,
      subscription_ids: subscriptions.map((item) => item.id),
      redirect_to: '/conta',
    };
  }

  async getOrderForUser(userId: string, orderId: string) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId, user_id: userId },
      relations: ['items'],
    });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }
    return this.mapOrder(order);
  }

  async identifyClient(userId: string, orderId: string, dto: IdentifyClientDto) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId, user_id: userId },
    });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }
    if (order.status !== 'pending') {
      throw new BadRequestException('Pedido não está aguardando pagamento');
    }

    const cpf = assertValidCpfCnpj(dto.cpf);
    order.customer_name = dto.name.trim();
    order.customer_email = dto.email.trim();
    order.customer_cpf = cpf;
    order.customer_phone = dto.phone.replace(/\D/g, '');
    await this.ordersRepository.save(order);

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (user) {
      user.name = dto.name.trim();
      user.email = dto.email.trim();
      user.cpf = cpf;
      user.phone = dto.phone.replace(/\D/g, '');
      await this.usersRepository.save(user);
    }

    return { ok: true };
  }

  private async ensureGatewayCustomer(order: Order, user: User): Promise<string> {
    const cpf = order.customer_cpf ?? user.cpf;
    if (!cpf) {
      throw new BadRequestException(
        'Informe seus dados de pagamento antes de continuar.',
      );
    }

    if (user.asaas_customer_id) {
      return user.asaas_customer_id;
    }

    const existing = await this.asaas.findCustomerByCpfCnpj(cpf);
    if (existing?.id) {
      user.asaas_customer_id = existing.id;
      await this.usersRepository.save(user);
      return existing.id;
    }

    const created = await this.asaas.createCustomer({
      name: order.customer_name,
      email: order.customer_email,
      cpfCnpj: cpf,
    });
    user.asaas_customer_id = created.id;
    await this.usersRepository.save(user);
    return created.id;
  }

  async payOrder(
    userId: string,
    orderId: string,
    dto: PayOrderDto,
    remoteIp?: string,
  ) {
    if (!this.asaas.isConfigured()) {
      throw new ServiceUnavailableException(
        'Pagamento online indisponível no momento.',
      );
    }

    const order = await this.ordersRepository.findOne({
      where: { id: orderId, user_id: userId },
      relations: ['items'],
    });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }
    if (order.status !== 'pending') {
      throw new BadRequestException('Este pedido já foi finalizado.');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const paymentMethod: PaymentMethod =
      dto.paymentMethod === 'creditCard' ? 'creditCard' : 'pix';
    const payableCents = this.payableAfterVoucherCents(order);
    const quote = this.buildChargeQuote(payableCents, paymentMethod);
    const installmentCount =
      paymentMethod === 'creditCard'
        ? Math.min(
            this.asaas.getCardMaxInstallments(),
            Math.max(1, Math.floor(Number(dto.installments || 1) || 1)),
          )
        : 1;

    if (paymentMethod === 'creditCard') {
      if (!dto.creditCard || !dto.creditCardHolderInfo) {
        throw new BadRequestException(
          'Informe os dados do cartão e do titular.',
        );
      }
    }

    const customerId = await this.ensureGatewayCustomer(order, user);
    const gatewayResponse = await this.asaas.createGatewayPayment({
      customerId,
      billingType: paymentMethod === 'pix' ? 'PIX' : 'CREDIT_CARD',
      valueReais: reaisFromCents(quote.totalCents),
      externalReference: order.id,
      installmentCount,
      creditCard: dto.creditCard,
      creditCardHolderInfo: dto.creditCardHolderInfo,
      remoteIp,
    });

    const gatewayStatus = this.asaas.extractGatewayStatus(gatewayResponse);
    const gatewayPaymentId = this.asaas.extractGatewayPaymentId(gatewayResponse);

    order.payment_method = paymentMethod;
    order.payment_discount_cents = quote.paymentDiscountCents;
    order.total_cents = quote.totalCents;
    order.installment_count =
      paymentMethod === 'creditCard' ? installmentCount : null;
    order.asaas_customer_id = customerId;
    order.asaas_payment_id = gatewayPaymentId || order.asaas_payment_id;
    order.payment_status = this.asaas.gatewayPaymentIsSettled(gatewayStatus)
      ? 'paid'
      : 'pending';
    await this.ordersRepository.save(order);

    if (this.asaas.gatewayPaymentIsSettled(gatewayStatus)) {
      await this.fulfillOrder(order.id);
    }

    return {
      paymentMethod,
      installments: installmentCount,
      gateway_status: gatewayStatus,
      response: gatewayResponse,
      order: await this.getOrderForUser(userId, orderId),
    };
  }

  async getPixQr(userId: string, orderId: string) {
    if (!this.asaas.isConfigured()) {
      throw new ServiceUnavailableException(
        'Pagamento online indisponível no momento.',
      );
    }

    const order = await this.ordersRepository.findOne({
      where: { id: orderId, user_id: userId },
    });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    const payments = await this.asaas.findPaymentsByExternalReference(orderId);
    const payment = payments.find((row) => row.id) ?? payments[0];
    if (!payment?.id) {
      return {
        process: false,
        data: [{ code: 1, message: 'Pagamento do pedido inexistente' }],
      };
    }

    const qrcode = await this.asaas.getPixQrCode(payment.id);
    return {
      process: true,
      data: {
        payload: qrcode.payload,
        encodedImage: qrcode.encodedImage,
        expirationDate: qrcode.expirationDate ?? null,
      },
    };
  }

  async checkPayment(userId: string, orderId: string) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId, user_id: userId },
      relations: ['items'],
    });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    if (order.status === 'paid') {
      return {
        process: true,
        data: this.mapOrder(order),
      };
    }

    if (!this.asaas.isConfigured()) {
      return {
        process: true,
        data: this.mapOrder(order),
      };
    }

    const payments = await this.asaas.findPaymentsByExternalReference(orderId);
    const paidPayment = payments.find((payment) =>
      this.asaas.gatewayPaymentIsSettled(payment.status),
    );

    if (paidPayment) {
      order.asaas_payment_id = paidPayment.id;
      await this.ordersRepository.save(order);
      await this.fulfillOrder(order.id);
      const refreshed = await this.ordersRepository.findOne({
        where: { id: orderId, user_id: userId },
        relations: ['items'],
      });
      return {
        process: true,
        data: this.mapOrder(refreshed!),
      };
    }

    return {
      process: true,
      data: this.mapOrder(order),
    };
  }

  async cancelPendingPayment(userId: string, orderId: string) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId, user_id: userId },
    });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }
    if (order.status !== 'pending') {
      throw new BadRequestException(
        'Só é possível cancelar cobrança em pedidos aguardando pagamento.',
      );
    }

    if (!this.asaas.isConfigured()) {
      throw new ServiceUnavailableException(
        'Pagamento online indisponível no momento.',
      );
    }

    const payments = await this.asaas.findPaymentsByExternalReference(orderId);
    if (payments.some((payment) => this.asaas.gatewayPaymentIsSettled(payment.status))) {
      throw new BadRequestException('Este pedido já foi pago.');
    }

    let cancelled = 0;
    for (const payment of payments) {
      if (!payment.id || !this.asaas.gatewayPaymentIsDeletable(payment.status)) {
        continue;
      }
      if (await this.asaas.deletePayment(payment.id)) {
        cancelled += 1;
      }
    }

    order.asaas_payment_id = null;
    order.payment_method = null;
    order.payment_status = 'pending';
    order.payment_discount_cents = 0;
    order.installment_count = null;
    order.total_cents = this.payableAfterVoucherCents(order);
    await this.ordersRepository.save(order);

    return { ok: true, cancelled };
  }

  async fulfillOrderByExternalReference(externalReference: string) {
    const order = await this.ordersRepository.findOne({
      where: { id: externalReference },
      relations: ['items'],
    });
    if (!order) {
      return null;
    }
    return this.fulfillOrder(order.id);
  }

  async fulfillOrderByAsaasPaymentId(paymentId: string) {
    const order = await this.ordersRepository.findOne({
      where: { asaas_payment_id: paymentId },
      relations: ['items'],
    });

    if (!order) {
      return null;
    }

    return this.fulfillOrder(order.id);
  }

  async fulfillOrder(orderId: string) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    if (order.status === 'paid') {
      return order;
    }

    if (order.order_type === 'renewal') {
      if (!order.subscription_id) {
        throw new BadRequestException('Pedido de renovação sem equipamento vinculado');
      }

      const renewalItem = order.items[0];
      const renewalDays = renewalItem
        ? getRenewalPlanDays(renewalItem.product_slug)
        : 0;

      if (renewalDays <= 0) {
        throw new BadRequestException('Plano de renovação inválido no pedido');
      }

      await this.subscriptionsService.extendPeriod(
        order.subscription_id,
        order.user_id,
        renewalDays,
      );

      order.status = 'paid';
      order.payment_status = 'paid';
      order.paid_at = new Date();
      return this.ordersRepository.save(order);
    }

    let hardwareUnits = 0;

    for (const item of order.items) {
      const product = await this.productsService.findBySlug(item.product_slug);
      if (product?.type === 'hardware') {
        hardwareUnits += item.quantity;
      }
    }

    const daysPerSlot = await this.resolveDaysPerSlot(order.items, hardwareUnits);

    if (order.voucher_code) {
      const voucher = await this.vouchersService.quote(
        order.voucher_code,
        order.subtotal_cents,
      );
      await this.vouchersService.redeem(voucher.voucher);
    }

    const user: AuthUser = {
      id: order.user_id,
      email: order.customer_email,
      name: order.customer_name,
      role: 'customer',
    };

    await this.subscriptionsService.createPendingSlots({
      user,
      orderId: order.id,
      quantity: hardwareUnits,
      daysPerSlot,
      labelPrefix: 'Rastreador',
    });

    order.status = 'paid';
    order.payment_status = 'paid';
    order.paid_at = new Date();
    return this.ordersRepository.save(order);
  }

  async handleAsaasWebhook(payload: AsaasWebhookPayload) {
    const paymentId = payload.payment?.id;
    const externalReference = payload.payment?.externalReference;

    const paidEvents = new Set(['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED']);
    if (!paidEvents.has(payload.event)) {
      return { handled: false, event: payload.event };
    }

    if (paymentId) {
      const byPayment = await this.ordersRepository.findOne({
        where: { asaas_payment_id: paymentId },
      });
      if (byPayment) {
        const fulfilled = await this.fulfillOrder(byPayment.id);
        return {
          handled: true,
          event: payload.event,
          order_id: fulfilled.id,
        };
      }
    }

    if (externalReference) {
      const fulfilled = await this.fulfillOrderByExternalReference(externalReference);
      return {
        handled: !!fulfilled,
        event: payload.event,
        order_id: fulfilled?.id ?? externalReference,
      };
    }

    return { handled: false, event: payload.event };
  }

  async listOrdersForUser(userId: string) {
    const orders = await this.ordersRepository.find({
      where: { user_id: userId },
      relations: ['items'],
      order: { created_at: 'DESC' },
    });

    return orders.map((order) => this.mapOrder(order));
  }
}
