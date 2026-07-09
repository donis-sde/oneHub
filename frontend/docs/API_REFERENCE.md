# OneHub API Reference

Backend API documentation for the WATI Admin Panel (OneHub). The frontend communicates with these endpoints via REST over HTTP. **Do not modify backend routes** — this document reflects the existing implementation.

## Base URL

| Environment | URL |
|-------------|-----|
| Local (Vite proxy) | `http://localhost:5173/api` → proxied to `http://localhost:3000/api` |
| Custom | Set `VITE_API_BASE_URL` in frontend env files |

## Authentication

### Cookie-based session (primary)

Most routes require the `__wati_auth` HttpOnly cookie set by sign-in.

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/signin` | POST | Public | Sign in with email/password |
| `/api/auth/signup` | POST | Public | Create admin user |
| `/api/auth/signout` | POST | Public | Clear session cookie |
| `/api/auth/checkStatus` | GET | Public | Check if cookie is valid |
| `/api/auth/me` | GET | Cookie | Get current user |

#### Sign in

```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your-password"
}
```

**Response (200):**
```json
{
  "success": true,
  "metadata": {
    "adminUser": {
      "email": "admin@example.com",
      "role": "admin"
    }
  }
}
```

Sets cookie: `__wati_auth=<jwt>; HttpOnly; Path=/`

**Errors:** `500 { "success": false, "error": "auth_error" }`

#### Get current user

```http
GET /api/auth/me
Cookie: __wati_auth=<jwt>
```

**Response:**
```json
{
  "user": {
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### API key (Retool routes only)

Routes under `/api/retool/*` require header:

```http
x-api-key: <RETOOL_API_KEY>
```

---

## Authorization (RBAC)

After authentication, routes enforce:

1. **Role rules** — hardcoded per route (e.g. `admin` only)
2. **Feature access** — `FeatureAccessControl` collection with `read`/`write` permissions per `BackofficeFeature`

**Roles:** `admin` | `engineer` | `operator` | `readonly` | `unverified`

Missing cookie → `unauthorized` (often 500). Forbidden → `403 { "error": "forbidden" }`.

---

## Health

| Endpoint | Method | Auth | Response |
|----------|--------|------|----------|
| `/api/healthCheck` | GET | None | `{}` |
| `/api/openapi.json` | GET | None | OpenAPI 3.0 spec |

---

## WABA Tools (`/api/waba/*`, `/api/accessToWABA/*`)

| Endpoint | Method | Feature | Query/Body | Response |
|----------|--------|---------|------------|----------|
| `/api/waba/phoneNumbers` | GET | META_GET_PHONE_NUMBER | `wabaId` | `{ phoneNumbers: [] }` |
| `/api/waba/register` | POST | META_REGISTER_NUMBER | `{ phoneNumber, pinCode }` | `{ success, message }` |
| `/api/waba/requestCode` | POST | META_OTP_CODE | `{ phoneNumberId, codeMethod, language }` | `{ success, message }` |
| `/api/waba/verifyCode` | POST | META_OTP_CODE | `{ phoneNumberId, code }` | `{ success, message }` |
| `/api/waba/getCreditLines` | GET | META_REMOVE_CREDIT_LINE | `businessId` | `{ creditLines: [] }` |
| `/api/waba/getBusinessIdFromWaba` | GET | META_BMID_CHECK | `wabaId` | `{ bmid, name }` |
| `/api/waba/subscribedApps` | GET/POST | META_SUBSCRIBED_APPS | `wabaId` | apps data |
| `/api/waba/coexSync` | POST | META_COEX_SYNC | `{ phoneNumberId, syncType }` | Meta response |
| `/api/waba/localStorageSettings` | POST | META_LOCAL_STORAGE | `{ phoneNumberId, action, countryCode? }` | `{ success, raw }` |
| `/api/waba/revokeCreditLine` | GET | META_REMOVE_CREDIT_LINE | `wabaId`, `creditLineId` | `{ success }` |
| `/api/waba/getAllocationConfig` | GET | META_REMOVE_CREDIT_LINE | `creditLineId`, `clientBusinessId` | config |
| `/api/waba/revokeCreditSharing` | GET | META_REMOVE_CREDIT_LINE | `allocationConfigId` | `{ success }` |
| `/api/accessToWABA/getUsers` | GET | ACCESS_TO_WABA | — | Meta users |
| `/api/accessToWABA/assignUser` | POST | ACCESS_TO_WABA | `{ wabaId, userId }` | Meta response |

---

## Database Collections

### `GET /api/databases/{database}/collections/{collection}`

**Query:** `skip`, `limit`, plus Mongo-style filter fields.

**Response:**
```json
{
  "data": [],
  "paginator": { "skip": 0, "limit": 25 },
  "hasNext": false,
  "count": 0
}
```

**Supported collections:**

| Database | Collection | Feature |
|----------|------------|---------|
| `wati-admin` | `AdminUsers` | USER_ROLE_UPDATE |
| `wati-tenants` | `Tenants` | MT_TENANT |
| `wati-tenants` | `Settings` | MT_SETTINGS |
| `Partners` | `Partners` | MT_PARTNER |
| `wati-admin` | `TableAccessSettings` | — |
| `wati-admin` | `ColumnAccessSettings` | — |

### `POST` — Bulk update

```json
{
  "filters": [{ "field": "email", "operator": "eq", "value": "test@example.com" }],
  "editParams": {
    "field": "role",
    "newValue": "operator",
    "type": "String"
  }
}
```

**Response:** `{ "matchedCount": 1, "updatedCount": 1 }`

---

## Cross Collection

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/crossCollection/crossCollectionData` | GET | Joint tenant + settings data |
| `/api/crossCollection/crossCollectionUpdate` | POST | Bulk update across collections |

---

## Feature Access Control

| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/api/featureAccessControl` | GET | — | `FeatureAccessControlDto[]` |
| `/api/featureAccessControl` | POST | `{ role, features }` | `201 { message }` |
| `/api/featureAccessControl/{Role}` | GET | — | single role config |
| `/api/featureAccessControl/{Role}` | PATCH | `{ features }` | `{ message }` |

---

## Internal Tools

| Module | Endpoints |
|--------|-----------|
| Client Status | `GET /api/watiCustomerStatus/queryTenant`, `queryCreditCustomer`, `queryWatiStates` |
| Create Ext Admin | `POST /api/createExtAdmin`, validation GET routes |
| Create Ext Admin EU | `POST /api/createExtAdminForEU`, validation GET routes |
| Register Cloud API | `POST /api/registerCloudAPI/register`, `retryRegister`, `GET viewAuditLog` |
| Onboarding Fix | `POST /api/onboardingFix`, `GET lookup` |
| Clean Cache | `POST /api/cleanCache` — `{ clientId }` |
| Broadcast | `GET /api/getBroadcastList`, `POST /api/stopBroadcast`, `POST /api/stopBroadcastRetries` |
| Manage Subscription | `GET validateTenantId`, `POST disableTenantFeature` |
| MPS Management | `GET mps`, `PUT updateMps`, `GET auditlogs` |
| FRT Report | `GET /api/frt/frt`, `GET validateTenantId` |
| API Explorer | `POST /api/apiExplorer` — proxy to Meta API |
| Delete Contacts | `GET/POST /api/deleteContacts/tenantContactsHandler` |
| Delete HubSpot | `POST /api/deleteHubspotContactMappings` |
| Usage Calculator | `POST calculate`, `GET referenceData`, `cbFxRates`, `fxRate` |

---

## PRM Gateway (`/api/prmGateway/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `partners` | GET | List partners (paginated) |
| `createPartner` | POST | Create partner |
| `updatePartner` | POST | Update partner |
| `deletePartner` | POST | Delete partner |
| `customers` | GET | List customers (`partner_id` required) |
| `createCustomer` | POST | Create customers |
| `updateCustomer` | POST | Update customer |
| `deleteCustomer` | POST | Delete customer |
| `subscriptions` | GET | List subscriptions |
| `forceSyncPartner` | GET | Force sync |
| `forceSyncCustomer` | GET | Force sync |

---

## Partnership & Affiliate

| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/partnershipManagement/transactions` | GET/POST/PUT/DELETE | Cookie + RBAC |
| `/api/affiliatePartnerDashboard/partners` | GET | None (proxies external service) |
| `/api/affiliatePartnerDashboard/customers` | GET | None |
| `/api/affiliatePartnerDashboard/transactions` | GET | None |
| `/api/affiliatePartnerDashboard/groups` | GET | None |
| `/api/affiliatePartnerDashboard/groups/updateIsSubOnly` | POST | None |

---

## Backoffice Logs (`/api/backofficeLogs/*`)

All **GET** with `skip`, `limit`, and optional filters. Response: `{ logs: [], total: number }`.

- `getPhoneNumLogs`, `getBmidLogs`, `getOtpLogs`, `regPhoneNumLogs`
- `removeCreditLineLogs`, `backofficeDbUpdateLogs`, `createUserLogs`
- `terminateSubscriptionLogs`, `cleanCacheLogs`, `apiExplorerLogs`
- `stopBroadcastLogs`, `stopBroadcastRetriesLogs`

---

## Retool API (`/api/retool/*`)

Requires `x-api-key` header. Mirrors database DAO patterns for tenants, settings, billing.

| Endpoint | Methods |
|----------|---------|
| `/api/retool/tenants` | GET, PUT |
| `/api/retool/tenants/batch-update` | POST |
| `/api/retool/settings` | GET, PUT |
| `/api/retool/settings/batch-update` | POST |
| `/api/retool/billing/credit-customers` | GET, PUT |
| `/api/retool/billing/credit-event-logs` | GET, PUT |
| `/api/retool/cancel-subscription-questionnaire` | GET, PUT |

---

## Common Error Responses

| Status | Shape | Cause |
|--------|-------|-------|
| 400 | `{ error: "bad_request" }` | Invalid input |
| 401/500 | `unauthorized` | Missing/invalid cookie |
| 403 | `{ error: "forbidden" }` | RBAC denied |
| 405 | `{ error: "Method not allowed" }` | Wrong HTTP method |
| 500 | `{ success: false, error: "..." }` | Server error |
| 502 | Meta upstream failure | WABA proxy errors |

---

## Frontend Service Mapping

Each API module has a corresponding service in `frontend/src/services/`:

- `auth.service.ts` — Authentication
- `waba.service.ts` — WABA + Access to WABA
- `databases.service.ts` — Collection CRUD
- `prm-gateway.service.ts` — PRM Gateway
- `tools.service.ts` — All internal tools, logs, affiliate, usage calculator
- `feature-access.service.ts` — RBAC configuration
- `cross-collection.service.ts` — Cross collection updates
- `health.service.ts` — Health check + OpenAPI

All services use the centralized Axios client at `frontend/src/lib/api-client.ts` with `withCredentials: true` for cookie auth.
