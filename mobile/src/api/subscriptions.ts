import type { PlanType, SubscriptionStatus } from '@hailguard/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { paymentProvider } from '@/lib/payment';
import { supabase } from '@/lib/supabase';

type SubscriptionRow = {
  id: string;
  vehicle_id: string;
  zone_id: string;
  plan_type: PlanType;
  status: SubscriptionStatus;
  amount: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  zones: { name: string } | null;
  vehicles: { make: string; model: string; license_plate: string } | null;
};

export type SubscriptionView = {
  id: string;
  status: SubscriptionStatus;
  planType: PlanType;
  amount: number;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  zoneId: string;
  vehicleId: string;
  zoneName: string;
  vehicleLabel: string;
  licensePlate: string;
};

function mapSubscription(row: SubscriptionRow): SubscriptionView {
  return {
    id: row.id,
    status: row.status,
    planType: row.plan_type,
    amount: Number(row.amount),
    currency: row.currency,
    startDate: row.start_date,
    endDate: row.end_date,
    zoneId: row.zone_id,
    vehicleId: row.vehicle_id,
    zoneName: row.zones?.name ?? 'Unknown zone',
    vehicleLabel: row.vehicles ? `${row.vehicles.make} ${row.vehicles.model}` : 'Vehicle',
    licensePlate: row.vehicles?.license_plate ?? '',
  };
}

export const subscriptionKeys = {
  all: ['subscriptions'] as const,
};

export function useSubscriptions() {
  return useQuery({
    queryKey: subscriptionKeys.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, zones(name), vehicles(make, model, license_plate)')
        .order('created_at', { ascending: false })
        .returns<SubscriptionRow[]>();
      if (error) throw error;
      return data.map(mapSubscription);
    },
  });
}

export type CheckoutInput = {
  vehicleId: string;
  zoneId: string;
  planType: PlanType;
  amount: number;
  currency: string;
};

/**
 * Full checkout: create a pending subscription, run the (stub) payment
 * provider, then confirm + activate via the SECURITY DEFINER RPC.
 */
export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CheckoutInput) => {
      // 1. Create the pending subscription (owner insert allowed by RLS).
      const { data: sub, error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          vehicle_id: input.vehicleId,
          zone_id: input.zoneId,
          plan_type: input.planType,
          amount: input.amount,
          currency: input.currency,
          status: 'pending_payment',
        })
        .select('id')
        .single<{ id: string }>();
      if (insertError) throw insertError;

      // 2. Run the payment provider (stub succeeds instantly).
      const session = await paymentProvider.createCheckout({
        subscriptionId: sub.id,
        vehicleId: input.vehicleId,
        zoneId: input.zoneId,
        planType: input.planType,
        amount: input.amount,
        currency: input.currency,
      });

      // 3. Confirm + activate (records payment, sets dates) via RPC.
      const { error: rpcError } = await supabase.rpc('confirm_subscription_payment', {
        p_subscription_id: sub.id,
        p_provider: session.provider,
        p_reference: session.reference,
      });
      if (rpcError) throw rpcError;

      return sub.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
    },
  });
}
