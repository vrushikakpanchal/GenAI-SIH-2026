import { AppLayout } from "@/components/layout/AppLayout";
import { SessionProvider, useSession } from "@/context/SessionContext";
import { canCreate, canReview, canSeeOrgAdmin } from "@/lib/utils";
import { ActivityPage } from "@/pages/ActivityPage";
import { ForgotPasswordPage, InvitePage, LoginPage, OrgSelectPage, ResetPasswordPage } from "@/pages/auth/AuthPages";
import { DashboardPage } from "@/pages/DashboardPage";
import { IntegrationsPage } from "@/pages/IntegrationsPage";
import { MembersPage } from "@/pages/MembersPage";
import { NewTransformationPage } from "@/pages/NewTransformationPage";
import { OrganizationPage, RolesPage, TeamDetailPage } from "@/pages/OrganizationPage";
import { ProvenancePage } from "@/pages/ProvenancePage";
import { ReviewQueuePage } from "@/pages/ReviewQueuePage";
import { SettingsPage } from "@/pages/SettingsPage";
import { TransformationWorkspacePage } from "@/pages/TransformationWorkspacePage";
import { WorkspacePage } from "@/pages/WorkspacePage";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

function RequireAuth() {
  const { user } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RequireRole({ allow }: { allow: (role: string) => boolean }) {
  const { user } = useSession();
  if (!user) return <Navigate to="/login" replace />;
  if (!allow(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/invite" element={<InvitePage />} />
        <Route path="/select-organization" element={<OrgSelectPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/transformations/:id" element={<TransformationWorkspacePage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/provenance" element={<ProvenancePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route element={<RequireRole allow={canCreate} />}>
              <Route path="/transformations/new" element={<NewTransformationPage />} />
            </Route>
            <Route element={<RequireRole allow={canReview} />}>
              <Route path="/review" element={<ReviewQueuePage />} />
              <Route path="/review/:id" element={<TransformationWorkspacePage />} />
            </Route>
            <Route element={<RequireRole allow={canSeeOrgAdmin} />}>
              <Route path="/organization" element={<OrganizationPage />} />
              <Route path="/organization/roles" element={<RolesPage />} />
              <Route path="/organization/:teamId" element={<TeamDetailPage />} />
              <Route path="/members" element={<MembersPage />} />
              <Route path="/integrations" element={<IntegrationsPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </SessionProvider>
  );
}
