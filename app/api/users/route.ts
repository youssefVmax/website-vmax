import { NextResponse } from 'next/server'
import { USERS } from '@/lib/auth'

export async function GET() {
  try {
    const safeUsers = USERS.map(({ password, ...rest }) => rest)
    return NextResponse.json(safeUsers, { status: 200 })
  } catch (e) {
    return NextResponse.json({ message: 'Failed to load users' }, { status: 500 })
  }
}
