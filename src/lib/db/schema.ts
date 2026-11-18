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
