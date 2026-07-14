import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
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

const MAX_RATE_LIMIT = 200
const AUDIT_LOG_LIMIT = 50

type MpsRow = {
  id: string
  tenantId: string
  rateLimit: number
  updatedAt: string
}

type AuditLogRow = {
  id: string
  tenantId: string
  oldValue: Record<string, number>
  newValue: Record<string, number>
  executedBy: string
  createdAt: string
}

const sampleMpsRows: MpsRow[] = [
  {
    id: "1",
    tenantId: "302234",
    rateLimit: 200,
    updatedAt: "2026-06-14T00:13:12.862Z",
  },
  {
    id: "2",
    tenantId: "302020",
    rateLimit: 85,
    updatedAt: "2026-06-10T07:11:16.145Z",
  },
  {
    id: "3",
    tenantId: "302238",
    rateLimit: 500,
    updatedAt: "2026-06-09T23:23:26.901Z",
  },
  {
    id: "4",
    tenantId: "302005",
    rateLimit: 200,
    updatedAt: "2026-06-08T14:02:41.220Z",
  },
  {
    id: "5",
    tenantId: "301990",
    rateLimit: 120,
    updatedAt: "2026-06-07T09:45:03.511Z",
  },
  {
    id: "6",
    tenantId: "301875",
    rateLimit: 50,
    updatedAt: "2026-06-06T18:30:55.002Z",
  },
  {
    id: "7",
    tenantId: "301840",
    rateLimit: 200,
    updatedAt: "2026-06-05T11:19:08.774Z",
  },
  {
    id: "8",
    tenantId: "301700",
    rateLimit: 75,
    updatedAt: "2026-06-04T16:08:33.119Z",
  },
  {
    id: "9",
    tenantId: "301655",
    rateLimit: 150,
    updatedAt: "2026-06-03T08:22:47.640Z",
  },
  {
    id: "10",
    tenantId: "301520",
    rateLimit: 100,
    updatedAt: "2026-06-02T21:55:12.308Z",
  },
  {
    id: "11",
    tenantId: "301410",
    rateLimit: 200,
    updatedAt: "2026-06-01T13:40:29.917Z",
  },
  {
    id: "12",
    tenantId: "301300",
    rateLimit: 90,
    updatedAt: "2026-05-30T05:17:54.481Z",
  },
]

const sampleAuditLogs: AuditLogRow[] = [
  {
    id: "a1",
    tenantId: "9590",
    oldValue: { RateLimit: 500 },
    newValue: { RateLimit: 200 },
    executedBy: "alif@clare.ai",
    createdAt: "2026-07-06T05:44:58.930Z",
  },
  {
    id: "a2",
    tenantId: "10188070",
    oldValue: {},
    newValue: { RateLimit: 200 },
    executedBy: "alif@clare.ai",
    createdAt: "2026-07-06T05:39:19.960Z",
  },
  {
    id: "a3",
    tenantId: "302234",
    oldValue: { RateLimit: 100 },
    newValue: { RateLimit: 200 },
    executedBy: "support@clare.ai",
    createdAt: "2026-06-14T00:13:12.862Z",
  },
  {
    id: "a4",
    tenantId: "302020",
    oldValue: { RateLimit: 200 },
    newValue: { RateLimit: 85 },
    executedBy: "ops@clare.ai",
    createdAt: "2026-06-10T07:11:16.145Z",
  },
]

function formatJson(value: Record<string, number>) {
  return JSON.stringify(value)
}

