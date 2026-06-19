import { BadRequestException } from '@nestjs/common';
import type { PaymentMethod } from './entities/order.entity';

export function normalizeCpfCnpj(value: string): string {
  return value.replace(/\D/g, '');
}

export function assertValidCpfCnpj(value: string): string {
  const digits = normalizeCpfCnpj(value);
  if (digits.length !== 11 && digits.length !== 14) {
    throw new BadRequestException('Informe um CPF ou CNPJ válido');
  }
  return digits;
}

export function computePaymentDiscountCents(
  totalAfterVoucherCents: number,
  paymentMethod: PaymentMethod,
  pixDiscountPercent: number,
): number {
  if (paymentMethod !== 'pix') {
    return 0;
  }
  return Math.round((totalAfterVoucherCents * pixDiscountPercent) / 100);
}

export function reaisFromCents(cents: number): number {
  return Number((cents / 100).toFixed(2));
}
