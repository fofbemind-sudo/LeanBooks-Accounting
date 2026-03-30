import { Request, Response, NextFunction } from "express";
import { ReportService } from "../services/reportService";

export class ReportController {
  static async getPnL(req: Request, res: Response, next: NextFunction) {
    const { businessId, startDate, endDate } = req.query;
    const requestId = (req as any).requestId || "unknown";

    try {
      const pnl = await ReportService.getProfitAndLoss(
        businessId as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      console.log(`[${requestId}] [REPORT_GENERATED]: P&L report generated for business ${businessId}`);
      res.json(pnl);
    } catch (error: any) {
      next(error);
    }
  }

  static async getBalanceSheet(req: Request, res: Response, next: NextFunction) {
    const { businessId, date } = req.query;
    const requestId = (req as any).requestId || "unknown";

    try {
      const bs = await ReportService.getBalanceSheet(
        businessId as string,
        new Date(date as string)
      );
      
      console.log(`[${requestId}] [REPORT_GENERATED]: Balance Sheet generated for business ${businessId}`);
      res.json(bs);
    } catch (error: any) {
      next(error);
    }
  }

  static async getCashFlow(req: Request, res: Response, next: NextFunction) {
    const { businessId, startDate, endDate } = req.query;
    const requestId = (req as any).requestId || "unknown";

    try {
      const cf = await ReportService.getCashFlow(
        businessId as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      console.log(`[${requestId}] [REPORT_GENERATED]: Cash Flow report generated for business ${businessId}`);
      res.json(cf);
    } catch (error: any) {
      next(error);
    }
  }

  static async getCashBalance(req: Request, res: Response, next: NextFunction) {
    const { businessId, date } = req.query;
    const requestId = (req as any).requestId || "unknown";

    try {
      const cash = await ReportService.getCashBalance(
        businessId as string,
        new Date(date as string)
      );
      
      console.log(`[${requestId}] [REPORT_GENERATED]: Cash Balance report generated for business ${businessId}`);
      res.json(cash);
    } catch (error: any) {
      next(error);
    }
  }
}
