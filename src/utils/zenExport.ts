import type { Task } from '../types';

export function generateICSContent(tasks: Task[]): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const events = tasks
    .filter(t => !t.isArchived)
    .map(t => {
      const cleanDate = t.date.replace(/-/g, '');
      const isDone = Array.isArray(t.completedDates) && t.completedDates.length > 0;
      const status = isDone ? 'COMPLETED' : 'CONFIRMED';
      const cleanTitle = (t.title || 'Untitled Task').replace(/[\\,;]/g, ' ');
      const descParts = [];
      if (t.tag) descParts.push(`Tag: ${t.tag}`);
      if (t.estimatedMinutes) descParts.push(`Est: ${t.estimatedMinutes}m`);
      if (t.isEvening) descParts.push(`This Evening (After 6:00 PM)`);
      if (t.isGhost) descParts.push(`Ghost Block (Tentative)`);
      const description = descParts.join(' | ');

      return [
        'BEGIN:VEVENT',
        `UID:${t.id}@zen.app`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${cleanDate}`,
        `SUMMARY:${cleanTitle}`,
        description ? `DESCRIPTION:${description}` : '',
        `STATUS:${status}`,
        'END:VEVENT',
      ]
        .filter(Boolean)
        .join('\r\n');
    });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Zen NoteApp//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Zen Calendar',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function generateMarkdownContent(tasks: Task[]): string {
  const tasksByDate = new Map<string, Task[]>();
  const inboxTasks: Task[] = [];

  for (const t of tasks) {
    if (t.isArchived) continue;
    if (t.isInbox || !t.date) {
      inboxTasks.push(t);
      continue;
    }
    const current = tasksByDate.get(t.date) || [];
    current.push(t);
    tasksByDate.set(t.date, current);
  }

  const sortedDates = Array.from(tasksByDate.keys()).sort();
  const lines: string[] = [
    '# 🌸 Zen Notes & Tasks Export',
    `*Exported on ${new Date().toISOString().split('T')[0]} - Obsidian & Local-first Ready*`,
    '',
  ];

  for (const date of sortedDates) {
    lines.push(`## ${date}`);
    const dateTasks = tasksByDate.get(date) || [];
    for (const t of dateTasks) {
      const isDone = Array.isArray(t.completedDates) && t.completedDates.includes(date);
      const mark = isDone ? 'x' : ' ';
      let meta = '';
      if (t.tag) meta += ` #${t.tag}`;
      if (t.estimatedMinutes) meta += ` ⏱️${t.estimatedMinutes}m`;
      if (t.isEvening) meta += ' 🌙 [Evening]';
      if (t.isGhost) meta += ' 👻 [Ghost]';
      lines.push(`- [${mark}] ${t.title}${meta}`);
    }
    lines.push('');
  }

  if (inboxTasks.length > 0) {
    lines.push('## 📥 Inbox & Triage');
    for (const t of inboxTasks) {
      let meta = '';
      if (t.tag) meta += ` #${t.tag}`;
      if (t.estimatedMinutes) meta += ` ⏱️${t.estimatedMinutes}m`;
      if (t.isGhost) meta += ' 👻 [Ghost]';
      lines.push(`- [ ] ${t.title}${meta}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function downloadTextFile(filename: string, content: string, mimeType = 'text/plain') {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
