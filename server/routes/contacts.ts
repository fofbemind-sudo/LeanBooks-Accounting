import { Router } from "express";
import { ContactController } from "../controllers/contactController";

const router = Router();

router.post("/", ContactController.create);
router.get("/", ContactController.list);
router.get("/:id", ContactController.getById);
router.put("/:id", ContactController.update);

export default router;
