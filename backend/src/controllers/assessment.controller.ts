import { Request, Response } from "express";
import * as assessmentService from "../services/assessment.service";

export async function getAssessments(req: Request, res: Response) {
  try {
    const email = req.user!.email;
    const assessments = await assessmentService.getAssessments(email);
    res.json({ assessments });
  } catch (error: any) {
    console.error("Failed to fetch assessments:", error);
    res.status(500).json({ error: "Internal error" });
  }
}

export async function getAssessmentById(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const email = req.user!.email;
    const assessment = await assessmentService.getAssessmentById(id, email);
    res.json(assessment);
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error("Failed to fetch assessment:", error);
    res.status(500).json({ error: "Internal error" });
  }
}

export async function saveAssessment(req: Request, res: Response) {
  try {
    const email = req.user!.email;
    const { inputs, results } = req.body;

    if (!inputs || !results) {
      res.status(400).json({ error: "Missing fields" });
      return;
    }

    const result = await assessmentService.saveAssessment(email, inputs, results);
    res.json(result);
  } catch (error: any) {
    console.error("Failed to save assessment (non-blocking):", error);
    res.json({ id: null });
  }
}
