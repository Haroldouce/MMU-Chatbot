import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  try {
    const body = await request.json()
    const { name, data } = body as { name: string; data: string }

    if (!name || !data) {
      return NextResponse.json({ error: 'Missing name or data' }, { status: 400 })
    }

    // Data is expected to be a base64 data URL or plain base64 string
    const base64 = data.includes('base64,') ? data.split('base64,')[1] : data

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.promises.mkdir(uploadsDir, { recursive: true })

    // ensure unique filename
    const timestamp = Date.now()
    const safeName = `${timestamp}-${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const filePath = path.join(uploadsDir, safeName)

    const buffer = Buffer.from(base64, 'base64')
    await fs.promises.writeFile(filePath, buffer)

    const publicPath = `/uploads/${safeName}`
    return NextResponse.json({ ok: true, path: publicPath })
  } catch (err) {
    console.error('Upload error', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
