// `.env.local`-ийг ачаалах тусдаа модуль. Статик import-ууд esbuild/tsx-ээр
// файлын эхэнд hoist хийгддэг тул энэ модулийг хамаарал (../src/lib/db)-аас
// ӨМНӨ импортлосноор DATABASE_URL гэх мэт орчны хувьсагчид тэдгээр
// модулиудын top-level код ажиллахаас өмнө бэлэн болсон байх баталгаатай.
import { config } from 'dotenv';
config({ path: '.env.local' });
