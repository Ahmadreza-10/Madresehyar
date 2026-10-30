import { sqliteTable, text, integer, real, blob, uniqueIndex, index, primaryKey } from 'drizzle-orm/sqlite-core';

/** ADMIN = مدیرکل سامانه (بدون مدرسه) | PRINCIPAL = مدیر مدرسه | VICE = معاون | بقیه عضو یک مدرسه‌اند */
export const ROLES = ['ADMIN', 'PRINCIPAL', 'VICE', 'TEACHER', 'STUDENT', 'PARENT'] as const;
export type Role = (typeof ROLES)[number];

const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date());

/** مدرسه: هر مدرسه داده‌های جداگانه‌ی خودش را دارد */
export const schools = sqliteTable('schools', {
  id: id(),
  name: text('name').notNull(),
  status: text('status', { enum: ['active', 'disabled'] }).notNull().default('active'),
  /** تعرفه‌ی فعلی و پایانِ اشتراک؛ خالی = بدون محدودیت زمانی (مدرسه‌های قدیمی) */
  planId: text('plan_id'),
  subscriptionEndsAt: integer('subscription_ends_at', { mode: 'timestamp' }),
  createdAt: createdAt(),
});

/** کاربران: همه‌ی نقش‌ها (مدیرکل، مدیر، معاون، معلم، دانش‌آموز، والد) */
export const users = sqliteTable('users', {
  id: id(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  role: text('role', { enum: ROLES }).notNull(),
  /** مدرسه‌ی کاربر؛ فقط برای مدیرکل سامانه خالی است */
  schoolId: text('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  /** عنوان معاون (آموزشی، پرورشی، اجرایی، …) که مدیر تعیین می‌کند */
  viceTitle: text('vice_title'),
  /** آواتار آماده (۰ تا ۱۷)؛ خالی = آواتارِ خودکار بر اساس نام */
  avatarPreset: integer('avatar_preset'),
  /** زمان آخرین آپلود عکس پروفایل؛ خالی = عکس ندارد */
  avatarPhotoAt: integer('avatar_photo_at', { mode: 'timestamp' }),
  /** active = اجازه‌ی ورود دارد | disabled = دسترسی مسدود شده */
  status: text('status', { enum: ['active', 'disabled'] }).notNull().default('active'),
  phone: text('phone'),
  nationalCode: text('national_code'),
  /** فقط برای دانش‌آموز */
  classId: text('class_id'),
  /** فقط برای مدیرکل: «ادمین اصلی» که می‌تواند ادمین‌های دیگر را اضافه یا حذف کند */
  isOwner: integer('is_owner', { mode: 'boolean' }).notNull().default(false),
  mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
  createdAt: createdAt(),
}, (t) => [index('users_role_idx').on(t.role), index('users_class_idx').on(t.classId), index('users_school_idx').on(t.schoolId)]);

export const classes = sqliteTable('classes', {
  id: id(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  gradeLevel: text('grade_level').notNull(),
  academicYear: text('academic_year').notNull(),
  createdAt: createdAt(),
});

export const subjects = sqliteTable('subjects', {
  id: id(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
}, (t) => [uniqueIndex('subject_school_name_uq').on(t.schoolId, t.name)]);

/** درسِ یک کلاس + معلم آن درس */
export const classSubjects = sqliteTable('class_subjects', {
  id: id(),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  teacherId: text('teacher_id').references(() => users.id, { onDelete: 'set null' }),
}, (t) => [uniqueIndex('class_subject_uq').on(t.classId, t.subjectId)]);

/** نظرسنجی از معلم‌ها: هر دانش‌آموز برای هر «معلم + درس» در هر سال تحصیلی یک نظر (قابل ویرایش) دارد.
 *  نظرها در همه‌جا ناشناس نمایش داده می‌شوند؛ studentId فقط برای جلوگیری از ثبت تکراری ذخیره می‌شود. */
export const teacherReviews = sqliteTable('teacher_reviews', {
  id: id(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  teacherId: text('teacher_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  academicYear: text('academic_year').notNull(),
  /** امتیازها از ۱ تا ۵ */
  overall: integer('overall').notNull(),
  teaching: integer('teaching').notNull(),
  mastery: integer('mastery').notNull(),
  behavior: integer('behavior').notNull(),
  comment: text('comment'),
  /** مدیر/معاون می‌تواند یک نظرِ نامناسب را پنهان کند */
  hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
  createdAt: createdAt(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
}, (t) => [uniqueIndex('teacher_review_uq').on(t.studentId, t.teacherId, t.subjectId, t.academicYear), index('teacher_review_teacher_idx').on(t.teacherId, t.academicYear)]);

export const parentStudents = sqliteTable('parent_students', {
  parentId: text('parent_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.parentId, t.studentId] })]);

export const sessions = sqliteTable('sessions', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  ip: text('ip'),
  userAgent: text('user_agent'),
  createdAt: createdAt(),
});

export const attendance = sqliteTable('attendance', {
  id: id(),
  studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  /** YYYY-MM-DD میلادی (به وقت تهران) */
  date: text('date').notNull(),
  status: text('status', { enum: ['absent', 'late', 'excused'] }).notNull(),
  note: text('note'),
  recordedBy: text('recorded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('attendance_uq').on(t.studentId, t.date)]);

/** درخواست موجه شدن غیبت/تأخیر: خانواده توضیح می‌نویسد؛ ثبت‌کننده‌ی غیبت می‌پذیرد یا رد می‌کند */
export const excuseRequests = sqliteTable('excuse_requests', {
  id: id(),
  attendanceId: text('attendance_id').notNull().references(() => attendance.id, { onDelete: 'cascade' }),
  requesterId: text('requester_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  reviewerId: text('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
  reviewNote: text('review_note'),
  createdAt: createdAt(),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
}, (t) => [uniqueIndex('excuse_attendance_uq').on(t.attendanceId)]);

export const GRADE_TYPES = ['quiz', 'midterm', 'final', 'classwork', 'homework', 'oral'] as const;
export const grades = sqliteTable('grades', {
  id: id(),
  studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  type: text('type', { enum: GRADE_TYPES }).notNull().default('quiz'),
  score: real('score').notNull(),
  maxScore: real('max_score').notNull().default(20),
  date: text('date').notNull(),
  note: text('note'),
  recordedBy: text('recorded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
}, (t) => [index('grades_student_idx').on(t.studentId, t.subjectId)]);

export const NOTE_TYPES = ['note', 'praise', 'discipline'] as const;
export const studentNotes = sqliteTable('student_notes', {
  id: id(),
  studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: NOTE_TYPES }).notNull().default('note'),
  body: text('body').notNull(),
  /** تعداد: یک یادداشت می‌تواند چند تشویق یا چند منفی با هم باشد (مثلاً ۲۰ مثبت) */
  count: integer('count').notNull().default(1),
  date: text('date').notNull(),
  authorId: text('author_id').references(() => users.id, { onDelete: 'set null' }),
  editedAt: integer('edited_at', { mode: 'timestamp' }),
  createdAt: createdAt(),
});

export const assignments = sqliteTable('assignments', {
  id: id(),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: text('due_date'),
  /** ساعت مهلت تحویل (HH:MM)؛ خالی = تا پایان روز */
  dueTime: text('due_time'),
  /** آرایه‌ی JSON از مراحل/زیرتکلیف‌ها که دانش‌آموز تیک می‌زند */
  steps: text('steps').notNull().default('[]'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
});

/** وضعیت انجام تکلیف برای هر دانش‌آموز: دانش‌آموز تیک می‌زند؛ معلم پس از پایان مهلت می‌تواند منفی ثبت کند */
export const assignmentStatus = sqliteTable('assignment_status', {
  id: id(),
  assignmentId: text('assignment_id').notNull().references(() => assignments.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  /** روز تیک‌زدن (YYYY-MM-DD تهران)؛ خالی = انجام نشده */
  doneDate: text('done_date'),
  /** یادداشت منفیِ ثبت‌شده برای عدم انجام تکلیف؛ خالی = منفی ثبت نشده */
  penaltyNoteId: text('penalty_note_id').references(() => studentNotes.id, { onDelete: 'set null' }),
  /** آرایه‌ی JSON از شماره‌ی مراحلی که دانش‌آموز تیک زده */
  stepsDone: text('steps_done').notNull().default('[]'),
  /** یادداشت شخصی دانش‌آموز (فقط برای خودش) */
  note: text('note'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (t) => [uniqueIndex('assignment_status_uq').on(t.assignmentId, t.studentId), index('assignment_status_student_idx').on(t.studentId)]);

/** پیوست تکلیف (عکس یا PDF) که معلم می‌گذارد */
export const assignmentFiles = sqliteTable('assignment_files', {
  id: id(),
  assignmentId: text('assignment_id').notNull().references(() => assignments.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  mime: text('mime').notNull(),
  size: integer('size').notNull(),
  data: blob('data', { mode: 'buffer' }).notNull(),
  createdAt: createdAt(),
}, (t) => [index('assignment_files_idx').on(t.assignmentId)]);

export const announcements = sqliteTable('announcements', {
  id: id(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  /** خالی = برای همه */
  classId: text('class_id').references(() => classes.id, { onDelete: 'cascade' }),
  authorId: text('author_id').references(() => users.id, { onDelete: 'set null' }),
  /** اطلاعیه‌ی سنجاق‌شده بالای فهرست می‌ماند */
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  editedAt: integer('edited_at', { mode: 'timestamp' }),
  createdAt: createdAt(),
});

export const STUDY_METHODS = ['reading', 'testing', 'review', 'summarizing', 'exercise', 'video', 'class_notes'] as const;
export const studyReports = sqliteTable('study_reports', {
  id: id(),
  studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  /** روزِ مطالعه، YYYY-MM-DD میلادی به وقت تهران */
  date: text('date').notNull(),
  startTime: text('start_time').notNull(), // HH:MM
  endTime: text('end_time').notNull(),
  durationMin: integer('duration_min').notNull(),
  subjectId: text('subject_id').notNull().references(() => subjects.id, { onDelete: 'restrict' }),
  topic: text('topic').notNull(),
  /** آرایه‌ی JSON از STUDY_METHODS */
  methods: text('methods').notNull().default('[]'),
  pages: integer('pages').notNull().default(0),
  mastery: integer('mastery').notNull().default(3), // 1..5
  goal: text('goal'),
  goalAchieved: integer('goal_achieved', { mode: 'boolean' }),
  notes: text('notes'),
  teacherFeedback: text('teacher_feedback'),
  feedbackBy: text('feedback_by').references(() => users.id, { onDelete: 'set null' }),
  /** چه کسی ثبت کرده (دانش‌آموز یا معلم/مدیر) */
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
}, (t) => [index('study_student_date_idx').on(t.studentId, t.date)]);

/** هر گزارش مطالعه چند «درس» دارد؛ برای هر درس زمان مطالعه و زمان تست جدا ثبت می‌شود */
export const studyReportItems = sqliteTable('study_report_items', {
  id: id(),
  reportId: text('report_id').notNull().references(() => studyReports.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id').notNull().references(() => subjects.id, { onDelete: 'restrict' }),
  studyMin: integer('study_min').notNull().default(0),
  testMin: integer('test_min').notNull().default(0),
  topic: text('topic').notNull(),
  methods: text('methods').notNull().default('[]'),
  pages: integer('pages').notNull().default(0),
  mastery: integer('mastery').notNull().default(3),
  goal: text('goal'),
  goalAchieved: integer('goal_achieved', { mode: 'boolean' }),
  position: integer('position').notNull().default(0),
}, (t) => [index('study_items_report_idx').on(t.reportId)]);

/** جزئیات هر دسته تست داخل یک گزارش مطالعه */
export const studyTests = sqliteTable('study_tests', {
  id: id(),
  reportId: text('report_id').notNull().references(() => studyReports.id, { onDelete: 'cascade' }),
  /** تست مربوط به کدام درسِ همین گزارش است */
  subjectId: text('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
  source: text('source').notNull(), // نام کتاب/آزمون
  totalCount: integer('total_count').notNull(),
  correctCount: integer('correct_count').notNull(),
  wrongCount: integer('wrong_count').notNull(),
  blankCount: integer('blank_count').notNull(),
  durationMin: integer('duration_min'),
  /** درصد با نمره‌ی منفی (روش کنکور): ((۳×صحیح − غلط) ÷ (۳×کل)) × ۱۰۰ */
  percent: real('percent').notNull(),
  note: text('note'),
});

/** تنظیمات هر مدرسه (بازه‌ی ثبت گزارش مطالعه، سال تحصیلی، …) */
export const settings = sqliteTable('settings', {
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  value: text('value').notNull(),
}, (t) => [primaryKey({ columns: [t.schoolId, t.key] })]);

export const auditLogs = sqliteTable('audit_logs', {
  id: id(),
  actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
  schoolId: text('school_id'),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  detail: text('detail'),
  ip: text('ip'),
  createdAt: createdAt(),
}, (t) => [index('audit_created_idx').on(t.createdAt), index('audit_school_idx').on(t.schoolId)]);

/** پیام‌رسان داخلی (معلم، مدیر، دانش‌آموز، ولی) */
export const messages = sqliteTable('messages', {
  id: id(),
  senderId: text('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipientId: text('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  readAt: integer('read_at', { mode: 'timestamp' }),
  /** سنجاق جداگانه برای فرستنده و گیرنده */
  pinnedBySender: integer('pinned_by_sender', { mode: 'boolean' }).notNull().default(false),
  pinnedByRecipient: integer('pinned_by_recipient', { mode: 'boolean' }).notNull().default(false),
  editedAt: integer('edited_at', { mode: 'timestamp' }),
  /** پاسخ به یک پیام: شناسه + خلاصه‌ی متن (تا با حذف پیام اصلی هم نمایش داده شود) */
  replyToId: text('reply_to_id'),
  replySnippet: text('reply_snippet'),
  /** «هدایت‌شده از …»؛ در هدایت بدون نام، خالی می‌ماند */
  forwardedFrom: text('forwarded_from'),
  createdAt: createdAt(),
}, (t) => [index('msg_recipient_idx').on(t.recipientId, t.readAt), index('msg_sender_idx').on(t.senderId)]);

/** برنامه‌ی هفتگی کلاس: weekday از ۰=شنبه تا ۵=پنجشنبه، period از ۱ تا ۸ */
export const scheduleSlots = sqliteTable('schedule_slots', {
  id: id(),
  classId: text('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
  weekday: integer('weekday').notNull(),
  period: integer('period').notNull(),
  subjectId: text('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  room: text('room'),
  /** ساعت شروع و پایان زنگ (HH:MM)؛ خالی = ساعت تعیین نشده */
  startTime: text('start_time'),
  endTime: text('end_time'),
}, (t) => [uniqueIndex('slot_uq').on(t.classId, t.weekday, t.period)]);

/** عکس پروفایل (جدا از جدول کاربران تا هر پرسمانِ کاربر سنگین نشود) */
export const userAvatars = sqliteTable('user_avatars', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  mime: text('mime').notNull(),
  data: blob('data', { mode: 'buffer' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

/** «امروز مطالعه نداشت»: ثبتِ صریحِ ولی برای یک روز */
export const studySkips = sqliteTable('study_skips', {
  id: id(),
  studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('skip_student_date_uq').on(t.studentId, t.date)]);

/**
 * نشانه‌ی «مثبت/منفی خودکارِ گزارش مطالعه» (قابلیت اختیاریِ مدرسه): برای هر دانش‌آموز، هر روز و هر نوع فقط یک بار ثبت می‌شود
 * تا با ریستارت سایت یا اجرای دوباره، یادداشت تکراری ساخته نشود. noteId = یادداشتِ ساخته‌شده در student_notes.
 */
export const studyAutoMarks = sqliteTable('study_auto_marks', {
  id: id(),
  studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  kind: text('kind', { enum: ['praise', 'negative'] }).notNull(),
  noteId: text('note_id').references(() => studentNotes.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('auto_mark_uq').on(t.studentId, t.date, t.kind)]);

/** اشتراک اعلان (Web Push) برای هر دستگاه کاربر */
export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('push_endpoint_uq').on(t.endpoint), index('push_user_idx').on(t.userId)]);

/** هر یادآور فقط یک‌بار در روز برای هر ولی فرستاده شود */
export const reminderLog = sqliteTable('reminder_log', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  slot: text('slot').notNull(),
  sentAt: integer('sent_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (t) => [primaryKey({ columns: [t.userId, t.date, t.slot] })]);

/** تنظیمات سراسری سامانه (مثل کلیدهای VAPID) */
export const appConfig = sqliteTable('app_config', { key: text('key').primaryKey(), value: text('value').notNull() });

/** پیام کاربران به پشتیبانی (مدیران سامانه)؛ پاسخ همان‌جا ثبت می‌شود */
export const supportTickets = sqliteTable('support_tickets', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  /** open = بدون پاسخ | answered = پاسخ داده شده | closed = بسته */
  status: text('status', { enum: ['open', 'answered', 'closed'] }).notNull().default('open'),
  reply: text('reply'),
  repliedBy: text('replied_by').references(() => users.id, { onDelete: 'set null' }),
  repliedAt: integer('replied_at', { mode: 'timestamp' }),
  editedAt: integer('edited_at', { mode: 'timestamp' }),
  createdAt: createdAt(),
}, (t) => [index('support_user_idx').on(t.userId), index('support_status_idx').on(t.status)]);

/** پیوست‌های اطلاعیه، پیام و تکلیف؛ خودِ فایل روی دیسک (پوشه‌ی data/uploads) نگه‌داری می‌شود نه در دیتابیس */
export const ATTACHMENT_KINDS = ['announcement', 'message', 'assignment', 'group_post'] as const;
export const attachments = sqliteTable('attachments', {
  id: id(),
  kind: text('kind', { enum: ATTACHMENT_KINDS }).notNull(),
  ownerId: text('owner_id').notNull(),
  name: text('name').notNull(),
  mime: text('mime').notNull(),
  size: integer('size').notNull(),
  uploaderId: text('uploader_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
}, (t) => [index('attach_owner_idx').on(t.kind, t.ownerId)]);

/** گروه یا کانالِ پیام‌رسان که مدیر/معاون می‌سازد. گروه: همه‌ی اعضا می‌نویسند | کانال: فقط مدیرانِ کانال می‌نویسند و بقیه می‌خوانند */
export const chatGroups = sqliteTable('chat_groups', {
  id: id(),
  schoolId: text('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  kind: text('kind', { enum: ['group', 'channel'] }).notNull().default('group'),
  description: text('description'),
  /** اگر برای یک کلاس ساخته شده باشد */
  classId: text('class_id').references(() => classes.id, { onDelete: 'set null' }),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
}, (t) => [index('chat_groups_school_idx').on(t.schoolId)]);

export const chatMembers = sqliteTable('chat_members', {
  id: id(),
  groupId: text('group_id').notNull().references(() => chatGroups.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  /** admin = مدیرِ گروه (مثلاً معلمِ کلاس) | member = عضو */
  role: text('role', { enum: ['admin', 'member'] }).notNull().default('member'),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('chat_members_uq').on(t.groupId, t.userId), index('chat_members_user_idx').on(t.userId)]);

export const chatPosts = sqliteTable('chat_posts', {
  id: id(),
  groupId: text('group_id').notNull().references(() => chatGroups.id, { onDelete: 'cascade' }),
  authorId: text('author_id').references(() => users.id, { onDelete: 'set null' }),
  body: text('body').notNull(),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  editedAt: integer('edited_at', { mode: 'timestamp' }),
  replyToId: text('reply_to_id'),
  replySnippet: text('reply_snippet'),
  forwardedFrom: text('forwarded_from'),
  createdAt: createdAt(),
}, (t) => [index('chat_posts_group_idx').on(t.groupId, t.createdAt)]);

/** تعرفه‌های فروش سامانه (قیمت به تومان برای کل مدت؛ سقف دانش‌آموز ۰ = نامحدود) */
export const plans = sqliteTable('plans', {
  id: id(),
  name: text('name').notNull(),
  description: text('description'),
  priceToman: integer('price_toman').notNull(),
  months: integer('months').notNull(),
  maxStudents: integer('max_students').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
});

/** درخواست خرید/ثبت‌نام مدرسه (kind=new) یا تمدید اشتراک (kind=renew). pending → approved → registered | rejected */
export const purchaseRequests = sqliteTable('purchase_requests', {
  id: id(),
  trackingCode: text('tracking_code').notNull().unique(),
  kind: text('kind', { enum: ['new', 'renew'] }).notNull().default('new'),
  status: text('status', { enum: ['pending', 'approved', 'payment_review', 'paid', 'rejected', 'registered'] }).notNull().default('pending'),
  planId: text('plan_id').references(() => plans.id, { onDelete: 'set null' }),
  /** فقط برای تمدید */
  schoolId: text('school_id').references(() => schools.id, { onDelete: 'set null' }),
  schoolName: text('school_name').notNull(),
  managerName: text('manager_name').notNull(),
  phone: text('phone').notNull(),
  city: text('city'),
  province: text('province'),
  address: text('address'),
  schoolType: text('school_type'),
  email: text('email'),
  teacherCount: integer('teacher_count').notNull().default(0),
  studentCount: integer('student_count').notNull().default(0),
  note: text('note'),
  /** قیمت نهایی (در زمان ثبت از تعرفه کپی می‌شود؛ ادمین می‌تواند تخفیف بدهد) */
  priceToman: integer('price_toman').notNull().default(0),
  adminNote: text('admin_note'),
  /** رسید پرداخت که خریدار ثبت می‌کند (شماره‌ی پیگیری بانکی / چهار رقم آخر کارت) */
  payRef: text('pay_ref'),
  payNote: text('pay_note'),
  paySubmittedAt: integer('pay_submitted_at', { mode: 'timestamp' }),
  /** نشست موقتِ پیگیری (هش توکن کوکی) */
  applicantTokenHash: text('applicant_token_hash'),
  decidedBy: text('decided_by').references(() => users.id, { onDelete: 'set null' }),
  decidedAt: integer('decided_at', { mode: 'timestamp' }),
  registeredAt: integer('registered_at', { mode: 'timestamp' }),
  createdSchoolId: text('created_school_id'),
  createdAt: createdAt(),
}, (t) => [index('purchase_status_idx').on(t.status)]);

/** درخواست «فراموشی رمز عبور»: مدیر/معاونِ مدرسه (یا مدیرکل برای مدیران) پس از شناختنِ فرد، رمز موقت می‌سازد */
export const passwordResets = sqliteTable('password_resets', {
  id: id(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  claimedName: text('claimed_name'),
  status: text('status', { enum: ['pending', 'done', 'dismissed'] }).notNull().default('pending'),
  handledBy: text('handled_by').references(() => users.id, { onDelete: 'set null' }),
  handledAt: integer('handled_at', { mode: 'timestamp' }),
  createdAt: createdAt(),
}, (t) => [index('pwreset_status_idx').on(t.status), index('pwreset_user_idx').on(t.userId)]);
