import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AsaasCustomer,
  AsaasPayment,
  AsaasPixQrCode,
  CreateGatewayPaymentInput,
} from './asaas.types';

@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!this.getApiKey();
  }

  getPixDiscountPercent(): number {
    const raw = this.config.get<string>('PIX_DISCOUNT_PERCENT', '5');
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 5;
  }

  getCardMaxInstallments(): number {
    const raw = this.config.get<string>('CARD_MAX_INSTALLMENTS', '3');
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, 12) : 3;
  }

  getWebhookToken(): string | undefined {
    return (
      this.config.get<string>('ASAAS_WEBHOOK_ACCESS_TOKEN')?.trim() ||
      this.config.get<string>('ASAAS_WEBHOOK_TOKEN')?.trim() ||
      undefined
    );
  }

  private getApiKey(): string | undefined {
    return this.config.get<string>('ASAAS_API_KEY')?.trim() || undefined;
  }

  private getBaseUrl(): string {
    return (
      this.config.get<string>('ASAAS_API_URL')?.trim() ||
      'https://api.asaas.com/v3'
    ).replace(/\/$/, '');
  }

  private ensureConfigured(): string {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Pagamento online não configurado (ASAAS_API_KEY).',
      );
    }
    return apiKey;
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
    options?: { throwOnError?: boolean },
  ): Promise<{ ok: boolean; status: number; body: T }> {
    const apiKey = this.ensureConfigured();
    const url = `${this.getBaseUrl()}${path}`;

    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        access_token: apiKey,
        ...(init.headers ?? {}),
      },
    });

    const text = await response.text();
    let body: T = null as T;
    if (text) {
      try {
        body = JSON.parse(text) as T;
      } catch {
        body = text as T;
      }
    }

    if (!response.ok && options?.throwOnError !== false) {
      this.logger.error(
        `Asaas ${init.method ?? 'GET'} ${path} → ${response.status}`,
        body,
      );
      const message = this.extractErrorMessage(body, response.status);
      throw new BadGatewayException(message);
    }

    return { ok: response.ok, status: response.status, body };
  }

  extractErrorMessage(body: unknown, status: number): string {
    if (
      typeof body === 'object' &&
      body &&
      'errors' in body &&
      Array.isArray((body as { errors: Array<{ description?: string }> }).errors)
    ) {
      const joined = (body as { errors: Array<{ description?: string }> }).errors
        .map((item) => item.description)
        .filter(Boolean)
        .join(' ');
      if (joined) {
        return joined;
      }
    }
    if (
      typeof body === 'object' &&
      body &&
      'message' in body &&
      typeof (body as { message: unknown }).message === 'string'
    ) {
      return (body as { message: string }).message;
    }
    return `Falha na API Asaas (${status})`;
  }

  extractGatewayStatus(body: Record<string, unknown>): string {
    const nested = body['object'];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const st = (nested as Record<string, unknown>)['status'];
      if (typeof st === 'string') {
        return st;
      }
    }
    const st = body['status'];
    return typeof st === 'string' ? st : '';
  }

  extractGatewayPaymentId(body: Record<string, unknown>): string {
    const nested = body['object'];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const id = (nested as Record<string, unknown>)['id'];
      if (typeof id === 'string') {
        return id;
      }
    }
    const id = body['id'];
    return typeof id === 'string' ? id : '';
  }

  async findCustomerByCpfCnpj(cpfCnpj: string): Promise<AsaasCustomer | null> {
    const { body } = await this.request<{ data: AsaasCustomer[]; totalCount?: number }>(
      `/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}&limit=1`,
    );
    return body.data?.[0] ?? null;
  }

  async createCustomer(input: {
    name: string;
    email: string;
    cpfCnpj: string;
  }): Promise<AsaasCustomer> {
    const { body } = await this.request<AsaasCustomer>('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        cpfCnpj: input.cpfCnpj,
        notificationDisabled: true,
      }),
    });
    return body;
  }

  async findPaymentsByExternalReference(
    externalReference: string,
  ): Promise<AsaasPayment[]> {
    const { body } = await this.request<{ data?: AsaasPayment[] }>(
      `/payments?externalReference=${encodeURIComponent(externalReference)}`,
    );
    return Array.isArray(body.data) ? body.data : [];
  }

  async createGatewayPayment(
    input: CreateGatewayPaymentInput,
  ): Promise<Record<string, unknown>> {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateString = dueDate.toISOString().slice(0, 10);
    const installmentCount = Math.max(
      1,
      Math.floor(Number(input.installmentCount || 1) || 1),
    );

    const order: Record<string, unknown> = {
      customer: input.customerId,
      billingType: input.billingType,
      value: input.valueReais,
      dueDate: dueDateString,
      externalReference: input.externalReference,
      installmentCount,
      installmentValue: input.valueReais / installmentCount,
      creditCard: input.creditCard,
      creditCardHolderInfo: input.creditCardHolderInfo,
    };

    if (input.billingType !== 'CREDIT_CARD') {
      delete order.creditCard;
      delete order.creditCardHolderInfo;
    } else {
      if (installmentCount === 1) {
        delete order.installmentCount;
        delete order.installmentValue;
      }
      if (input.remoteIp) {
        order.remoteIp = input.remoteIp;
      }
    }

    if (installmentCount > 1) {
      delete order.value;
    }

    const { ok, body } = await this.request<Record<string, unknown>>(
      '/payments',
      {
        method: 'POST',
        body: JSON.stringify(order),
      },
      { throwOnError: false },
    );

    if (!ok) {
      const message = this.extractErrorMessage(body, 400);
      const err = new BadGatewayException(message);
      throw err;
    }

    return body;
  }

  async getPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
    const { body } = await this.request<AsaasPixQrCode>(
      `/payments/${paymentId}/pixQrCode`,
    );
    return body;
  }

  async deletePayment(paymentId: string): Promise<boolean> {
    const { ok } = await this.request<unknown>(
      `/payments/${encodeURIComponent(paymentId)}`,
      { method: 'DELETE' },
      { throwOnError: false },
    );
    return ok;
  }

  gatewayPaymentIsSettled(status: unknown): boolean {
    const st = String(status ?? '').toUpperCase();
    return (
      st === 'CONFIRMED' ||
      st === 'RECEIVED' ||
      st === 'RECEIVED_IN_CASH'
    );
  }

  gatewayPaymentIsDeletable(status: unknown): boolean {
    const st = String(status ?? '').toUpperCase();
    if (this.gatewayPaymentIsSettled(st)) {
      return false;
    }
    return (
      st === 'PENDING' ||
      st === 'OVERDUE' ||
      st === 'AWAITING_RISK_ANALYSIS'
    );
  }
}
