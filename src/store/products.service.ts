import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';

const DEFAULT_PRODUCTS: Array<
  Pick<Product, 'slug' | 'name' | 'description' | 'type' | 'price_cents' | 'subscription_days'>
> = [
  {
    slug: 'kit-tsim7080g',
    name: 'Kit rastreador LT',
    description:
      'Kit completo com rastreador, antena e chip já configurados para o LIVRE TRACKER. Inclui 12 meses de uso sem mensalidade. A partir do 2º ano, renove em planos de 6 ou 12 meses por R$ 25,90/mês.',
    type: 'hardware',
    price_cents: 47880,
  },
  {
    slug: 'assinatura-mensal',
    name: 'Assinatura de Rastreamento',
    description:
      'Monitoramento em tempo real, histórico de rotas e alertas. A partir do 2º ano: planos de 6 ou 12 meses.',
    type: 'subscription',
    price_cents: 2590,
    subscription_days: 30,
  },
  {
    slug: 'renovacao-6-meses',
    name: 'Renovação 6 meses',
    description:
      'Renovação do rastreamento por 6 meses (R$ 25,90/mês). O período é somado à data de vencimento atual.',
    type: 'subscription',
    price_cents: 15540,
    subscription_days: 180,
  },
  {
    slug: 'renovacao-12-meses',
    name: 'Renovação 12 meses',
    description:
      'Renovação do rastreamento por 12 meses (R$ 19,90/mês). O período é somado à data de vencimento atual.',
    type: 'subscription',
    price_cents: 23880,
    subscription_days: 365,
  },
];

const PRODUCT_STORE_EXTRAS: Record<
  string,
  {
    compare_at_price_cents: number;
    included_months: number;
    promo_label: string;
    renewal_monthly_cents: number;
  }
> = {
  'kit-tsim7080g': {
    compare_at_price_cents: 59880,
    included_months: 12,
    promo_label: 'Promoção de lançamento',
    renewal_monthly_cents: 2590,
  },
};

/** Dias de uso incluídos na compra de cada kit (12 meses = 1 ano). */
export function getHardwareIncludedDays(slug: string): number {
  const extras = PRODUCT_STORE_EXTRAS[slug];
  if (!extras?.included_months) {
    return 0;
  }
  if (extras.included_months >= 12) {
    return 365;
  }
  return extras.included_months * 30;
}

export const RENEWAL_PLAN_SLUGS = ['renovacao-6-meses', 'renovacao-12-meses'] as const;

export function isRenewalPlanSlug(slug: string): boolean {
  return (RENEWAL_PLAN_SLUGS as readonly string[]).includes(slug);
}

export function getRenewalPlanDays(slug: string): number {
  if (slug === 'renovacao-6-meses') {
    return 180;
  }
  if (slug === 'renovacao-12-meses') {
    return 365;
  }
  return 0;
}

function monthlyPriceLabel(totalCents: number, months: number): string {
  return formatBrl(Math.round(totalCents / months));
}

export type StoreProduct = {
  slug: string;
  name: string;
  description: string;
  type: Product['type'];
  price_cents: number;
  price_label: string;
  subscription_days?: number;
  compare_at_price_cents?: number;
  compare_at_price_label?: string;
  monthly_price_label?: string;
  compare_at_monthly_label?: string;
  included_months?: number;
  promo_label?: string;
  renewal_monthly_label?: string;
};

export function enrichProductForStore(product: Product): StoreProduct {
  const extras = PRODUCT_STORE_EXTRAS[product.slug];
  const base: StoreProduct = {
    slug: product.slug,
    name: product.name,
    description: product.description,
    type: product.type,
    price_cents: product.price_cents,
    price_label: formatBrl(product.price_cents),
    subscription_days: product.subscription_days,
  };

  if (!extras) {
    return base;
  }

  return {
    ...base,
    compare_at_price_cents: extras.compare_at_price_cents,
    compare_at_price_label: formatBrl(extras.compare_at_price_cents),
    monthly_price_label: monthlyPriceLabel(product.price_cents, extras.included_months),
    compare_at_monthly_label: monthlyPriceLabel(
      extras.compare_at_price_cents,
      extras.included_months,
    ),
    included_months: extras.included_months,
    promo_label: extras.promo_label,
    renewal_monthly_label: formatBrl(extras.renewal_monthly_cents),
  };
}

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const item of DEFAULT_PRODUCTS) {
      const existing = await this.productsRepository.findOne({
        where: { slug: item.slug },
      });

      if (!existing) {
        await this.productsRepository.save(this.productsRepository.create(item));
        continue;
      }

      if (
        existing.name !== item.name ||
        existing.description !== item.description ||
        existing.price_cents !== item.price_cents
      ) {
        existing.name = item.name;
        existing.description = item.description;
        existing.price_cents = item.price_cents;
        await this.productsRepository.save(existing);
      }
    }
  }

  async findAllActive(): Promise<Product[]> {
    return this.productsRepository.find({
      where: { active: true },
      order: { type: 'ASC', price_cents: 'ASC' },
    });
  }

  async findBySlug(slug: string): Promise<Product | null> {
    return this.productsRepository.findOne({
      where: { slug, active: true },
    });
  }
}

export function formatBrl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
