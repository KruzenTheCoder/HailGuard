import { STAFF_ROLES } from "@hailguard/shared";
import { ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

import { Sidebar } from "@/components/sidebar";
import { SignOutButton } from "@/components/sign-out-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getMyPermissions } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!STAFF_ROLES.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>
              {user.email ?? "This account"} is not an administrator. Contact a HailGuard admin to
              be granted access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignOutButton className="justify-center bg-muted text-foreground hover:bg-muted/70" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const permissions = await getMyPermissions();

  return (
    <div className="flex min-h-screen">
      <Sidebar email={user.email} role={user.role} permissions={[...permissions]} />
      <main className="flex-1 overflow-x-hidden bg-muted/30">{children}</main>
    </div>
  );
}
