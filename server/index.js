import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import dotenv from "dotenv";
import { createTables } from "./db/schema.js";
import { seedDemoData } from "./db/seed.js";
import authRoutes from "./routes/auth.js";
import groupRoutes from "./routes/groups.js";
import statusRoutes from "./routes/status.js";
import pushRoutes from "./routes/push.js";
import adminRoutes from "./routes/admin.js";
import { sanitize } from "./middleware/validate.js";

dotenv.config();

// ── JWT secret validation ──
const secret = process.env.JWT_SECRET || "";
if (secret.length < 32) {
  console.error("FATAL: JWT_SECRET must be at least 32 characters. Current length:", secret.length);
  process.exit(1);
}

// Initialize database
createTables();
if (process.env.NODE_ENV !== "production") {
  seedDemoData();
}

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security headers ──
app.use(helmet());

// ── CORS ──
app.use(cors());

// ── Body parser ──
app.use(express.json({ limit: "16kb" }));

// ── Request logging ──
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.path} ${res.statusCode} ${duration}ms`
    );
  });
  next();
});

// ── Input sanitization (HTML strip + dangerous char rejection) ──
app.use(sanitize);

// ── Rate limiting: auth routes ──
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// ── Slow down: auth routes (progressive delay after 3 attempts) ──
const authSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 3,
  delayMs: (hits) => (hits - 3) * 500,
});

// ── Rate limiting: general API ──
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// ── Health check (no rate limit) ──
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ── Routes ──
app.use("/api/auth", authSlowDown, authLimiter, authRoutes);
app.use("/api/groups", apiLimiter, groupRoutes);
app.use("/api/status", apiLimiter, statusRoutes);
app.use("/api/push", apiLimiter, pushRoutes);
app.use("/admin", adminRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
