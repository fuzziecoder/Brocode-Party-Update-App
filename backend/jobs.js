import { database } from './db.js';

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
};

const safeLog = (message, details) => {
  if (details) {
    console.log(`[jobs] ${message}`, details);
    return;
  }

  console.log(`[jobs] ${message}`);
};

const safeError = (message, error) => {
  console.error(`[jobs] ${message}`, error?.message || error);
};

const buildReminderPayload = (spot) => ({
  spotId: spot.id,
  location: spot.location,
  date: spot.date,
  hostUserId: spot.hostUserId,
});

export const createJobSystem = async () => {
  let Queue;
  let Worker;
  let QueueEvents;
  let IORedis;

  try {
    ({ Queue, Worker, QueueEvents } = await import('bullmq'));
    ({ default: IORedis } = await import('ioredis'));
  } catch (error) {
    safeError(
      'BullMQ/ioredis not available. Background jobs are disabled until dependencies are installed.',
      error
    );

    return {
      enabled: false,
      async enqueueEmailNotification() {},
      async enqueueSpotReminders() {},
      async enqueueExpiredSpotCleanup() {},
      async shutdown() {},
    };
  }

  const connection = new IORedis(redisConfig);

  const emailQueue = new Queue('email-notifications', { connection });
  const reminderQueue = new Queue('spot-reminders', { connection });
  const cleanupQueue = new Queue('expired-spot-cleanup', { connection });

  const emailEvents = new QueueEvents('email-notifications', { connection });
  const reminderEvents = new QueueEvents('spot-reminders', { connection });
  const cleanupEvents = new QueueEvents('expired-spot-cleanup', { connection });

  emailEvents.on('completed', ({ jobId }) => safeLog(`Email job completed: ${jobId}`));
  reminderEvents.on('completed', ({ jobId }) => safeLog(`Reminder job completed: ${jobId}`));
  cleanupEvents.on('completed', ({ jobId }) => safeLog(`Cleanup job completed: ${jobId}`));

  emailEvents.on('failed', ({ jobId, failedReason }) => safeError(`Email job failed (${jobId})`, failedReason));
  reminderEvents.on('failed', ({ jobId, failedReason }) => safeError(`Reminder job failed (${jobId})`, failedReason));
  cleanupEvents.on('failed', ({ jobId, failedReason }) => safeError(`Cleanup job failed (${jobId})`, failedReason));

  const emailWorker = new Worker(
    'email-notifications',
    async (job) => {
      const { toUserId, subject, message } = job.data;
      safeLog('Sending email notification', { toUserId, subject, message });
      return { delivered: true, sentAt: new Date().toISOString() };
    },
    { connection }
  );

  const reminderWorker = new Worker(
    'spot-reminders',
    async (job) => {
      safeLog('Sending scheduled event reminder', job.data);
      return { delivered: true, sentAt: new Date().toISOString() };
    },
    { connection }
  );

  const cleanupWorker = new Worker(
    'expired-spot-cleanup',
    async () => {
      const result = database.cleanupExpiredSpots();
      safeLog('Expired events cleanup finished', result);
      return result;
    },
    { connection }
  );

  const enqueueEmailNotification = async ({ toUserId, subject, message }) =>
    emailQueue.add(
      'send-email-notification',
      { toUserId, subject, message },
      { removeOnComplete: true, removeOnFail: 100, attempts: 3 }
    );

  const enqueueSpotReminders = async ({ beforeHours = 2 } = {}) => {
    const now = Date.now();
    const reminderWindowEnd = now + beforeHours * 60 * 60 * 1000;
    const spots = database.getSpotsBetween({
      fromInclusive: new Date(now).toISOString(),
      toInclusive: new Date(reminderWindowEnd).toISOString(),
    });

    await Promise.all(
      spots.map((spot) =>
        reminderQueue.add(
          'send-event-reminder',
          buildReminderPayload(spot),
          {
            jobId: `reminder:${spot.id}:${beforeHours}`,
            removeOnComplete: true,
            removeOnFail: 100,
            attempts: 2,
          }
        )
      )
    );

    return { queuedReminders: spots.length };
  };

  const enqueueExpiredSpotCleanup = async () =>
    cleanupQueue.add('cleanup-expired-events', {}, { removeOnComplete: true, removeOnFail: 100 });

  await cleanupQueue.add(
    'cleanup-expired-events-recurring',
    {},
    {
      jobId: 'cleanup-expired-events-recurring',
      repeat: { every: 60 * 60 * 1000 },
      removeOnComplete: true,
      removeOnFail: 100,
    }
  );

  await reminderQueue.add(
    'send-event-reminders-recurring',
    { beforeHours: Number(process.env.EVENT_REMINDER_BEFORE_HOURS || 2) },
    {
      jobId: 'send-event-reminders-recurring',
      repeat: { every: 30 * 60 * 1000 },
      removeOnComplete: true,
      removeOnFail: 100,
    }
  );

  reminderWorker.on('completed', async (job) => {
    if (job?.name === 'send-event-reminders-recurring') {
      await enqueueSpotReminders({ beforeHours: job.data.beforeHours });
    }
  });

  const shutdown = async () => {
    await Promise.allSettled([
      emailWorker.close(),
      reminderWorker.close(),
      cleanupWorker.close(),
      emailQueue.close(),
      reminderQueue.close(),
      cleanupQueue.close(),
      emailEvents.close(),
      reminderEvents.close(),
      cleanupEvents.close(),
    ]);

    await connection.quit();
  };

  return {
    enabled: true,
    enqueueEmailNotification,
    enqueueSpotReminders,
    enqueueExpiredSpotCleanup,
    shutdown,
  };
};
