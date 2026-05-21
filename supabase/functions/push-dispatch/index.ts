// HailGuard — push-dispatch Edge Function (Deno).
//
// Drains public.notification_queue and delivers each pending message to the
// recipient's registered Expo push tokens via the Expo Push API, then marks
// the row sent/failed. Uses the service role (bypasses RLS).
//
// Deploy:   supabase functions deploy push-dispatch
// Invoke:   schedule every ~2 min (Supabase scheduled functions, or pg_cron +
//           pg_net POSTing to the function URL with the service-role key).
//
// Env (set automatically for deployed functions, or via `supabase secrets`):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH = 100;

type QueueRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const { data: pending, error } = await supabase
    .from("notification_queue")
    .select("id, user_id, title, body, data")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH)
    .returns<QueueRow[]>();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  if (!pending || pending.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { "content-type": "application/json" },
    });
  }

  // Fetch tokens for all recipients in one query.
  const userIds = [...new Set(pending.map((r) => r.user_id))];
  const { data: tokenRows } = await supabase
    .from("push_tokens")
    .select("user_id, token")
    .in("user_id", userIds)
    .returns<{ user_id: string; token: string }[]>();

  const tokensByUser = new Map<string, string[]>();
  for (const t of tokenRows ?? []) {
    if (!tokensByUser.has(t.user_id)) tokensByUser.set(t.user_id, []);
    tokensByUser.get(t.user_id)!.push(t.token);
  }

  // Build Expo messages.
  const messages: { to: string; title: string; body: string; data: Record<string, unknown> }[] = [];
  for (const row of pending) {
    for (const to of tokensByUser.get(row.user_id) ?? []) {
      messages.push({ to, title: row.title, body: row.body, data: row.data });
    }
  }

  let delivered = false;
  if (messages.length > 0) {
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(messages),
      });
      delivered = res.ok;
    } catch {
      delivered = false;
    }
  } else {
    // No tokens registered for these users — treat as handled so we don't loop.
    delivered = true;
  }

  const ids = pending.map((r) => r.id);
  await supabase
    .from("notification_queue")
    .update(
      delivered
        ? { status: "sent", sent_at: new Date().toISOString() }
        : { status: "failed" }
    )
    .in("id", ids);

  return new Response(
    JSON.stringify({ processed: pending.length, messages: messages.length, delivered }),
    { headers: { "content-type": "application/json" } }
  );
});
