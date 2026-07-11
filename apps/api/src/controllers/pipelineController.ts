import type { Request, Response } from "express";
import type { AcknowledgeOutreachInput, LeadListQuery } from "@bluwheelz/shared";
import { asyncHandler } from "../utils/asyncHandler.js";
import { pipelineService } from "../services/pipeline/pipelineService.js";

export const pipelineController = {
  board: asyncHandler(async (req: Request, res: Response) => {
    const board = await pipelineService.listByStatus(req.user!.organizationId);
    res.json({ data: board });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as LeadListQuery;
    const { data, total } = await pipelineService.list(req.user!.organizationId, query, query);
    res.json({ data, meta: { total, page: query.page, limit: query.limit } });
  }),

  detail: asyncHandler(async (req: Request, res: Response) => {
    const lead = await pipelineService.getDetail(req.params.id as string);
    res.json({ data: lead });
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const lead = await pipelineService.transition(req.params.id as string, req.body.status, req.user!.id, req.body.reason);
    res.json({ data: lead });
  }),

  assign: asyncHandler(async (req: Request, res: Response) => {
    const lead = await pipelineService.assign(req.params.id as string, req.body.assignedTo);
    res.json({ data: lead });
  }),

  activities: asyncHandler(async (req: Request, res: Response) => {
    const activities = await pipelineService.getActivities(req.params.id as string);
    res.json({ data: activities });
  }),

  revealContacts: asyncHandler(async (req: Request, res: Response) => {
    const contacts = await pipelineService.revealContacts(req.user!.organizationId, req.params.id as string, req.user!.id);
    res.json({ data: contacts });
  }),

  listAcknowledgements: asyncHandler(async (req: Request, res: Response) => {
    const acks = await pipelineService.listAcknowledgements(req.params.id as string);
    res.json({ data: acks });
  }),

  acknowledgeOutreach: asyncHandler(async (req: Request, res: Response) => {
    const { channel, acknowledged } = req.body as AcknowledgeOutreachInput;
    const ack = await pipelineService.acknowledgeOutreach(
      req.params.id as string,
      req.params.contactId as string,
      channel,
      acknowledged,
      req.user!.id,
    );
    res.json({ data: ack });
  }),
};
