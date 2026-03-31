import { Request, Response } from "express";
import * as userService from "../services/user.service";

export async function getUser(req: Request, res: Response) {
  try {
    const email = req.user!.email;
    const user = await userService.getUser(email);
    res.json(user);
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error("Failed to fetch user:", error);
    res.status(500).json({ error: "Internal error" });
  }
}
