# RBAC Report — oneHub Backend

_A detailed analysis of Role-Based Access Control in the `backend` service (Next.js API routes + MongoDB/Mongoose)._

---

## 1. Executive summary

The backend is a **Next.js API backoffice** (an internal "Wati" admin portal) protecting sensitive operations: tenant management, subscription control, WhatsApp Business (WABA) provisioning, billing, contact deletion, cache management, etc.

Access control is implemented as a **two-tier RBAC model**:

1. **Static role rules** — each API route hardcodes which `Role`s may call it, per HTTP method.
2. **Dynamic feature permissions** — when the static rule does not grant access, the middleware falls back to a `FeatureAccessControl` collection in MongoDB that maps a role → a list of features → `read`/`write` permissions. This lets an admin grant granular access to non-admin roles at runtime without a redeploy.

Authentication is JWT-based. The JWT carries only `{ role, email }` and is validated on every protected request. There is no separate "permissions" claim in the token — the role is the single source of truth, and everything else is derived from it (either from hardcoded rules or the DB feature table).

A secondary, unrelated auth path exists for **Retool** integrations using a shared static API key (`x-api-key`) instead of user roles.

---

## 2. The role model

Defined in `src/enums/Role.ts`:

| Role | Value | Purpose (inferred) |
|------|-------|--------------------|
| `ADMIN` | `admin` | Full access. The only role hardcoded into route rules. |
| `ENGINEER` | `engineer` | Non-admin; access only via dynamic feature grants. |
| `OPERATOR` | `operator` | Non-admin; access only via dynamic feature grants. |
| `READONLY` | `readonly` | Non-admin; intended for read access via feature grants. |
| `UNVERIFIED` | `unverified` | Default role on signup. No access until promoted. |

A type guard `isRole()` validates values coming off the JWT.

**Key finding:** across every API route, the hardcoded rules reference **only `Role.ADMIN`** (see §6). `ENGINEER`, `OPERATOR`, and `READONLY` never appear in static rules — so any access those roles have is granted **entirely** through the dynamic `FeatureAccessControl` table. In other words, without DB configuration, only `admin` can do anything.

---

## 3. The two RBAC layers

### Layer 1 — Static role rules (in code)

Each protected route declares an array of rules:

```ts
interface RbacRule {
  roles: Role[] | null;   // null == "any authenticated role"
  httpMethod: HttpMethod;
}
```

A rule pairs an HTTP method with the roles allowed to use it. Example (`api/featureAccessControl/index.ts`):

```ts
const rbacRules = [
  { roles: [Role.ADMIN], httpMethod: HttpMethod.GET },
  { roles: [Role.ADMIN], httpMethod: HttpMethod.POST },
  { roles: [Role.ADMIN], httpMethod: HttpMethod.PATCH },
];
```

`roles: null` means the rule matches **any** role (still requires a valid JWT). This is used for authenticated-but-unrestricted endpoints such as the table/column access-setting handlers, which pass `BackofficeFeature.NO_FEATURE`.

### Layer 2 — Dynamic feature permissions (in MongoDB)

Model `src/dataAccess/models/FeatureAccessControl.ts`, collection `FeatureAccessControl`:

```ts
interface IFeatureAccessControl {
  role: String;                 // unique per role
  features: {
    featureName: BackofficeFeature;
    permissions: ('read' | 'write' | 'use')[];
  }[];
}
```

Each role document lists the features it can touch and, per feature, whether it has `read` and/or `write`. When a static rule denies a caller, the middleware looks up this document for the caller's role and re-checks against the route's `featureName`.

Managed at runtime through admin-only endpoints:

- `GET/POST /api/featureAccessControl` — list all role configs / add a role config.
- `GET/PATCH /api/featureAccessControl/[Role]` — fetch / update the feature list for one role.

DAO: `src/dataAccess/FeatureAccessControlDao.ts` (`getByRole`, `updateByRole`, `getOrAddRole`, `list`, etc.). `getOrAddRole` validates the role against the `Role` enum before creating a blank config.

---

## 4. Feature catalogue (`BackofficeFeature`)

`src/enums/BackofficeFeature.ts` defines ~38 features, each a string key used both in route wiring and in the DB permission documents. Grouped by area:

