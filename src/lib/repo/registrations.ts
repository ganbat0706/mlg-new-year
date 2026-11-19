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

/** Бүртгэлийн id-аар хайна — үр дүнгийн хуудас өөрийн байраа ачаалахад. */
export async function findById(id: string): Promise<RegistrationView | null> {
  const [row] = await db.select().from(registrations).where(eq(registrations.id, id)).limit(1);
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
