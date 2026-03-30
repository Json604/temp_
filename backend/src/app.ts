import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { errorHandler } from "./middlewares/error.middleware";
import authRoutes from "./routes/auth.route";
import assessmentRoutes from "./routes/assessment.route";
import userRoutes from "./routes/user.route";

const app = express();

// Middleware
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/user", userRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Lemnisca API running on port ${env.PORT}`);
});

export default app;
