import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { DatabaseIcon, RefreshCwIcon } from "lucide-react"

import { astraService } from "@/services/astra.service"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function AstraDatabasesPage() {
  const [selectedDb, setSelectedDb] = React.useState<string>("")
  const [selectedTable, setSelectedTable] = React.useState<string>("")

  const databasesQuery = useQuery({
    queryKey: ["astra", "databases"],
    queryFn: astraService.listDatabases,
    retry: false,
  })

  const tablesQuery = useQuery({
    queryKey: ["astra", "tables", selectedDb],
    queryFn: () => astraService.listTables(selectedDb),
    enabled: Boolean(selectedDb),
    retry: false,
  })

  const columnsQuery = useQuery({
    queryKey: ["astra", "columns", selectedDb, selectedTable],
    queryFn: () => astraService.listColumns(selectedDb, selectedTable),
    enabled: Boolean(selectedDb && selectedTable),
    retry: false,
  })

  const databases = databasesQuery.data?.databases ?? []
  const okCount = databases.filter((d) => d.ok).length

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Astra Databases</h1>
          <p className="text-muted-foreground text-sm">
            Read-only Postgres connections for Astra Tools only
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => databasesQuery.refetch()}
          disabled={databasesQuery.isFetching}
        >
          <RefreshCwIcon className="size-3.5" />
          Refresh
        </Button>
      </div>

      <Card className="surface-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseIcon className="size-4" />
            Connection status
          </CardTitle>
          <CardDescription>
            Host {databasesQuery.data?.host ?? "—"} · user{" "}
            {databasesQuery.data?.user ?? "—"} · port{" "}
            {databasesQuery.data?.port ?? "—"} ·{" "}
            <Badge variant="secondary">read-only</Badge>
            {databases.length > 0 ? (
              <span className="ml-2">
                {okCount}/{databases.length} reachable
              </span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {databasesQuery.isLoading ? (
            <p className="text-muted-foreground text-sm">Checking databases…</p>
          ) : databasesQuery.isError ? (
            <p className="text-destructive text-sm">
              {(databasesQuery.error as Error).message}
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Database</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Latency</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {databases.map((db) => (
                    <TableRow
                      key={db.database}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedDb(db.database)
                        setSelectedTable("")
                      }}
                    >
                      <TableCell className="font-mono text-xs">
                        {db.database}
                      </TableCell>
                      <TableCell>
                        <Badge variant={db.ok ? "default" : "outline"}>
                          {db.ok ? "ok" : "error"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {db.latencyMs != null ? `${db.latencyMs} ms` : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-md truncate text-xs">
                        {db.error ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="surface-card">
          <CardHeader>
            <CardTitle>Tables</CardTitle>
            <CardDescription>
              Browse public schema tables (read-only introspection)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={selectedDb || undefined}
              onValueChange={(value) => {
                setSelectedDb(value)
                setSelectedTable("")
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a database" />
              </SelectTrigger>
              <SelectContent>
                {databases.map((db) => (
                  <SelectItem key={db.database} value={db.database}>
                    {db.database}
                    {db.ok ? "" : " (unreachable)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!selectedDb ? (
              <p className="text-muted-foreground text-sm">
                Select a database to list tables.
              </p>
            ) : tablesQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">Loading tables…</p>
            ) : tablesQuery.isError ? (
              <p className="text-destructive text-sm">
                {(tablesQuery.error as Error).message}
              </p>
            ) : (
              <div className="max-h-80 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Schema</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(tablesQuery.data?.tables ?? []).map((table) => (
                      <TableRow
                        key={`${table.table_schema}.${table.table_name}`}
                        className="cursor-pointer"
                        onClick={() => setSelectedTable(table.table_name)}
                      >
                        <TableCell className="font-mono text-xs">
                          {table.table_schema}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {table.table_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {table.table_type}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardHeader>
            <CardTitle>Columns</CardTitle>
            <CardDescription>
              {selectedDb && selectedTable
                ? `${selectedDb}.public.${selectedTable}`
                : "Select a table to inspect columns"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedTable ? (
              <p className="text-muted-foreground text-sm">
                Click a table to view columns.
              </p>
            ) : columnsQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">Loading columns…</p>
            ) : columnsQuery.isError ? (
              <p className="text-destructive text-sm">
                {(columnsQuery.error as Error).message}
              </p>
            ) : (
              <div className="max-h-80 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Nullable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(columnsQuery.data?.columns ?? []).map((col) => (
                      <TableRow key={col.column_name}>
                        <TableCell className="font-mono text-xs">
                          {col.column_name}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {col.data_type}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {col.is_nullable}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
