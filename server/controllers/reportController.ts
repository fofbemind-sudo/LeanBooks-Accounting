import { Request, Response } from "express";
import { ReportService } from "../services/reportService";

export class ReportController {
  static async getPnL(req: Request, res: Response) {
    const { businessId, startDate, endDate } = req.query;
    if (!businessId || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing required parameters: businessId, startDate, endDate" });
    }
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid date format for startDate or endDate" });
    }
    try {
      const pnl = await ReportService.getProfitAndLoss(
        businessId as string,
        start,
        end
      );
      res.json(pnl);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getBalanceSheet(req: Request, res: Response) {
    const { businessId, date } = req.query;
    if (!businessId || !date) {
      return res.status(400).json({ error: "Missing required parameters: businessId, date" });
    }
    const asOfDate = new Date(date as string);
    if (isNaN(asOfDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }
    try {
      const bs = await ReportService.getBalanceSheet(
        businessId as string,
        asOfDate
      );
      res.json(bs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getCashFlow(req: Request, res: Response) {
    const { businessId, startDate, endDate } = req.query;
    if (!businessId || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing required parameters: businessId, startDate, endDate" });
    }
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid date format for startDate or endDate" });
    }
    try {
      const cf = await ReportService.getCashFlow(
        businessId as string,
        start,
        end
      );
      res.json(cf);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getTrialBalance(req: Request, res: Response) {
    const { businessId, date } = req.query;
    if (!businessId || !date) {
      return res.status(400).json({ error: "Missing required parameters: businessId, date" });
    }
    try {
      const tb = await ReportService.getTrialBalance(
        businessId as string,
        new Date(date as string)
      );
      res.json(tb);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getGeneralLedger(req: Request, res: Response) {
    const { businessId, startDate, endDate, accountId } = req.query;
    if (!businessId || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing required parameters: businessId, startDate, endDate" });
    }
    try {
      const gl = await ReportService.getGeneralLedger(
        businessId as string,
        new Date(startDate as string),
        new Date(endDate as string),
        accountId as string | undefined
      );
      res.json(gl);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getCashBalance(req: Request, res: Response) {
    const { businessId, date } = req.query;
    if (!businessId || !date) {
      return res.status(400).json({ error: "Missing required parameters: businessId, date" });
    }
    const asOfDate = new Date(date as string);
    if (isNaN(asOfDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }
    try {
      const cash = await ReportService.getCashBalance(
        businessId as string,
        asOfDate
      );
      res.json(cash);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
