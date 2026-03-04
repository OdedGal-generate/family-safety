import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createTables } from "./db/schema.js";
import { seedDemoData } from "./db/seed.js";
import authRoutes from "./routes/auth.js";
import groupRoutes from "./routes/groups.js";
import statusRoutes from "./routes/status.js";
import pushRoutes from "./routes/push.js";

dotenv.config();

// Initialize database
createTables();
if (process.env.NODE_ENV !== "production") {
  seedDemoData();
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/push", pushRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
