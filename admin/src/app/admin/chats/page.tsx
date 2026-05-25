import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { ChatsClient } from "./chats-client";

export const dynamic = "force-dynamic";

export default async function ChatsPage() {
  await requirePermission("application:review");
  const user = await getCurrentUser();

  return (
    <>
      <PageHeader
        title="Support Queue"
        description="Assist drivers with Professional Driving Permit (PrDP), vehicle verification, and zone pass compliance issues."
      />
      <ChatsClient myUserId={user?.id ?? ""} />
    </>
  );
}
