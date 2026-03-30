import { Router } from "express";
import { EmployeeController } from "../controllers/employeeController";
import { validate } from "../middleware/validate";
import { employeeSchema } from "../lib/validation";

const router = Router();

router.post("/", validate(employeeSchema), EmployeeController.create);
router.get("/", EmployeeController.list);
router.put("/:id", validate(employeeSchema.partial()), EmployeeController.update);
router.delete("/:id", EmployeeController.delete);

export default router;
