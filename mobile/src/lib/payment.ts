import { StubPaymentProvider, type PaymentProvider } from '@hailguard/shared';

// Swap this for a Payfast/Stripe provider in production — everything else
// depends only on the PaymentProvider interface.
export const paymentProvider: PaymentProvider = new StubPaymentProvider();
