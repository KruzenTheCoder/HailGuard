import { CreateUserForm } from "@/components/create-user-form";
import { PageHeader } from "@/components/page-header";
import { UserRowActions } from "@/components/user-row-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth";
import { getPortalUsers, type PortalUser } from "@/lib/user-queries";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const [me, users] = await Promise.all([getCurrentUser(), getPortalUsers()]);

  // Internal backoffice staff vs. drivers (the app's end users).
  const staff = users.filter((u) => u.role !== "driver");
  const drivers = users.filter((u) => u.role === "driver");

  return (
    <>
      <PageHeader
        title="Team & users"
        description="Manage internal staff who run the portal, and the drivers who use the app."
      />
      <div className="flex flex-col gap-6 p-8">
        <CreateUserForm />

        <UsersCard
          title="Internal staff"
          subtitle="Backoffice administrators with portal access"
          users={staff}
          meId={me?.id}
          emptyText="No staff yet — add one above."
        />

        <UsersCard
          title="Drivers"
          subtitle="App users — created here or via mobile sign-up"
          users={drivers}
          meId={me?.id}
          emptyText="No drivers registered yet."
        />
      </div>
    </>
  );
}

function UsersCard({
  title,
  subtitle,
  users,
  meId,
  emptyText,
}: {
  title: string;
  subtitle: string;
  users: PortalUser[];
  meId: string | undefined;
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Badge tone="info">{users.length}</Badge>
      </CardHeader>
      <CardContent className="p-0">
        {users.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.fullName || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
                  <TableCell>
                    <Badge tone={u.role === "driver" ? "neutral" : "info"}>{u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString("en-ZA")}
                  </TableCell>
                  <TableCell className="text-right">
                    <UserRowActions userId={u.id} role={u.role} isSelf={u.id === meId} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
