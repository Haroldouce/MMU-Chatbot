import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import fs from "fs"
import path from "path"

export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const uploadsDir = path.join(process.cwd(), "public", "uploads")

  try {
    await fs.promises.mkdir(uploadsDir, { recursive: true })
    const files = await fs.promises.readdir(uploadsDir)

    const documents = await Promise.all(
      files
        .filter((name) => !name.startsWith("."))
        .map(async (name) => {
          const filePath = path.join(uploadsDir, name)
          const stat = await fs.promises.stat(filePath)
          return {
            id: name,
            name: name.replace(/^\d+-/, ""),
            fileName: name,
            date: stat.mtime.toISOString().slice(0, 10),
            size: formatBytes(stat.size),
            path: `/uploads/${name}`,
          }
        }),
    )

    documents.sort((a, b) => b.date.localeCompare(a.date))

    return NextResponse.json({ documents })
  } catch (err) {
    console.error("GET /api/admin/documents", err)
    return NextResponse.json({ documents: [] })
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
