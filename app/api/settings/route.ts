 import { NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const settingsPath = path.join(process.cwd(), 'public', 'data', 'settings.json')

async function ensureFile() {
  try {
    await fs.access(settingsPath)
  } catch {
    const initial = {
      theme: 'dark',
      emailNotifications: true,
      pushNotifications: true,
      dealAlerts: true,
      targetReminders: true,
      autoLogout: 30,
    }
    await fs.mkdir(path.dirname(settingsPath), { recursive: true })
    await fs.writeFile(settingsPath, JSON.stringify(initial, null, 2))
  }
}

export async function GET() {
  await ensureFile()
  const content = await fs.readFile(settingsPath, 'utf-8')
  return new Response(content, { headers: { 'Content-Type': 'application/json' } })
}

export async function PUT(req: NextRequest) {
  await ensureFile()
  try {
    const body = await req.json()
    // Basic shape validation and merge with existing
    const currentRaw = await fs.readFile(settingsPath, 'utf-8')
    let current: any
    try { current = JSON.parse(currentRaw) } catch { current = {} }
    const next = {
      ...current,
      ...body,
    }
    await fs.writeFile(settingsPath, JSON.stringify(next, null, 2))
    return new Response(JSON.stringify(next), { headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Invalid settings payload' }), { status: 400 })
  }
}
