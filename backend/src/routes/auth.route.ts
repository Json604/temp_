import { Router } from "express";
import { handleAuth } from "../controllers/auth.controller";

const router = Router();

router.post("/", handleAuth);

export default router;
