import { z } from "zod";

const envSchema = z.object({
    DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN は必須です"),
    DATABASE_URL: z.string().optional(),
    LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(7),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("❌ 環境変数が不正です:", parsed.error.format());
    process.exit(1);
}

export const env = parsed.data;
