import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { contactsRepository } from "../repositories/contactsRepository.js";

export const contactsController = {
  listForCompany: asyncHandler(async (req: Request, res: Response) => {
    const contacts = await contactsRepository.listByCompany(req.params.id as string);
    res.json({ data: contacts });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const contact = await contactsRepository.create({ ...req.body, companyId: req.params.id as string });
    res.status(201).json({ data: contact });
  }),
};
