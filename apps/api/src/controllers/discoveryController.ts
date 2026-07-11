import type { Request, Response } from "express";
import type { CompanyListQuery } from "@bluwheelz/shared";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apolloService } from "../services/apollo/apolloService.js";
import { discoveredLeadsService } from "../services/discovery/discoveredLeadsService.js";
import { companiesRepository } from "../repositories/companiesRepository.js";
import { discoveredLeadsRepository } from "../repositories/discoveredLeadsRepository.js";
import { ApiError } from "../utils/errors.js";

export const discoveryController = {
  searchApollo: asyncHandler(async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const context = { organizationId, userId: req.user!.id };

    const [companyApolloIds, discoveredApolloIds] = await Promise.all([
      companiesRepository.listApolloIds(organizationId),
      discoveredLeadsRepository.listApolloIds(organizationId),
    ]);
    const excludeApolloIds = new Set([...companyApolloIds, ...discoveredApolloIds]);

    const results = await apolloService.searchForDiscovery(req.body, context, excludeApolloIds);
    const { batchId, discoveredLeads } = await discoveredLeadsService.saveFromSearchResult(
      req.user!.organizationId,
      req.user!.id,
      req.body,
      results,
    );
    res.json({
      data: {
        ...results,
        batchId,
        discoveredLeads,
      },
    });
  }),

  importApollo: asyncHandler(async (req: Request, res: Response) => {
    const result = await apolloService.importOrganizations(req.user!.organizationId, req.body, req.user!.id);
    res.status(201).json({ data: result });
  }),

  importCsv: asyncHandler(async (req: Request, res: Response) => {
    const rows = req.body.rows as unknown[];
    if (!Array.isArray(rows) || rows.length === 0) throw ApiError.badRequest("No CSV rows provided");

    const imported = [];
    let duplicatesSkipped = 0;
    for (const row of rows) {
      const result = await apolloService.importCsvRow(req.user!.organizationId, row as never, req.user!.id);
      imported.push(result.lead);
      if (result.wasDuplicate) duplicatesSkipped += 1;
    }
    res.status(201).json({ data: { imported, duplicatesSkipped } });
  }),

  checkDuplicate: asyncHandler(async (req: Request, res: Response) => {
    const domain = req.query.domain as string;
    if (!domain) throw ApiError.badRequest("A domain query parameter is required");
    const isDuplicate = await apolloService.checkDuplicate(req.user!.organizationId, domain);
    res.json({ data: { isDuplicate } });
  }),

  listCompanies: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as CompanyListQuery;
    const { data, total } = await companiesRepository.list(req.user!.organizationId, query, query);
    res.json({ data, meta: { total, page: query.page, limit: query.limit } });
  }),
};
