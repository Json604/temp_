import { Router } from "express";
import {
  getAssessments,
  getAssessmentById,
  saveAssessment,
} from "../controllers/assessment.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", requireAuth, getAssessments);
router.get("/:id", requireAuth, getAssessmentById);
router.post("/save", requireAuth, saveAssessment);

export default router;
