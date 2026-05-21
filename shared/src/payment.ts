// Provider-agnostic payment abstraction. The concrete provider (Payfast,
// Stripe, etc.) is chosen in Phase 6 — code against this interface so the
// checkout/subscription flow does not depend on a specific gateway.

import type { PlanType } from "./types";

export interface CheckoutRequest {
  subscriptionId: string;
  vehicleId: string;
  zoneId: string;
  planType: PlanType;
  amount: number;
  currency: string;
  /** Where the provider should send the user after payment. */
  returnUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutSession {
  /** Opaque reference returned by the provider. */
  reference: string;
  /** URL to redirect/open for hosted checkout, when the provider uses one. */
  redirectUrl?: string;
  /** Provider name, e.g. "stub", "payfast", "stripe". */
  provider: string;
}

export interface PaymentResult {
  reference: string;
  status: "succeeded" | "failed" | "pending";
  raw?: unknown;
}

export interface RefundRequest {
  reference: string;
  amount?: number;
  reason?: string;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  /** Verify and normalise a provider callback/webhook payload. */
  handleCallback(payload: unknown): Promise<PaymentResult>;
  refund(req: RefundRequest): Promise<PaymentResult>;
}

/**
 * Development stub: instantly "succeeds" without contacting any gateway.
 * Lets the full subscription flow be built and tested before a real
 * provider is wired in.
 */
export class StubPaymentProvider implements PaymentProvider {
  readonly name = "stub";

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    return {
      reference: `stub_${req.subscriptionId}_${Date.now()}`,
      provider: this.name,
    };
  }

  async handleCallback(payload: unknown): Promise<PaymentResult> {
    const reference =
      typeof payload === "object" && payload !== null && "reference" in payload
        ? String((payload as { reference: unknown }).reference)
        : `stub_${Date.now()}`;
    return { reference, status: "succeeded", raw: payload };
  }

  async refund(req: RefundRequest): Promise<PaymentResult> {
    return { reference: req.reference, status: "succeeded" };
  }
}
