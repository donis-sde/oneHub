import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type PhoneResult = {
  name: string
  phoneNumberId: string
  phoneNumber: string
  qualityRating: "GREEN" | "YELLOW" | "RED"
  verificationStatus: "VERIFIED" | "EXPIRED" | "PENDING"
  lastOnboarded: string
}

type BmidResult = {
  name: string
  bmid: string
  wabaId: string
  verificationStatus: "VERIFIED" | "EXPIRED" | "PENDING"
  createdAt: string
}

type SearchResults = {
  phones: PhoneResult[]
  bmids: BmidResult[]
}

function getSampleResults(wabaId: string): SearchResults {
  const id = wabaId.trim() || "300000000000001"
  return {
    phones: [
      {
        name: "Sample Pharmacy Co",
        phoneNumberId: "100000000000001",
        phoneNumber: "+100 5550 0100",
        qualityRating: "GREEN",
        verificationStatus: "EXPIRED",
        lastOnboarded: "1/15/2026, 10:00:00 AM",
      },
      {
        name: "Demo Retail Store",
        phoneNumberId: "100000000000002",
        phoneNumber: "+100 5550 0200",
        qualityRating: "YELLOW",
        verificationStatus: "VERIFIED",
        lastOnboarded: "3/02/2026, 2:30:15 PM",
      },
    ],
    bmids: [
      {
        name: "Sample Business Manager",
        bmid: "200000000000001",
        wabaId: id === "300000000000001" ? id : "300000000000001",
        verificationStatus: "VERIFIED",
        createdAt: "11/08/2025, 9:15:42 AM",
      },
      {
        name: "Demo Agency Account",
        bmid: "200000000000002",
        wabaId: "300000000000002",
        verificationStatus: "PENDING",
        createdAt: "2/20/2026, 4:45:00 PM",
      },
    ],
  }
}

function statusColor(status: string) {
  switch (status) {
    case "VERIFIED":
    case "GREEN":
      return "text-emerald-600 dark:text-emerald-400"
    case "YELLOW":
    case "PENDING":
      return "text-amber-600 dark:text-amber-400"
    case "EXPIRED":
    case "RED":
      return "text-red-600 dark:text-red-400"
    default:
      return "text-foreground"
  }
}

function ResultField({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <p className="text-sm text-foreground">
      <span className="text-muted-foreground">{label}: </span>
      <span className={cn("font-medium", valueClassName)}>{value}</span>
    </p>
  )
}

function ResultCard({
  index,
  title,
  children,
}: {
  index: number
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="relative border-l-2 border-teal-500/70 pl-4">
      <p className="mb-2 text-sm font-semibold">
        <span className="text-sky-600 dark:text-sky-400">{index}. </span>
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

export function BmidPhoneFromWaba() {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResults | null>(null)

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    setResults(getSampleResults(query))
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 p-4 md:p-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Search BMID / Phone Number
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Search by WABA ID to look up linked business manager and WhatsApp
            phone number details.
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          className="mx-auto flex w-full max-w-xl flex-col items-center gap-4"
        >
          <Input
            id="waba-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by WABA ID..."
            className="h-11 rounded-full px-5 text-center"
            aria-label="Search by WABA ID"
          />
          <Button type="submit" className="min-w-28">
            Search
          </Button>
        </form>

        {results ? (
          <div className="grid gap-10 md:grid-cols-2 md:gap-12">
            <section className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Phone Number</h2>
                <p className="text-sm text-muted-foreground">
                  Found {results.phones.length} phone number
                  {results.phones.length === 1 ? "" : "s"} linked to this WABA
                  ID:
                </p>
              </div>
              <div className="space-y-6">
                {results.phones.map((phone, index) => (
                  <ResultCard
                    key={phone.phoneNumberId}
                    index={index + 1}
                    title={phone.name}
                  >
                    <ResultField
                      label="Phone Number ID"
                      value={phone.phoneNumberId}
                    />
                    <ResultField
                      label="Phone Number"
                      value={phone.phoneNumber}
                    />
                    <ResultField
                      label="Quality Rating"
                      value={phone.qualityRating}
                      valueClassName={statusColor(phone.qualityRating)}
                    />
                    <ResultField
                      label="Verification Status"
                      value={phone.verificationStatus}
                      valueClassName={statusColor(phone.verificationStatus)}
                    />
                    <ResultField
                      label="Last Onboarded"
                      value={phone.lastOnboarded}
                    />
                  </ResultCard>
                ))}
              </div>
            </section>

            <section className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">BMID</h2>
                <p className="text-sm text-muted-foreground">
                  Found {results.bmids.length} BMID
                  {results.bmids.length === 1 ? "" : "s"} linked to this search:
                </p>
              </div>
              <div className="space-y-6">
                {results.bmids.map((bmid, index) => (
                  <ResultCard
                    key={bmid.bmid}
                    index={index + 1}
                    title={bmid.name}
                  >
                    <ResultField label="BMID" value={bmid.bmid} />
                    <ResultField label="WABA ID" value={bmid.wabaId} />
                    <ResultField
                      label="Verification Status"
                      value={bmid.verificationStatus}
                      valueClassName={statusColor(bmid.verificationStatus)}
                    />
                    <ResultField label="Created At" value={bmid.createdAt} />
                  </ResultCard>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  )
}
