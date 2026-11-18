# MLG Шинэ жилийн урилгын тоглоом — Хэрэгжүүлэх төлөвлөгөө

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Monlogistics-ийн 100-200 ажилтан веб дээр бүртгүүлж, quiz + reaction тоглоом тоглоод, хувийн дугаартай урилгаа PNG-ээр татаж авдаг систем.

**Architecture:** Next.js App Router нэг төсөлд frontend + API. Оноо тооцох бүх логик серверт — `src/lib/*` дотор цэвэр функцүүд (DB-гүй, тусдаа тестлэгдэнэ), API route-ууд тэднийг дуудаж DB-тэй ярина. Reaction тоглоомын объектын хуваарийг сервер үүсгэж өгөөд, буцаж ирсэн tap-уудыг тэр хуваарьтай тулгаж шалгана.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Drizzle ORM, PostgreSQL (postgres.js driver), Vitest, `next/og` (ImageResponse).

**Spec:** `docs/superpowers/specs/2026-11-18-mlg-new-year-game-design.md`

## Global Constraints

- Node.js ≥ 20.9. Package manager: npm.
- Бүх хэрэглэгчид харагдах текст **монгол кирилл** үсгээр.
- Овог, нэр: зөвхөн `/^[А-ЯӨҮЁа-яөүё][А-ЯӨҮЁа-яөүё\s-]*$/u`, 2-50 тэмдэгт.
- Утас: `/^[89]\d{7}$/`.
- Урилгын код: `MLG-2026` + sequence дугаар (жишээ `MLG-202601`).
- Оролдлого: нэг бүртгэлд дээд тал нь **3**.
- Quiz: **10** асуулт, тус бүр **10,000 ms**, зөв = `100 + үлдсэн_секунд × 10`.
- Reaction: **20,000 ms**, объект **1,200 ms** амьдарна, зөв `+40`, буруу `−25`, оноо 0-ээс доош буухгүй.
- Арга хэмжээ: **2026-12-05**. Тоглоом хаагдах: **2026-12-03T23:59:59+08:00** (`GAME_CLOSES_AT`).
- Шагналтай байр: эхний **5**.
- Цагийн бүс: `Asia/Ulaanbaatar` (+08:00). Бүх timestamp DB-д `timestamptz`.
- **Оноог зөвхөн сервер тооцно.** Client-ээс ирсэн ямар ч оноонд итгэхгүй.
- Урилган дээр **хэлтэс харагдахгүй** (бүртгэл, админд үлдэнэ).
- Брэнд: улаан `#ED1C24`, хар `#221E20`. Лого `public/logo.png`.

## Review Focus

1. **Нэг утсаар зэрэг хоёр бүртгэл** — хоёр хүсэлт нэг мөчид ирэхэд нэг л бүртгэл, нэг л урилгын код үүсэх ёстой (Task 6).
2. **Сөрөг эсвэл утгагүй elapsed** — `answered_at < served_at` (цагийн зөрүү) үед оноо сөрөг болох ёсгүй, 0-д clamp хийгдэнэ (Task 3).
3. **Хэт том tap жагсаалт** — 10,000 мөртэй reaction хүсэлт серверийг зогсоохгүй, 400 буцаана (Task 4, Task 7).
4. **Нэг асуултад давхар хариулт** — хоёр дахь хариулт оноо нэмэхгүй, татгалзана (Task 7).
5. **Хаагдах мөчид дунд нь байсан оролдлого** — `start` 410 буцаана, харин аль хэдийн эхэлсэн оролдлогыг `finish` хийхийг зөвшөөрнө (Task 8).

---

## Файлын бүтэц

| Файл | Үүрэг |
|---|---|
| `src/lib/config.ts` | Тогтмолууд, орчны хувьсагч, `isGameOpen()` |
| `src/lib/validation.ts` | Нэр, утасны шалгалт + хэвийн болгох (цэвэр) |
| `src/lib/rng.ts` | Seed-тэй санамсаргүй тоо, холих (цэвэр) |
| `src/lib/quiz.ts` | Асуулт сонгох, хувилбар холих, оноо (цэвэр) |
| `src/lib/reaction.ts` | Spawn хуваарь, tap баталгаажуулалт (цэвэр) |
| `src/lib/scoring.ts` | Нийт оноо, эрэмбэ (цэвэр) |
| `src/lib/invite.ts` | Кодын формат (цэвэр) |
| `src/lib/db/schema.ts` | Drizzle хүснэгтүүд |
| `src/lib/db/index.ts` | DB холболт |
| `src/lib/repo/registrations.ts` | Бүртгэл үүсгэх/олох (DB) |
| `src/lib/repo/attempts.ts` | Оролдлогын DB үйлдлүүд |
| `src/app/api/**` | HTTP давхарга |
| `src/app/**` | UI хуудсууд |

---

## Task 1: Төсөл үүсгэх, DB схем, тестийн орчин

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`
- Create: `docker-compose.yml`, `.env.example`, `.gitignore`
- Create: `drizzle.config.ts`, `src/lib/db/schema.ts`, `src/lib/db/index.ts`
- Create: `src/lib/config.ts`, `tests/config.test.ts`

**Interfaces:**
- Consumes: —
- Produces: `db` (Drizzle instance), хүснэгтүүд `registrations`, `attempts`, `attemptAnswers`, `questions`; `isGameOpen(now: Date): boolean`, `GAME` тогтмолууд.

- [ ] **Step 1: Next.js төсөл үүсгэх**

Ажлын хавтас `mlg-new-year` дотор:

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm
```

Асуулт гарвал: Turbopack — тийм. Одоо байгаа `docs/`, `assets/` файлуудыг бүү устга (`--force` хэрэглэхгүй; create-next-app шаардвал файлуудыг түр `../mlg-docs-backup/` руу зөөгөөд буцааж оруул).

- [ ] **Step 2: Хамаарлууд суулгах**

```bash
npm i drizzle-orm postgres
npm i -D drizzle-kit vitest @vitejs/plugin-react dotenv tsx
```

- [ ] **Step 3: Локал Postgres**

`docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: mlg
      POSTGRES_PASSWORD: mlg
      POSTGRES_DB: mlg
    ports:
      - "5433:5432"
    volumes:
      - mlgdata:/var/lib/postgresql/data
volumes:
  mlgdata:
```

`.env.example`:

```
DATABASE_URL=postgres://mlg:mlg@localhost:5433/mlg
GAME_CLOSES_AT=2026-12-03T23:59:59+08:00
EVENT_DATE=2026-12-05
EVENT_TIME=18:00
EVENT_VENUE=Тодорхойлоогүй
ADMIN_PASSWORD=change-me
```

Ажиллуулах:

```bash
cp .env.example .env.local
docker compose up -d
```

- [ ] **Step 4: Vitest тохируулах**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
});
```

`tests/setup.ts`:

```ts
import { config } from 'dotenv';
config({ path: '.env.local' });
```

`package.json`-ийн `scripts`-д нэмэх:

```json
"test": "vitest run",
"test:watch": "vitest",
"db:push": "drizzle-kit push",
"db:generate": "drizzle-kit generate",
"seed": "tsx scripts/seed-questions.ts"
```

- [ ] **Step 5: `src/lib/config.ts` бичих**

```ts
export const QUIZ = {
  QUESTION_COUNT: 10,
  TIME_LIMIT_MS: 10_000,
  /** Сүлжээний саатлыг нөхөх хөнгөлөлт — серверийн хэмжсэн хугацаанаас хасна. */
  NETWORK_GRACE_MS: 800,
  BASE_POINTS: 100,
  SPEED_POINTS_PER_SECOND: 10,
} as const;

export const REACTION = {
  DURATION_MS: 20_000,
  OBJECT_LIFETIME_MS: 1_200,
  SPAWN_INTERVAL_MS: 300,
  BAD_RATIO: 0.25,
  GOOD_POINTS: 40,
  BAD_POINTS: -25,
  /** Нэг хүсэлтэд зөвшөөрөх дээд tap тоо — илүү бол 400. */
  MAX_TAPS: 400,
  /** Tap-ын цагт зөвшөөрөх хөнгөлөлт. */
  GRACE_MS: 400,
} as const;

export const GAME = {
  MAX_ATTEMPTS: 3,
  PRIZE_PLACES: 5,
  /** Үүнээс удсан in_progress оролдлого хүчингүй болно. */
  ATTEMPT_TIMEOUT_MS: 30 * 60 * 1000,
  INVITE_PREFIX: 'MLG-2026',
} as const;

export function gameClosesAt(): Date {
  const raw = process.env.GAME_CLOSES_AT;
  if (!raw) throw new Error('GAME_CLOSES_AT тохируулаагүй байна');
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new Error(`GAME_CLOSES_AT буруу: ${raw}`);
  return d;
}

export function isGameOpen(now: Date = new Date()): boolean {
  return now.getTime() <= gameClosesAt().getTime();
}

export function eventInfo() {
  return {
    date: process.env.EVENT_DATE ?? '2026-12-05',
    time: process.env.EVENT_TIME ?? '',
    venue: process.env.EVENT_VENUE ?? '',
  };
}
```

- [ ] **Step 6: `tests/config.test.ts` бичих (унах ёстой)**

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { isGameOpen, gameClosesAt } from '@/lib/config';

const ORIGINAL = process.env.GAME_CLOSES_AT;
afterEach(() => { process.env.GAME_CLOSES_AT = ORIGINAL; });

describe('isGameOpen', () => {
  it('хаагдах огнооноос өмнө нээлттэй', () => {
    process.env.GAME_CLOSES_AT = '2026-12-03T23:59:59+08:00';
    expect(isGameOpen(new Date('2026-12-01T10:00:00+08:00'))).toBe(true);
  });

  it('хаагдах огнооны дараа хаалттай', () => {
    process.env.GAME_CLOSES_AT = '2026-12-03T23:59:59+08:00';
    expect(isGameOpen(new Date('2026-12-04T00:00:01+08:00'))).toBe(false);
  });

  it('яг хаагдах мөчид нээлттэй хэвээр', () => {
    process.env.GAME_CLOSES_AT = '2026-12-03T23:59:59+08:00';
    expect(isGameOpen(new Date('2026-12-03T23:59:59+08:00'))).toBe(true);
  });

  it('GAME_CLOSES_AT буруу бол алдаа шиднэ', () => {
    process.env.GAME_CLOSES_AT = 'тийм огноо байхгүй';
    expect(() => gameClosesAt()).toThrow();
  });
});
```

- [ ] **Step 7: Тест ажиллуулж унахыг нь харах**

```bash
npm test
```

Хүлээгдэх: `Cannot find module '@/lib/config'` эсвэл PASS (Step 5-ийг аль хэдийн бичсэн бол). Хэрэв PASS бол дараагийн алхам руу.

- [ ] **Step 8: `src/lib/db/schema.ts` бичих**

```ts
import {
  pgTable, uuid, text, integer, boolean, timestamp, jsonb, serial, index,
} from 'drizzle-orm/pg-core';

export const registrations = pgTable('registrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  lastName: text('last_name').notNull(),
  firstName: text('first_name').notNull(),
  department: text('department').notNull(),
  phone: text('phone').notNull().unique(),
  inviteCode: text('invite_code').notNull().unique(),
  inviteSeq: integer('invite_seq').notNull().unique(),
  attemptsUsed: integer('attempts_used').notNull().default(0),
  bestScore: integer('best_score').notNull().default(0),
  bestFinishedAt: timestamp('best_finished_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('registrations_best_score_idx').on(t.bestScore)]);

export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  text: text('text').notNull(),
  options: jsonb('options').$type<string[]>().notNull(),
  correctIndex: integer('correct_index').notNull(),
  active: boolean('active').notNull().default(true),
});

export const attempts = pgTable('attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  registrationId: uuid('registration_id').notNull().references(() => registrations.id),
  status: text('status').$type<'in_progress' | 'completed' | 'invalid'>().notNull().default('in_progress'),
  seed: integer('seed').notNull(),
  questionIds: jsonb('question_ids').$type<number[]>().notNull(),
  quizScore: integer('quiz_score').notNull().default(0),
  reactionScore: integer('reaction_score').notNull().default(0),
  totalScore: integer('total_score').notNull().default(0),
  reactionDone: boolean('reaction_done').notNull().default(false),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
}, (t) => [index('attempts_registration_idx').on(t.registrationId)]);

export const attemptAnswers = pgTable('attempt_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  attemptId: uuid('attempt_id').notNull().references(() => attempts.id),
  questionId: integer('question_id').notNull().references(() => questions.id),
  position: integer('position').notNull(),
  optionOrder: jsonb('option_order').$type<number[]>().notNull(),
  servedAt: timestamp('served_at', { withTimezone: true }).notNull().defaultNow(),
  answeredAt: timestamp('answered_at', { withTimezone: true }),
  choiceIndex: integer('choice_index'),
  isCorrect: boolean('is_correct'),
  points: integer('points').notNull().default(0),
}, (t) => [index('attempt_answers_attempt_idx').on(t.attemptId)]);
```

> **Спекээс ялгаа:** `attempts` дээр `seed`, `question_ids`, `reaction_done` нэмэгдсэн (асуултын сонголтыг оролдлого эхлэхэд тогтоох), `spawn_schedule` хасагдсан (seed-ээс дахин тооцогдоно — DB-д хадгалах шаардлагагүй). `attempt_answers` дээр `option_order` нэмэгдсэн (холисон дарааллыг тогтоож, дахин үзүүлэхэд ижил харагдана). `registrations` дээр `best_finished_at` нэмэгдсэн (тэнцсэн үеийн эрэмбэд хэрэгтэй).

- [ ] **Step 9: `src/lib/db/index.ts` бичих**

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL тохируулаагүй байна');

const client = postgres(url, { max: 5 });
export const db = drizzle(client, { schema });
export { client };
```

`drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
config({ path: '.env.local' });

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [ ] **Step 10: Схемийг DB рүү түлхэж, sequence үүсгэх**

```bash
npm run db:push
docker compose exec -T db psql -U mlg -d mlg -c "CREATE SEQUENCE IF NOT EXISTS invite_seq_counter START 1;"
docker compose exec -T db psql -U mlg -d mlg -c "\dt"
```

Хүлээгдэх: `registrations`, `attempts`, `attempt_answers`, `questions` дөрвөн хүснэгт жагсаана.

- [ ] **Step 11: Тест ажиллуулах**

```bash
npm test
```

Хүлээгдэх: `tests/config.test.ts` дөрвөн тест PASS.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: төслийн суурь, DB схем, тестийн орчин"
```

---

## Task 2: Нэр, утасны шалгалт (цэвэр логик)

**Files:**
- Create: `src/lib/validation.ts`
- Test: `tests/validation.test.ts`

**Interfaces:**
- Consumes: —
- Produces: `normalizeName(raw: string): string`, `validateName(raw: string, field: string): Result<string>`, `validatePhone(raw: string): Result<string>`, `validateDepartment(raw: string, allowed: string[]): Result<string>`, төрөл `Result<T> = { ok: true; value: T } | { ok: false; error: string }`

- [ ] **Step 1: Унах тест бичих**

`tests/validation.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizeName, validateName, validatePhone, validateDepartment } from '@/lib/validation';

describe('normalizeName', () => {
  it('илүүдэл зай арилгана', () => {
    expect(normalizeName('  бат   болд ')).toBe('Бат болд');
  });
  it('эхний үсгийг томоор болгоно', () => {
    expect(normalizeName('ганбат')).toBe('Ганбат');
  });
  it('аль хэдийн том байвал хэвээр', () => {
    expect(normalizeName('Ганбат')).toBe('Ганбат');
  });
});

describe('validateName', () => {
  it('кирилл нэрийг зөвшөөрнө', () => {
    const r = validateName('ганбат', 'Нэр');
    expect(r).toEqual({ ok: true, value: 'Ганбат' });
  });

  it('өвөрмөц монгол үсгийг зөвшөөрнө', () => {
    expect(validateName('өнөрцэцэг', 'Нэр').ok).toBe(true);
    expect(validateName('үнэнбат', 'Нэр').ok).toBe(true);
    expect(validateName('ёндон', 'Нэр').ok).toBe(true);
  });

  it('зураастай нэрийг зөвшөөрнө', () => {
    expect(validateName('бат-эрдэнэ', 'Нэр').ok).toBe(true);
  });

  it('латин үсгийг татгалзана', () => {
    const r = validateName('Ganbat', 'Нэр');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('кирилл');
  });

  it('латин homoglyph холилдсоныг татгалзана', () => {
    // 'A' нь латин, бусад нь кирилл
    expect(validateName('Aлтан', 'Нэр').ok).toBe(false);
  });

  it('тоо агуулсныг татгалзана', () => {
    expect(validateName('Бат2', 'Нэр').ok).toBe(false);
  });

  it('хэт богиныг татгалзана', () => {
    expect(validateName('б', 'Нэр').ok).toBe(false);
  });

  it('хэт уртыг татгалзана', () => {
    expect(validateName('б'.repeat(51), 'Нэр').ok).toBe(false);
  });

  it('хоосныг татгалзана', () => {
    expect(validateName('   ', 'Нэр').ok).toBe(false);
  });

  it('алдааны мессеж талбарын нэрийг агуулна', () => {
    const r = validateName('', 'Овог');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('Овог');
  });
});

describe('validatePhone', () => {
  it('8-аар эхэлсэн 8 оронтойг зөвшөөрнө', () => {
    expect(validatePhone('88112233')).toEqual({ ok: true, value: '88112233' });
  });
  it('9-ээр эхэлсэнийг зөвшөөрнө', () => {
    expect(validatePhone('99112233').ok).toBe(true);
  });
  it('зай, зураас арилгаад хүлээн авна', () => {
    expect(validatePhone(' 8811-2233 ')).toEqual({ ok: true, value: '88112233' });
  });
  it('7-гоор эхэлсэнийг татгалзана', () => {
    expect(validatePhone('77112233').ok).toBe(false);
  });
  it('7 оронтойг татгалзана', () => {
    expect(validatePhone('8811223').ok).toBe(false);
  });
  it('9 оронтойг татгалзана', () => {
    expect(validatePhone('881122334').ok).toBe(false);
  });
  it('үсэг агуулсныг татгалзана', () => {
    expect(validatePhone('8811223a').ok).toBe(false);
  });
});

