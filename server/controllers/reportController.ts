import { Request, Response } from "express";
import { ReportService } from "../services/reportService";

export class ReportController {
  static async getPnL(req: Request, res: Response) {
    const { businessId, startDate, endDate } = req.query;
    try {
      const pnl = await ReportService.getProfitAndLoss(
        businessId as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(pnl);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getBalanceSheet(req: Request, res: Response) {
    const { businessId, date } = req.query;
    try {
      const bs = await ReportService.getBalanceSheet(
        businessId as string,
        new Date(date as string)
      );
      res.json(bs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getCashFlow(req: Request, res: Response) {
    const { businessId, startDate, endDate } = req.query;
    try {
      const cf = await ReportService.getCashFlow(
        businessId as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(cf);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
