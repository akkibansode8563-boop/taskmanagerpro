import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function toIsoString(value) {
  if (!value) return null;
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  if (typeof value === 'string') {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
  }
  if (typeof value === 'object') {
    if ('seconds' in value && typeof value.seconds === 'number') {
      return new Date(value.seconds * 1000).toISOString();
    }
    if ('_seconds' in value && typeof value._seconds === 'number') {
      return new Date(value._seconds * 1000).toISOString();
    }
  }
  return null;
}

function normalizeTaskStatus(task) {
  if (task.status && ['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'].includes(task.status)) {
    return task.status;
  }
  return task.isCompleted ? 'COMPLETED' : 'TODO';
}

function normalizeMeetingStatus(meeting) {
  if (meeting.status && ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(meeting.status)) {
    return meeting.status;
  }
  return meeting.isCompleted ? 'COMPLETED' : 'SCHEDULED';
}

function loadUsersFromExport(payload) {
  if (payload && typeof payload === 'object' && payload.users && typeof payload.users === 'object') {
    return payload.users;
  }

  if (payload && typeof payload === 'object') {
    return payload;
  }

  throw new Error('Unsupported export shape. Expected an object keyed by Firebase user ids or a top-level "users" object.');
}

function resolveSupabaseUserId(firebaseUserId, userPayload, mapping) {
  if (mapping.byFirebaseUid?.[firebaseUserId]) {
    return mapping.byFirebaseUid[firebaseUserId];
  }

  const email = userPayload.email ?? userPayload.profile?.email ?? null;
  if (email && mapping.byEmail?.[email]) {
    return mapping.byEmail[email];
  }

  return null;
}

async function readJson(filePath) {
  const absolutePath = path.resolve(filePath);
  const content = await fs.readFile(absolutePath, 'utf8');
  return JSON.parse(content);
}

async function main() {
  const inputPath = readArg('--input');
  const mappingPath = readArg('--mapping');

  if (!inputPath) {
    throw new Error('Missing required --input argument.');
  }

  if (!mappingPath) {
    throw new Error('Missing required --mapping argument.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const [exportPayload, mapping] = await Promise.all([readJson(inputPath), readJson(mappingPath)]);
  const users = loadUsersFromExport(exportPayload);

  let importedProfiles = 0;
  let importedTasks = 0;
  let importedMeetings = 0;
  let skippedUsers = 0;

  for (const [firebaseUserId, userPayload] of Object.entries(users)) {
    const supabaseUserId = resolveSupabaseUserId(firebaseUserId, userPayload, mapping);

    if (!supabaseUserId) {
      skippedUsers += 1;
      console.warn(`Skipping ${firebaseUserId}: no Supabase user mapping found.`);
      continue;
    }

    const profile = userPayload.profile ?? {};
    const tasks = Object.values(userPayload.tasks ?? {});
    const meetings = Object.values(userPayload.meetings ?? {});

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: supabaseUserId,
      email: userPayload.email ?? profile.email ?? null,
      display_name: profile.displayName ?? profile.display_name ?? userPayload.displayName ?? null,
      last_login_at: toIsoString(userPayload.lastLoginAt ?? profile.lastLoginAt),
    });

    if (profileError) {
      throw new Error(`Profile import failed for ${firebaseUserId}: ${profileError.message}`);
    }

    importedProfiles += 1;

    if (tasks.length > 0) {
      const taskRows = tasks.map((task) => ({
        id: task.id,
        user_id: supabaseUserId,
        name: task.taskName ?? task.name ?? 'Untitled task',
        details: task.subDetails ?? task.details ?? null,
        category: task.category ?? null,
        due_at: toIsoString(task.dueDate ?? task.due_at) ?? new Date().toISOString(),
        reminder_at: toIsoString(task.reminderTime ?? task.reminder_at),
        priority: ['HIGH', 'MEDIUM', 'LOW'].includes(task.priority) ? task.priority : 'MEDIUM',
        status: normalizeTaskStatus(task),
        was_carried_forward: Boolean(task.wasCarriedForward),
        created_at: toIsoString(task.createdAt ?? task.created_at) ?? new Date().toISOString(),
        updated_at: toIsoString(task.updatedAt ?? task.updated_at) ?? new Date().toISOString(),
      }));

      const { error: taskError } = await supabase.from('tasks').upsert(taskRows);
      if (taskError) {
        throw new Error(`Task import failed for ${firebaseUserId}: ${taskError.message}`);
      }

      importedTasks += taskRows.length;
    }

    if (meetings.length > 0) {
      const meetingRows = meetings.map((meeting) => ({
        id: meeting.id,
        user_id: supabaseUserId,
        title: meeting.title ?? 'Untitled meeting',
        subtitle: meeting.subtitle ?? null,
        location: meeting.location ?? null,
        attendees: meeting.attendees ?? null,
        scheduled_at: toIsoString(meeting.dateTime ?? meeting.scheduled_at) ?? new Date().toISOString(),
        status: normalizeMeetingStatus(meeting),
        minutes: meeting.minutes ?? null,
        created_at: toIsoString(meeting.createdAt ?? meeting.created_at) ?? new Date().toISOString(),
        updated_at: toIsoString(meeting.updatedAt ?? meeting.updated_at) ?? new Date().toISOString(),
      }));

      const { error: meetingError } = await supabase.from('meetings').upsert(meetingRows);
      if (meetingError) {
        throw new Error(`Meeting import failed for ${firebaseUserId}: ${meetingError.message}`);
      }

      importedMeetings += meetingRows.length;
    }
  }

  console.log(
    JSON.stringify(
      {
        importedProfiles,
        importedTasks,
        importedMeetings,
        skippedUsers,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
