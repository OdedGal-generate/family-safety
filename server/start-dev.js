// Dev startup wrapper — sets JWT_SECRET for local development
process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-secret-for-local-testing-only-min-32-chars";

import("./index.js");
