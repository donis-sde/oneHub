import * as React from "react"
import { InfoIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type CustomerRow = {
  tenantId: string
  frontEndUrl: string
  wabaPhoneNumber: string
  subscriptionId: string
  clientEmail: string
  state: string
  stripeCustomerId: string
}

type AccountInfo = {
  phoneNumber: string
  wabaId: string
  verifiedName: string
  accountReviewStatus: string
  businessVerificationStatus: string
  codeVerificationStatus: string
  phoneConnectedStatus: string
  messagingLimitTier: string
  nameStatus: string
}

type BillingInfo = {
  subscriptionId: string
  domain: string
  currency: string
  credit: string
  email: string
  stripeCustomerId: string
}

function getSampleCustomers(query: string): CustomerRow[] {
  const id = query.trim() || "1234"
  return [
    {
      tenantId: id,
      frontEndUrl: `sample.wati.io/${id}`,
      wabaPhoneNumber: "10000000000",
      subscriptionId: "sample-sub-1234",
      clientEmail: "sampletext@example.com",
      state: "AUTOMATED_REGISTERED",
      stripeCustomerId: "cus_sample1234",
    },
  ]
}

function getSampleAccountInfo(phoneNumber: string): AccountInfo {
  return {
    phoneNumber,
    wabaId: "100000000000001",
    verifiedName: "Sample Business",
    accountReviewStatus: "APPROVED",
    businessVerificationStatus: "verified",
    codeVerificationStatus: "VERIFIED",
    phoneConnectedStatus: "CONNECTED",
    messagingLimitTier: "TIER_1K",
    nameStatus: "APPROVED",
  }
}

function getSampleBillingInfo(
  subscriptionId: string,
  email: string,
  stripeCustomerId: string
): BillingInfo {
  return {
    subscriptionId,
    domain: "sample.wati.io",
    currency: "USD",
    credit: "0.00",
    email,
    stripeCustomerId,
  }
}

export function ClientStatus() {
  const [query, setQuery] = React.useState("")
  const [customers, setCustomers] = React.useState<CustomerRow[] | null>(null)
  const [selectedPhone, setSelectedPhone] = React.useState<string | null>(null)
  const [selectedSubscription, setSelectedSubscription] = React.useState<
    string | null
  >(null)
  const [accountInfo, setAccountInfo] = React.useState<AccountInfo | null>(null)
  const [billingInfo, setBillingInfo] = React.useState<BillingInfo | null>(null)

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const results = getSampleCustomers(query)
    setCustomers(results)
    setSelectedPhone(null)
    setSelectedSubscription(null)
    setAccountInfo(null)
    setBillingInfo(null)
  }

  const handleSelectPhone = (customer: CustomerRow) => {
    setSelectedPhone(customer.wabaPhoneNumber)
    setAccountInfo(getSampleAccountInfo(customer.wabaPhoneNumber))
  }

  const handleSelectSubscription = (customer: CustomerRow) => {
    setSelectedSubscription(customer.subscriptionId)
    setBillingInfo(
      getSampleBillingInfo(
        customer.subscriptionId,
        customer.clientEmail,
        customer.stripeCustomerId
      )
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 p-4 md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Wati Customer Status
        </h1>

        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <Field className="max-w-md flex-1">
            <FieldLabel htmlFor="customer-query">Query</FieldLabel>
            <Input
              id="customer-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="1234"
            />
          </Field>
          <Button type="submit" variant="outline" className="shrink-0 uppercase">
            Search
          </Button>
        </form>
        <p className="-mt-4 text-sm text-muted-foreground">
          Check with - Email / WATI URL / Client ID / Subscription ID / Phone
          Number / WABA ID / BMID
        </p>

        {customers ? (
          <Card className="overflow-hidden py-0">
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>TenantId</TableHead>
                    <TableHead>FrontEndUrl</TableHead>
                    <TableHead>WABAPhoneNumber</TableHead>
                    <TableHead>SubscriptionId</TableHead>
                    <TableHead>ClientEmail</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>StripeCustomerId</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.tenantId}>
                      <TableCell>{customer.tenantId}</TableCell>
                      <TableCell>{customer.frontEndUrl}</TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className={cn(
                            "text-left text-primary underline-offset-2 hover:underline",
                            selectedPhone === customer.wabaPhoneNumber &&
                              "font-semibold"
                          )}
                          onClick={() => handleSelectPhone(customer)}
                        >
                          {customer.wabaPhoneNumber}
                        </button>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className={cn(
                            "text-left text-primary underline-offset-2 hover:underline",
                            selectedSubscription === customer.subscriptionId &&
                              "font-semibold"
                          )}
                          onClick={() => handleSelectSubscription(customer)}
                        >
                          {customer.subscriptionId}
                        </button>
                      </TableCell>
                      <TableCell>{customer.clientEmail}</TableCell>
                      <TableCell>{customer.state}</TableCell>
                      <TableCell>{customer.stripeCustomerId}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Account info</h2>
          <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              Select one of the WABAPhoneNumber above to view the Wati Account
              Info
            </p>
          </div>
          {accountInfo ? (
            <Card className="overflow-hidden py-0">
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>phone_number</TableHead>
                      <TableHead>waba_id</TableHead>
                      <TableHead>verified_name</TableHead>
                      <TableHead>Account Review Status</TableHead>
                      <TableHead>Business Verification Status</TableHead>
                      <TableHead>code_verification_status</TableHead>
                      <TableHead>phone_connected_status</TableHead>
                      <TableHead>messaging_limit_tier</TableHead>
                      <TableHead>name_status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>{accountInfo.phoneNumber}</TableCell>
                      <TableCell>{accountInfo.wabaId}</TableCell>
                      <TableCell>{accountInfo.verifiedName}</TableCell>
                      <TableCell>{accountInfo.accountReviewStatus}</TableCell>
                      <TableCell>
                        {accountInfo.businessVerificationStatus}
                      </TableCell>
                      <TableCell>
                        {accountInfo.codeVerificationStatus}
                      </TableCell>
                      <TableCell>{accountInfo.phoneConnectedStatus}</TableCell>
                      <TableCell>{accountInfo.messagingLimitTier}</TableCell>
                      <TableCell>{accountInfo.nameStatus}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Billing info</h2>
          <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              Select one of the SubscriptionId above to view the Wati Billing
              Info
            </p>
          </div>
          {billingInfo ? (
            <Card className="overflow-hidden py-0">
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>SubscriptionId</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Credit</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>StripeCustomerId</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>{billingInfo.subscriptionId}</TableCell>
                      <TableCell>{billingInfo.domain}</TableCell>
                      <TableCell>{billingInfo.currency}</TableCell>
                      <TableCell>{billingInfo.credit}</TableCell>
                      <TableCell>{billingInfo.email}</TableCell>
                      <TableCell>{billingInfo.stripeCustomerId}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </section>
      </div>
    </div>
  )
}
