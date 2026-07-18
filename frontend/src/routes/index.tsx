import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { AuthProvider } from "@/contexts/auth-context"
import { ThemeCustomizationProvider } from "@/contexts/theme-customization-context"
import { AppLayout } from "@/layouts/app-layout"
import { ProtectedRoute, PublicOnlyRoute } from "@/routes/protected-route"
import { LoginPage } from "@/pages/login"
import { HomeDashboardPage } from "@/pages/home-dashboard"
import { ProfilePage, SettingsPage } from "@/pages/settings-pages"
import { CollectionBrowserPage } from "@/pages/collection-browser"
import { ActivityLogPage } from "@/pages/activity-log"
import {
  AstraChangeOwnershipPage,
  AstraCreateAdminUserPage,
  AstraDatabasesPage,
  AstraExtendTrialPage,
  AstraGetAiUsagePage,
} from "@/pages/astra-tools"
import { PlatformUsersPage } from "@/pages/platform-users"
import {
  AccessToWabaPage,
  AffiliateDashboardPage,
  ApiExplorerPage,
  BackofficeLogsPage,
  CleanCachePage,
  ClientStatusPage,
  CreateExtAdminEuPage,
  CreateExtAdminPage,
  CrossCollectionPage,
  DeleteContactsPage,
  DeleteHubspotPage,
  FeatureAccessPage,
  FrtReportPage,
  ManageSubscriptionPage,
  MpsManagementPage,
  OnboardingFixPage,
  PartnershipTransactionsPage,
  PrmGatewayPage,
  RegisterCloudApiPage,
  StopBroadcastPage,
  StopBroadcastRetriesPage,
  UsageCalculatorPage,
  WabaBusinessIdPage,
  WabaCoexSyncPage,
  WabaLocalStoragePage,
  WabaPhoneNumbersPage,
  WabaRegisterPage,
  WabaRequestCodePage,
  WabaRevokeCreditPage,
  WabaSubscribedAppsPage,
  WabaVerifyCodePage,
} from "@/pages/tool-pages"

export function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeCustomizationProvider>
          <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<HomeDashboardPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="settings" element={<SettingsPage />} />

                <Route
                  path="data/tenants"
                  element={
                    <CollectionBrowserPage
                      title="Tenants"
                      description="MT tenant collection"
                      database="wati-tenants"
                      collection="Tenants"
                    />
                  }
                />
                <Route
                  path="data/settings"
                  element={
                    <CollectionBrowserPage
                      title="Settings"
                      description="MT settings collection"
                      database="wati-tenants"
                      collection="Settings"
                    />
                  }
                />
                <Route
                  path="data/partners"
                  element={
                    <CollectionBrowserPage
                      title="Partners"
                      database="Partners"
                      collection="Partners"
                    />
                  }
                />
                <Route
                  path="data/admin-users"
                  element={<PlatformUsersPage />}
                />
                <Route path="data/cross-collection" element={<CrossCollectionPage />} />
                <Route path="admin/feature-access" element={<FeatureAccessPage />} />
                <Route path="admin/activity-log" element={<ActivityLogPage />} />

                <Route path="tools/access-to-waba" element={<AccessToWabaPage />} />
                <Route path="tools/waba/phone-numbers" element={<WabaPhoneNumbersPage />} />
                <Route path="tools/waba/business-id" element={<WabaBusinessIdPage />} />
                <Route path="tools/waba/revoke-credit" element={<WabaRevokeCreditPage />} />
                <Route path="tools/waba/subscribed-apps" element={<WabaSubscribedAppsPage />} />
                <Route path="tools/waba/register" element={<WabaRegisterPage />} />
                <Route path="tools/waba/request-code" element={<WabaRequestCodePage />} />
                <Route path="tools/waba/verify-code" element={<WabaVerifyCodePage />} />
                <Route path="tools/waba/coex-sync" element={<WabaCoexSyncPage />} />
                <Route path="tools/waba/local-storage" element={<WabaLocalStoragePage />} />
                <Route
                  path="tools/astra/create-admin-user"
                  element={<AstraCreateAdminUserPage />}
                />
                <Route
                  path="tools/astra/extend-trial"
                  element={<AstraExtendTrialPage />}
                />
                <Route
                  path="tools/astra/change-ownership"
                  element={<AstraChangeOwnershipPage />}
                />
                <Route
                  path="tools/astra/get-ai-usage"
                  element={<AstraGetAiUsagePage />}
                />
                <Route
                  path="tools/astra/databases"
                  element={<AstraDatabasesPage />}
                />
                <Route path="tools/client-status" element={<ClientStatusPage />} />
                <Route path="tools/create-ext-admin" element={<CreateExtAdminPage />} />
                <Route path="tools/create-ext-admin-eu" element={<CreateExtAdminEuPage />} />
                <Route path="tools/register-cloud-api" element={<RegisterCloudApiPage />} />
                <Route path="tools/onboarding-fix" element={<OnboardingFixPage />} />
                <Route path="tools/clean-cache" element={<CleanCachePage />} />
                <Route path="tools/stop-broadcast-retries" element={<StopBroadcastRetriesPage />} />
                <Route path="tools/stop-broadcast" element={<StopBroadcastPage />} />
                <Route path="tools/manage-subscription" element={<ManageSubscriptionPage />} />
                <Route path="tools/mps-management" element={<MpsManagementPage />} />
                <Route path="tools/frt" element={<FrtReportPage />} />
                <Route path="tools/api-explorer" element={<ApiExplorerPage />} />
                <Route path="tools/delete-contacts" element={<DeleteContactsPage />} />
                <Route path="tools/delete-hubspot" element={<DeleteHubspotPage />} />
                <Route path="tools/usage-calculator" element={<UsageCalculatorPage />} />
                <Route path="logs" element={<BackofficeLogsPage />} />

                <Route path="prm-gateway" element={<PrmGatewayPage />} />
                <Route path="partnership/transactions" element={<PartnershipTransactionsPage />} />
                <Route path="affiliate" element={<AffiliateDashboardPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ThemeCustomizationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
