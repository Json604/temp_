import { Router } from "express";
import {
  getAssessments,
  getAssessmentById,
  saveAssessment,
} from "../controllers/assessment.controller";

const router = Router();

router.get("/", getAssessments);
router.get("/:id", getAssessmentById);
router.post("/save", saveAssessment);

export default router;
