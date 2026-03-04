import Joi from "joi";

// ── HTML tag stripper ──
function stripHtml(str) {
  if (typeof str !== "string") return str;
  return str.replace(/<[^>]*>/g, "");
}

// ── SQLite injection guard — reject $ and { characters ──
function hasDangerousChars(val) {
  if (typeof val !== "string") return false;
  return /[${}]/.test(val);
}

function scanForDangerousChars(obj) {
  for (const val of Object.values(obj)) {
    if (typeof val === "string" && hasDangerousChars(val)) return true;
    if (val && typeof val === "object") {
      if (scanForDangerousChars(val)) return true;
    }
  }
  return false;
}

// ── Sanitize middleware — strips HTML + rejects dangerous chars ──
export function sanitize(req, res, next) {
  if (req.body && typeof req.body === "object") {
    if (scanForDangerousChars(req.body)) {
      return res.status(400).json({ error: "Invalid characters in input" });
    }
    // Strip HTML from all string fields
    for (const [key, val] of Object.entries(req.body)) {
      if (typeof val === "string") {
        req.body[key] = stripHtml(val);
      }
    }
  }
  next();
}

// ── Joi validation middleware factory ──
export function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const messages = error.details.map((d) => d.message);
      return res.status(400).json({ errors: messages });
    }
    req.body = value;
    next();
  };
}

// ── Joi schemas ──

export const schemas = {
  sendOtp: Joi.object({
    phone: Joi.string().trim().min(7).max(20).pattern(/^\+?[0-9\s\-()]+$/).required()
      .messages({ "string.pattern.base": "Invalid phone number format" }),
  }),

  verifyOtp: Joi.object({
    phone: Joi.string().trim().min(7).max(20).pattern(/^\+?[0-9\s\-()]+$/).required(),
    code: Joi.string().trim().length(6).pattern(/^[0-9]+$/).required()
      .messages({ "string.pattern.base": "Code must be 6 digits" }),
  }),

  register: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    avatar_emoji: Joi.string().max(10).optional(),
  }),

  createGroup: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    parent_group_id: Joi.number().integer().positive().optional(),
  }),

  joinGroup: Joi.object({
    code: Joi.string().trim().pattern(/^[0-9]{3}-[0-9]{3}$/).required()
      .messages({ "string.pattern.base": "Code must be in format 000-000" }),
    display_name: Joi.string().trim().min(1).max(100).required(),
    phone: Joi.string().trim().min(7).max(20).pattern(/^\+?[0-9\s\-()]+$/).required(),
    self_description: Joi.string().trim().max(200).optional().allow(""),
  }),

  reviewRequest: Joi.object({
    status: Joi.string().valid("approved", "rejected").required(),
  }),

  postStatus: Joi.object({
    group_id: Joi.number().integer().positive().required(),
    status: Joi.string().valid("safe", "need_help", "sos").required(),
    lat: Joi.number().min(-90).max(90).optional(),
    lng: Joi.number().min(-180).max(180).optional(),
    address: Joi.string().trim().max(300).optional().allow(""),
    message: Joi.string().trim().max(500).optional().allow(""),
  }),

  pushSubscribe: Joi.object({
    endpoint: Joi.string().uri().required(),
    keys: Joi.object({
      p256dh: Joi.string().required(),
      auth: Joi.string().required(),
    }).required(),
    expirationTime: Joi.any().optional(),
  }),
};
