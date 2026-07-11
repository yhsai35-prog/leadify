import { Navigate, Route, Routes } from "react-router-dom";
import { UserRole } from "@bluwheelz/shared";
import { ProtectedRoute } from "./app/ProtectedRoute";
import { RoleRoute } from "./app/RoleRoute";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { DiscoveryPage } from "@/features/discovery/DiscoveryPage";
import { PipelineKanbanPage } from "@/features/pipeline/PipelineKanbanPage";
import { LeadDetailPage } from "@/features/pipeline/LeadDetailPage";
import { CompaniesListPage } from "@/features/companies/CompaniesListPage";
import { CompanyDetailPage } from "@/features/companies/CompanyDetailPage";
import { ApprovalQueuePage } from "@/features/approval/ApprovalQueuePage";
import { CampaignsPage } from "@/features/campaigns/CampaignsPage";
import { CampaignDetailPage } from "@/features/campaigns/CampaignDetailPage";
import { SimilarityPage } from "@/features/similarity/SimilarityPage";
import { LeadsFoundPage } from "@/features/leads-found/LeadsFoundPage";
import { CopilotPage } from "@/features/copilot/CopilotPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { UsersPage } from "@/features/users/UsersPage";
import { AiUsagePage } from "@/features/ai-usage/AiUsagePage";
import { LeadNurturingPage } from "@/features/lead-nurturing/LeadNurturingPage";
import { IntegrationsPage } from "@/features/integrations/IntegrationsPage";
import { ProfileSettingsPage } from "@/features/profile/ProfileSettingsPage";
import { KnowledgeBasePage } from "@/features/knowledge-base/KnowledgeBasePage";
import { LandingPage } from "@/features/landing/LandingPage";
import { TenantsPage } from "@/features/tenants/TenantsPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/discovery" element={<DiscoveryPage />} />
        <Route path="/leads-found" element={<LeadsFoundPage />} />
        <Route path="/pipeline" element={<PipelineKanbanPage />} />
        <Route path="/pipeline/:id" element={<LeadDetailPage />} />
        <Route path="/companies" element={<CompaniesListPage />} />
        <Route path="/companies/:id" element={<CompanyDetailPage />} />
        <Route path="/approval" element={<ApprovalQueuePage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
        <Route path="/similarity" element={<SimilarityPage />} />
        <Route path="/copilot" element={<CopilotPage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/profile/settings" element={<ProfileSettingsPage />} />
        <Route path="/knowledge-base" element={<KnowledgeBasePage />} />

        <Route element={<RoleRoute minRole={UserRole.ADMIN} />}>
          <Route path="/sales-activity" element={<LeadNurturingPage />} />
          <Route path="/lead-nurturing" element={<Navigate to="/sales-activity" replace />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/users" element={<UsersPage />} />
        </Route>

        <Route element={<RoleRoute minRole={UserRole.SUPER_ADMIN} />}>
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/ai-usage" element={<AiUsagePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
