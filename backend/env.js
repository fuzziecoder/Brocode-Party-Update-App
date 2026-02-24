const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config();

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(10),
  PORT: z.string().optional()
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("\n❌ Invalid environment configuration:\n");

  result.error.errors.forEach((err) => {
    console.error(`- ${err.path.join(".")}: ${err.message}`);
  });

  process.exit(1); // 🔥 FAIL FAST
}

module.exports = result.data;