import { z } from "zod";

const envSchema = z.object({
    DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN is required"),
    DATABASE_URL: z.string().optional(),
    // Add other environment variables here as needed
});

// Validate process.env
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.format());
    process.exit(1);
}

export const env = parsed.data;
