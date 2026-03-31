import { Router } from "express";
import {
  getAssessments,
  getAssessmentById,
  saveAssessment,
  deleteAssessment,
} from "../controllers/assessment.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", requireAuth, getAssessments);
router.get("/:id", requireAuth, getAssessmentById);
router.post("/save", requireAuth, saveAssessment);
router.delete("/:id", requireAuth, deleteAssessment);

export default router;
