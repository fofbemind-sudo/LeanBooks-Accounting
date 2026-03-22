import { Router } from "express";
import { EmployeeController } from "../controllers/employeeController";

const router = Router();

router.post("/", EmployeeController.create);
router.get("/", EmployeeController.list);

export default router;
