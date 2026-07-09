import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { SearchIcon } from "lucide-react"

import { databasesService } from "@/services/databases.service"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Pagination } from "@/components/shared/pagination"
import { PageLoader } from "@/components/shared/page-loader"
import { ErrorState } from "@/components/shared/error-state"
import { EmptyState } from "@/components/shared/empty-state"

interface CollectionBrowserProps {
  title: string
  description?: string
  database: string
  collection: string
}

export function CollectionBrowserPage({
  title,
  description,
  database,
  collection,
}: CollectionBrowserProps) {
  const [page, setPage] = React.useState(0)
  const [search, setSearch] = React.useState("")
  const pageSize = 25

  const query = useQuery({
    queryKey: ["collection", database, collection, page, search],
    queryFn: () =>
      databasesService.list(database, collection, {
        skip: page * pageSize,
        limit: pageSize,
        ...(search ? { q: search } : {}),
      }),
  })

  const columns = React.useMemo(() => {
    const first = query.data?.data?.[0]
    if (!first) return []
    return Object.keys(first).slice(0, 8)
  }, [query.data])

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Filter..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
        </div>
      </div>

      {query.isLoading ? <PageLoader /> : null}
      {query.isError ? (
        <ErrorState
          message={query.error instanceof Error ? query.error.message : "Failed to load data"}
          onRetry={() => query.refetch()}
        />
      ) : null}

      {query.isSuccess && query.data.data.length === 0 ? (
        <EmptyState title="No records found" description="Try adjusting your filters." />
      ) : null}

      {query.isSuccess && query.data.data.length > 0 ? (
        <div className="surface-card overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col}>{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.data.map((row, index) => (
                <TableRow key={String((row as Record<string, unknown>)._id ?? index)}>
                  {columns.map((col) => (
                    <TableCell key={col} className="max-w-[200px] truncate">
                      {formatCell((row as Record<string, unknown>)[col])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t p-4">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={query.data.count}
              onPageChange={setPage}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}