describe('validateDepartment', () => {
  const allowed = ['Хүний нөөц', 'Мэдээллийн технологи'];
  it('жагсаалтад байгааг зөвшөөрнө', () => {
    expect(validateDepartment('Хүний нөөц', allowed).ok).toBe(true);
  });
  it('жагсаалтад байхгүйг татгалзана', () => {
    expect(validateDepartment('Сансрын хэлтэс', allowed).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Тест унахыг баталгаажуулах**

```bash
npm test -- tests/validation.test.ts
```

Хүлээгдэх: FAIL — `Cannot find module '@/lib/validation'`.

- [ ] **Step 3: `src/lib/validation.ts` бичих**

```ts
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/** Монгол кирилл үсэг (ё, ө, ү багтана). Латин үсэг энд ОРОХГҮЙ. */
const CYRILLIC_LETTER = 'А-Яа-яЁёӨөҮү';
const NAME_RE = new RegExp(`^[${CYRILLIC_LETTER}][${CYRILLIC_LETTER}\\s-]*$`, 'u');

const NAME_MIN = 2;
const NAME_MAX = 50;

export function normalizeName(raw: string): string {
  const t = raw.trim().replace(/\s+/g, ' ');
  if (t.length === 0) return '';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function validateName(raw: string, field: string): Result<string> {
  const value = normalizeName(raw ?? '');
  if (value.length === 0) {
    return { ok: false, error: `${field} хоосон байна` };
  }
  if (value.length < NAME_MIN || value.length > NAME_MAX) {
    return { ok: false, error: `${field} ${NAME_MIN}-${NAME_MAX} тэмдэгт байх ёстой` };
  }
  if (!NAME_RE.test(value)) {
    return { ok: false, error: `${field}-ээ кирилл үсгээр бичнэ үү` };
  }
  return { ok: true, value };
}

const PHONE_RE = /^[89]\d{7}$/;

export function validatePhone(raw: string): Result<string> {
  const value = (raw ?? '').replace(/[\s-]/g, '');
  if (!PHONE_RE.test(value)) {
    return { ok: false, error: 'Утасны дугаар 8 эсвэл 9-өөр эхэлсэн 8 оронтой байна' };
  }
  return { ok: true, value };
}

export function validateDepartment(raw: string, allowed: readonly string[]): Result<string> {
  const value = (raw ?? '').trim();
  if (!allowed.includes(value)) {
    return { ok: false, error: 'Хэлтсээ жагсаалтаас сонгоно уу' };
  }
  return { ok: true, value };
}
```

- [ ] **Step 4: Тест ногоон болохыг шалгах**

```bash
npm test -- tests/validation.test.ts
```

Хүлээгдэх: бүх тест PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation.ts tests/validation.test.ts
git commit -m "feat: нэр, утас, хэлтсийн шалгалт"
```

---

## Task 3: Seed-тэй RNG ба Quiz логик (цэвэр)

**Files:**
- Create: `src/lib/rng.ts`, `src/lib/quiz.ts`
- Test: `tests/rng.test.ts`, `tests/quiz.test.ts`

**Interfaces:**
- Consumes: `QUIZ` (`@/lib/config`)
- Produces:
  - `mulberry32(seed: number): () => number`
  - `shuffle<T>(items: readonly T[], rng: () => number): T[]`
  - `pickN<T>(items: readonly T[], n: number, rng: () => number): T[]`
  - `scoreAnswer(isCorrect: boolean, elapsedMs: number): number`
  - `buildOptionOrder(optionCount: number, rng: () => number): number[]`
  - `applyOptionOrder(options: readonly string[], order: readonly number[]): string[]`
  - `resolveChoice(order: readonly number[], shownIndex: number): number`

- [ ] **Step 1: `tests/rng.test.ts` бичих**

```ts
import { describe, it, expect } from 'vitest';
import { mulberry32, shuffle, pickN } from '@/lib/rng';

describe('mulberry32', () => {
  it('ижил seed ижил дараалал өгнө', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('өөр seed өөр дараалал өгнө', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it('0 ба 1-ийн хооронд утга буцаана', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  it('бүх элементийг хадгална', () => {
    const out = shuffle([1, 2, 3, 4, 5], mulberry32(3));
    expect([...out].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it('эх массивыг өөрчлөхгүй', () => {
    const src = [1, 2, 3];
    shuffle(src, mulberry32(3));
    expect(src).toEqual([1, 2, 3]);
  });

  it('ижил seed ижил үр дүн', () => {
    expect(shuffle([1, 2, 3, 4, 5], mulberry32(9)))
      .toEqual(shuffle([1, 2, 3, 4, 5], mulberry32(9)));
  });
});

describe('pickN', () => {
  it('яг n ширхэг сонгоно', () => {
    expect(pickN([1, 2, 3, 4, 5], 3, mulberry32(1))).toHaveLength(3);
  });

  it('давхардахгүй', () => {
    const out = pickN([1, 2, 3, 4, 5], 5, mulberry32(1));
    expect(new Set(out).size).toBe(5);
  });

  it('n массиваас их бол бүгдийг буцаана', () => {
    expect(pickN([1, 2], 10, mulberry32(1))).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Тест унахыг шалгах**

```bash
npm test -- tests/rng.test.ts
```

Хүлээгдэх: FAIL — модуль олдохгүй.

- [ ] **Step 3: `src/lib/rng.ts` бичих**

```ts
/** Жижиг, хурдан, seed-тэй PRNG. Ижил seed → ижил дараалал. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pickN<T>(items: readonly T[], n: number, rng: () => number): T[] {
  return shuffle(items, rng).slice(0, Math.min(n, items.length));
}
```

- [ ] **Step 4: `tests/rng.test.ts` ногоон болохыг шалгах**

```bash
npm test -- tests/rng.test.ts
```

Хүлээгдэх: PASS.

- [ ] **Step 5: `tests/quiz.test.ts` бичих**

```ts
import { describe, it, expect } from 'vitest';
import {
  scoreAnswer, buildOptionOrder, applyOptionOrder, resolveChoice,
} from '@/lib/quiz';
import { mulberry32 } from '@/lib/rng';
import { QUIZ } from '@/lib/config';

describe('scoreAnswer', () => {
  it('буруу хариулт 0 оноо', () => {
    expect(scoreAnswer(false, 0)).toBe(0);
  });

  it('шууд хариулсан зөв хариулт дээд оноо', () => {
    expect(scoreAnswer(true, 0)).toBe(200);
  });

  it('10 оролдлогын дээд оноо 2000 болно', () => {
    expect(scoreAnswer(true, 0) * QUIZ.QUESTION_COUNT).toBe(2000);
  });

  it('5 секундэд хариулбал дунд зэргийн оноо', () => {
    // 5000ms - 800ms grace = 4200ms → үлдсэн 5800ms → floor 5 секунд
    expect(scoreAnswer(true, 5000)).toBe(100 + 5 * 10);
  });

  it('9.5 секундэд хариулбал суурь оноо', () => {
    // 9500 - 800 = 8700 → үлдсэн 1300 → floor 1 секунд
    expect(scoreAnswer(true, 9500)).toBe(100 + 1 * 10);
  });

  it('хугацаа дуусвал 0 оноо', () => {
    expect(scoreAnswer(true, 11_000)).toBe(0);
  });

  it('grace дотор яг хугацаандаа хариулсныг тооцно', () => {
    // 10_200ms - 800ms = 9_400ms < 10_000ms → суурь оноо авна
    expect(scoreAnswer(true, 10_200)).toBeGreaterThan(0);
  });

  it('сөрөг elapsed-ийг 0 мэт үзнэ (цагийн зөрүү)', () => {
    expect(scoreAnswer(true, -5000)).toBe(200);
  });

  it('NaN elapsed-ийг 0 оноо болгоно', () => {
    expect(scoreAnswer(true, Number.NaN)).toBe(0);
  });
});

describe('option order', () => {
  it('buildOptionOrder бүх индексийг агуулна', () => {
    const order = buildOptionOrder(4, mulberry32(5));
    expect([...order].sort()).toEqual([0, 1, 2, 3]);
  });

  it('applyOptionOrder дарааллын дагуу хувилбаруудыг байрлуулна', () => {
    expect(applyOptionOrder(['a', 'b', 'c', 'd'], [2, 0, 3, 1]))
      .toEqual(['c', 'a', 'd', 'b']);
  });

  it('resolveChoice харагдсан индексийг эх индекс рүү буулгана', () => {
    const order = [2, 0, 3, 1];
    expect(resolveChoice(order, 0)).toBe(2);
    expect(resolveChoice(order, 3)).toBe(1);
  });

  it('хүрээнээс гадуурх сонголт -1 буцаана', () => {
    expect(resolveChoice([2, 0, 3, 1], 9)).toBe(-1);
    expect(resolveChoice([2, 0, 3, 1], -1)).toBe(-1);
  });
});
```

- [ ] **Step 6: Тест унахыг шалгах**

```bash
npm test -- tests/quiz.test.ts
```

Хүлээгдэх: FAIL — `@/lib/quiz` олдохгүй.

- [ ] **Step 7: `src/lib/quiz.ts` бичих**

```ts
import { QUIZ } from './config';
import { shuffle } from './rng';

/**
 * Зөв хариултын оноо: суурь + хурдны урамшуулал.
 * Сөрөг эсвэл утгагүй elapsed-ийг хамгаалж 0-д clamp хийнэ.
 */
export function scoreAnswer(isCorrect: boolean, elapsedMs: number): number {
  if (!isCorrect) return 0;
  if (!Number.isFinite(elapsedMs)) return 0;

  const adjusted = Math.max(0, elapsedMs - QUIZ.NETWORK_GRACE_MS);
  if (adjusted >= QUIZ.TIME_LIMIT_MS) return 0;

  const remainingSeconds = Math.floor((QUIZ.TIME_LIMIT_MS - adjusted) / 1000);
  return QUIZ.BASE_POINTS + remainingSeconds * QUIZ.SPEED_POINTS_PER_SECOND;
}

export function buildOptionOrder(optionCount: number, rng: () => number): number[] {
  const indices = Array.from({ length: optionCount }, (_, i) => i);
  return shuffle(indices, rng);
}

export function applyOptionOrder(
  options: readonly string[],
  order: readonly number[],
): string[] {
  return order.map((i) => options[i]);
}

/** Хэрэглэгчийн харсан байрлалыг асуултын эх индекс рүү буулгана. */
export function resolveChoice(order: readonly number[], shownIndex: number): number {
  if (!Number.isInteger(shownIndex)) return -1;
  if (shownIndex < 0 || shownIndex >= order.length) return -1;
  return order[shownIndex];
}
```

- [ ] **Step 8: Тест ногоон болохыг шалгах**

```bash
npm test -- tests/quiz.test.ts
```

Хүлээгдэх: бүх тест PASS. `scoreAnswer(true, 5000)` → `150` эсэхийг онцгойлон шалга.

- [ ] **Step 9: Commit**

```bash
git add src/lib/rng.ts src/lib/quiz.ts tests/rng.test.ts tests/quiz.test.ts
git commit -m "feat: seed-тэй RNG ба quiz-ийн оноо тооцох логик"
```

---

## Task 4: Reaction тоглоомын логик (цэвэр)

**Files:**
- Create: `src/lib/reaction.ts`
- Test: `tests/reaction.test.ts`

**Interfaces:**
- Consumes: `REACTION` (`@/lib/config`), `mulberry32` (`@/lib/rng`)
- Produces:
  - `type SpawnItem = { id: number; t: number; x: number; y: number; kind: 'good' | 'bad' }`
  - `type Tap = { id: number; t: number }`
  - `generateSpawnSchedule(seed: number): SpawnItem[]`
  - `scoreTaps(schedule: readonly SpawnItem[], taps: readonly Tap[]): { score: number; hits: number; misses: number; rejected: number }`
  - `maxReactionScore(schedule: readonly SpawnItem[]): number`

- [ ] **Step 1: Унах тест бичих**

`tests/reaction.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateSpawnSchedule, scoreTaps, maxReactionScore } from '@/lib/reaction';
import { REACTION } from '@/lib/config';

describe('generateSpawnSchedule', () => {
  it('ижил seed ижил хуваарь өгнө', () => {
    expect(generateSpawnSchedule(123)).toEqual(generateSpawnSchedule(123));
  });

  it('өөр seed өөр хуваарь өгнө', () => {
    expect(generateSpawnSchedule(1)).not.toEqual(generateSpawnSchedule(2));
  });

  it('id нь 0-ээс эхэлсэн дараалсан тоо', () => {
    const s = generateSpawnSchedule(5);
    expect(s.map((i) => i.id)).toEqual(s.map((_, i) => i));
  });

  it('бүх объект тоглоомын хугацаанд багтана', () => {
    for (const item of generateSpawnSchedule(5)) {
      expect(item.t).toBeGreaterThanOrEqual(0);
      expect(item.t + REACTION.OBJECT_LIFETIME_MS).toBeLessThanOrEqual(REACTION.DURATION_MS);
    }
  });

  it('байрлал 0-100 хувийн хооронд', () => {
    for (const item of generateSpawnSchedule(5)) {
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.x).toBeLessThanOrEqual(100);
      expect(item.y).toBeGreaterThanOrEqual(0);
      expect(item.y).toBeLessThanOrEqual(100);
    }
  });

  it('муу объектын эзлэх хувь ойролцоогоор BAD_RATIO', () => {
    const s = generateSpawnSchedule(77);
    const bad = s.filter((i) => i.kind === 'bad').length;
    expect(bad / s.length).toBeGreaterThan(REACTION.BAD_RATIO - 0.15);
    expect(bad / s.length).toBeLessThan(REACTION.BAD_RATIO + 0.15);
  });

  it('дээд оноо 2000-д ойр байна', () => {
    const max = maxReactionScore(generateSpawnSchedule(77));
    expect(max).toBeGreaterThan(1500);
    expect(max).toBeLessThan(2500);
  });
});

describe('scoreTaps', () => {
  const schedule = generateSpawnSchedule(42);
  const good = schedule.filter((i) => i.kind === 'good');
  const bad = schedule.filter((i) => i.kind === 'bad');

  it('tap байхгүй бол 0 оноо', () => {
    expect(scoreTaps(schedule, []).score).toBe(0);
  });

  it('зөв объект дарвал оноо нэмэгдэнэ', () => {
    const r = scoreTaps(schedule, [{ id: good[0].id, t: good[0].t + 100 }]);
    expect(r.score).toBe(REACTION.GOOD_POINTS);
    expect(r.hits).toBe(1);
  });

  it('муу объект дарвал оноо хасагдана', () => {
    const r = scoreTaps(schedule, [
      { id: good[0].id, t: good[0].t + 10 },
      { id: good[1].id, t: good[1].t + 10 },
      { id: bad[0].id, t: bad[0].t + 10 },
    ]);
    expect(r.score).toBe(REACTION.GOOD_POINTS * 2 + REACTION.BAD_POINTS);
  });

  it('оноо 0-ээс доош буухгүй', () => {
    const taps = bad.slice(0, 5).map((i) => ({ id: i.id, t: i.t + 10 }));
    expect(scoreTaps(schedule, taps).score).toBe(0);
  });

  it('байхгүй объектын id-г татгалзана', () => {
    const r = scoreTaps(schedule, [{ id: 99999, t: 100 }]);
    expect(r.score).toBe(0);
    expect(r.rejected).toBe(1);
  });

  it('объект гарахаас өмнөх tap-ыг татгалзана', () => {
    const item = good.find((i) => i.t > 2000)!;
    const r = scoreTaps(schedule, [{ id: item.id, t: item.t - 1000 }]);
    expect(r.score).toBe(0);
    expect(r.rejected).toBe(1);
  });

  it('объект алга болсны дараах tap-ыг татгалзана', () => {
    const item = good[0];
    const late = item.t + REACTION.OBJECT_LIFETIME_MS + REACTION.GRACE_MS + 1;
    const r = scoreTaps(schedule, [{ id: item.id, t: late }]);
    expect(r.score).toBe(0);
    expect(r.rejected).toBe(1);
  });

  it('нэг объектыг давхар дарахыг нэг л удаа тооцно', () => {
    const item = good[0];
    const r = scoreTaps(schedule, [
      { id: item.id, t: item.t + 10 },
      { id: item.id, t: item.t + 20 },
    ]);
    expect(r.score).toBe(REACTION.GOOD_POINTS);
    expect(r.rejected).toBe(1);
  });

  it('тоглоомын хугацаанаас хэтэрсэн tap-ыг татгалзана', () => {
    const r = scoreTaps(schedule, [{ id: good[0].id, t: REACTION.DURATION_MS + 10_000 }]);
    expect(r.score).toBe(0);
  });

  it('бүх зөв объектыг дарсан нь дээд онооноос хэтрэхгүй', () => {
    const taps = good.map((i) => ({ id: i.id, t: i.t + 50 }));
    const r = scoreTaps(schedule, taps);
    expect(r.score).toBe(maxReactionScore(schedule));
  });

  it('эмх замбараагүй дарааллаар ирсэн tap-ыг зөв боловсруулна', () => {
    const taps = [
      { id: good[3].id, t: good[3].t + 10 },
      { id: good[0].id, t: good[0].t + 10 },
    ];
    expect(scoreTaps(schedule, taps).score).toBe(REACTION.GOOD_POINTS * 2);
  });

  it('утгагүй t (NaN) бүхий tap-ыг татгалзана', () => {
    const r = scoreTaps(schedule, [{ id: good[0].id, t: Number.NaN }]);
    expect(r.rejected).toBe(1);
    expect(r.score).toBe(0);
  });
});
```

- [ ] **Step 2: Тест унахыг шалгах**

```bash
npm test -- tests/reaction.test.ts
```

Хүлээгдэх: FAIL — `@/lib/reaction` олдохгүй.

- [ ] **Step 3: `src/lib/reaction.ts` бичих**

```ts
import { REACTION } from './config';
import { mulberry32 } from './rng';

export type SpawnKind = 'good' | 'bad';

export type SpawnItem = {
  id: number;
  /** Тоглоом эхэлснээс хойших миллисекунд. */
  t: number;
  /** Талбайн өргөний хувь (0-100). */
  x: number;
  /** Талбайн өндрийн хувь (0-100). */
  y: number;
  kind: SpawnKind;
};

export type Tap = { id: number; t: number };

export type TapResult = {
  score: number;
  hits: number;
  misses: number;
  rejected: number;
};

export function generateSpawnSchedule(seed: number): SpawnItem[] {
  const rng = mulberry32(seed);
  const items: SpawnItem[] = [];
  const last = REACTION.DURATION_MS - REACTION.OBJECT_LIFETIME_MS;

  let id = 0;
  for (let t = 0; t <= last; t += REACTION.SPAWN_INTERVAL_MS) {
    // Байрлалыг ирмэгээс 8% дотогш байлгаж, товшилтын талбайг бүтэн үлдээнэ.
    const x = 8 + rng() * 84;
    const y = 8 + rng() * 84;
    const kind: SpawnKind = rng() < REACTION.BAD_RATIO ? 'bad' : 'good';
    items.push({ id: id++, t, x: round1(x), y: round1(y), kind });
  }
  return items;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function maxReactionScore(schedule: readonly SpawnItem[]): number {
  return schedule.filter((i) => i.kind === 'good').length * REACTION.GOOD_POINTS;
}

export function scoreTaps(
  schedule: readonly SpawnItem[],
  taps: readonly Tap[],
): TapResult {
  const byId = new Map(schedule.map((i) => [i.id, i]));
  const seen = new Set<number>();
  const latestAllowed = REACTION.DURATION_MS + REACTION.GRACE_MS;

  let score = 0;
  let hits = 0;
  let misses = 0;
  let rejected = 0;

  for (const tap of taps) {
    if (!Number.isFinite(tap?.t) || !Number.isInteger(tap?.id)) { rejected++; continue; }
    if (tap.t < 0 || tap.t > latestAllowed) { rejected++; continue; }

    const item = byId.get(tap.id);
    if (!item) { rejected++; continue; }
    if (seen.has(tap.id)) { rejected++; continue; }

    const opensAt = item.t;
    const closesAt = item.t + REACTION.OBJECT_LIFETIME_MS + REACTION.GRACE_MS;
    if (tap.t < opensAt || tap.t > closesAt) { rejected++; continue; }

    seen.add(tap.id);
    if (item.kind === 'good') {
      score += REACTION.GOOD_POINTS;
      hits++;
    } else {
      score += REACTION.BAD_POINTS;
      misses++;
    }
  }

  return { score: Math.max(0, score), hits, misses, rejected };
}
```

- [ ] **Step 4: Тест ногоон болохыг шалгах**

```bash
npm test -- tests/reaction.test.ts
```

Хүлээгдэх: бүх тест PASS. Хэрэв "дээд оноо 2000-д ойр" тест унавал `REACTION.SPAWN_INTERVAL_MS`-ийг тохируулж (300 → 280 эсвэл 320) дахин ажиллуул.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reaction.ts tests/reaction.test.ts
git commit -m "feat: reaction тоглоомын хуваарь ба tap баталгаажуулалт"
```

---

## Task 5: Нийт оноо ба эрэмбэ (цэвэр)

**Files:**
- Create: `src/lib/scoring.ts`
- Test: `tests/scoring.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `type Rankable = { id: string; bestScore: number; bestFinishedAt: Date | null }`
  - `totalScore(quiz: number, reaction: number): number`
  - `compareForRank(a: Rankable, b: Rankable): number`
  - `rankAll<T extends Rankable>(rows: readonly T[]): Array<T & { rank: number }>`
  - `rankOf(rows: readonly Rankable[], id: string): number | null`

- [ ] **Step 1: Унах тест бичих**

`tests/scoring.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { totalScore, rankAll, rankOf } from '@/lib/scoring';

const at = (iso: string) => new Date(iso);

describe('totalScore', () => {
  it('хоёр оноог нэмнэ', () => {
    expect(totalScore(1200, 800)).toBe(2000);
  });
  it('сөрөг утгыг 0 болгоно', () => {
    expect(totalScore(-50, 800)).toBe(800);
  });
  it('бутархайг бүхэлчилнэ', () => {
    expect(totalScore(100.6, 0)).toBe(101);
  });
});

describe('rankAll', () => {
  it('өндөр оноотой нь эхэнд', () => {
    const out = rankAll([
      { id: 'a', bestScore: 1000, bestFinishedAt: at('2026-12-01T10:00:00Z') },
      { id: 'b', bestScore: 3000, bestFinishedAt: at('2026-12-01T10:00:00Z') },
    ]);
    expect(out.map((r) => r.id)).toEqual(['b', 'a']);
    expect(out[0].rank).toBe(1);
    expect(out[1].rank).toBe(2);
  });

  it('тэнцсэн үед эрт дуусгасан нь дээгүүр', () => {
    const out = rankAll([
      { id: 'late', bestScore: 2000, bestFinishedAt: at('2026-12-01T12:00:00Z') },
      { id: 'early', bestScore: 2000, bestFinishedAt: at('2026-12-01T09:00:00Z') },
    ]);
    expect(out.map((r) => r.id)).toEqual(['early', 'late']);
  });

  it('дуусгаагүй (null) нь хамгийн доор', () => {
    const out = rankAll([
      { id: 'none', bestScore: 2000, bestFinishedAt: null },
      { id: 'done', bestScore: 2000, bestFinishedAt: at('2026-12-01T12:00:00Z') },
    ]);
    expect(out.map((r) => r.id)).toEqual(['done', 'none']);
  });

  it('байр 1-ээс эхэлж дараалан өснө', () => {
    const out = rankAll([
      { id: 'a', bestScore: 300, bestFinishedAt: at('2026-12-01T10:00:00Z') },
      { id: 'b', bestScore: 200, bestFinishedAt: at('2026-12-01T10:00:00Z') },
      { id: 'c', bestScore: 100, bestFinishedAt: at('2026-12-01T10:00:00Z') },
    ]);
    expect(out.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('хоосон жагсаалт хоосон үр дүн', () => {
    expect(rankAll([])).toEqual([]);
  });

  it('эх массивыг өөрчлөхгүй', () => {
    const rows = [
      { id: 'a', bestScore: 100, bestFinishedAt: null },
      { id: 'b', bestScore: 200, bestFinishedAt: null },
    ];
    rankAll(rows);
    expect(rows[0].id).toBe('a');
  });
});

describe('rankOf', () => {
  const rows = [
    { id: 'a', bestScore: 300, bestFinishedAt: at('2026-12-01T10:00:00Z') },
    { id: 'b', bestScore: 200, bestFinishedAt: at('2026-12-01T10:00:00Z') },
  ];

  it('байрыг олно', () => {
    expect(rankOf(rows, 'b')).toBe(2);
  });

  it('олдохгүй бол null', () => {
    expect(rankOf(rows, 'zzz')).toBeNull();
  });
});
```

- [ ] **Step 2: Тест унахыг шалгах**

```bash
npm test -- tests/scoring.test.ts
```

Хүлээгдэх: FAIL.

- [ ] **Step 3: `src/lib/scoring.ts` бичих**

```ts
export type Rankable = {
  id: string;
  bestScore: number;
  bestFinishedAt: Date | null;
};

export function totalScore(quiz: number, reaction: number): number {
  const q = Number.isFinite(quiz) ? Math.max(0, quiz) : 0;
  const r = Number.isFinite(reaction) ? Math.max(0, reaction) : 0;
  return Math.round(q + r);
}

/** Өндөр оноо эхэнд; тэнцвэл эрт дуусгасан нь дээгүүр; дуусгаагүй нь доор. */
export function compareForRank(a: Rankable, b: Rankable): number {
  if (a.bestScore !== b.bestScore) return b.bestScore - a.bestScore;

  const at = a.bestFinishedAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const bt = b.bestFinishedAt?.getTime() ?? Number.POSITIVE_INFINITY;
  if (at !== bt) return at - bt;

  return a.id.localeCompare(b.id);
}

export function rankAll<T extends Rankable>(
  rows: readonly T[],
): Array<T & { rank: number }> {
  return [...rows]
    .sort(compareForRank)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

export function rankOf(rows: readonly Rankable[], id: string): number | null {
  const found = rankAll(rows).find((r) => r.id === id);
  return found ? found.rank : null;
}
```

- [ ] **Step 4: Тест ногоон болохыг шалгах**

```bash
npm test -- tests/scoring.test.ts
```

Хүлээгдэх: бүх тест PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring.ts tests/scoring.test.ts
git commit -m "feat: нийт оноо ба эрэмбэлэх логик"
```

---

## Task 6: Урилгын код ба бүртгэл (DB)

**Files:**
- Create: `src/lib/invite.ts`, `src/lib/repo/registrations.ts`, `src/lib/departments.ts`
- Create: `tests/helpers/db.ts`
- Test: `tests/invite.test.ts`, `tests/registrations.test.ts`

**Interfaces:**
- Consumes: `db`, `registrations` (`@/lib/db`), `validateName/validatePhone/validateDepartment` (`@/lib/validation`), `GAME` (`@/lib/config`)
- Produces:
  - `formatInviteCode(seq: number): string`
  - `DEPARTMENTS: readonly string[]`
  - `type RegistrationInput = { lastName: string; firstName: string; department: string; phone: string }`
  - `type RegistrationView = { id: string; lastName: string; firstName: string; department: string; inviteCode: string; attemptsUsed: number; attemptsLeft: number; bestScore: number }` — **утасны дугаар ОРООГҮЙ** (задруулахгүй)
  - `registerOrGet(input: RegistrationInput): Promise<Result<RegistrationView>>`
  - `findByPhone(phone: string): Promise<RegistrationView | null>`
  - `findByInviteCode(code: string): Promise<RegistrationView | null>`

- [ ] **Step 1: `src/lib/departments.ts` бичих**

`docs/departments-draft.md`-ийн жагсаалтыг код руу буулгана. Арга хэмжээний баг жагсаалтыг засвал ЗӨВХӨН энэ файлыг өөрчилнө.

```ts
export const DEPARTMENTS = [
  'Гүйцэтгэх удирдлага',
  'Санхүү, нягтлан бодох бүртгэл',
  'Хүний нөөц',
  'Мэдээллийн технологи',
  'Борлуулалт, маркетинг',
  'Худалдан авалт',
  'Гаалийн зуучлал',
  'Олон улсын авто тээвэр',
  'Төмөр замын тээвэр',
  'Агаарын тээвэр',
  'Далайн тээвэр',
  'Агуулахын үйл ажиллагаа',
  'Логистикийн үйл ажиллагаа',
  'Эрх зүй',
  'Аж ахуй, захиргаа',
  'Бусад',
] as const;
```

- [ ] **Step 2: `tests/invite.test.ts` бичих (унах ёстой)**

```ts
import { describe, it, expect } from 'vitest';
import { formatInviteCode } from '@/lib/invite';

describe('formatInviteCode', () => {
  it('эхний кодыг MLG-202601 гэж үүсгэнэ', () => {
    expect(formatInviteCode(1)).toBe('MLG-202601');
  });
  it('хоёр оронтой дугаарыг хэвээр нь залгана', () => {
    expect(formatInviteCode(42)).toBe('MLG-202642');
  });
  it('99-ээс хойш оронгийн тоо өснө', () => {
    expect(formatInviteCode(100)).toBe('MLG-2026100');
  });
  it('0 эсвэл сөрөг дугаарыг татгалзана', () => {
    expect(() => formatInviteCode(0)).toThrow();
    expect(() => formatInviteCode(-1)).toThrow();
  });
  it('бутархай дугаарыг татгалзана', () => {
    expect(() => formatInviteCode(1.5)).toThrow();
  });
});
```

- [ ] **Step 3: Тест унахыг шалгах**

```bash
npm test -- tests/invite.test.ts
```

Хүлээгдэх: FAIL.

- [ ] **Step 4: `src/lib/invite.ts` бичих**

```ts
import { GAME } from './config';

/**
 * Sequence дугаарыг урилгын код болгоно.
 * 1 → MLG-202601, 100 → MLG-2026100
 * Тогтмол өргөнтэй болгохыг хүсвэл доорх мөрийг
 * `String(seq).padStart(3, '0')` болгож өөрчилнө.
 */
export function formatInviteCode(seq: number): string {
  if (!Number.isInteger(seq) || seq < 1) {
    throw new Error(`Урилгын дугаар эерэг бүхэл тоо байх ёстой: ${seq}`);
  }
  const suffix = seq < 10 ? `0${seq}` : String(seq);
  return `${GAME.INVITE_PREFIX}${suffix}`;
}
```

> `formatInviteCode(1)` = `MLG-202601` болохын тулд 1-9 дугаарыг тэглэж бөглөнө; 10-аас хойш шууд залгана.

- [ ] **Step 5: `tests/invite.test.ts` ногоон болохыг шалгах**

```bash
npm test -- tests/invite.test.ts
```

Хүлээгдэх: PASS.

- [ ] **Step 6: `tests/helpers/db.ts` бичих**

```ts
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

/** Тест бүрийн өмнө DB-г цэвэрлэж, sequence-ийг 1 рүү буцаана. */
export async function resetDb(): Promise<void> {
  await db.execute(sql`TRUNCATE attempt_answers, attempts, registrations RESTART IDENTITY CASCADE`);
  await db.execute(sql`ALTER SEQUENCE invite_seq_counter RESTART WITH 1`);
}

export async function seedQuestions(count = 15): Promise<void> {
  await db.execute(sql`TRUNCATE questions RESTART IDENTITY CASCADE`);
  for (let i = 1; i <= count; i++) {
    await db.execute(sql`
      INSERT INTO questions (text, options, correct_index, active)
      VALUES (${`Тест асуулт ${i}`}, ${JSON.stringify(['A', 'B', 'C', 'D'])}::jsonb, ${i % 4}, true)
    `);
  }
}
```

- [ ] **Step 7: `tests/registrations.test.ts` бичих (унах ёстой)**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { registerOrGet, findByPhone, findByInviteCode } from '@/lib/repo/registrations';
import { resetDb } from './helpers/db';

const input = {
  lastName: 'батхүү',
  firstName: 'ганбат',
  department: 'Мэдээллийн технологи',
  phone: '88112233',
};

beforeEach(async () => { await resetDb(); });

describe('registerOrGet', () => {
  it('шинэ бүртгэл үүсгэж эхний кодыг өгнө', async () => {
    const r = await registerOrGet(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.inviteCode).toBe('MLG-202601');
    expect(r.value.attemptsLeft).toBe(3);
  });

  it('нэрийг хэвийн болгож хадгална', async () => {
    const r = await registerOrGet({ ...input, firstName: '  ганбат ' });
    expect(r.ok && r.value.firstName).toBe('Ганбат');
  });

  it('дараалсан кодууд өснө', async () => {
    const a = await registerOrGet(input);
    const b = await registerOrGet({ ...input, phone: '88112234' });
    expect(a.ok && a.value.inviteCode).toBe('MLG-202601');
    expect(b.ok && b.value.inviteCode).toBe('MLG-202602');
  });

  it('ижил утсаар дахин бүртгүүлэхэд ижил код буцаана', async () => {
    const a = await registerOrGet(input);
    const b = await registerOrGet({ ...input, firstName: 'өөр' });
    expect(a.ok && b.ok && a.value.inviteCode).toBe(b.ok ? b.value.inviteCode : '');
    expect(a.ok && b.ok && a.value.id).toBe(b.ok ? b.value.id : '');
  });

  it('латин нэрийг татгалзана', async () => {
    const r = await registerOrGet({ ...input, firstName: 'Ganbat' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('кирилл');
  });

  it('буруу утсыг татгалзана', async () => {
    expect((await registerOrGet({ ...input, phone: '12345' })).ok).toBe(false);
  });

  it('жагсаалтад байхгүй хэлтсийг татгалзана', async () => {
    expect((await registerOrGet({ ...input, department: 'Сансрын алба' })).ok).toBe(false);
  });

  it('зэрэг ирсэн ижил утасны 5 хүсэлт нэг л бүртгэл үүсгэнэ', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => registerOrGet(input)),
    );
    const ids = new Set(results.map((r) => (r.ok ? r.value.id : 'err')));
    expect(ids.size).toBe(1);
    expect(ids.has('err')).toBe(false);
  });

  it('зэрэг ирсэн 20 өөр утас бүгд өвөрмөц кодтой', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        registerOrGet({ ...input, phone: `881122${String(i).padStart(2, '0')}` })),
    );
    const codes = results.map((r) => (r.ok ? r.value.inviteCode : 'err'));
    expect(new Set(codes).size).toBe(20);
    expect(codes).not.toContain('err');
  });
});

describe('findByPhone / findByInviteCode', () => {
  it('бүртгэлтэй утсаар олно', async () => {
    await registerOrGet(input);
    const found = await findByPhone('88112233');
    expect(found?.inviteCode).toBe('MLG-202601');
  });

  it('бүртгэлгүй утсаар null', async () => {
    expect(await findByPhone('99999999')).toBeNull();
  });

  it('кодоор олно', async () => {
    await registerOrGet(input);
    const found = await findByInviteCode('MLG-202601');
    expect(found?.firstName).toBe('Ганбат');
  });

  it('буцаасан өгөгдөлд утасны дугаар агуулагдахгүй', async () => {
    await registerOrGet(input);
    const found = await findByInviteCode('MLG-202601');
    expect(JSON.stringify(found)).not.toContain('88112233');
  });

  it('байхгүй кодоор null', async () => {
    expect(await findByInviteCode('MLG-209999')).toBeNull();
  });
});
```

- [ ] **Step 8: Тест унахыг шалгах**

Docker Postgres асаалттай эсэхийг эхлээд шалга:

```bash
docker compose up -d
npm test -- tests/registrations.test.ts
```

Хүлээгдэх: FAIL — `@/lib/repo/registrations` олдохгүй.

- [ ] **Step 9: `src/lib/repo/registrations.ts` бичих**

```ts
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { registrations } from '@/lib/db/schema';
import { GAME } from '@/lib/config';
import { DEPARTMENTS } from '@/lib/departments';
import { formatInviteCode } from '@/lib/invite';
import {
  validateName, validatePhone, validateDepartment, type Result,
} from '@/lib/validation';

export type RegistrationInput = {
  lastName: string;
  firstName: string;
  department: string;
  phone: string;
};

export type RegistrationView = {
  id: string;
  lastName: string;
  firstName: string;
  department: string;
  inviteCode: string;
  attemptsUsed: number;
  attemptsLeft: number;
  bestScore: number;
};

type Row = typeof registrations.$inferSelect;

function toView(row: Row): RegistrationView {
  return {
    id: row.id,
    lastName: row.lastName,
    firstName: row.firstName,
    department: row.department,
    inviteCode: row.inviteCode,
    attemptsUsed: row.attemptsUsed,
    attemptsLeft: Math.max(0, GAME.MAX_ATTEMPTS - row.attemptsUsed),
    bestScore: row.bestScore,
  };
}

export async function findByPhone(phone: string): Promise<RegistrationView | null> {
  const [row] = await db.select().from(registrations).where(eq(registrations.phone, phone)).limit(1);
  return row ? toView(row) : null;
}

export async function findByInviteCode(code: string): Promise<RegistrationView | null> {
  const [row] = await db.select().from(registrations).where(eq(registrations.inviteCode, code)).limit(1);
  return row ? toView(row) : null;
}

export async function registerOrGet(
  input: RegistrationInput,
): Promise<Result<RegistrationView>> {
  const lastName = validateName(input.lastName, 'Овог');
  if (!lastName.ok) return lastName;

  const firstName = validateName(input.firstName, 'Нэр');
  if (!firstName.ok) return firstName;

  const department = validateDepartment(input.department, DEPARTMENTS);
  if (!department.ok) return department;

  const phone = validatePhone(input.phone);
  if (!phone.ok) return phone;

  const existing = await findByPhone(phone.value);
  if (existing) return { ok: true, value: existing };

  try {
    // nextval ба INSERT нэг транзакцид — зэрэг ирсэн хүсэлтүүд давхардахгүй.
    const inserted = await db.transaction(async (tx) => {
      const seqRows = await tx.execute<{ seq: string }>(
        sql`SELECT nextval('invite_seq_counter')::int AS seq`,
      );
      const seq = Number((seqRows as unknown as Array<{ seq: number | string }>)[0].seq);

      const [row] = await tx.insert(registrations).values({
        lastName: lastName.value,
        firstName: firstName.value,
        department: department.value,
        phone: phone.value,
        inviteCode: formatInviteCode(seq),
        inviteSeq: seq,
      }).returning();

      return row;
    });

    return { ok: true, value: toView(inserted) };
  } catch (err) {
    // Хоёр хүсэлт яг зэрэг орвол unique(phone) зөрчигдөнө — тэгвэл
    // нөгөө нь аль хэдийн үүсгэсэн гэсэн үг, дахин уншина.
    const retry = await findByPhone(phone.value);
    if (retry) return { ok: true, value: retry };
    throw err;
  }
}
```

- [ ] **Step 10: Тест ногоон болохыг шалгах**

```bash
npm test -- tests/registrations.test.ts
```

Хүлээгдэх: бүх тест PASS. Ялангуяа "зэрэг ирсэн ижил утасны 5 хүсэлт" болон "20 өөр утас" тестүүд.

- [ ] **Step 11: Commit**

```bash
git add src/lib/invite.ts src/lib/departments.ts src/lib/repo/registrations.ts tests/
git commit -m "feat: урилгын код ба бүртгэлийн репозитор"
```

---

## Task 7: Оролдлогын амьдралын мөчлөг (DB репозитор)

**Files:**
- Create: `src/lib/repo/attempts.ts`
- Test: `tests/attempts.test.ts`

**Interfaces:**
- Consumes: `db`, `attempts`, `attemptAnswers`, `questions`, `registrations`; `pickN`, `mulberry32`; `scoreAnswer`, `buildOptionOrder`, `applyOptionOrder`, `resolveChoice`; `generateSpawnSchedule`, `scoreTaps`; `totalScore`; `GAME`, `QUIZ`, `REACTION`
- Produces:
  - `startAttempt(registrationId: string): Promise<Result<{ attemptId: string; spawnSchedule: SpawnItem[]; answered: number; reactionDone: boolean }>>`
  - `serveNextQuestion(attemptId: string): Promise<Result<{ position: number; total: number; questionId: number; text: string; options: string[] } | null>>`
  - `submitAnswer(attemptId: string, questionId: number, shownIndex: number): Promise<Result<{ isCorrect: boolean; points: number }>>`
  - `submitReaction(attemptId: string, taps: Tap[]): Promise<Result<{ reactionScore: number }>>`
  - `finishAttempt(attemptId: string): Promise<Result<{ totalScore: number; quizScore: number; reactionScore: number; bestScore: number }>>`

- [ ] **Step 1: Унах тест бичих**

`tests/attempts.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  startAttempt, serveNextQuestion, submitAnswer, submitReaction, finishAttempt,
} from '@/lib/repo/attempts';
import { registerOrGet } from '@/lib/repo/registrations';
import { resetDb, seedQuestions } from './helpers/db';
import { QUIZ, REACTION, GAME } from '@/lib/config';
import { db } from '@/lib/db';
import { attempts, registrations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const input = {
  lastName: 'батхүү', firstName: 'ганбат',
  department: 'Мэдээллийн технологи', phone: '88112233',
};

async function newRegistration(phone = '88112233') {
  const r = await registerOrGet({ ...input, phone });
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

beforeEach(async () => {
  await resetDb();
  await seedQuestions(15);
});

describe('startAttempt', () => {
  it('оролдлого үүсгэж spawn хуваарь буцаана', async () => {
    const reg = await newRegistration();
    const r = await startAttempt(reg.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.spawnSchedule.length).toBeGreaterThan(30);
    expect(r.value.answered).toBe(0);
  });

  it('дуусаагүй оролдлого байвал шинээр үүсгэхгүй, үргэлжлүүлнэ', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    const b = await startAttempt(reg.id);
    expect(a.ok && b.ok && a.value.attemptId).toBe(b.ok ? b.value.attemptId : '');
  });

  it('оролдлого үргэлжлүүлэхэд хариулсан тоо хадгалагдана', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error('эхлээгүй');
    const q = await serveNextQuestion(a.value.attemptId);
    if (!q.ok || !q.value) throw new Error('асуулт ирсэнгүй');
    await submitAnswer(a.value.attemptId, q.value.questionId, 0);

    const b = await startAttempt(reg.id);
    expect(b.ok && b.value.answered).toBe(1);
  });

  it('30 минутаас удсан оролдлого хүчингүй болж, оролдлогын тоонд тооцогдохгүй', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);

    // Эхэлсэн цагийг хиймлээр хоцроож, хугацаа хэтэрсэн болгоно.
    const stale = new Date(Date.now() - GAME.ATTEMPT_TIMEOUT_MS - 60_000);
    await db.update(attempts).set({ startedAt: stale }).where(eq(attempts.id, a.value.attemptId));

    const b = await startAttempt(reg.id);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect(b.value.attemptId).not.toBe(a.value.attemptId);

    const [row] = await db.select().from(attempts).where(eq(attempts.id, a.value.attemptId));
    expect(row.status).toBe('invalid');

    const [regRow] = await db.select().from(registrations).where(eq(registrations.id, reg.id));
    expect(regRow.attemptsUsed).toBe(1); // хуучин нь хасагдаж, шинэ нь нэмэгдсэн
  });

  it(`${GAME.MAX_ATTEMPTS} оролдлогын дараа татгалзана`, async () => {
    const reg = await newRegistration();
    for (let i = 0; i < GAME.MAX_ATTEMPTS; i++) {
      const a = await startAttempt(reg.id);
      if (!a.ok) throw new Error(a.error);
      await finishAttempt(a.value.attemptId);
    }
    const extra = await startAttempt(reg.id);
    expect(extra.ok).toBe(false);
    if (!extra.ok) expect(extra.error).toContain('оролдлого');
  });
});

describe('serveNextQuestion', () => {
  it(`${QUIZ.QUESTION_COUNT} асуулт дараалан өгнө, дараа нь null`, async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);

    for (let i = 1; i <= QUIZ.QUESTION_COUNT; i++) {
      const q = await serveNextQuestion(a.value.attemptId);
      expect(q.ok).toBe(true);
      if (!q.ok || !q.value) throw new Error(`${i}-р асуулт ирсэнгүй`);
      expect(q.value.position).toBe(i);
      expect(q.value.total).toBe(QUIZ.QUESTION_COUNT);
      expect(q.value.options).toHaveLength(4);
      await submitAnswer(a.value.attemptId, q.value.questionId, 0);
    }

    const extra = await serveNextQuestion(a.value.attemptId);
    expect(extra.ok && extra.value).toBeNull();
  });

  it('хариулаагүй байхад дахин дуудвал ижил асуулт буцаана', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    const first = await serveNextQuestion(a.value.attemptId);
    const again = await serveNextQuestion(a.value.attemptId);
    expect(first.ok && again.ok && first.value?.questionId)
      .toBe(again.ok ? again.value?.questionId : -1);
  });

  it('зөв хариултыг хариултанд оруулж илгээхгүй', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    const q = await serveNextQuestion(a.value.attemptId);
    if (!q.ok || !q.value) throw new Error('асуулт алга');
    expect(JSON.stringify(q.value)).not.toContain('correctIndex');
    expect(JSON.stringify(q.value)).not.toContain('correct_index');
  });

  it('асуултууд давхардахгүй', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    const ids: number[] = [];
    for (let i = 0; i < QUIZ.QUESTION_COUNT; i++) {
      const q = await serveNextQuestion(a.value.attemptId);
      if (!q.ok || !q.value) break;
      ids.push(q.value.questionId);
      await submitAnswer(a.value.attemptId, q.value.questionId, 0);
    }
    expect(new Set(ids).size).toBe(QUIZ.QUESTION_COUNT);
  });
});

describe('submitAnswer', () => {
  it('зөв хариултад оноо өгнө', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    const q = await serveNextQuestion(a.value.attemptId);
    if (!q.ok || !q.value) throw new Error('асуулт алга');

    // seedQuestions: correct_index = id % 4, options нь ['A','B','C','D']
    // Зөв хувилбарын ТЕКСТийг олж, түүний харагдсан байрлалыг илгээнэ.
    const correctLetter = ['A', 'B', 'C', 'D'][q.value.questionId % 4];
    const shownIndex = q.value.options.indexOf(correctLetter);

    const r = await submitAnswer(a.value.attemptId, q.value.questionId, shownIndex);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.isCorrect).toBe(true);
    expect(r.value.points).toBeGreaterThan(0);
  });

  it('буруу хариултад 0 оноо', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    const q = await serveNextQuestion(a.value.attemptId);
    if (!q.ok || !q.value) throw new Error('асуулт алга');

    const correctLetter = ['A', 'B', 'C', 'D'][q.value.questionId % 4];
    const wrongIndex = q.value.options.findIndex((o) => o !== correctLetter);

    const r = await submitAnswer(a.value.attemptId, q.value.questionId, wrongIndex);
    expect(r.ok && r.value.isCorrect).toBe(false);
    expect(r.ok && r.value.points).toBe(0);
  });

  it('нэг асуултад давхар хариулахыг татгалзана', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    const q = await serveNextQuestion(a.value.attemptId);
    if (!q.ok || !q.value) throw new Error('асуулт алга');

    await submitAnswer(a.value.attemptId, q.value.questionId, 0);
    const second = await submitAnswer(a.value.attemptId, q.value.questionId, 1);
    expect(second.ok).toBe(false);
  });

  it('өгөгдөөгүй асуултад хариулахыг татгалзана', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    await serveNextQuestion(a.value.attemptId);
    const r = await submitAnswer(a.value.attemptId, 99999, 0);
    expect(r.ok).toBe(false);
  });

  it('хүрээнээс гадуур сонголт буруу гэж тооцогдоно', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    const q = await serveNextQuestion(a.value.attemptId);
    if (!q.ok || !q.value) throw new Error('асуулт алга');
    const r = await submitAnswer(a.value.attemptId, q.value.questionId, 99);
    expect(r.ok && r.value.isCorrect).toBe(false);
    expect(r.ok && r.value.points).toBe(0);
  });
});

describe('submitReaction', () => {
  it('зөв tap-уудад оноо өгнө', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);

    const good = a.value.spawnSchedule.filter((i) => i.kind === 'good').slice(0, 3);
    const r = await submitReaction(
      a.value.attemptId,
      good.map((i) => ({ id: i.id, t: i.t + 100 })),
    );
    expect(r.ok && r.value.reactionScore).toBe(REACTION.GOOD_POINTS * 3);
  });

  it('хуурамч id-тай tap оноо нэмэхгүй', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    const r = await submitReaction(a.value.attemptId, [
      { id: 99999, t: 10 }, { id: 99998, t: 20 },
    ]);
    expect(r.ok && r.value.reactionScore).toBe(0);
  });

  it(`${REACTION.MAX_TAPS}-аас олон tap-ыг татгалзана`, async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    const taps = Array.from({ length: REACTION.MAX_TAPS + 1 }, (_, i) => ({ id: i, t: i }));
    const r = await submitReaction(a.value.attemptId, taps);
    expect(r.ok).toBe(false);
  });

  it('reaction-ийг давхар илгээхийг татгалзана', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    await submitReaction(a.value.attemptId, []);
    const second = await submitReaction(a.value.attemptId, []);
    expect(second.ok).toBe(false);
  });
});

describe('finishAttempt', () => {
  it('нийт оноог тооцож бүртгэлийн дээд оноог шинэчилнэ', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);

    for (let i = 0; i < QUIZ.QUESTION_COUNT; i++) {
      const q = await serveNextQuestion(a.value.attemptId);
      if (!q.ok || !q.value) break;
      const correctLetter = ['A', 'B', 'C', 'D'][q.value.questionId % 4];
      await submitAnswer(a.value.attemptId, q.value.questionId, q.value.options.indexOf(correctLetter));
    }
    const good = a.value.spawnSchedule.filter((i) => i.kind === 'good').slice(0, 5);
    await submitReaction(a.value.attemptId, good.map((i) => ({ id: i.id, t: i.t + 50 })));

    const r = await finishAttempt(a.value.attemptId);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.quizScore).toBeGreaterThan(0);
    expect(r.value.reactionScore).toBe(REACTION.GOOD_POINTS * 5);
    expect(r.value.totalScore).toBe(r.value.quizScore + r.value.reactionScore);
    expect(r.value.bestScore).toBe(r.value.totalScore);
  });

  it('хоёр дахь оролдлого муу бол дээд оноо буурахгүй', async () => {
    const reg = await newRegistration();

    const first = await startAttempt(reg.id);
    if (!first.ok) throw new Error(first.error);
    const good = first.value.spawnSchedule.filter((i) => i.kind === 'good').slice(0, 10);
    await submitReaction(first.value.attemptId, good.map((i) => ({ id: i.id, t: i.t + 50 })));
    const r1 = await finishAttempt(first.value.attemptId);

    const second = await startAttempt(reg.id);
    if (!second.ok) throw new Error(second.error);
    await submitReaction(second.value.attemptId, []);
    const r2 = await finishAttempt(second.value.attemptId);

    expect(r1.ok && r2.ok && r2.value.bestScore).toBe(r1.ok ? r1.value.totalScore : -1);
  });

  it('аль хэдийн дууссан оролдлогыг дахин дуусгахыг татгалзана', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    await finishAttempt(a.value.attemptId);
    expect((await finishAttempt(a.value.attemptId)).ok).toBe(false);
  });

  it('байхгүй оролдлогыг татгалзана', async () => {
    expect((await finishAttempt('00000000-0000-0000-0000-000000000000')).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Тест унахыг шалгах**

```bash
npm test -- tests/attempts.test.ts
```

Хүлээгдэх: FAIL — `@/lib/repo/attempts` олдохгүй.

- [ ] **Step 3: `src/lib/repo/attempts.ts` бичих**

```ts
import { and, asc, eq, isNull, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { attempts, attemptAnswers, questions, registrations } from '@/lib/db/schema';
import { GAME, QUIZ, REACTION } from '@/lib/config';
import { mulberry32, pickN } from '@/lib/rng';
import {
  scoreAnswer, buildOptionOrder, applyOptionOrder, resolveChoice,
} from '@/lib/quiz';
import { generateSpawnSchedule, scoreTaps, type SpawnItem, type Tap } from '@/lib/reaction';
import { totalScore } from '@/lib/scoring';
import type { Result } from '@/lib/validation';

const fail = (error: string): Result<never> => ({ ok: false, error });

/** 30 минутаас удсан in_progress оролдлогыг хүчингүй болгож, оролдлогын тоог буцаана. */
async function expireStaleAttempts(registrationId: string): Promise<void> {
  const cutoff = new Date(Date.now() - GAME.ATTEMPT_TIMEOUT_MS);
  const stale = await db.update(attempts)
    .set({ status: 'invalid', finishedAt: new Date() })
    .where(and(
      eq(attempts.registrationId, registrationId),
      eq(attempts.status, 'in_progress'),
      sql`${attempts.startedAt} < ${cutoff}`,
    ))
    .returning({ id: attempts.id });

  if (stale.length > 0) {
    await db.update(registrations)
      .set({ attemptsUsed: sql`GREATEST(0, ${registrations.attemptsUsed} - ${stale.length})` })
      .where(eq(registrations.id, registrationId));
  }
}

export async function startAttempt(registrationId: string): Promise<Result<{
  attemptId: string;
  spawnSchedule: SpawnItem[];
  answered: number;
  reactionDone: boolean;
}>> {
  await expireStaleAttempts(registrationId);

  const [reg] = await db.select().from(registrations)
    .where(eq(registrations.id, registrationId)).limit(1);
  if (!reg) return fail('Бүртгэл олдсонгүй');

  // Дуусаагүй оролдлого байвал үргэлжлүүлнэ.
  const [open] = await db.select().from(attempts)
    .where(and(eq(attempts.registrationId, registrationId), eq(attempts.status, 'in_progress')))
    .limit(1);

  if (open) {
    const answered = await countAnswered(open.id);
    return {
      ok: true,
      value: {
        attemptId: open.id,
        spawnSchedule: generateSpawnSchedule(open.seed),
        answered,
        reactionDone: open.reactionDone,
      },
    };
  }

  if (reg.attemptsUsed >= GAME.MAX_ATTEMPTS) {
    return fail(`Та ${GAME.MAX_ATTEMPTS} оролдлогоо бүрэн ашигласан байна`);
  }

  const pool = await db.select({ id: questions.id }).from(questions)
    .where(eq(questions.active, true));
  if (pool.length < QUIZ.QUESTION_COUNT) {
    return fail('Асуултын сан хүрэлцэхгүй байна');
  }

  const seed = Math.floor(Math.random() * 2_147_483_647);
  const questionIds = pickN(pool.map((q) => q.id), QUIZ.QUESTION_COUNT, mulberry32(seed));

  const created = await db.transaction(async (tx) => {
    const [row] = await tx.insert(attempts)
      .values({ registrationId, seed, questionIds })
      .returning();
    await tx.update(registrations)
      .set({ attemptsUsed: sql`${registrations.attemptsUsed} + 1` })
      .where(eq(registrations.id, registrationId));
    return row;
  });

  return {
    ok: true,
    value: {
      attemptId: created.id,
      spawnSchedule: generateSpawnSchedule(seed),
      answered: 0,
      reactionDone: false,
    },
  };
}

async function countAnswered(attemptId: string): Promise<number> {
  const rows = await db.select({ id: attemptAnswers.id }).from(attemptAnswers)
    .where(and(eq(attemptAnswers.attemptId, attemptId), sql`${attemptAnswers.answeredAt} IS NOT NULL`));
  return rows.length;
}

export type ServedQuestion = {
  position: number;
  total: number;
  questionId: number;
  text: string;
  options: string[];
  timeLimitMs: number;
};

export async function serveNextQuestion(
  attemptId: string,
): Promise<Result<ServedQuestion | null>> {
  const [attempt] = await db.select().from(attempts).where(eq(attempts.id, attemptId)).limit(1);
  if (!attempt) return fail('Оролдлого олдсонгүй');
  if (attempt.status !== 'in_progress') return fail('Энэ оролдлого дууссан байна');

  const served = await db.select().from(attemptAnswers)
    .where(eq(attemptAnswers.attemptId, attemptId))
    .orderBy(asc(attemptAnswers.position));

  // Хариулаагүй асуулт байвал ижлийг нь буцаана (refresh хийсэн тохиолдол).
  const pending = served.find((a) => a.answeredAt === null);
  if (pending) {
    const q = await loadQuestion(pending.questionId);
    if (!q) return fail('Асуулт олдсонгүй');
    return {
      ok: true,
      value: {
        position: pending.position,
        total: QUIZ.QUESTION_COUNT,
        questionId: q.id,
        text: q.text,
        options: applyOptionOrder(q.options, pending.optionOrder),
        timeLimitMs: QUIZ.TIME_LIMIT_MS,
      },
    };
  }

  const position = served.length + 1;
  if (position > QUIZ.QUESTION_COUNT) return { ok: true, value: null };

  const questionId = attempt.questionIds[position - 1];
  const q = await loadQuestion(questionId);
  if (!q) return fail('Асуулт олдсонгүй');

  const rng = mulberry32(attempt.seed + position);
  const optionOrder = buildOptionOrder(q.options.length, rng);

  await db.insert(attemptAnswers).values({
    attemptId, questionId, position, optionOrder, servedAt: new Date(),
  });

  return {
    ok: true,
    value: {
      position,
      total: QUIZ.QUESTION_COUNT,
      questionId: q.id,
      text: q.text,
      options: applyOptionOrder(q.options, optionOrder),
      timeLimitMs: QUIZ.TIME_LIMIT_MS,
    },
  };
}

async function loadQuestion(id: number) {
  const [q] = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
  return q ?? null;
}

export async function submitAnswer(
  attemptId: string,
  questionId: number,
  shownIndex: number,
): Promise<Result<{ isCorrect: boolean; points: number }>> {
  const [attempt] = await db.select().from(attempts).where(eq(attempts.id, attemptId)).limit(1);
  if (!attempt) return fail('Оролдлого олдсонгүй');
  if (attempt.status !== 'in_progress') return fail('Энэ оролдлого дууссан байна');

  const [row] = await db.select().from(attemptAnswers)
    .where(and(
      eq(attemptAnswers.attemptId, attemptId),
      eq(attemptAnswers.questionId, questionId),
      isNull(attemptAnswers.answeredAt),
    )).limit(1);
  if (!row) return fail('Энэ асуулт өгөгдөөгүй эсвэл аль хэдийн хариулсан байна');

  const q = await loadQuestion(questionId);
  if (!q) return fail('Асуулт олдсонгүй');

  const answeredAt = new Date();
  const elapsedMs = answeredAt.getTime() - row.servedAt.getTime();
  const originalIndex = resolveChoice(row.optionOrder, shownIndex);
  const isCorrect = originalIndex === q.correctIndex;
  const points = scoreAnswer(isCorrect, elapsedMs);

  await db.update(attemptAnswers)
    .set({ answeredAt, choiceIndex: originalIndex, isCorrect, points })
    .where(eq(attemptAnswers.id, row.id));

  return { ok: true, value: { isCorrect, points } };
}

export async function submitReaction(
  attemptId: string,
  taps: Tap[],
): Promise<Result<{ reactionScore: number }>> {
  if (!Array.isArray(taps)) return fail('Tap өгөгдөл буруу байна');
  if (taps.length > REACTION.MAX_TAPS) return fail('Хэт олон tap илгээгдлээ');

  const [attempt] = await db.select().from(attempts).where(eq(attempts.id, attemptId)).limit(1);
  if (!attempt) return fail('Оролдлого олдсонгүй');
  if (attempt.status !== 'in_progress') return fail('Энэ оролдлого дууссан байна');
  if (attempt.reactionDone) return fail('Reaction аль хэдийн илгээгдсэн байна');

  const schedule = generateSpawnSchedule(attempt.seed);
  const { score } = scoreTaps(schedule, taps);

  await db.update(attempts)
    .set({ reactionScore: score, reactionDone: true })
    .where(eq(attempts.id, attemptId));

  return { ok: true, value: { reactionScore: score } };
}

export async function finishAttempt(attemptId: string): Promise<Result<{
  totalScore: number; quizScore: number; reactionScore: number; bestScore: number;
}>> {
  const [attempt] = await db.select().from(attempts).where(eq(attempts.id, attemptId)).limit(1);
  if (!attempt) return fail('Оролдлого олдсонгүй');
  if (attempt.status !== 'in_progress') return fail('Энэ оролдлого аль хэдийн дууссан байна');

  const answers = await db.select({ points: attemptAnswers.points }).from(attemptAnswers)
    .where(eq(attemptAnswers.attemptId, attemptId));
  const quizScore = answers.reduce((sum, a) => sum + a.points, 0);
  const total = totalScore(quizScore, attempt.reactionScore);
  const finishedAt = new Date();

  const bestScore = await db.transaction(async (tx) => {
    await tx.update(attempts).set({
      status: 'completed', quizScore, totalScore: total, finishedAt,
    }).where(eq(attempts.id, attemptId));

    const [reg] = await tx.select().from(registrations)
      .where(eq(registrations.id, attempt.registrationId)).limit(1);

    if (total > reg.bestScore) {
      await tx.update(registrations)
        .set({ bestScore: total, bestFinishedAt: finishedAt })
        .where(eq(registrations.id, attempt.registrationId));
      return total;
    }
    return reg.bestScore;
  });

  return {
    ok: true,
    value: { totalScore: total, quizScore, reactionScore: attempt.reactionScore, bestScore },
  };
}
```

- [ ] **Step 4: Тест ногоон болохыг шалгах**

```bash
npm test -- tests/attempts.test.ts
```

Хүлээгдэх: бүх тест PASS.

- [ ] **Step 5: Бүх тест ажиллуулах**

```bash
npm test
```

Хүлээгдэх: Task 1-7-ийн бүх тест PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/repo/attempts.ts tests/attempts.test.ts
git commit -m "feat: оролдлогын амьдралын мөчлөг — асуулт өгөх, хариулт, reaction, дуусгах"
```

---

## Task 8: API route-ууд ба хаагдах хаалга

**Files:**
- Create: `src/lib/http.ts`, `src/lib/rate-limit.ts`
- Create: `src/app/api/register/route.ts`
- Create: `src/app/api/attempt/start/route.ts`
- Create: `src/app/api/attempt/[id]/question/route.ts`
- Create: `src/app/api/attempt/[id]/answer/route.ts`
- Create: `src/app/api/attempt/[id]/reaction/route.ts`
- Create: `src/app/api/attempt/[id]/finish/route.ts`
- Test: `tests/http.test.ts`

**Interfaces:**
- Consumes: `registerOrGet`, `startAttempt`, `serveNextQuestion`, `submitAnswer`, `submitReaction`, `finishAttempt`, `isGameOpen`
- Produces: `ok<T>(data: T): Response`, `bad(error: string, status?: number): Response`, `closed(): Response`, `boom(): Response`, `readJson<T>(req: Request): Promise<T | null>`, `hitRateLimit(key: string): boolean`, `clientIp(req: Request): string`

**Хаалганы дүрэм (Review Focus #5):** `register` ба `attempt/start` нь тоглоом хаагдсан үед **410** буцаана. `question`, `answer`, `reaction`, `finish` нь хаагдсан ч **ажиллана** — аль хэдийн эхэлсэн хүн дуусгах эрхтэй.

- [ ] **Step 1: `tests/http.test.ts` бичих (унах ёстой)**

```ts
import { describe, it, expect } from 'vitest';
import { ok, bad, closed, readJson } from '@/lib/http';

describe('ok', () => {
  it('200 статустай JSON буцаана', async () => {
    const res = ok({ a: 1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { a: 1 } });
  });
});

describe('bad', () => {
  it('анхдагчаар 400', async () => {
    const res = bad('буруу');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: 'буруу' });
  });
  it('статусыг дамжуулж болно', () => {
    expect(bad('олдсонгүй', 404).status).toBe(404);
  });
});

describe('closed', () => {
  it('410 буцаана', async () => {
    const res = closed();
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('хаагдсан');
  });
});

describe('readJson', () => {
  it('зөв JSON-ийг уншина', async () => {
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ a: 1 }) });
    expect(await readJson(req)).toEqual({ a: 1 });
  });
  it('буруу JSON-д null буцаана', async () => {
    const req = new Request('http://x', { method: 'POST', body: '{' });
    expect(await readJson(req)).toBeNull();
  });
  it('хоосон биед null буцаана', async () => {
    const req = new Request('http://x', { method: 'POST' });
    expect(await readJson(req)).toBeNull();
  });
});
```

- [ ] **Step 2: Тест унахыг шалгах**

```bash
npm test -- tests/http.test.ts
```

Хүлээгдэх: FAIL.

- [ ] **Step 3: `src/lib/http.ts` бичих**

```ts
export function ok<T>(data: T): Response {
  return Response.json({ ok: true, data }, { status: 200 });
}

export function bad(error: string, status = 400): Response {
  return Response.json({ ok: false, error }, { status });
}

export function closed(): Response {
  return Response.json(
    { ok: false, error: 'Тоглоом хаагдсан байна' },
    { status: 410 },
  );
}

export function boom(): Response {
  return Response.json(
    { ok: false, error: 'Түр зуурын алдаа гарлаа. Дахин оролдоно уу.' },
    { status: 500 },
  );
}

export async function readJson<T = unknown>(req: Request): Promise<T | null> {
  try {
    const text = await req.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Тест ногоон болохыг шалгах**

```bash
npm test -- tests/http.test.ts
```

Хүлээгдэх: PASS.

- [ ] **Step 4b: `src/lib/rate-limit.ts` бичих (спек §5.6)**

Нэг IP-ээс хэт олон бүртгэл үүсгэхээс сэргийлнэ. Санах ойд хадгална —
200 хүний арга хэмжээнд Redis хэрэггүй. Serverless instance дахин асахад
тоолуур тэглэгддэг; энэ нь хүлээн зөвшөөрөгдөх (зорилго нь скрипт
хориглох, баталгаат хамгаалалт биш).

```ts
const WINDOW_MS = 60_000;
const MAX_HITS = 10;

const hits = new Map<string, number[]>();

/** true буцаавал хязгаар хэтэрсэн — хүсэлтийг татгалзана. */
export function hitRateLimit(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_HITS) {
    hits.set(key, recent);
    return true;
  }

  recent.push(now);
  hits.set(key, recent);

  // Санах ой хэт өсөхөөс сэргийлж хааяа цэвэрлэнэ.
  if (hits.size > 1000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }

  return false;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/** Зөвхөн тестэд — тоолуурыг тэглэнэ. */
export function resetRateLimit(): void {
  hits.clear();
}
```

`tests/rate-limit.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { hitRateLimit, clientIp, resetRateLimit } from '@/lib/rate-limit';

beforeEach(() => { resetRateLimit(); });

describe('hitRateLimit', () => {
  it('эхний 10 хүсэлтийг зөвшөөрнө', () => {
    for (let i = 0; i < 10; i++) expect(hitRateLimit('1.1.1.1')).toBe(false);
  });

  it('11 дэх хүсэлтийг татгалзана', () => {
    for (let i = 0; i < 10; i++) hitRateLimit('1.1.1.1');
    expect(hitRateLimit('1.1.1.1')).toBe(true);
  });

  it('өөр IP-д нөлөөлөхгүй', () => {
    for (let i = 0; i < 10; i++) hitRateLimit('1.1.1.1');
    expect(hitRateLimit('2.2.2.2')).toBe(false);
  });
});

describe('clientIp', () => {
  it('x-forwarded-for-ийн эхний утгыг авна', () => {
    const req = new Request('http://x', {
      headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
    });
    expect(clientIp(req)).toBe('203.0.113.5');
  });

  it('header байхгүй бол unknown', () => {
    expect(clientIp(new Request('http://x'))).toBe('unknown');
  });
});
```

Ажиллуулах:

```bash
npm test -- tests/rate-limit.test.ts
```

Хүлээгдэх: бүх тест PASS.

- [ ] **Step 5: `src/app/api/register/route.ts` бичих**

```ts
import { registerOrGet } from '@/lib/repo/registrations';
import { isGameOpen } from '@/lib/config';
import { ok, bad, closed, boom, readJson } from '@/lib/http';
import { hitRateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  lastName?: string; firstName?: string; department?: string; phone?: string;
};

export async function POST(req: Request): Promise<Response> {
  if (!isGameOpen()) return closed();

  if (hitRateLimit(clientIp(req))) {
    return bad('Хэт олон удаа оролдлоо. Минут хүлээгээд дахин оролдоно уу.', 429);
  }

  const body = await readJson<Body>(req);
  if (!body) return bad('Өгөгдөл буруу байна');

  try {
    const result = await registerOrGet({
      lastName: body.lastName ?? '',
      firstName: body.firstName ?? '',
      department: body.department ?? '',
      phone: body.phone ?? '',
    });
    if (!result.ok) return bad(result.error);
    return ok(result.value);
  } catch (err) {
    console.error('[register]', err);
    return boom();
  }
}
```

- [ ] **Step 6: `src/app/api/attempt/start/route.ts` бичих**

```ts
import { startAttempt } from '@/lib/repo/attempts';
import { isGameOpen } from '@/lib/config';
import { ok, bad, closed, boom, readJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  if (!isGameOpen()) return closed();

  const body = await readJson<{ registrationId?: string }>(req);
  if (!body?.registrationId) return bad('registrationId дутуу байна');

  try {
    const result = await startAttempt(body.registrationId);
    if (!result.ok) return bad(result.error);
    return ok(result.value);
  } catch (err) {
    console.error('[attempt/start]', err);
    return boom();
  }
}
```

- [ ] **Step 7: `src/app/api/attempt/[id]/question/route.ts` бичих**

```ts
import { serveNextQuestion } from '@/lib/repo/attempts';
import { ok, bad, boom } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  try {
    const result = await serveNextQuestion(id);
    if (!result.ok) return bad(result.error);
    return ok(result.value); // null = quiz дууссан
  } catch (err) {
    console.error('[attempt/question]', err);
    return boom();
  }
}
```

- [ ] **Step 8: `src/app/api/attempt/[id]/answer/route.ts` бичих**

```ts
import { submitAnswer } from '@/lib/repo/attempts';
import { ok, bad, boom, readJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = { questionId?: number; choiceIndex?: number };

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  const body = await readJson<Body>(req);
  if (!body || typeof body.questionId !== 'number') {
    return bad('questionId дутуу байна');
  }
  const choiceIndex = typeof body.choiceIndex === 'number' ? body.choiceIndex : -1;

  try {
    const result = await submitAnswer(id, body.questionId, choiceIndex);
    if (!result.ok) return bad(result.error);
    return ok(result.value);
  } catch (err) {
    console.error('[attempt/answer]', err);
    return boom();
  }
}
```

- [ ] **Step 9: `src/app/api/attempt/[id]/reaction/route.ts` бичих**

```ts
import { submitReaction } from '@/lib/repo/attempts';
import { REACTION } from '@/lib/config';
import { ok, bad, boom, readJson } from '@/lib/http';
import type { Tap } from '@/lib/reaction';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  const body = await readJson<{ taps?: unknown }>(req);

  if (!body || !Array.isArray(body.taps)) return bad('taps дутуу байна');
  if (body.taps.length > REACTION.MAX_TAPS) {
    return bad(`Хэт олон tap илгээгдлээ (дээд тал нь ${REACTION.MAX_TAPS})`);
  }

  const taps: Tap[] = body.taps
    .filter((t): t is Tap =>
      typeof t === 'object' && t !== null &&
      typeof (t as Tap).id === 'number' && typeof (t as Tap).t === 'number')
    .map((t) => ({ id: t.id, t: t.t }));

  try {
    const result = await submitReaction(id, taps);
    if (!result.ok) return bad(result.error);
    return ok(result.value);
  } catch (err) {
    console.error('[attempt/reaction]', err);
    return boom();
  }
}
```

- [ ] **Step 10: `src/app/api/attempt/[id]/finish/route.ts` бичих**

```ts
import { finishAttempt } from '@/lib/repo/attempts';
import { ok, bad, boom } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  try {
    const result = await finishAttempt(id);
    if (!result.ok) return bad(result.error);
    return ok(result.value);
  } catch (err) {
    console.error('[attempt/finish]', err);
    return boom();
  }
}
```

- [ ] **Step 11: Гараар шалгах**

```bash
npm run dev
```

Өөр терминалд:

```bash
curl -s -X POST localhost:3000/api/register \
  -H 'content-type: application/json' \
  -d '{"lastName":"батхүү","firstName":"ганбат","department":"Мэдээллийн технологи","phone":"88112233"}'
```

Хүлээгдэх: `{"ok":true,"data":{"inviteCode":"MLG-202601",...}}`

Латин нэрээр шалгах:

```bash
curl -s -X POST localhost:3000/api/register \
  -H 'content-type: application/json' \
  -d '{"lastName":"Batkhuu","firstName":"Ganbat","department":"Мэдээллийн технологи","phone":"88112244"}'
```

Хүлээгдэх: `{"ok":false,"error":"Овог-ээ кирилл үсгээр бичнэ үү"}`, статус 400.

Хаагдсан үеийг шалгах — `.env.local` дотор `GAME_CLOSES_AT=2020-01-01T00:00:00+08:00` болгоод dev серверийг дахин асаа, register-ийг дахин дуудахад статус **410** ирэх ёстой. Шалгасны дараа утгыг буцааж засна.

- [ ] **Step 12: Commit**

```bash
git add src/lib/http.ts src/lib/rate-limit.ts src/app/api tests/http.test.ts tests/rate-limit.test.ts
git commit -m "feat: API route-ууд, rate limit, хаагдах хаалга"
```

---

## Task 9: Leaderboard ба үр дүнгийн өгөгдөл

**Files:**
- Create: `src/lib/repo/leaderboard.ts`
- Create: `src/app/api/leaderboard/route.ts`
- Test: `tests/leaderboard.test.ts`

**Interfaces:**
- Consumes: `db`, `registrations`, `rankAll`, `GAME`
- Produces:
  - `type LeaderRow = { rank: number; lastName: string; firstName: string; bestScore: number; isPrize: boolean }`
  - `getLeaderboard(limit?: number): Promise<LeaderRow[]>`
  - `getStanding(registrationId: string): Promise<{ rank: number; bestScore: number; total: number } | null>`

- [ ] **Step 1: Унах тест бичих**

`tests/leaderboard.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getLeaderboard, getStanding } from '@/lib/repo/leaderboard';
import { registerOrGet } from '@/lib/repo/registrations';
import { db } from '@/lib/db';
import { registrations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { resetDb } from './helpers/db';
import { GAME } from '@/lib/config';

const base = { lastName: 'батхүү', department: 'Мэдээллийн технологи' };

async function make(firstName: string, phone: string, score: number, finishedIso: string) {
  const r = await registerOrGet({ ...base, firstName, phone });
  if (!r.ok) throw new Error(r.error);
  await db.update(registrations)
    .set({ bestScore: score, bestFinishedAt: new Date(finishedIso) })
    .where(eq(registrations.id, r.value.id));
  return r.value.id;
}

beforeEach(async () => { await resetDb(); });

describe('getLeaderboard', () => {
  it('хоосон DB дээр хоосон жагсаалт', async () => {
    expect(await getLeaderboard()).toEqual([]);
  });

  it('оноогоор буурахаар эрэмбэлнэ', async () => {
    await make('нэгдүгээр', '88000001', 1000, '2026-12-01T10:00:00Z');
    await make('хоёрдугаар', '88000002', 3000, '2026-12-01T10:00:00Z');
    const rows = await getLeaderboard();
    expect(rows.map((r) => r.bestScore)).toEqual([3000, 1000]);
    expect(rows[0].rank).toBe(1);
  });

  it(`эхний ${GAME.PRIZE_PLACES} байрыг шагналтай гэж тэмдэглэнэ`, async () => {
    for (let i = 0; i < 7; i++) {
      await make(`ажилтан${i}`, `8800000${i}`, 1000 - i * 10, '2026-12-01T10:00:00Z');
    }
    const rows = await getLeaderboard();
    expect(rows.filter((r) => r.isPrize)).toHaveLength(GAME.PRIZE_PLACES);
    expect(rows[GAME.PRIZE_PLACES - 1].isPrize).toBe(true);
    expect(rows[GAME.PRIZE_PLACES].isPrize).toBe(false);
  });

  it('тэнцсэн үед эрт дуусгасан нь дээгүүр', async () => {
    await make('орой', '88000001', 2000, '2026-12-01T18:00:00Z');
    await make('эрт', '88000002', 2000, '2026-12-01T09:00:00Z');
    expect((await getLeaderboard())[0].firstName).toBe('Эрт');
  });

  it('limit-ийг хүндэтгэнэ', async () => {
    for (let i = 0; i < 10; i++) {
      await make(`ажилтан${i}`, `8800000${i}`, 100 + i, '2026-12-01T10:00:00Z');
    }
    expect(await getLeaderboard(3)).toHaveLength(3);
  });

  it('утасны дугаарыг задруулахгүй', async () => {
    await make('ганбат', '88112233', 500, '2026-12-01T10:00:00Z');
    expect(JSON.stringify(await getLeaderboard())).not.toContain('88112233');
  });

  it('огт тоглоогүй (0 оноотой) хүн жагсаалтад орохгүй', async () => {
    const r = await registerOrGet({ ...base, firstName: 'тоглоогүй', phone: '88009999' });
    expect(r.ok).toBe(true);
    expect(await getLeaderboard()).toEqual([]);
  });
});

describe('getStanding', () => {
  it('байр ба нийт оролцогчийн тоог буцаана', async () => {
    await make('нэг', '88000001', 3000, '2026-12-01T10:00:00Z');
    const id = await make('хоёр', '88000002', 1000, '2026-12-01T10:00:00Z');
    const s = await getStanding(id);
    expect(s).toEqual({ rank: 2, bestScore: 1000, total: 2 });
  });

  it('байхгүй бүртгэлд null', async () => {
    expect(await getStanding('00000000-0000-0000-0000-000000000000')).toBeNull();
  });
});
```

- [ ] **Step 2: Тест унахыг шалгах**

```bash
npm test -- tests/leaderboard.test.ts
```

Хүлээгдэх: FAIL.

- [ ] **Step 3: `src/lib/repo/leaderboard.ts` бичих**

```ts
import { gt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { registrations } from '@/lib/db/schema';
import { GAME } from '@/lib/config';
import { rankAll } from '@/lib/scoring';

export type LeaderRow = {
  rank: number;
  lastName: string;
  firstName: string;
  bestScore: number;
  isPrize: boolean;
};

/** Оноо авсан (0-ээс дээш) бүртгэлүүдийг эрэмбэлсэн дарааллаар. */
async function rankedRows() {
  const rows = await db.select({
    id: registrations.id,
    lastName: registrations.lastName,
    firstName: registrations.firstName,
    bestScore: registrations.bestScore,
    bestFinishedAt: registrations.bestFinishedAt,
  }).from(registrations).where(gt(registrations.bestScore, 0));

  return rankAll(rows);
}

export async function getLeaderboard(limit?: number): Promise<LeaderRow[]> {
  const ranked = await rankedRows();
  const sliced = typeof limit === 'number' ? ranked.slice(0, limit) : ranked;

  return sliced.map((r) => ({
    rank: r.rank,
    lastName: r.lastName,
    firstName: r.firstName,
    bestScore: r.bestScore,
    isPrize: r.rank <= GAME.PRIZE_PLACES,
  }));
}

export async function getStanding(registrationId: string): Promise<
  { rank: number; bestScore: number; total: number } | null
> {
  const ranked = await rankedRows();
  const me = ranked.find((r) => r.id === registrationId);
  if (!me) return null;
  return { rank: me.rank, bestScore: me.bestScore, total: ranked.length };
}
```

- [ ] **Step 4: `src/app/api/leaderboard/route.ts` бичих**

```ts
import { getLeaderboard } from '@/lib/repo/leaderboard';
import { ok, boom } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const limitRaw = new URL(req.url).searchParams.get('limit');
  const parsed = limitRaw === null ? 20 : Number(limitRaw);
  const limit = Number.isInteger(parsed) && parsed > 0 && parsed <= 500 ? parsed : 20;

  try {
    return ok(await getLeaderboard(limit));
  } catch (err) {
    console.error('[leaderboard]', err);
    return boom();
  }
}
```

- [ ] **Step 5: Тест ногоон болохыг шалгах**

```bash
npm test -- tests/leaderboard.test.ts
```

Хүлээгдэх: бүх тест PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/repo/leaderboard.ts src/app/api/leaderboard tests/leaderboard.test.ts
git commit -m "feat: leaderboard ба байрын тооцоо"
```

---

## Task 10: Асуултын сан ба seed скрипт

**Files:**
- Create: `src/data/questions.ts`
- Create: `scripts/seed-questions.ts`
- Test: `tests/questions-data.test.ts`

**Interfaces:**
- Consumes: `db`, `questions`
- Produces: `QUESTION_BANK: ReadonlyArray<{ text: string; options: string[]; correctIndex: number }>`

> `docs/questions-draft.md`-ийн 1-3 асуулт (компанийн бодит мэдээлэл) **хоосон** байна. Доорх кодод тэднийг `PLACEHOLDER` гэж тэмдэглэсэн — арга хэмжээний баг утгыг нь бөглөнө. Тест нь placeholder үлдсэн эсэхийг анхааруулна, гэхдээ унахгүй (`it.skip` биш, зөвхөн console-д сануулга).

- [ ] **Step 1: `src/data/questions.ts` бичих**

```ts
export type QuestionSeed = {
  text: string;
  options: string[];
  correctIndex: number;
};

/** Компанийн баг бөглөх ёстой асуултыг энэ тэмдгээр эхлүүлнэ. */
export const PLACEHOLDER_MARK = '[БӨГЛӨХ]';

export const QUESTION_BANK: ReadonlyArray<QuestionSeed> = [
  {
    text: `${PLACEHOLDER_MARK} Monlogistics Group хэдэн онд байгуулагдсан бэ?`,
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
  },
  {
    text: `${PLACEHOLDER_MARK} Monlogistics Group хэдэн салбартай вэ?`,
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
  },
  {
    text: `${PLACEHOLDER_MARK} Компанийн уриа үг аль нь вэ?`,
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
  },
  {
    text: '"TEU" гэдэг нь юуны товчлол вэ?',
    options: [
      'Total Export Unit',
      'Twenty-foot Equivalent Unit',
      'Transit Entry Unit',
      'Terminal Exchange Unit',
    ],
    correctIndex: 1,
  },
  {
    text: 'FOB нөхцөлд худалдагчийн хариуцлага хэзээ дуусах вэ?',
    options: [
      'Агуулахаас ачаа гарах үед',
      'Ачааг хөлөг онгоцон дээр ачсан үед',
      'Худалдан авагч ачааг хүлээн авах үед',
      'Гаалийн бүрдүүлэлт дуусах үед',
    ],
    correctIndex: 1,
  },
  {
    text: 'CIF нөхцөлд ачааны даатгалын зардлыг хэн хариуцах вэ?',
    options: ['Худалдагч', 'Худалдан авагч', 'Тээвэрлэгч', 'Гаалийн байгууллага'],
    correctIndex: 0,
  },
  {
    text: 'Далайн тээвэрт ашиглагддаг ачааны үндсэн баримтыг юу гэдэг вэ?',
    options: ['Air Waybill', 'Bill of Lading (B/L)', 'Packing List', 'Proforma Invoice'],
    correctIndex: 1,
  },
  {
    text: 'Агаарын тээвэрт ачааны баримтыг юу гэж нэрлэдэг вэ?',
    options: ['Air Waybill (AWB)', 'Bill of Lading', 'CMR', 'Rail Waybill'],
    correctIndex: 0,
  },
  {
    text: '40 футын стандарт контейнерийн дотоод эзлэхүүн ойролцоогоор хэд вэ?',
    options: ['33 м³', '47 м³', '67 м³', '95 м³'],
    correctIndex: 2,
  },
  {
    text: 'HS код гэж юу вэ?',
    options: [
      'Тээврийн хэрэгслийн улсын дугаар',
      'Барааг гаалийн зориулалтаар ангилах олон улсын код',
      'Агуулахын тавиурын код',
      'Даатгалын гэрээний дугаар',
    ],
    correctIndex: 1,
  },
  {
    text: 'Замын-Үүд боомтын эсрэг талд БНХАУ-ын аль боомт байрладаг вэ?',
    options: ['Эрээн', 'Тяньжин', 'Маньжуур', 'Хөх хот'],
    correctIndex: 0,
  },
  {
    text: 'ОХУ-тай хиллэдэг Монголын гол төмөр замын боомт аль нь вэ?',
    options: ['Сүхбаатар', 'Алтанбулаг', 'Чойбалсан', 'Бичигт'],
    correctIndex: 0,
  },
  {
    text: '"Транзит тээвэр" гэж юуг хэлэх вэ?',
    options: [
      'Зөвхөн улс дотор хийгдэх тээвэр',
      'Нэг улсаас нөгөө рүү гуравдагч улсын нутгаар дамжин өнгөрөх тээвэр',
      'Агуулахаас агуулах руу зөөх',
      'Буцаалтын тээвэр',
    ],
    correctIndex: 1,
  },
  {
    text: 'Дэлхий дээр Шинэ жилийг хамгийн түрүүнд угтдаг улс аль нь вэ?',
    options: ['Шинэ Зеланд', 'Кирибати', 'Япон', 'Австрали'],
    correctIndex: 1,
  },
  {
    text: '2026 он зурхайгаар ямар жил вэ?',
    options: ['Бар жил', 'Туулай жил', 'Морин жил', 'Хонин жил'],
    correctIndex: 2,
  },
];
```

- [ ] **Step 2: `tests/questions-data.test.ts` бичих**

```ts
import { describe, it, expect } from 'vitest';
import { QUESTION_BANK, PLACEHOLDER_MARK } from '@/data/questions';
import { QUIZ } from '@/lib/config';

describe('QUESTION_BANK', () => {
  it(`дор хаяж ${QUIZ.QUESTION_COUNT} асуулттай`, () => {
    expect(QUESTION_BANK.length).toBeGreaterThanOrEqual(QUIZ.QUESTION_COUNT);
  });

  it('асуулт бүр 4 хувилбартай', () => {
    for (const q of QUESTION_BANK) expect(q.options).toHaveLength(4);
  });

  it('correctIndex хүрээнд багтана', () => {
    for (const q of QUESTION_BANK) {
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
    }
  });

  it('хувилбарууд давхардахгүй', () => {
    for (const q of QUESTION_BANK) {
      expect(new Set(q.options).size).toBe(q.options.length);
    }
  });

  it('асуултын текст давхардахгүй', () => {
    expect(new Set(QUESTION_BANK.map((q) => q.text)).size).toBe(QUESTION_BANK.length);
  });

  it('бөглөөгүй асуулт үлдсэн эсэхийг сануулна', () => {
    const pending = QUESTION_BANK.filter((q) => q.text.includes(PLACEHOLDER_MARK));
    if (pending.length > 0) {
      console.warn(`\n⚠️  ${pending.length} асуулт бөглөгдөөгүй байна:\n` +
        pending.map((q) => `   - ${q.text}`).join('\n') + '\n');
    }
    // Энэ тест унахгүй — зөвхөн сануулга. Арга хэмжээнээс өмнө 0 болгоно.
    expect(pending.length).toBeLessThanOrEqual(3);
  });
});
```

- [ ] **Step 3: Тест ажиллуулах**

```bash
npm test -- tests/questions-data.test.ts
```

Хүлээгдэх: бүх тест PASS, console дээр 3 бөглөөгүй асуултын сануулга гарна.

- [ ] **Step 4: `scripts/seed-questions.ts` бичих**

```ts
import { config } from 'dotenv';
config({ path: '.env.local' });

import { sql } from 'drizzle-orm';
import { db, client } from '../src/lib/db';
import { questions } from '../src/lib/db/schema';
import { QUESTION_BANK, PLACEHOLDER_MARK } from '../src/data/questions';

async function main() {
  await db.execute(sql`TRUNCATE questions RESTART IDENTITY CASCADE`);
  await db.insert(questions).values(
    QUESTION_BANK.map((q) => ({
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      active: true,
    })),
  );

  const pending = QUESTION_BANK.filter((q) => q.text.includes(PLACEHOLDER_MARK)).length;
  console.log(`✅ ${QUESTION_BANK.length} асуулт нэмэгдлээ.`);
  if (pending > 0) console.warn(`⚠️  ${pending} асуулт бөглөгдөөгүй хэвээр байна.`);

  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 5: Seed ажиллуулж шалгах**

```bash
npm run seed
docker compose exec -T db psql -U mlg -d mlg -c "SELECT count(*) FROM questions;"
```

Хүлээгдэх: `✅ 15 асуулт нэмэгдлээ.` ба `count = 15`.

- [ ] **Step 6: Commit**

```bash
git add src/data/questions.ts scripts/seed-questions.ts tests/questions-data.test.ts
git commit -m "feat: асуултын сан ба seed скрипт"
```

---

## Task 11: UI суурь, нүүр хуудас, бүртгэлийн форм

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/globals.css`
- Create: `src/app/page.tsx`
- Create: `src/components/Brand.tsx`, `src/components/Button.tsx`
- Create: `src/app/register/page.tsx`, `src/app/register/RegisterForm.tsx`
- Create: `src/lib/session.ts`
- Copy: `assets/logo.png` → `public/logo.png`

**Interfaces:**
- Consumes: `/api/register`, `DEPARTMENTS`, `isGameOpen`
- Produces: `saveSession(reg)`, `loadSession()`, `clearSession()` (localStorage), `<Brand />`, `<Button />`

- [ ] **Step 1: Лого байрлуулах**

```bash
cp assets/logo.png public/logo.png
ls -la public/logo.png
```

- [ ] **Step 2: `src/app/globals.css` дээр брэндийн өнгө тодорхойлох**

Файлын `@import "tailwindcss";` мөрийн ДАРАА нэмэх:

```css
@theme {
  --color-brand: #ED1C24;
  --color-ink: #221E20;
  --color-paper: #FAF7F0;
  --color-muted: #6B6568;
}

html, body {
  background: var(--color-paper);
  color: var(--color-ink);
  -webkit-tap-highlight-color: transparent;
}

/* Тоглоом дээр санамсаргүй сонголт хийхээс сэргийлнэ. */
.no-select {
  user-select: none;
  -webkit-user-select: none;
}
```

- [ ] **Step 3: `src/app/layout.tsx` бичих**

```tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Monlogistics — Шинэ жилийн баяр 2026',
  description: 'Тоглоом тоглож урилгаа аваарай.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ED1C24',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: `src/components/Brand.tsx` ба `src/components/Button.tsx` бичих**

```tsx
// src/components/Brand.tsx
import Image from 'next/image';

export function Brand({ className = '' }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Monlogistics Group"
      width={480}
      height={133}
      priority
      className={`h-10 w-auto ${className}`}
    />
  );
}
```

```tsx
// src/components/Button.tsx
'use client';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
};

export function Button({ variant = 'primary', className = '', ...rest }: Props) {
  const base =
    'inline-flex min-h-12 items-center justify-center rounded-lg px-6 text-base ' +
    'font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed';
  const look = variant === 'primary'
    ? 'bg-[#ED1C24] text-white hover:bg-[#C21019]'
    : 'border border-[#221E20] text-[#221E20] hover:bg-[#221E20] hover:text-white';

  return <button className={`${base} ${look} ${className}`} {...rest} />;
}
```

- [ ] **Step 5: `src/lib/session.ts` бичих**

```ts
'use client';

const KEY = 'mlg.registration';

export type Session = {
  id: string;
  lastName: string;
  firstName: string;
  inviteCode: string;
  attemptsLeft: number;
  bestScore: number;
};

export function saveSession(s: Session): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ }
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    return typeof parsed?.id === 'string' ? parsed : null;
  } catch { return null; }
}

export function clearSession(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
```

- [ ] **Step 6: `src/app/page.tsx` бичих (нүүр)**

```tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isGameOpen, eventInfo } from '@/lib/config';
import { Brand } from '@/components/Brand';

export const dynamic = 'force-dynamic';

export default function Home() {
  // Тоглоом хаагдсан бол шууд үр дүнгийн хуудас руу (спек 3.2).
  if (!isGameOpen()) redirect('/result');

  const event = eventInfo();

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-10">
      <Brand />

      <div className="flex flex-1 flex-col justify-center py-10">
        <p className="text-sm font-semibold tracking-[0.2em] text-[#ED1C24]">
          ШИНЭ ЖИЛИЙН БАЯР
        </p>
        <h1 className="mt-3 text-5xl font-extrabold leading-none tracking-tight sm:text-6xl">
          2026
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-[#221E20]">
          Богино тоглоом тоглоод урилгаа аваарай. Хамгийн өндөр оноо авсан
          эхний 5 ажилтан арга хэмжээн дээр шагнал хүртэнэ.
        </p>

        <ul className="mt-8 space-y-2 text-base text-[#6B6568]">
          <li>· 10 асуулт — асуулт тус бүр 10 секунд</li>
          <li>· 20 секундын «Ачаа ачих» тоглоом</li>
          <li>· 3 удаа оролдож болно, хамгийн сайн оноо тооцогдоно</li>
        </ul>

        <Link
          href="/register"
          className="mt-10 inline-flex min-h-14 items-center justify-center rounded-lg
                     bg-[#ED1C24] px-8 text-lg font-semibold text-white hover:bg-[#C21019]"
        >
          Тоглож урилгаа ав
        </Link>
      </div>

      <footer className="border-t border-[#DAD5CC] pt-5 text-sm text-[#6B6568]">
        Арга хэмжээ: {event.date}
        {event.time ? ` · ${event.time}` : ''}
        {event.venue ? ` · ${event.venue}` : ''}
      </footer>
    </main>
  );
}
```

- [ ] **Step 7: `src/app/register/RegisterForm.tsx` бичих**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEPARTMENTS } from '@/lib/departments';
import { saveSession } from '@/lib/session';
import { Button } from '@/components/Button';

export function RegisterForm() {
  const router = useRouter();
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lastName, firstName, department, phone }),
      });
      const body = await res.json();

      if (!res.ok || !body.ok) {
        setError(body.error ?? 'Алдаа гарлаа. Дахин оролдоно уу.');
        return;
      }

      saveSession(body.data);
      router.push('/rules');
    } catch {
      setError('Сүлжээний алдаа. Дахин оролдоно уу.');
    } finally {
      setBusy(false);
    }
  }

  const field =
    'min-h-12 w-full rounded-lg border border-[#DAD5CC] bg-white px-4 text-base ' +
    'outline-none focus:border-[#ED1C24]';

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="lastName" className="mb-1.5 block text-sm font-semibold">Овог</label>
        <input id="lastName" className={field} value={lastName} autoComplete="family-name"
               onChange={(e) => setLastName(e.target.value)} placeholder="Батхүү" required />
      </div>

      <div>
        <label htmlFor="firstName" className="mb-1.5 block text-sm font-semibold">Нэр</label>
        <input id="firstName" className={field} value={firstName} autoComplete="given-name"
               onChange={(e) => setFirstName(e.target.value)} placeholder="Ганбат" required />
      </div>

      <div>
        <label htmlFor="department" className="mb-1.5 block text-sm font-semibold">Хэлтэс</label>
        <select id="department" className={field} value={department} required
                onChange={(e) => setDepartment(e.target.value)}>
          <option value="">— сонгоно уу —</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold">Утас</label>
        <input id="phone" className={field} value={phone} inputMode="numeric"
               autoComplete="tel" maxLength={8} placeholder="88112233"
               onChange={(e) => setPhone(e.target.value)} required />
        <p className="mt-1.5 text-sm text-[#6B6568]">
          Нэг дугаараар нэг л удаа бүртгүүлнэ.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-[#FDECEC] px-4 py-3 text-base text-[#8A0F15]">
          {error}
        </p>
      )}

      <Button type="submit" disabled={busy} className="w-full">
        {busy ? 'Түр хүлээнэ үү…' : 'Үргэлжлүүлэх'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 8: `src/app/register/page.tsx` бичих**

```tsx
import { redirect } from 'next/navigation';
import { isGameOpen } from '@/lib/config';
import { Brand } from '@/components/Brand';
import { RegisterForm } from './RegisterForm';

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  if (!isGameOpen()) redirect('/result');

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <Brand />
      <h1 className="mt-10 text-3xl font-extrabold tracking-tight">Бүртгэл</h1>
      <p className="mt-2 text-base text-[#6B6568]">
        Овог нэрээ <strong>кирилл</strong> үсгээр бичнэ үү.
      </p>
      <div className="mt-8">
        <RegisterForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 9: Гараар шалгах**

```bash
npm run dev
```

Browser дээр `http://localhost:3000` нээж шалгах:
- Нүүр хуудсанд лого, «Тоглож урилгаа ав» товч харагдана
- Бүртгэлийн форм бөглөөд латин нэр оруулбал улаан алдааны мессеж гарна
- Кирилл нэр оруулбал `/rules` рүү шилжинэ (одоохондоо 404 — Task 12-т үүснэ)
- Утсан дэлгэцийн өргөнд (DevTools → iPhone) хэвтээ гүйлгэх зураас гарахгүй

- [ ] **Step 10: Commit**

```bash
git add src/app src/components src/lib/session.ts public/logo.png
git commit -m "feat: UI суурь, нүүр хуудас, бүртгэлийн форм"
```

---

## Task 12: Дүрмийн хуудас ба Quiz UI

**Files:**
- Create: `src/app/rules/page.tsx`
- Create: `src/app/play/page.tsx`, `src/app/play/PlayClient.tsx`
- Create: `src/app/play/QuizStage.tsx`
- Create: `src/lib/api.ts`

**Interfaces:**
- Consumes: `/api/attempt/start`, `/api/attempt/[id]/question`, `/api/attempt/[id]/answer`, `loadSession`
- Produces: `apiPost<T>(url, body): Promise<ApiResult<T>>`, `apiGet<T>(url): Promise<ApiResult<T>>`, `<QuizStage onDone={...} />`

- [ ] **Step 1: `src/lib/api.ts` бичих**

```ts
'use client';

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

async function call<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, init);
    const body = await res.json().catch(() => null);

    if (!res.ok || !body?.ok) {
      return {
        ok: false,
        status: res.status,
        error: body?.error ?? 'Алдаа гарлаа. Дахин оролдоно уу.',
      };
    }
    return { ok: true, data: body.data as T };
  } catch {
    return { ok: false, status: 0, error: 'Сүлжээний алдаа. Дахин оролдоно уу.' };
  }
}

export function apiGet<T>(url: string): Promise<ApiResult<T>> {
  return call<T>(url, { cache: 'no-store' });
}

export function apiPost<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  return call<T>(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
```

- [ ] **Step 2: `src/app/rules/page.tsx` бичих**

```tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isGameOpen, QUIZ, REACTION, GAME } from '@/lib/config';
import { Brand } from '@/components/Brand';

export const dynamic = 'force-dynamic';

export default function RulesPage() {
  if (!isGameOpen()) redirect('/result');

  const seconds = REACTION.DURATION_MS / 1000;

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-10">
      <Brand />
      <h1 className="mt-10 text-3xl font-extrabold tracking-tight">Дүрэм</h1>

      <ol className="mt-8 space-y-6">
        <li>
          <h2 className="text-lg font-bold">1. Асуулт — {QUIZ.QUESTION_COUNT} ширхэг</h2>
          <p className="mt-1.5 text-base leading-relaxed text-[#6B6568]">
            Асуулт тус бүрт {QUIZ.TIME_LIMIT_MS / 1000} секунд. Хурдан хариулах тусам
            илүү оноо. Хугацаа дуусвал дараагийн асуулт руу автоматаар шилжинэ.
          </p>
        </li>
        <li>
          <h2 className="text-lg font-bold">2. Ачаа ачих — {seconds} секунд</h2>
          <p className="mt-1.5 text-base leading-relaxed text-[#6B6568]">
            Улаан контейнер дээр дарж ачна (+{REACTION.GOOD_POINTS}).
            Хар «эвдэрсэн ачаа» дээр дарвал оноо хасагдана ({REACTION.BAD_POINTS}).
          </p>
        </li>
        <li>
          <h2 className="text-lg font-bold">3. Оролдлого — {GAME.MAX_ATTEMPTS} удаа</h2>
          <p className="mt-1.5 text-base leading-relaxed text-[#6B6568]">
            Хамгийн сайн оноо тооцогдоно. Эхний {GAME.PRIZE_PLACES} байр шагналтай.
          </p>
        </li>
      </ol>

      <div className="flex-1" />

      <Link
        href="/play"
        className="mt-10 inline-flex min-h-14 w-full items-center justify-center rounded-lg
                   bg-[#ED1C24] px-8 text-lg font-semibold text-white hover:bg-[#C21019]"
      >
        Эхлэх
      </Link>
    </main>
  );
}
```

- [ ] **Step 3: `src/app/play/QuizStage.tsx` бичих**

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';

type Question = {
  position: number;
  total: number;
  questionId: number;
  text: string;
  options: string[];
  timeLimitMs: number;
};

type Props = {
  attemptId: string;
  onDone: () => void;
  onError: (message: string) => void;
};

export function QuizStage({ attemptId, onDone, onError }: Props) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean; points: number } | null>(null);
  const deadlineRef = useRef(0);

  const loadNext = useCallback(async () => {
    setFeedback(null);
    setLocked(false);

    const res = await apiGet<Question | null>(`/api/attempt/${attemptId}/question`);
    if (!res.ok) { onError(res.error); return; }

    if (res.data === null) { onDone(); return; }

    setQuestion(res.data);
    deadlineRef.current = Date.now() + res.data.timeLimitMs;
    setRemainingMs(res.data.timeLimitMs);
  }, [attemptId, onDone, onError]);

  const answer = useCallback(async (shownIndex: number) => {
    if (locked || !question) return;
    setLocked(true);

    const res = await apiPost<{ isCorrect: boolean; points: number }>(
      `/api/attempt/${attemptId}/answer`,
      { questionId: question.questionId, choiceIndex: shownIndex },
    );

    if (!res.ok) {
      // Хугацаа дууссаны улмаас сервер татгалзсан бол дараагийн асуулт руу.
      setFeedback({ correct: false, points: 0 });
    } else {
      setFeedback({ correct: res.data.isCorrect, points: res.data.points });
    }

    setTimeout(() => { void loadNext(); }, 900);
  }, [attemptId, locked, loadNext, question]);

  useEffect(() => { void loadNext(); }, [loadNext]);

  // Цаг тоолуур — 100ms тутам шинэчилнэ, 0 болоход автоматаар алгасна.
  useEffect(() => {
    if (!question || locked) return;

    const timer = setInterval(() => {
      const left = Math.max(0, deadlineRef.current - Date.now());
      setRemainingMs(left);
      if (left === 0) { void answer(-1); }
    }, 100);

    return () => clearInterval(timer);
  }, [question, locked, answer]);

  if (!question) {
    return <p className="py-20 text-center text-[#6B6568]">Ачааллаж байна…</p>;
  }

  const pct = (remainingMs / question.timeLimitMs) * 100;

  return (
    <div className="no-select">
      <div className="flex items-baseline justify-between text-sm font-semibold text-[#6B6568]">
        <span>Асуулт {question.position} / {question.total}</span>
        <span className={remainingMs < 3000 ? 'text-[#ED1C24]' : ''}>
          {Math.ceil(remainingMs / 1000)} сек
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E3DED2]">
        <div
          className="h-full rounded-full bg-[#ED1C24] transition-[width] duration-100 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>

      <h2 className="mt-8 text-2xl font-bold leading-snug">{question.text}</h2>

      <div className="mt-6 space-y-3">
        {question.options.map((option, i) => (
          <button
            key={i}
            type="button"
            disabled={locked}
            onClick={() => void answer(i)}
            className="min-h-14 w-full rounded-lg border border-[#DAD5CC] bg-white px-5
                       py-3 text-left text-base font-medium transition
                       hover:border-[#ED1C24] disabled:opacity-60"
          >
            {option}
          </button>
        ))}
      </div>

      {feedback && (
        <p
          role="status"
          className={`mt-6 rounded-lg px-4 py-3 text-base font-semibold ${
            feedback.correct ? 'bg-[#E6F4EA] text-[#13693B]' : 'bg-[#FDECEC] text-[#8A0F15]'
          }`}
        >
          {feedback.correct ? `Зөв! +${feedback.points} оноо` : 'Буруу'}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: `src/app/play/PlayClient.tsx` бичих (quiz хүртэл)**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { loadSession } from '@/lib/session';
import { Button } from '@/components/Button';
import { QuizStage } from './QuizStage';
import type { SpawnItem } from '@/lib/reaction';

type StartData = {
  attemptId: string;
  spawnSchedule: SpawnItem[];
  answered: number;
  reactionDone: boolean;
};

type Stage = 'loading' | 'quiz' | 'reaction' | 'error';

export function PlayClient() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('loading');
  const [start, setStart] = useState<StartData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const session = loadSession();
    if (!session) { router.replace('/register'); return; }

    void (async () => {
      const res = await apiPost<StartData>('/api/attempt/start', {
        registrationId: session.id,
      });
      if (!res.ok) { setError(res.error); setStage('error'); return; }

      setStart(res.data);
      setStage(res.data.reactionDone ? 'reaction' : 'quiz');
    })();
  }, [router]);

  if (stage === 'loading') {
    return <p className="py-24 text-center text-[#6B6568]">Бэлтгэж байна…</p>;
  }

  if (stage === 'error') {
    return (
      <div className="py-16">
        <p role="alert" className="rounded-lg bg-[#FDECEC] px-4 py-3 text-base text-[#8A0F15]">
          {error}
        </p>
        <Button className="mt-6 w-full" onClick={() => router.push('/result')}>
          Үр дүн харах
        </Button>
      </div>
    );
  }

  if (!start) return null;

  if (stage === 'quiz') {
    return (
      <QuizStage
        attemptId={start.attemptId}
        onDone={() => setStage('reaction')}
        onError={(m) => { setError(m); setStage('error'); }}
      />
    );
  }

  // 'reaction' үе Task 13-т нэмэгдэнэ.
  return <p className="py-24 text-center text-[#6B6568]">Ачаа ачих тоглоом бэлдэж байна…</p>;
}
```

- [ ] **Step 5: `src/app/play/page.tsx` бичих**

```tsx
import { Brand } from '@/components/Brand';
import { PlayClient } from './PlayClient';

export const dynamic = 'force-dynamic';

export default function PlayPage() {
  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <Brand className="h-8" />
      <div className="mt-8">
        <PlayClient />
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Гараар шалгах**

```bash
npm run dev
```

Browser дээр бүтэн урсгалыг туулах: бүртгэл → дүрэм → тоглоом.
Шалгах зүйлс:
- 10 асуулт дараалан гарна, `Асуулт N / 10` зөв өснө
- Цаг тоолуур буурна, 0 болоход автоматаар дараагийн асуулт руу шилжинэ
- Хариулт дарахад «Зөв! +N оноо» эсвэл «Буруу» гарна
- Хуудсыг дунд нь refresh хийхэд ижил асуултаас үргэлжилнэ
- 10 асуулт дуусахад «Ачаа ачих тоглоом бэлдэж байна…» гарна

- [ ] **Step 7: Commit**

```bash
git add src/app/rules src/app/play src/lib/api.ts
git commit -m "feat: дүрмийн хуудас ба quiz-ийн UI"
```

---

## Task 13: Reaction тоглоомын UI

**Files:**
- Create: `src/app/play/ReactionStage.tsx`
- Modify: `src/app/play/PlayClient.tsx` (reaction үеийг холбох)

**Interfaces:**
- Consumes: `SpawnItem`, `REACTION`, `/api/attempt/[id]/reaction`, `/api/attempt/[id]/finish`
- Produces: `<ReactionStage attemptId schedule onDone onError />`

- [ ] **Step 1: `src/app/play/ReactionStage.tsx` бичих**

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiPost } from '@/lib/api';
import { REACTION } from '@/lib/config';
import type { SpawnItem, Tap } from '@/lib/reaction';
import { Button } from '@/components/Button';

type Props = {
  attemptId: string;
  schedule: SpawnItem[];
  onDone: () => void;
  onError: (message: string) => void;
};

type Phase = 'ready' | 'running' | 'sending';

export function ReactionStage({ attemptId, schedule, onDone, onError }: Props) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [elapsed, setElapsed] = useState(0);
  const [shownScore, setShownScore] = useState(0);
  const [tappedIds, setTappedIds] = useState<Set<number>>(new Set());

  const startedAtRef = useRef(0);
  const tapsRef = useRef<Tap[]>([]);

  const submit = useCallback(async () => {
    setPhase('sending');
    const res = await apiPost<{ reactionScore: number }>(
      `/api/attempt/${attemptId}/reaction`,
      { taps: tapsRef.current },
    );
    if (!res.ok) { onError(res.error); return; }
    onDone();
  }, [attemptId, onDone, onError]);

  // Тоглоомын цаг — requestAnimationFrame-ээр жигд явуулна.
  useEffect(() => {
    if (phase !== 'running') return;

    let frame = 0;
    const tick = () => {
      const t = Date.now() - startedAtRef.current;
      setElapsed(t);
      if (t >= REACTION.DURATION_MS) { void submit(); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [phase, submit]);

  function begin() {
    startedAtRef.current = Date.now();
    tapsRef.current = [];
    setTappedIds(new Set());
    setShownScore(0);
    setElapsed(0);
    setPhase('running');
  }

  function tap(item: SpawnItem) {
    if (phase !== 'running' || tappedIds.has(item.id)) return;

    const t = Date.now() - startedAtRef.current;
    if (tapsRef.current.length >= REACTION.MAX_TAPS) return;

    tapsRef.current.push({ id: item.id, t });
    setTappedIds((prev) => new Set(prev).add(item.id));
    setShownScore((s) => Math.max(0, s + (item.kind === 'good'
      ? REACTION.GOOD_POINTS : REACTION.BAD_POINTS)));
  }

  if (phase === 'ready') {
    return (
      <div className="py-10 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight">Ачаа ачих</h2>
        <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-[#6B6568]">
          {REACTION.DURATION_MS / 1000} секундын дотор <strong>улаан контейнер</strong> дээр
          дарж ачаарай. <strong>Хар эвдэрсэн ачаа</strong> дээр дарвал оноо хасагдана.
        </p>
        <Button className="mt-10 w-full" onClick={begin}>Эхлэх</Button>
      </div>
    );
  }

  if (phase === 'sending') {
    return <p className="py-24 text-center text-[#6B6568]">Оноог тооцож байна…</p>;
  }

  const visible = schedule.filter(
    (i) => elapsed >= i.t
      && elapsed <= i.t + REACTION.OBJECT_LIFETIME_MS
      && !tappedIds.has(i.id),
  );
  const remaining = Math.ceil((REACTION.DURATION_MS - elapsed) / 1000);

  return (
    <div className="no-select">
      <div className="flex items-baseline justify-between text-sm font-semibold">
        <span className="text-[#6B6568]">Оноо: {shownScore}</span>
        <span className={remaining <= 5 ? 'text-[#ED1C24]' : 'text-[#6B6568]'}>
          {remaining} сек
        </span>
      </div>

      <div
        className="relative mt-3 w-full overflow-hidden rounded-xl bg-[#221E20] touch-none"
        style={{ height: 'min(70dvh, 560px)' }}
      >
        {visible.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.kind === 'good' ? 'Контейнер ачих' : 'Эвдэрсэн ачаа'}
            onPointerDown={() => tap(item)}
            className="absolute rounded-md"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              width: 64,
              height: 48,
              marginLeft: -32,
              marginTop: -24,
              background: item.kind === 'good' ? '#ED1C24' : '#4A4446',
              border: item.kind === 'good' ? '2px solid #FF6B70' : '2px dashed #8A8285',
            }}
          />
        ))}
      </div>

      <p className="mt-3 text-center text-sm text-[#6B6568]">
        Улаан = ачих · Хар тасархай = бүү дар
      </p>
    </div>
  );
}
```

> **Хүртээмж:** объект бүр жинхэнэ `<button>` бөгөөд `aria-label`-тай. Улаан/хар хоёр нь өнгөнөөс гадна **хүрээгээрээ** (бүтэн vs тасархай) ялгагдана — өнгө ялгахад хүндрэлтэй хүн ч тоглоно.

- [ ] **Step 2: `src/app/play/PlayClient.tsx`-ийн reaction хэсгийг солих**

Файлын төгсгөлийн дараах мөрүүдийг:

```tsx
  // 'reaction' үе Task 13-т нэмэгдэнэ.
  return <p className="py-24 text-center text-[#6B6568]">Ачаа ачих тоглоом бэлдэж байна…</p>;
```

дараахаар солино:

```tsx
  return (
    <ReactionStage
      attemptId={start.attemptId}
      schedule={start.spawnSchedule}
      onDone={async () => {
        const res = await apiPost<unknown>(`/api/attempt/${start.attemptId}/finish`, {});
        if (!res.ok) { setError(res.error); setStage('error'); return; }
        router.push('/result');
      }}
      onError={(m) => { setError(m); setStage('error'); }}
    />
  );
```

Файлын эхэнд import нэмэх:

```tsx
import { ReactionStage } from './ReactionStage';
```

- [ ] **Step 3: Гараар шалгах**

```bash
npm run dev
```

Бүтэн урсгалыг утсан дэлгэц дээр (DevTools → iPhone 14) туулах:
- Quiz дууссаны дараа «Ачаа ачих» дүрэм гарна
- «Эхлэх» дарахад 20 секундын тоглоом эхэлнэ, объект гарч ирээд алга болно
- Улаан дарахад оноо нэмэгдэнэ, хар дарахад хасагдана
- Оноо 0-ээс доош буухгүй
- 20 секунд дуусахад автоматаар серверт илгээгдэнэ
- `/result` рүү шилжинэ (одоохондоо 404 — Task 14-т үүснэ)

- [ ] **Step 4: Серверийн оноо client-ийн оноотой тохирч буйг шалгах**

```bash
docker compose exec -T db psql -U mlg -d mlg \
  -c "SELECT reaction_score, quiz_score, total_score FROM attempts ORDER BY started_at DESC LIMIT 1;"
```

Хүлээгдэх: `reaction_score` нь дэлгэц дээр харагдсан оноотой ойролцоо (сүлжээний саатлаас болж 1-2 tap зөрж болно).

- [ ] **Step 5: Commit**

```bash
git add src/app/play
git commit -m "feat: reaction тоглоомын UI"
```

---

## Task 14: Үр дүн ба leaderboard-ийн хуудас

**Files:**
- Create: `src/app/result/page.tsx`, `src/app/result/ResultClient.tsx`
- Create: `src/app/api/standing/route.ts`
- Create: `src/components/LeaderTable.tsx`

**Interfaces:**
- Consumes: `/api/leaderboard`, `/api/standing`, `loadSession`, `getStanding`, `findByPhone`, `isGameOpen`
- Produces: `<LeaderTable rows highlightRank />`

- [ ] **Step 1: `src/app/api/standing/route.ts` бичих**

Хаагдсаны дараа хүн утсаа оруулаад өөрийн байр, кодоо олох зам.

```ts
import { getStanding } from '@/lib/repo/leaderboard';
import { findByPhone } from '@/lib/repo/registrations';
import { validatePhone } from '@/lib/validation';
import { ok, bad, boom, readJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  const body = await readJson<{ phone?: string }>(req);
  const phone = validatePhone(body?.phone ?? '');
  if (!phone.ok) return bad(phone.error);

  try {
    const reg = await findByPhone(phone.value);
    if (!reg) return bad('Энэ дугаараар бүртгэл олдсонгүй', 404);

    const standing = await getStanding(reg.id);
    return ok({
      lastName: reg.lastName,
      firstName: reg.firstName,
      inviteCode: reg.inviteCode,
      bestScore: reg.bestScore,
      rank: standing?.rank ?? null,
      total: standing?.total ?? 0,
    });
  } catch (err) {
    console.error('[standing]', err);
    return boom();
  }
}
```

- [ ] **Step 2: `src/components/LeaderTable.tsx` бичих**

```tsx
type Row = {
  rank: number;
  lastName: string;
  firstName: string;
  bestScore: number;
  isPrize: boolean;
};

export function LeaderTable({
  rows, highlightRank,
}: { rows: Row[]; highlightRank?: number | null }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-[#6B6568]">Одоогоор оролцогч алга.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#DAD5CC]">
      <table className="w-full border-collapse text-base">
        <caption className="sr-only">Оноогоор эрэмбэлсэн жагсаалт</caption>
        <thead>
          <tr className="bg-[#221E20] text-left text-sm text-[#FAF7F0]">
            <th scope="col" className="px-3 py-2.5 font-semibold">Байр</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Ажилтан</th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">Оноо</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const mine = highlightRank === r.rank;
            return (
              <tr
                key={r.rank}
                className={`border-t border-[#E3DED2] ${
                  mine ? 'bg-[#FDECEC] font-semibold' : r.isPrize ? 'bg-[#FFF8E8]' : ''
                }`}
              >
                <td className="px-3 py-2.5 tabular-nums">
                  {r.rank}
                  {r.isPrize && (
                    <span className="ml-1.5 text-sm text-[#ED1C24]" title="Шагналтай байр">★</span>
                  )}
                </td>
                <td className="px-3 py-2.5">{r.lastName} {r.firstName}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {r.bestScore.toLocaleString('mn-MN')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

> ★ тэмдэг нь өнгөнөөс гадна шагналтай байрыг ялгана — өнгө ялгахад хүндрэлтэй хүн ч ойлгоно.

- [ ] **Step 3: `src/app/result/ResultClient.tsx` бичих**

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { loadSession, type Session } from '@/lib/session';
import { Button } from '@/components/Button';
import { LeaderTable } from '@/components/LeaderTable';

type LeaderRow = {
  rank: number; lastName: string; firstName: string; bestScore: number; isPrize: boolean;
};

type Standing = {
  lastName: string; firstName: string; inviteCode: string;
  bestScore: number; rank: number | null; total: number;
};

export function ResultClient({ gameOpen }: { gameOpen: boolean }) {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [me, setMe] = useState<Standing | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [phone, setPhone] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSession(loadSession());
    void (async () => {
      const res = await apiGet<LeaderRow[]>('/api/leaderboard?limit=200');
      if (res.ok) setRows(res.data);
    })();
  }, []);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupError('');
    setBusy(true);
    const res = await apiPost<Standing>('/api/standing', { phone });
    setBusy(false);
    if (!res.ok) { setLookupError(res.error); return; }
    setMe(res.data);
  }

  const field =
    'min-h-12 w-full rounded-lg border border-[#DAD5CC] bg-white px-4 text-base ' +
    'outline-none focus:border-[#ED1C24]';

  return (
    <div className="space-y-10">
      {me && (
        <section className="rounded-xl border-2 border-[#ED1C24] bg-white p-5">
          <p className="text-sm font-semibold tracking-[0.16em] text-[#6B6568]">ТАНЫ ҮР ДҮН</p>
          <p className="mt-2 text-2xl font-extrabold">{me.lastName} {me.firstName}</p>
          <p className="mt-1 text-lg">
            {me.bestScore.toLocaleString('mn-MN')} оноо
            {me.rank ? ` · ${me.rank} / ${me.total} байр` : ' · тоглоогүй'}
          </p>
          <Link
            href={`/invite/${me.inviteCode}`}
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-lg
                       bg-[#ED1C24] px-6 font-semibold text-white hover:bg-[#C21019]"
          >
            Урилгаа харах ({me.inviteCode})
          </Link>
        </section>
      )}

      {!me && session && (
        <section className="rounded-xl border border-[#DAD5CC] bg-white p-5">
          <p className="text-base">
            <strong>{session.lastName} {session.firstName}</strong> — урилгын дугаар{' '}
            <strong>{session.inviteCode}</strong>
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/invite/${session.inviteCode}`}
              className="inline-flex min-h-12 items-center justify-center rounded-lg
                         bg-[#ED1C24] px-6 font-semibold text-white hover:bg-[#C21019]"
            >
              Урилгаа харах
            </Link>
            {gameOpen && session.attemptsLeft > 0 && (
              <Link
                href="/play"
                className="inline-flex min-h-12 items-center justify-center rounded-lg
                           border border-[#221E20] px-6 font-semibold hover:bg-[#221E20] hover:text-white"
              >
                Дахин тоглох ({session.attemptsLeft} үлдсэн)
              </Link>
            )}
          </div>
        </section>
      )}

      {!me && (
        <section>
          <h2 className="text-lg font-bold">Өөрийн байраа олох</h2>
          <form onSubmit={lookup} className="mt-3 flex gap-3">
            <input
              className={field} value={phone} inputMode="numeric" maxLength={8}
              placeholder="Утасны дугаар" aria-label="Утасны дугаар"
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button type="submit" disabled={busy}>Хайх</Button>
          </form>
          {lookupError && (
            <p role="alert" className="mt-3 rounded-lg bg-[#FDECEC] px-4 py-3 text-[#8A0F15]">
              {lookupError}
            </p>
          )}
        </section>
      )}

      <section>
        <h2 className="text-lg font-bold">Нийт жагсаалт</h2>
        <p className="mb-3 mt-1 text-sm text-[#6B6568]">
          ★ тэмдэгтэй эхний 5 байр шагнал хүртэнэ.
        </p>
        <LeaderTable rows={rows} highlightRank={me?.rank ?? null} />
      </section>
    </div>
  );
}
```

- [ ] **Step 4: `src/app/result/page.tsx` бичих**

```tsx
import { Brand } from '@/components/Brand';
import { isGameOpen, eventInfo } from '@/lib/config';
import { ResultClient } from './ResultClient';

export const dynamic = 'force-dynamic';

export default function ResultPage() {
  const open = isGameOpen();
  const event = eventInfo();

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Brand />

      <h1 className="mt-10 text-3xl font-extrabold tracking-tight">
        {open ? 'Үр дүн' : 'Тоглоом дууслаа'}
      </h1>

      {!open && (
        <p className="mt-3 rounded-lg bg-[#221E20] px-5 py-4 text-base text-[#FAF7F0]">
          Тэмцээн хаагдлаа. Арга хэмжээ <strong>{event.date}</strong>
          {event.time ? ` · ${event.time}` : ''}
          {event.venue ? ` · ${event.venue}` : ''} болно.
          Урилгаа доороос дахин татаж авч болно.
        </p>
      )}

      <div className="mt-8">
        <ResultClient gameOpen={open} />
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Гараар шалгах**

```bash
npm run dev
```

- Бүтэн урсгал туулаад `/result` дээр очиход өөрийн оноо, байр, урилгын дугаар харагдана
- Утасны дугаараар хайхад үр дүн гарна, байхгүй дугаараар «бүртгэл олдсонгүй»
- Жагсаалтад эхний 5 байр ★ тэмдэгтэй, арын өнгөтэй
- `.env.local` дээр `GAME_CLOSES_AT`-ыг өнгөрсөн огноо болгоод dev-ийг дахин асаахад нүүр хуудас `/result` руу шилжиж, «Тоглоом дууслаа» гарна. Шалгасны дараа буцааж засна.

- [ ] **Step 6: Commit**

```bash
git add src/app/result src/app/api/standing src/components/LeaderTable.tsx
git commit -m "feat: үр дүн ба leaderboard-ийн хуудас"
```

---

## Task 15: Урилгын хуудас ба PNG зураг

**Files:**
- Create: `scripts/fetch-fonts.mjs`
- Create: `src/assets/fonts/.gitkeep`
- Create: `src/app/invite/[code]/page.tsx`
- Create: `src/app/invite/[code]/InviteActions.tsx`
- Create: `src/app/invite/[code]/image/route.tsx`

**Interfaces:**
- Consumes: `findByInviteCode`, `getStanding`, `eventInfo`, `ImageResponse` (`next/og`)
- Produces: `GET /invite/[code]/image` → 1080×1350 PNG

> **Дизайн:** энэ PNG нь canvas дээрх **B — Контейнер** загварыг хэрэгжүүлнэ (цөөвөр цагаан дэвсгэр + брэндийн улаан). Өөр загвар (A, C, D, E, F) сонговол ЗӨВХӨН `image/route.tsx`-ийн JSX-ийг солино — бусад код хөндөгдөхгүй.

- [ ] **Step 1: Кирилл үсэгтэй фонт татах скрипт бичих**

`scripts/fetch-fonts.mjs`:

```js
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const DIR = 'src/assets/fonts';

// Google Fonts-ийн эх санд байгаа статик TTF. Satori нь woff2-ыг уншихгүй тул
// заавал .ttf хэрэгтэй. Noto Sans нь кирилл үсгийг бүрэн дэмждэг.
const FILES = [
  ['NotoSans-Regular.ttf', 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/static/NotoSans-Regular.ttf'],
  ['NotoSans-Bold.ttf', 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/static/NotoSans-Bold.ttf'],
];

await mkdir(DIR, { recursive: true });

for (const [name, url] of FILES) {
  const path = `${DIR}/${name}`;
  if (existsSync(path)) { console.log(`• ${name} аль хэдийн байна`); continue; }

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`✗ ${name} татагдсангүй (${res.status}) — ${url}`);
    console.error('  Кирилл дэмждэг ямар ч статик .ttf файлыг гараар энэ замд хуулж болно.');
    process.exit(1);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 50_000) {
    console.error(`✗ ${name} хэт жижиг (${buf.length} байт) — файл буруу байж магадгүй`);
    process.exit(1);
  }

  await writeFile(path, buf);
  console.log(`✓ ${name} (${Math.round(buf.length / 1024)} KB)`);
}
```

`package.json`-ийн `scripts`-д нэмэх:

```json
"fonts": "node scripts/fetch-fonts.mjs"
```

- [ ] **Step 2: Фонт татаж шалгах**

```bash
npm run fonts
ls -la src/assets/fonts/
```

Хүлээгдэх: хоёр `.ttf` файл, тус бүр 200 KB-аас дээш.

Татагдахгүй бол: кирилл дэмждэг ямар ч статик TTF (жишээ нь macOS дээрх `/System/Library/Fonts/Supplemental/Arial Unicode.ttf`) -ыг `src/assets/fonts/NotoSans-Regular.ttf` ба `NotoSans-Bold.ttf` нэрээр хуулна.

- [ ] **Step 3: `src/app/invite/[code]/image/route.tsx` бичих**

```tsx
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { findByInviteCode } from '@/lib/repo/registrations';
import { getStanding } from '@/lib/repo/leaderboard';
import { eventInfo } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const W = 1080;
const H = 1350;
const RED = '#ED1C24';
const INK = '#221E20';
const PAPER = '#FAF7F0';
const MUTED = '#6B6568';

async function loadFonts() {
  const dir = path.join(process.cwd(), 'src/assets/fonts');
  const [regular, bold] = await Promise.all([
    readFile(path.join(dir, 'NotoSans-Regular.ttf')),
    readFile(path.join(dir, 'NotoSans-Bold.ttf')),
  ]);
  return [
    { name: 'Noto', data: regular, weight: 400 as const, style: 'normal' as const },
    { name: 'Noto', data: bold, weight: 700 as const, style: 'normal' as const },
  ];
}

async function loadLogo(origin: string): Promise<string> {
  const res = await fetch(`${origin}/logo.png`);
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:image/png;base64,${buf.toString('base64')}`;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ code: string }> },
): Promise<Response> {
  const { code } = await ctx.params;

  const reg = await findByInviteCode(code);
  if (!reg) return new Response('Урилга олдсонгүй', { status: 404 });

  const standing = await getStanding(reg.id);
  const event = eventInfo();
  const origin = new URL(req.url).origin;
  const [fonts, logo] = await Promise.all([loadFonts(), loadLogo(origin)]);

  const label = (text: string) => (
    <div style={{ fontSize: 20, letterSpacing: 3, color: MUTED }}>{text}</div>
  );

  return new ImageResponse(
    (
      <div style={{
        width: W, height: H, display: 'flex', flexDirection: 'column',
        background: PAPER, color: INK, fontFamily: 'Noto',
      }}>
        <div style={{ display: 'flex', height: 16 }}>
          <div style={{ flexGrow: 3, background: RED }} />
          <div style={{ flexGrow: 1, background: INK }} />
          <div style={{ flexGrow: 2, background: RED }} />
        </div>

        <div style={{ display: 'flex', padding: '58px 80px 0', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={310} height={86} alt="Monlogistics Group" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', padding: '62px 80px 0' }}>
          <div style={{ fontSize: 100, fontWeight: 700, lineHeight: 1 }}>ШИНЭ ЖИЛИЙН</div>
          <div style={{ fontSize: 100, fontWeight: 700, lineHeight: 1 }}>БАЯР 2026</div>
          <div style={{ marginTop: 26, fontSize: 30, color: RED }}>
            Жилийн аян замын төгсгөлд — хамтдаа
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, padding: '56px 80px 0', alignItems: 'flex-end' }}>
          {[56, 112, 56, 168, 112, 56, 112].map((h, i) => (
            <div key={i} style={{
              width: 116, height: h, borderRadius: 4,
              background: [RED, INK, '#E3DED2'][i % 3],
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', padding: '10px 80px 0' }}>
          <div style={{ width: '100%', height: 6, borderRadius: 3, background: INK }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', padding: '54px 80px 0' }}>
          {label('УРИЛГА ЭЗЭМШИГЧ')}
          <div style={{ marginTop: 12, fontSize: 64, fontWeight: 700 }}>
            {reg.lastName} {reg.firstName}
          </div>
          <div style={{ marginTop: 10, fontSize: 26, color: MUTED }}>
            {reg.bestScore.toLocaleString('en-US')} оноо
            {standing ? ` · ${standing.rank}-р байр` : ''}
          </div>
        </div>

        <div style={{ flexGrow: 1 }} />

        <div style={{
          display: 'flex', margin: '0 80px', borderRadius: 8, background: INK,
          color: PAPER, padding: '38px 44px', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', marginRight: 56 }}>
            <div style={{ fontSize: 18, letterSpacing: 3, color: '#B5AFB1' }}>ОГНОО</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{event.date}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginRight: 56 }}>
            <div style={{ fontSize: 18, letterSpacing: 3, color: '#B5AFB1' }}>ЦАГ</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{event.time || '—'}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <div style={{ fontSize: 18, letterSpacing: 3, color: '#B5AFB1' }}>БАЙРШИЛ</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{event.venue || '—'}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 18, letterSpacing: 3, color: '#B5AFB1' }}>ДУГААР</div>
            <div style={{ fontSize: 36, fontWeight: 700 }}>{reg.inviteCode}</div>
          </div>
        </div>

        <div style={{ display: 'flex', height: 48 }} />
        <div style={{ display: 'flex', height: 16 }}>
          <div style={{ flexGrow: 2, background: RED }} />
          <div style={{ flexGrow: 1, background: INK }} />
          <div style={{ flexGrow: 3, background: RED }} />
        </div>
      </div>
    ),
    { width: W, height: H, fonts },
  );
}
```

> **Satori-ийн хязгаарлалт:** бүх элемент заавал `display: 'flex'` эсвэл `display: 'none'` байх ёстой (нэгээс олон хүүхэдтэй бол). Дээрх код үүнийг дагасан.

- [ ] **Step 4: `src/app/invite/[code]/InviteActions.tsx` бичих**

```tsx
'use client';

import { Button } from '@/components/Button';

export function InviteActions({ code }: { code: string }) {
  async function download() {
    try {
      const res = await fetch(`/invite/${code}/image`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${code}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Татахад садаа болвол зургийг шинэ цонхонд нээж, урт дарж хадгалуулна.
      window.open(`/invite/${code}/image`, '_blank');
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={download}>Урилгаа татах</Button>
      <a
        href={`/invite/${code}/image`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-12 items-center justify-center rounded-lg
                   border border-[#221E20] px-6 font-semibold hover:bg-[#221E20] hover:text-white"
      >
        Шинэ цонхонд нээх
      </a>
    </div>
  );
}
```

- [ ] **Step 5: `src/app/invite/[code]/page.tsx` бичих**

```tsx
import { notFound } from 'next/navigation';
import { Brand } from '@/components/Brand';
import { findByInviteCode } from '@/lib/repo/registrations';
import { InviteActions } from './InviteActions';

export const dynamic = 'force-dynamic';

export default async function InvitePage(
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const reg = await findByInviteCode(code);
  if (!reg) notFound();

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <Brand />

      <h1 className="mt-10 text-3xl font-extrabold tracking-tight">Таны урилга</h1>
      <p className="mt-2 text-base text-[#6B6568]">
        Урилгын дугаар <strong className="text-[#221E20]">{reg.inviteCode}</strong>
      </p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/invite/${code}/image`}
        alt={`${reg.lastName} ${reg.firstName}-ийн урилга, дугаар ${reg.inviteCode}`}
        width={1080}
        height={1350}
        className="mt-6 w-full rounded-xl border border-[#DAD5CC]"
      />

      <div className="mt-6">
        <InviteActions code={code} />
      </div>

      <p className="mt-6 text-sm leading-relaxed text-[#6B6568]">
        Зураг татагдахгүй бол дээрх зураг дээр удаан дарж «Зураг хадгалах» сонгоно уу.
      </p>
    </main>
  );
}
```

- [ ] **Step 6: Гараар шалгах**

```bash
npm run dev
```

- `/invite/MLG-202601` нээхэд урилгын зураг харагдана
- Кирилл үсэг **зөв** харагдана (квадрат хайрцаг биш)
- «Урилгаа татах» дарахад `MLG-202601.png` татагдана
- Байхгүй код (`/invite/MLG-209999`) 404 буцаана
- Татсан файлыг нээж 1080×1350 хэмжээтэй эсэхийг шалгах:

```bash
sips -g pixelWidth -g pixelHeight ~/Downloads/MLG-202601.png
```

- [ ] **Step 7: Commit**

```bash
npm run fonts   # фонтыг git-д оруулах бол .gitignore-оос хасна
git add src/app/invite scripts/fetch-fonts.mjs src/assets/fonts
git commit -m "feat: урилгын хуудас ба PNG зураг үүсгэх"
```

> Фонтын файлыг git-д оруулахгүй бол Vercel дээр build хийхэд татагдахгүй. `package.json`-ийн `build` скриптийг `"build": "npm run fonts && next build"` болгож өөрчилнө, эсвэл TTF-ийг commit хийнэ. **Хялбар, найдвартай нь — commit хийх.**

---

## Task 16: Админ хуудас ба CSV экспорт

**Files:**
- Create: `src/lib/admin-auth.ts`
- Create: `src/app/admin/page.tsx`, `src/app/admin/LoginForm.tsx`
- Create: `src/app/api/admin/login/route.ts`
- Create: `src/app/api/admin/export/route.ts`
- Test: `tests/admin-auth.test.ts`

**Interfaces:**
- Consumes: `db`, `registrations`, `rankAll`, `ADMIN_PASSWORD`
- Produces: `signAdminToken(): string`, `verifyAdminToken(token: string | undefined): boolean`, `ADMIN_COOKIE`

- [ ] **Step 1: Унах тест бичих**

`tests/admin-auth.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { signAdminToken, verifyAdminToken } from '@/lib/admin-auth';

beforeEach(() => { process.env.ADMIN_PASSWORD = 'нууц-үг-123'; });

describe('admin token', () => {
  it('өөрийн гаргасан token-ыг хүлээн авна', () => {
    expect(verifyAdminToken(signAdminToken())).toBe(true);
  });

  it('хоосон token-ыг татгалзана', () => {
    expect(verifyAdminToken(undefined)).toBe(false);
    expect(verifyAdminToken('')).toBe(false);
  });

  it('өөрчилсөн token-ыг татгалзана', () => {
    const token = signAdminToken();
    expect(verifyAdminToken(token.slice(0, -1) + 'x')).toBe(false);
  });

  it('нууц үг солигдвол хуучин token хүчингүй болно', () => {
    const token = signAdminToken();
    process.env.ADMIN_PASSWORD = 'өөр-нууц-үг';
    expect(verifyAdminToken(token)).toBe(false);
  });

  it('ADMIN_PASSWORD тохируулаагүй бол алдаа шиднэ', () => {
    delete process.env.ADMIN_PASSWORD;
    expect(() => signAdminToken()).toThrow();
  });
});
```

- [ ] **Step 2: Тест унахыг шалгах**

```bash
npm test -- tests/admin-auth.test.ts
```

Хүлээгдэх: FAIL.

- [ ] **Step 3: `src/lib/admin-auth.ts` бичих**

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'mlg_admin';

function secret(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) throw new Error('ADMIN_PASSWORD тохируулаагүй байна');
  return pw;
}

/** Нууц үгнээс гаргасан тогтмол токен. Нууц үг солигдвол хуучин нь хүчингүй. */
export function signAdminToken(): string {
  return createHmac('sha256', secret()).update('mlg-admin-v1').digest('hex');
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  let expected: string;
  try { expected = signAdminToken(); } catch { return false; }

  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function checkPassword(input: string): boolean {
  let pw: string;
  try { pw = secret(); } catch { return false; }

  const a = Buffer.from(input ?? '');
  const b = Buffer.from(pw);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

- [ ] **Step 4: Тест ногоон болохыг шалгах**

```bash
npm test -- tests/admin-auth.test.ts
```

Хүлээгдэх: PASS.

- [ ] **Step 5: `src/app/api/admin/login/route.ts` бичих**

```ts
import { cookies } from 'next/headers';
import { checkPassword, signAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth';
import { ok, bad, readJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  const body = await readJson<{ password?: string }>(req);
  if (!checkPassword(body?.password ?? '')) {
    return bad('Нууц үг буруу байна', 401);
  }

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, signAdminToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  return ok({ ok: true });
}
```

- [ ] **Step 6: `src/app/api/admin/export/route.ts` бичих**

```ts
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { registrations } from '@/lib/db/schema';
import { rankAll } from '@/lib/scoring';
import { verifyAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** CSV талбарыг хашилтаар хамгаална (таслал, хашилт, мөр таслалт). */
function cell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(): Promise<Response> {
  const jar = await cookies();
  if (!verifyAdminToken(jar.get(ADMIN_COOKIE)?.value)) {
    return new Response('Нэвтрээгүй байна', { status: 401 });
  }

  const rows = await db.select().from(registrations);
  const ranked = rankAll(rows.map((r) => ({
    ...r, bestScore: r.bestScore, bestFinishedAt: r.bestFinishedAt,
  })));

  const header = [
    'Байр', 'Овог', 'Нэр', 'Хэлтэс', 'Утас',
    'Урилгын дугаар', 'Оноо', 'Оролдлого', 'Бүртгүүлсэн',
  ];

  const lines = [
    header.map(cell).join(','),
    ...ranked.map((r) => [
      r.bestScore > 0 ? r.rank : '',
      r.lastName, r.firstName, r.department, r.phone,
      r.inviteCode, r.bestScore, r.attemptsUsed,
      r.createdAt.toISOString(),
    ].map(cell).join(',')),
  ];

  // Excel кирилл үсгийг зөв уншихын тулд BOM нэмнэ.
  const csv = '﻿' + lines.join('\r\n');

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="mlg-registrations.csv"',
    },
  });
}
```

- [ ] **Step 7: `src/app/admin/LoginForm.tsx` бичих**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { Button } from '@/components/Button';

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await apiPost('/api/admin/login', { password });
    if (!res.ok) { setError(res.error); return; }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm space-y-4">
      <div>
        <label htmlFor="pw" className="mb-1.5 block text-sm font-semibold">Нууц үг</label>
        <input
          id="pw" type="password" value={password} autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-12 w-full rounded-lg border border-[#DAD5CC] bg-white px-4
                     text-base outline-none focus:border-[#ED1C24]"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-[#FDECEC] px-4 py-3 text-[#8A0F15]">{error}</p>
      )}
      <Button type="submit" className="w-full">Нэвтрэх</Button>
    </form>
  );
}
```

- [ ] **Step 8: `src/app/admin/page.tsx` бичих**

```tsx
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { registrations } from '@/lib/db/schema';
import { rankAll } from '@/lib/scoring';
import { verifyAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth';
import { GAME } from '@/lib/config';
import { Brand } from '@/components/Brand';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const jar = await cookies();
  const authed = verifyAdminToken(jar.get(ADMIN_COOKIE)?.value);

  if (!authed) {
    return (
      <main className="mx-auto max-w-xl px-5 py-10">
        <Brand />
        <h1 className="mt-10 text-3xl font-extrabold tracking-tight">Админ</h1>
        <div className="mt-8"><LoginForm /></div>
      </main>
    );
  }

  const rows = await db.select().from(registrations);
  const ranked = rankAll(rows);
  const played = ranked.filter((r) => r.bestScore > 0);

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Brand />

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Админ</h1>
        <a
          href="/api/admin/export"
          className="inline-flex min-h-12 items-center justify-center rounded-lg
                     bg-[#ED1C24] px-6 font-semibold text-white hover:bg-[#C21019]"
        >
          CSV татах
        </a>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#DAD5CC] bg-white p-4">
          <dt className="text-sm text-[#6B6568]">Бүртгүүлсэн</dt>
          <dd className="mt-1 text-3xl font-extrabold tabular-nums">{rows.length}</dd>
        </div>
        <div className="rounded-xl border border-[#DAD5CC] bg-white p-4">
          <dt className="text-sm text-[#6B6568]">Тоглосон</dt>
          <dd className="mt-1 text-3xl font-extrabold tabular-nums">{played.length}</dd>
        </div>
        <div className="rounded-xl border border-[#DAD5CC] bg-white p-4">
          <dt className="text-sm text-[#6B6568]">Хамгийн өндөр оноо</dt>
          <dd className="mt-1 text-3xl font-extrabold tabular-nums">
            {played[0]?.bestScore.toLocaleString('mn-MN') ?? '—'}
          </dd>
        </div>
      </dl>

      <div className="mt-8 overflow-x-auto rounded-xl border border-[#DAD5CC]">
        <table className="w-full border-collapse text-base">
          <thead>
            <tr className="bg-[#221E20] text-left text-sm text-[#FAF7F0]">
              <th scope="col" className="px-3 py-2.5">Байр</th>
              <th scope="col" className="px-3 py-2.5">Овог нэр</th>
              <th scope="col" className="px-3 py-2.5">Хэлтэс</th>
              <th scope="col" className="px-3 py-2.5">Утас</th>
              <th scope="col" className="px-3 py-2.5">Дугаар</th>
              <th scope="col" className="px-3 py-2.5 text-right">Оноо</th>
              <th scope="col" className="px-3 py-2.5 text-right">Оролдлого</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r) => (
              <tr
                key={r.id}
                className={`border-t border-[#E3DED2] ${
                  r.bestScore > 0 && r.rank <= GAME.PRIZE_PLACES ? 'bg-[#FFF8E8]' : ''
                }`}
              >
                <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                  {r.bestScore > 0 ? r.rank : '—'}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">{r.lastName} {r.firstName}</td>
                <td className="px-3 py-2.5">{r.department}</td>
                <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{r.phone}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{r.inviteCode}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{r.bestScore}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{r.attemptsUsed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
```

- [ ] **Step 9: Гараар шалгах**

```bash
npm run dev
```

- `/admin` нээхэд нууц үгийн форм гарна
- Буруу нууц үг → «Нууц үг буруу байна»
- `.env.local`-ийн `ADMIN_PASSWORD` утгыг оруулахад жагсаалт гарна
- «CSV татах» дарахад файл татагдана; Excel-ээр нээхэд кирилл үсэг зөв харагдана
- Нэвтрээгүй үед шууд `/api/admin/export` дуудахад 401 ирэхийг шалгах:

```bash
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/api/admin/export
```

Хүлээгдэх: `401`

- [ ] **Step 10: Commit**

```bash
git add src/lib/admin-auth.ts src/app/admin src/app/api/admin tests/admin-auth.test.ts
git commit -m "feat: админ хуудас ба CSV экспорт"
```

---

## Task 17: Deploy ба ачааллын шалгалт

**Files:**
- Create: `README.md`
- Modify: `package.json` (build скрипт)

- [ ] **Step 1: Бүх тест ба build ажиллуулах**

```bash
npm test
npm run build
```

Хүлээгдэх: бүх тест PASS, build алдаагүй.

- [ ] **Step 2: Ачааллын шалгалт — 200 зэрэг бүртгэл**

`scripts/load-test.mjs`:

```js
const BASE = process.argv[2] ?? 'http://localhost:3000';
const N = 200;

const started = Date.now();
const results = await Promise.all(
  Array.from({ length: N }, (_, i) =>
    fetch(`${BASE}/api/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lastName: 'Тест',
        firstName: `Ажилтан${i}`,
        department: 'Бусад',
        phone: `9${String(1000000 + i).padStart(7, '0')}`,
      }),
    }).then((r) => r.json()).catch(() => ({ ok: false })),
  ),
);

const okRows = results.filter((r) => r.ok);
const codes = new Set(okRows.map((r) => r.data.inviteCode));

console.log(`Хугацаа:       ${Date.now() - started} ms`);
console.log(`Амжилттай:     ${okRows.length} / ${N}`);
console.log(`Өвөрмөц код:   ${codes.size}`);

if (okRows.length !== N) { console.error('✗ Зарим хүсэлт амжилтгүй'); process.exit(1); }
if (codes.size !== N) { console.error('✗ Код давхардлаа!'); process.exit(1); }
console.log('✓ Бүх код өвөрмөц');
```

Ажиллуулах:

```bash
docker compose exec -T db psql -U mlg -d mlg \
  -c "TRUNCATE attempt_answers, attempts, registrations CASCADE; ALTER SEQUENCE invite_seq_counter RESTART WITH 1;"
npm run dev &
sleep 5
node scripts/load-test.mjs
```

Хүлээгдэх: `✓ Бүх код өвөрмөц`, 200/200 амжилттай.

Шалгасны дараа DB-г цэвэрлэж, `npm run seed` дахин ажиллуулна.

- [ ] **Step 3: `package.json`-ийн build скриптийг шалгах**

Фонтыг git-д commit хийсэн бол `build` хэвээр. Хийгээгүй бол:

```json
"build": "node scripts/fetch-fonts.mjs && next build"
```

- [ ] **Step 4: Production DB үүсгэж холбох**

```bash
npx vercel link
npx vercel env add DATABASE_URL production
npx vercel env add GAME_CLOSES_AT production
npx vercel env add EVENT_DATE production
npx vercel env add EVENT_TIME production
npx vercel env add EVENT_VENUE production
npx vercel env add ADMIN_PASSWORD production
```

`DATABASE_URL` — Vercel Postgres эсвэл Neon-ийн **pooled** холболтын мөр.

- [ ] **Step 5: Схем ба өгөгдлийг production руу түлхэх**

```bash
DATABASE_URL="<production-url>" npm run db:push
psql "<production-url>" -c "CREATE SEQUENCE IF NOT EXISTS invite_seq_counter START 1;"
DATABASE_URL="<production-url>" npm run seed
```

- [ ] **Step 6: Deploy**

```bash
npx vercel --prod
```

- [ ] **Step 7: Production дээр бүтэн урсгалыг гараар шалгах**

Жинхэнэ утаснаас (iPhone Safari ба Android Chrome):
- Бүртгэл → дүрэм → quiz → reaction → үр дүн → урилга татах
- Татсан PNG дээр кирилл үсэг, нэр, дугаар зөв
- `/admin` нэвтрээд CSV татах
- Тестийн бүртгэлүүдийг устгах:

```bash
psql "<production-url>" -c "TRUNCATE attempt_answers, attempts, registrations CASCADE; ALTER SEQUENCE invite_seq_counter RESTART WITH 1;"
```

- [ ] **Step 8: `README.md` бичих**

```markdown
# MLG Шинэ жилийн урилгын тоглоом

Monlogistics Group-ийн 2026 оны шинэ жилийн арга хэмжээний урилгыг
тоглоомоор дамжуулан олгох веб.

## Ажиллуулах

    cp .env.example .env.local
    docker compose up -d
    npm install
    npm run fonts
    npm run db:push
    docker compose exec -T db psql -U mlg -d mlg \
      -c "CREATE SEQUENCE IF NOT EXISTS invite_seq_counter START 1;"
    npm run seed
    npm run dev

## Тест

    npm test

## Арга хэмжээнээс өмнө заавал хийх

- [ ] `src/data/questions.ts` — `[БӨГЛӨХ]` тэмдэгтэй 3 асуултыг бөглөх
- [ ] `src/lib/departments.ts` — хэлтсийн жагсаалтыг бодит бүтцээр засах
- [ ] `EVENT_TIME`, `EVENT_VENUE` орчны хувьсагчийг бөглөх
- [ ] `ADMIN_PASSWORD`-ыг хүчтэй нууц үгээр солих
- [ ] Тестийн бүртгэлүүдийг цэвэрлэж, sequence-ийг 1 рүү буцаах

## Тохируулга

Бүх тоглоомын тогтмол `src/lib/config.ts` дотор. Оноог тэнцвэржүүлэхэд
`REACTION.SPAWN_INTERVAL_MS` (бага = илүү олон объект = өндөр дээд оноо)
болон `QUIZ.SPEED_POINTS_PER_SECOND`-ыг өөрчилнө.

Урилгын дизайныг солихдоо зөвхөн
`src/app/invite/[code]/image/route.tsx`-ийн JSX-ийг солино.
```

- [ ] **Step 9: Commit**

```bash
git add README.md scripts/load-test.mjs package.json
git commit -m "chore: README, ачааллын шалгалт, deploy бэлтгэл"
```

---

## Арга хэмжээнээс өмнөх шалгах хуудас

- [ ] `src/data/questions.ts` — 3 `[БӨГЛӨХ]` асуулт бөглөгдсөн
- [ ] `src/lib/departments.ts` — бодит хэлтсийн жагсаалт
- [ ] `EVENT_TIME`, `EVENT_VENUE` production дээр тохируулагдсан
- [ ] `GAME_CLOSES_AT` = `2026-12-03T23:59:59+08:00`
- [ ] `ADMIN_PASSWORD` хүчтэй нууц үгээр солигдсон
- [ ] Урилгын дизайн сонгогдож, `image/route.tsx`-д хэрэгжсэн
- [ ] Тестийн өгөгдөл устгагдаж, sequence 1-ээс эхэлсэн
- [ ] iPhone Safari + Android Chrome дээр бүтэн урсгал шалгагдсан
- [ ] Ачааллын шалгалт production дээр нэг удаа ажилласан (дараа нь цэвэрлэсэн)
