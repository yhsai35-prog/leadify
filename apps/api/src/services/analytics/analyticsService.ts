import type { AnalyticsScope } from "../../utils/analyticsScope.js";
import { analyticsRepository } from "../../repositories/analyticsRepository.js";
import { campaignsRepository } from "../../repositories/campaignsRepository.js";

function ctx(organizationId: string, scope: AnalyticsScope) {
  return { organizationId, scope };
}

export const analyticsService = {
  async kpis(organizationId: string, scope: AnalyticsScope) {
    return analyticsRepository.kpis(ctx(organizationId, scope));
  },
  async campaignPerformance(organizationId: string, scope: AnalyticsScope) {
    return campaignsRepository.performanceByOrganization(organizationId, scope.userId);
  },
  async pipelineFunnel(organizationId: string, scope: AnalyticsScope) {
    return analyticsRepository.pipelineFunnel(ctx(organizationId, scope));
  },
  async industryBreakdown(organizationId: string, scope: AnalyticsScope) {
    return analyticsRepository.industryBreakdown(ctx(organizationId, scope));
  },
  async stateBreakdown(organizationId: string, scope: AnalyticsScope) {
    return analyticsRepository.stateBreakdown(ctx(organizationId, scope));
  },
  async cityBreakdown(organizationId: string, scope: AnalyticsScope) {
    return analyticsRepository.cityBreakdown(ctx(organizationId, scope));
  },
  async conversionByStage(organizationId: string, scope: AnalyticsScope) {
    return analyticsRepository.conversionByStage(ctx(organizationId, scope));
  },
  async funnelConversion(organizationId: string, scope: AnalyticsScope) {
    return analyticsRepository.funnelConversion(ctx(organizationId, scope));
  },
  async trends(organizationId: string, scope: AnalyticsScope) {
    return analyticsRepository.trends(ctx(organizationId, scope));
  },
  async actionQueue(organizationId: string, scope: AnalyticsScope, limit?: number) {
    return analyticsRepository.actionQueue(ctx(organizationId, scope), limit);
  },
  async repPerformance(organizationId: string, scope: AnalyticsScope) {
    return analyticsRepository.repPerformance(ctx(organizationId, scope));
  },
  async emailEngagement(organizationId: string, scope: AnalyticsScope) {
    return analyticsRepository.emailEngagement(ctx(organizationId, scope));
  },
  async discoveryFunnel(organizationId: string, scope: AnalyticsScope) {
    return analyticsRepository.discoveryFunnel(ctx(organizationId, scope));
  },
  async leadQuality(organizationId: string, scope: AnalyticsScope) {
    return analyticsRepository.leadQuality(ctx(organizationId, scope));
  },
};
