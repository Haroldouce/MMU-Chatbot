import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json()
    const { path: publicPath, name } = body as { path?: string; name?: string }

    if (!publicPath && !name) {
      return NextResponse.json({ error: 'Missing path or name' }, { status: 400 })
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')

    const fileName = name ?? (typeof publicPath === 'string' ? publicPath.split('/').pop() : undefined)
    if (!fileName) {
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 })
    }

    const safeName = path.basename(fileName)
    const filePath = path.join(uploadsDir, safeName)

    // ensure file is inside uploads and exists
    await fs.promises.access(filePath)
    await fs.promises.unlink(filePath)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Delete error', err)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