- **Tenant / settings / partner data:** `MT-Tenant`, `MT-Settings`, `MT-Partner`, `Cross-Collection-Update-Tenant-And-Settings`.
- **User & access management:** `User-Role-Update`, `Create-Wati-User`, `Create-Wati-User-For-EU`, `Feature-Access-Control`.
- **Subscription / billing:** `Manage-Subscription`, `Terminate-Subscription-Logs`, `Wati-Customer-Status`, `Usage-Calculator`.
- **WABA / Meta provisioning:** `Access-To-Waba`, `Reigster-Cloud-API` _(sic)_, `Meta-Get-Phone-Number`, `Meta-Register-Number`, `Meta-Remove-Credit-Line`, `Meta-Bmid-Check`, `Meta-Otp-Code`, `Meta-Subscribed-Apps`, `Meta-Coex-Sync`, `Meta-Local-Storage`.
- **Operations:** `Clean-Cache`, `Stop-Broadcast`, `Stop-Broadcast-Retries`, `MPS-Management`, `Onboarding-Fix`, `PRM-Gateway`, `Partner-Ship-Management`.
- **Contacts / integrations:** `Delete-Contact`, `Delete-HubSpot-Contact-Mapping`.
- **Logs / tooling:** `DB-Update-Logs`, `Create-User-Logs`, `API-Explorer`, `FRT-Report`.
- **Sentinel:** `No-Feature` (used by routes that only need the static rule / any authenticated role).

---

## 5. How enforcement works (control flow)

### The core middleware — `src/middlewares/createRbacMiddleware.ts`

```ts
createRbacMiddleware(rules: RbacRule[], featureName: BackofficeFeature)
```

On each request it:

