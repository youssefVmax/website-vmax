import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { NextRequest, NextResponse } from 'next/server';
import { USERS } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Prefer a writable location for serverless (e.g., Netlify/Vercel). Fallback to tmp.
const WRITABLE_DIR = process.env.NOTIFICATIONS_DIR || os.tmpdir();
const TMP_FILE = path.join(WRITABLE_DIR, 'notifications.json');
const PUBLIC_SEED = path.join(process.cwd(), 'public', 'data', 'notifications.json');

async function ensureFile() {
  try {
    await fs.access(TMP_FILE);
  } catch {
    try {
      await fs.mkdir(path.dirname(TMP_FILE), { recursive: true });
    } catch {}
    // Seed from public file if exists; otherwise empty array
    try {
      const seed = await fs.readFile(PUBLIC_SEED, 'utf-8').catch(() => '[]');
      // validate JSON
      JSON.parse(seed);
      await fs.writeFile(TMP_FILE, seed, 'utf-8');
    } catch {
      await fs.writeFile(TMP_FILE, '[]', 'utf-8');
    }
  }
}

async function readNotifications() {
  await ensureFile();
  const fileContent = await fs.readFile(TMP_FILE, 'utf-8');
  try {
    const parsed = JSON.parse(fileContent);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Reset to [] if corrupted
    await fs.writeFile(TMP_FILE, '[]', 'utf-8');
    return [];
  }
}

async function writeNotifications(data: any) {
  await ensureFile();
  await fs.writeFile(TMP_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Helper to sanitize and filter notifications according to target audience
function filterForUser(all: any[], userId?: string | null, role?: string | null) {
  const validIds = new Set<string>(USERS.map(u => u.id));

  // First, sanitize entries that contain invalid recipients (legacy placeholders)
  const sanitized = all.filter((n) => {
    if (!Array.isArray(n.to)) return false;
    // allow 'ALL' or valid user IDs only
    return n.to.every((t: any) => typeof t === 'string' && (t === 'ALL' || validIds.has(t)));
  });

  // If manager, they can see everything
  if (role === 'manager') return sanitized;

  if (!userId) return [];

  // Otherwise, only notifications addressed to this user or ALL
  return sanitized.filter((n) => Array.isArray(n.to) && (n.to.includes('ALL') || n.to.includes(userId)));
}

export async function GET(req: NextRequest) {
  try {
    const all = await readNotifications();
    const search = req.nextUrl.searchParams;
    const userId = search.get('userId');
    const role = search.get('role');

    const notifications = filterForUser(all, userId, role);
    // Sort by timestamp descending
    notifications.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return NextResponse.json(notifications, { status: 200 });
  } catch (error) {
    console.error('Error reading notifications:', error);
    return NextResponse.json({ message: 'Error reading notifications', details: String((error as any)?.message || error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }
    if (!Array.isArray(body.to) || body.to.length === 0) {
      return NextResponse.json({ message: 'Notifications require a non-empty "to" array' }, { status: 400 });
    }
    const notifications = await readNotifications();

    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? (crypto as any).randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const newNotification = {
      ...body,
      id,
      timestamp: new Date().toISOString(),
      read: false,
    };

    notifications.unshift(newNotification);
    await writeNotifications(notifications);

    return NextResponse.json(newNotification, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ message: 'Error creating notification', details: String((error as any)?.message || error) }, { status: 500 });
  }
}

// PUT supports marking a notification as read or mark-all for a user
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, markAllForUser } = body;
    const notifications = await readNotifications();

    if (markAllForUser) {
      const { userId } = body;
      // Mark as read for notifications directed to this user or to ALL/manager role
      for (const n of notifications) {
        if (Array.isArray(n.to) && (n.to.includes(userId) || n.to.includes('ALL'))) {
          n.read = true;
        }
      }
      await writeNotifications(notifications);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const index = notifications.findIndex((n: any) => n.id === id);
    if (index === -1) {
      return NextResponse.json({ message: 'Notification not found' }, { status: 404 });
    }

    notifications[index].read = true;
    await writeNotifications(notifications);
    return NextResponse.json(notifications[index], { status: 200 });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ message: 'Error updating notification', details: String((error as any)?.message || error) }, { status: 500 });
  }
}

