import type { RequestHandler } from 'express'
import pool from '../config/db'
import getAuthIdsFromRequest from '../helpers/auth/getDoctorIdFromRequest'
import { getStorage } from 'firebase-admin/storage'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { getFileAsBase64 } from '../helpers/getFileAsBase64'

type UserRow = {
  id: number
  username: string
  email: string
  speciality?: string | null
  cpf_cnpj?: string | null
  register?: string | null
  phone?: string | null
  uf?: string | null
  gender?: string | null
  avatar_url?: string | null
  logo_url?: string | null
  clinic_name?: string | null
}

const mapUser = (row: UserRow, logoBase64?: string | null) => ({
  id: row.id,
  username: row.username,
  email: row.email,
  speciality: row.speciality ?? '',
  cpf_cnpj: row.cpf_cnpj ?? '',
  register: row.register ?? '',
  phone: row.phone ?? '',
  uf: row.uf ?? '',
  gender: row.gender ?? '',
  avatar_url: row.avatar_url ?? null,
  logo_url: row.logo_url ?? null,
  clinic_name: row.clinic_name ?? '',
  logo_base64: logoBase64 ?? null
})

const extractStoragePathFromSignedUrl = (signedUrl: string) => {
  try {
    const url = new URL(signedUrl)
    const parts = url.pathname.replace(/^\/+/, '').split('/')
    if (parts.length <= 1) return null
    parts.shift()
    return parts.join('/')
  } catch {
    return null
  }
}

export const getUserByToken: RequestHandler = async (req, res) => {
  try {
    const { userId } = await getAuthIdsFromRequest(req)

    const result = await pool.query<UserRow>(
      `select
         id,
         username,
         email,
         speciality,
         cpf_cnpj,
         register,
         phone,
         uf,
         gender,
         avatar_url,
         logo_url,
         clinic_name
       from users
       where id = $1`,
      [Number(userId)]
    )

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    const user = result.rows[0]

    let logoBase64: string | null = null

    if (user.logo_url) {
      const storagePath = extractStoragePathFromSignedUrl(user.logo_url)
      if (storagePath) {
        logoBase64 = await getFileAsBase64(storagePath)
      }
    }

    return res.json(mapUser(user, logoBase64))
  } catch (err: any) {
    console.error('getUserByToken error', err)
    const status = err?.status ?? 401
    const msg = err?.msg ?? 'Não autenticado'
    return res.status(status).json({ error: msg })
  }
}

export const updateUserProfile: RequestHandler = async (req, res) => {
  try {
    const { userId } = await getAuthIdsFromRequest(req)

    const currentResult = await pool.query<UserRow>(
      `select
         id,
         username,
         email,
         speciality,
         cpf_cnpj,
         register,
         phone,
         uf,
         gender,
         avatar_url,
         logo_url,
         clinic_name
       from users
       where id = $1`,
      [Number(userId)]
    )

    if (!currentResult.rowCount) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    const current = currentResult.rows[0]
    const body = req.body as any

    const username = String(body.username ?? current.username ?? '').trim()
    const speciality = String(body.speciality ?? current.speciality ?? '').trim()
    const cpf_cnpj = String(body.cpf_cnpj ?? current.cpf_cnpj ?? '').trim()
    const register = String(body.register ?? current.register ?? '').trim()
    const phone = String(body.phone ?? current.phone ?? '').trim()
    const uf = String(body.uf ?? current.uf ?? '').trim()
    const gender = String(body.gender ?? current.gender ?? '').trim()
    const clinic_name = String(body.clinic_name ?? current.clinic_name ?? '').trim()

    let avatarUrl = current.avatar_url ?? null
    let logoUrl = current.logo_url ?? null

    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined

    const storage = getStorage()
    const bucket = storage.bucket()

    const uploadImage = async (
      file: Express.Multer.File,
      kind: 'avatar' | 'logo'
    ) => {
      const ext =
        path.extname(file.originalname || '') ||
        (file.mimetype === 'image/png'
          ? '.png'
          : file.mimetype === 'image/jpeg'
          ? '.jpg'
          : '')

      const filename = `user_${userId}/${kind}/${kind}_${Date.now()}_${uuidv4()}${ext}`

      const gcsFile = bucket.file(filename)
      await gcsFile.save(file.buffer, {
        contentType: file.mimetype,
        metadata: { firebaseStorageDownloadTokens: uuidv4() }
      })

      const [url] = await gcsFile.getSignedUrl({
        action: 'read',
        expires: '9999-12-31'
      })

      return { url, storagePath: filename }
    }

    let uploadedLogoStoragePath: string | null = null

    const avatarFile = files?.avatar?.[0]
    const logoFile = files?.logo?.[0]

    if (avatarFile) {
      const uploaded = await uploadImage(avatarFile, 'avatar')
      avatarUrl = uploaded.url
    }

    if (logoFile) {
      const uploaded = await uploadImage(logoFile, 'logo')
      logoUrl = uploaded.url
      uploadedLogoStoragePath = uploaded.storagePath
    }

    const updatedResult = await pool.query<UserRow>(
      `update users
         set
           username = $1,
           speciality = $2,
           cpf_cnpj = $3,
           register = $4,
           phone = $5,
           uf = $6,
           gender = $7,
           avatar_url = $8,
           logo_url = $9,
           clinic_name = $10
       where id = $11
       returning
         id,
         username,
         email,
         speciality,
         cpf_cnpj,
         register,
         phone,
         uf,
         gender,
         avatar_url,
         logo_url,
         clinic_name`,
      [
        username,
        speciality,
        cpf_cnpj,
        register,
        phone,
        uf,
        gender,
        avatarUrl,
        logoUrl,
        clinic_name,
        Number(userId)
      ]
    )

    const updated = updatedResult.rows[0]

    let logoBase64: string | null = null

    if (uploadedLogoStoragePath) {
      logoBase64 = await getFileAsBase64(uploadedLogoStoragePath)
    } else if (updated.logo_url) {
      const storagePath = extractStoragePathFromSignedUrl(updated.logo_url)
      if (storagePath) {
        logoBase64 = await getFileAsBase64(storagePath)
      }
    }

    return res.json(mapUser(updated, logoBase64))
  } catch (err: any) {
    console.error('updateUserProfile error', err)
    const status = err?.status ?? 500
    const msg = err?.msg ?? 'Erro ao atualizar perfil'
    return res.status(status).json({ error: msg })
  }
}
