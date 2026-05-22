import { CreateUserForm } from "@/components/create-user-form";
import { PageHeader } from "@/components/page-header";
import { UserRowActions } from "@/components/user-row-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth";
import { getPortalUsers } from "@/lib/user-queries";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const [me, users] = await Promise.all([getCurrentUser(), getPortalUsers()]);

  return (
    <>
      <PageHeader
        title="Team & users"
        description="Create portal administrators and manage driver accounts."
      />
      <div className="flex flex-col gap-6 p-8">
        <CreateUserForm />

        <Card>
          <CardContent className="p-0">
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
                      <Badge tone={u.role === "admin" ? "info" : "neutral"}>{u.role}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString("en-ZA")}
                    </TableCell>
                    <TableCell className="text-right">
                      <UserRowActions userId={u.id} role={u.role} isSelf={u.id === me?.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