export function TenantsMps() {
  const [tenantIdQuery, setTenantIdQuery] = React.useState("")
  const [appliedTenantFilter, setAppliedTenantFilter] = React.useState("")
  const [rateLimit, setRateLimit] = React.useState("0")
  const [mpsRows, setMpsRows] = React.useState<MpsRow[]>(sampleMpsRows)
  const [auditLogs, setAuditLogs] =
    React.useState<AuditLogRow[]>(sampleAuditLogs)
  const [selectedMpsIds, setSelectedMpsIds] = React.useState<Set<string>>(
    new Set()
  )
  const [selectedAuditIds, setSelectedAuditIds] = React.useState<Set<string>>(
    new Set()
  )
  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(10)

  const tenantFilter = appliedTenantFilter.trim()
  const filteredRows = tenantFilter
    ? mpsRows.filter((row) => row.tenantId.includes(tenantFilter))
    : mpsRows

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const safePageIndex = Math.min(pageIndex, pageCount - 1)
  const pageStart = safePageIndex * pageSize
  const pageRows = filteredRows.slice(pageStart, pageStart + pageSize)
  const rangeStart = filteredRows.length === 0 ? 0 : pageStart + 1
  const rangeEnd = Math.min(pageStart + pageSize, filteredRows.length)

  const parsedRateLimit = Number(rateLimit)
  const rateLimitValid =
    Number.isFinite(parsedRateLimit) &&
    parsedRateLimit > 0 &&
    parsedRateLimit <= MAX_RATE_LIMIT
  const canUpdate = selectedMpsIds.size > 0 && rateLimitValid
  const canSearch = tenantIdQuery.trim().length > 0

  const handleSearchTenant = (event?: React.FormEvent) => {
    event?.preventDefault()
    setAppliedTenantFilter(tenantIdQuery.trim())
    setPageIndex(0)
    setSelectedMpsIds(new Set())
  }

  const handleUpdateMps = () => {
    if (!canUpdate) {
      return
    }

    const nextLimit = Math.min(parsedRateLimit, MAX_RATE_LIMIT)
    const updatedAt = new Date().toISOString()
    const nextAuditEntries: AuditLogRow[] = []

    setMpsRows((current) =>
      current.map((row) => {
        if (!selectedMpsIds.has(row.id)) {
          return row
        }
        nextAuditEntries.push({
          id: `${row.id}-${updatedAt}`,
          tenantId: row.tenantId,
          oldValue: { RateLimit: row.rateLimit },
          newValue: { RateLimit: nextLimit },
          executedBy: "support@clare.ai",
          createdAt: updatedAt,
        })
        return { ...row, rateLimit: nextLimit, updatedAt }
      })
    )

    setAuditLogs((current) =>
      [...nextAuditEntries, ...current].slice(0, AUDIT_LOG_LIMIT)
    )
    setSelectedMpsIds(new Set())
  }

  const toggleMpsRow = (id: string, checked: boolean) => {
    setSelectedMpsIds((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const toggleAllMpsOnPage = (checked: boolean) => {
    setSelectedMpsIds((current) => {
      const next = new Set(current)
      for (const row of pageRows) {
        if (checked) {
          next.add(row.id)
        } else {
          next.delete(row.id)
        }
      }
      return next
    })
  }

  const toggleAuditRow = (id: string, checked: boolean) => {
    setSelectedAuditIds((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((row) => selectedMpsIds.has(row.id))
  const somePageSelected =
    pageRows.some((row) => selectedMpsIds.has(row.id)) && !allPageSelected

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 p-4 md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Tenants MPS</h1>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <form
            onSubmit={handleSearchTenant}
            className="flex w-full max-w-xs flex-col gap-3"
          >
            <Field>
              <FieldLabel htmlFor="tenant-id">Tenant ID</FieldLabel>
              <Input
                id="tenant-id"
                value={tenantIdQuery}
                onChange={(event) => setTenantIdQuery(event.target.value)}
                placeholder="Tenant ID"
              />
            </Field>
            <Button type="submit" variant="outline" className="w-fit uppercase">
              Search Tenant ID
            </Button>
          </form>

          <div className="flex w-full max-w-md flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field className="flex-1">
                <FieldLabel htmlFor="rate-limit">Rate Limit</FieldLabel>
                <Input
                  id="rate-limit"
                  type="number"
                  min={0}
                  max={MAX_RATE_LIMIT}
                  value={rateLimit}
                  onChange={(event) => setRateLimit(event.target.value)}
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="uppercase"
                  disabled={!canUpdate}
                  onClick={handleUpdateMps}
                >
                  Update MPS
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="uppercase"
                  disabled={!canSearch}
                  onClick={() => handleSearchTenant()}
                >
                  Search
                </Button>
              </div>
            </div>
            <p className="text-sm text-destructive">
              *Rate limit is up to {MAX_RATE_LIMIT} mps
            </p>
          </div>
        </div>

        <Card className="overflow-hidden py-0">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 px-4 py-3">
            <CardTitle className="text-base font-semibold">MPS</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Filter MPS"
            >
              <FilterIcon className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        allPageSelected
                          ? true
                          : somePageSelected
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={(checked) =>
                        toggleAllMpsOnPage(checked === true)
                      }
                      aria-label="Select all MPS rows on page"
                    />
                  </TableHead>
                  <TableHead>Tenant ID</TableHead>
                  <TableHead>Rate Limit</TableHead>
                  <TableHead>Updated at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No MPS records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedMpsIds.has(row.id)}
                          onCheckedChange={(checked) =>
                            toggleMpsRow(row.id, checked === true)
                          }
                          aria-label={`Select tenant ${row.tenantId}`}
                        />
                      </TableCell>
                      <TableCell>{row.tenantId}</TableCell>
                      <TableCell>{row.rateLimit}</TableCell>
                      <TableCell>{row.updatedAt}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="flex flex-col gap-3 border-t border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Label htmlFor="mps-rows-per-page" className="font-normal">
                  Rows per page:
                </Label>
                <Select
                  value={`${pageSize}`}
                  onValueChange={(value) => {
                    if (value == null) {
                      return
                    }
                    setPageSize(Number(value))
                    setPageIndex(0)
                  }}
                  items={[10, 20, 30, 50].map((size) => ({
                    label: `${size}`,
                    value: `${size}`,
                  }))}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-20"
                    id="mps-rows-per-page"
                  >
                    <SelectValue placeholder={pageSize} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    <SelectGroup>
                      {[10, 20, 30, 50].map((size) => (
                        <SelectItem key={size} value={`${size}`}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>
                  {rangeStart}-{rangeEnd} of {filteredRows.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={safePageIndex <= 0}
                    onClick={() => setPageIndex((current) => current - 1)}
                    aria-label="Previous page"
                  >
                    <ChevronLeftIcon className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={safePageIndex >= pageCount - 1}
                    onClick={() => setPageIndex((current) => current + 1)}
                    aria-label="Next page"
                  >
                    <ChevronRightIcon className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden py-0">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 px-4 py-3">
            <CardTitle className="text-base font-semibold">
              Audit log (last {AUDIT_LOG_LIMIT} logs)
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Filter audit log"
            >
              <FilterIcon className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">
                    <span className="sr-only">Select</span>
                  </TableHead>
                  <TableHead>Tenant ID</TableHead>
                  <TableHead>Old</TableHead>
                  <TableHead>New</TableHead>
                  <TableHead>Executed by</TableHead>
                  <TableHead>Created at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedAuditIds.has(log.id)}
                        onCheckedChange={(checked) =>
                          toggleAuditRow(log.id, checked === true)
                        }
                        aria-label={`Select audit log for ${log.tenantId}`}
                      />
                    </TableCell>
                    <TableCell>{log.tenantId}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatJson(log.oldValue)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatJson(log.newValue)}
                    </TableCell>
                    <TableCell>{log.executedBy}</TableCell>
                    <TableCell>{log.createdAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