1. Reads the JWT from the **`WATI_AUTH` cookie**. If missing → `res.status(400)` then throws `unauthorized`.
2. Verifies & decodes the JWT with `JWT_SECRET`, validating the shape via `isAuthJwt` (`{ role, email }`).
3. Loads `featureAccessControlDao` from the DI container.
4. Iterates the route's `rules`:
   - **If** `httpMethod` matches **and** (`rule.roles === null` **or** `rule.roles` includes the caller's role) → attaches the user to `req.logContext.userContext` and calls `next()` (**granted**).
   - **Else** → looks up the caller's role in `FeatureAccessControl`, finds the entry for this route's `featureName`, and grants if:
     - method is `GET` and the feature has `read`, **or**
     - the feature has `write` (see finding in §8 — `write` is **not** method-gated).
5. If nothing grants access:
   - For `DELETE_CONTACT` only → responds `403 { error: 'forbidden' }`.
   - Otherwise → throws `Error('forbidden')` (surfaced by the route as a generic error, usually **HTTP 500**).

### Middleware composition — `src/utils/middlewareFlattener.ts`

Routes run middlewares sequentially, each resolving before the next:

```ts
await middlewareFlattener([
  createLogContextMiddleware(),   // trace/span IDs, request logging
  createRbacMiddleware(rules, BackofficeFeature.X),
  handler,                        // the actual business logic
])(req, res);
```

Some routes also insert `createHttpMethodMiddleware([...])` to reject unsupported methods early.

### Supporting middlewares

- **`createAllowRoleMiddleware(allowedRoles | null)`** (`createAllowRoleMiddleware.ts`) — an alternative gate that reads the JWT from the **`Authorization: Bearer` header** (not the cookie). `null` = public. Used by `/api/auth/signin` and `/api/auth/signup` with `null`, i.e. those endpoints are public.
- **`createHttpMethodMiddleware(methods)`** — rejects methods not in the allow-list before RBAC runs.
- **`createRetoolApiKeyMiddleware()`** — a completely separate auth path (see §7).
- **`createLogContextMiddleware()`** — not access control, but always paired with RBAC; it establishes trace IDs and later carries `userContext` for audit logging.

### Identity extraction — `src/utils/extractUser.ts`

After RBAC passes, handlers call `extractUserFromHeaders()` to re-parse the `WATI_AUTH` cookie and obtain `{ role, email }` for audit logs (e.g. `changedBy` in `BackofficeDbUpdateLogs`).

### JWT utilities — `src/utils/jwtUtils.ts`

`encode()` signs a validated payload; `verifyAndDecode()` verifies and re-validates shape. Both use a shared `JWT_SECRET` from env.

---

## 6. Where RBAC is used (route inventory)

RBAC is applied in **~88 route/handler files** under `src/pages/api`. Every one uses `Role.ADMIN` in its static rules. Representative mapping of route → feature:

| Area / route | Feature | Methods (admin) |
|---|---|---|
| `auth/signin`, `auth/signup` | — (public via `createAllowRoleMiddleware(null)`) | POST |
| `auth/me` | `NO_FEATURE` (roles `null`) | GET |
| `featureAccessControl`, `featureAccessControl/[Role]` | `FEATURE_ACCESS_CONTROL` | GET/POST/PATCH |
| `databases/.../adminUsers*` | `USER_ROLE_UPDATE` | GET/POST |
| `databases/.../tenants*` | `MT_TENANT` | GET/POST |
| `databases/.../settings*` | `MT_SETTINGS` | GET/POST |
| `databases/.../partner*` | `MT_PARTNER` | GET/POST |
| `databases/.../tableAccessSettings*`, `columnAccessSettings*` | `NO_FEATURE` (roles `null`) | GET/POST |
| `cleanCache` | `CLEAN_CACHE` | POST |
| `deleteContacts/tenantContactsHandler` | `DELETE_CONTACT` (returns real 403) | GET/POST |
| `deleteHubspotContactMappings` | `DELETE_HUBSPOT_CONTACT_MAPPING` | POST |
| `crossCollection/*` | `CROSS_COLLECTION_UPDATES_TENANT_AND_SETTINGS` | GET/POST |
| `manageSubscription/*` | `MANAGE_SUBSCRIPTION` | GET/POST |
| `createExtAdmin/*`, `createExtAdminForEU/*` | `CREATE_EXTERNAL_ADMIN`, `..._FOR_EU` | POST |
| `waba/*` (register, phoneNumbers, requestCode, verifyCode, getCreditLines, coexSync, subscribedApps, localStorageSettings, getBusinessIdFromWaba) | `REGISTER_CLOUD_API`, `META_*`, `ACCESS_TO_WABA` | GET/POST |
| `prmGateway/*` (customers, partners, subscriptions, create/update/delete/forceSync) | `PRM_GATEWAY` | GET/POST |
| `mpsManagement/*` | `MPS_MANAGEMENT` | GET/POST |
| `stopBroadcast`, `stopBroadcastRetries` | `STOP_BROADCAST`, `STOP_BROADCAST_RETRIES` | GET/POST |
| `onboardingFix/*` | `ONBOARDING_FIX` | POST |
| `apiExplorer` | `API_EXPLORER` | POST |
| `usageCalculator/fxRate` | `USAGE_CALCULATOR` | PUT |
| `frt/*` | `FRT_REPORT` | GET |
| `partnershipManagement/transactionHandlers` | `PARTNER_SHIP_MANAGEMENT` | GET/POST |
| `backofficeLogs/*` (10+ log viewers) | matching `*_LOGS` features | GET |
| `accessToWABA/assignUser`, `getUsers` | `ACCESS_TO_WABA` | GET/POST |

There is also a reusable helper `src/pages/api/waba/util/rbac.ts` exporting a pre-built `adminPostOnly` middleware.

---

## 7. Retool integration — separate auth path

Eight routes under `src/pages/api/retool/**` (billing credit-customers, credit-event-logs, cancel-subscription-questionnaire, settings, settings/batch-update, tenants, tenants/batch-update) do **not** use role RBAC. Instead they use `createRetoolApiKeyMiddleware()`:

- Requires header `x-api-key` matching env `RETOOL_API_KEY`.
- On success, injects a synthetic user `{ role: 'retool', email: 'retool@api' }` into `req.logContext.userContext`.
- Returns proper `401` on missing/invalid key and `500` if the key isn't configured.

This is a machine-to-machine trust boundary — any caller with the shared key gets full access to those endpoints, independent of the user role system.

---

## 8. Users, sessions & role assignment

- **Model** `src/dataAccess/models/AdminUser.ts` (collection `adminUsers`): `{ email, role, salt, passwordHash, ... }`. DTO strips `passwordHash`/`salt`.
- **Signup** (`auth/signup`, public): creates a user with `role: Role.UNVERIFIED` (via `AdminUserDao.createAdminUser`, salted+hashed password). New users therefore have **no access** until promoted.
- **Signin** (`auth/signin`, public): verifies password, then issues a JWT `{ role, email }` and sets it as an **HttpOnly cookie** `WATI_AUTH` (`Secure` outside development), `Max-Age` = 1 day, `Path=/`.
- **Role promotion:** done by editing the `adminUsers` collection through the admin DB-explorer handler `adminUsersHandler` (feature `USER_ROLE_UPDATE`). Every change is written to `BackofficeDbUpdateLogs` (old value, new value, filter, `changedBy`, timestamp) — providing an audit trail for privilege changes.

---

## 9. Observations, risks & inconsistencies

These are technical observations from reading the code, not confirmed exploits. Worth reviewing:

1. **`write` permission is not HTTP-method-gated.** In `createRbacMiddleware`, the dynamic branch grants access if `feature.permissions.includes('write')` for **any** method. A role with `write` on a feature can therefore hit `DELETE`/`PATCH`/`POST` on that route even if only mutation via one method was intended. `read` correctly restricts to `GET`.

2. **"Forbidden" usually returns HTTP 500, not 403.** Only the `DELETE_CONTACT` route returns a proper `403`. Everywhere else, denial throws `Error('forbidden')`, which route try/catch blocks convert into a generic `500 internal_server_error`. This is a correctness/observability issue (clients can't distinguish auth failure from server error), not necessarily a security hole.

3. **Non-admin roles are inert by default.** `ENGINEER`, `OPERATOR`, `READONLY` appear nowhere in static rules; they only gain access if an admin populates `FeatureAccessControl`. This centralises power in `admin` and the feature table. If that table is misconfigured, non-admins silently have either no access or unexpectedly broad access.

4. **JWT has no cryptographic expiry.** `jwtUtils.encode` calls `jsonwebtoken.sign` without `expiresIn`; the only time limit is the cookie's 1-day `Max-Age`. A leaked token remains valid indefinitely server-side (until secret rotation), since verification doesn't check `exp`.

5. **Schema vs. interface mismatch on permissions.** `IFeatureAccessControl` types permissions as `('read'|'write'|'use')[]`, but the Mongoose schema `enum` only allows `['read','write']`. A `'use'` value would fail validation, and the middleware never checks `'use'` anyway — it's dead/aspirational.

6. **Two different token transports.** `createRbacMiddleware` reads the JWT from a **cookie**; `createAllowRoleMiddleware` reads it from the **Authorization header**. They aren't interchangeable — worth keeping in mind when adding routes.

7. **`res.status(400)` before throwing on missing JWT.** Minor: the status is set but the subsequent `throw` is caught and typically re-responds `500`, so the 400 may be overwritten depending on the route's catch block.

8. **`getAll()` in `FeatureAccessControlDao` is buggy** (references an undefined `featureAccessControls` variable). It appears unused by routes (they use `list`/`getByRole`), but it's latent broken code.

9. **`NO_FEATURE` + `roles: null` = any authenticated user.** The table/column access-setting endpoints and `auth/me` are open to any valid JWT holder regardless of role. Fine for `me`; for table/column settings, confirm that exposing/mutating UI preferences to all roles is intended.

---

## 10. File reference

Core:
- `src/enums/Role.ts` — role enum + guard
- `src/enums/BackofficeFeature.ts` — feature catalogue
- `src/enums/HttpMethod.ts` — method enum
- `src/types/AuthJwt.ts` — JWT payload type + guard
- `src/middlewares/createRbacMiddleware.ts` — **primary enforcement**
- `src/middlewares/createAllowRoleMiddleware.ts` — header-based gate (auth routes)
- `src/middlewares/createHttpMethodMiddleware.ts` — method allow-list
- `src/middlewares/createRetoolApiKeyMiddleware.ts` — Retool API-key auth
- `src/middlewares/createLogContextMiddleware.ts` — logging/trace context
- `src/utils/middlewareFlattener.ts` — middleware chaining
- `src/utils/jwtUtils.ts` — sign/verify
- `src/utils/extractUser.ts` — identity from cookie

Data:
- `src/dataAccess/models/FeatureAccessControl.ts` + `src/dataAccess/FeatureAccessControlDao.ts`
- `src/dataAccess/models/AdminUser.ts` + `src/dataAccess/AdminUserDao.ts`
- `src/dataAccess/models/TableAccessSetting.ts`, `ColumnAccessSetting.ts`

Management endpoints:
- `src/pages/api/featureAccessControl/index.ts`, `.../[Role]/index.ts`
- `src/pages/api/auth/{signin,signup,me}.ts`
- `src/pages/api/databases/[database]/collections/[collection]/**` (DB-explorer handlers)
- `src/pages/api/retool/**` (API-key routes)
