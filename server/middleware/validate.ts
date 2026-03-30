import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { BadRequestError } from "../lib/errors";

export const validate = (schema: z.ZodTypeAny) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      return next(new BadRequestError(message));
    }
    return next(error);
  }
};
