export type AsaasBillingType = 'PIX' | 'CREDIT_CARD';

export type AsaasCustomer = {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
};

export type AsaasPayment = {
  id: string;
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  status: string;
  dueDate: string;
  invoiceUrl?: string;
  externalReference?: string;
  installmentCount?: number;
  object?: {
    status?: string;
    id?: string;
  };
};

export type AsaasPixQrCode = {
  encodedImage: string;
  payload: string;
  expirationDate?: string;
};

export type AsaasWebhookEvent =
  | 'PAYMENT_CREATED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_DELETED'
  | 'PAYMENT_REFUNDED';

export type AsaasWebhookPayload = {
  event: AsaasWebhookEvent;
  payment?: {
    id: string;
    status: string;
    externalReference?: string;
  };
};

export type AsaasCreditCardInput = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
};

export type AsaasCreditCardHolderInfo = {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  addressComplement?: string | null;
  phone: string;
  mobilePhone: string;
};

export type CreateGatewayPaymentInput = {
  customerId: string;
  billingType: AsaasBillingType;
  valueReais: number;
  externalReference: string;
  installmentCount: number;
  creditCard?: AsaasCreditCardInput;
  creditCardHolderInfo?: AsaasCreditCardHolderInfo;
  remoteIp?: string;
};
