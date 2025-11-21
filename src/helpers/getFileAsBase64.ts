import { getStorage } from 'firebase-admin/storage'
import path from 'path'

export const getFileAsBase64 = async (filePath: string) => {
  const storage = getStorage()
  const bucket = storage.bucket()
  const file = bucket.file(filePath)

  const [exists] = await file.exists()
  if (!exists) return null

  const [buffer] = await file.download()
  const base64 = buffer.toString('base64')

  const ext = path.extname(filePath).toLowerCase()

  if (ext === '.jpg' || ext === '.jpeg') {
    return `data:image/jpeg;base64,${base64}`
  }

  if (ext === '.png') {
    return `data:image/png;base64,${base64}`
  }

  return null
}
