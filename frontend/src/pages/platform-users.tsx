import { useQuery } from "@tanstack/react-query"

import {
  PLATFORM_DEMO_PASSWORD,
  PLATFORM_USERS,
} from "@/config/platform-users"
import { databasesService } from "@/services/databases.service"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { JsonViewer } from "@/components/shared/json-viewer"

export function PlatformUsersPage() {
  const query = useQuery({
    queryKey: ["collection", "wati-admin", "AdminUsers"],
    queryFn: () =>
      databasesService.list("wati-admin", "AdminUsers", { skip: 0, limit: 100 }),
    retry: false,
  })

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin Users</h1>
        <p className="text-muted-foreground text-sm">
          Platform demo users (@clare.ai). Shared password:{" "}
          <code className="text-foreground">{PLATFORM_DEMO_PASSWORD}</code>
        </p>
      </div>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Platform users</CardTitle>
          <CardDescription>
            Available across the entire dashboard (login, Access to WABA, admin
            tools)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Tag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Password</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PLATFORM_USERS.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell className="font-mono text-xs">{user.userId}</TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.tag}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.status === "active" ? "default" : "outline"}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {PLATFORM_DEMO_PASSWORD}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle>Database AdminUsers</CardTitle>
          <CardDescription>
            Live records from `/api/databases/wati-admin/collections/AdminUsers`
          </CardDescription>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : query.isError ? (
            <p className="text-muted-foreground text-sm">
              Could not load live AdminUsers. Platform demo users above are still
              available for login after seeding.
            </p>
          ) : (
            <JsonViewer data={query.data} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
