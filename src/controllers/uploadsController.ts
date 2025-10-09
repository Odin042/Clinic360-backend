import type { RequestHandler } from 'express'
import { getStorage } from 'firebase-admin/storage'
import pool from '../config/db'
import getAuthIdsFromRequest from '../helpers/auth/getDoctorIdFromRequest'

export const uploadProcedureImage: RequestHandler = async (req, res) => {
  try {
    const { userId, doctorId } = await getAuthIdsFromRequest(req)
    const patientId = Number(req.params.id)

    if (!doctorId) return res.status(403).json({ error: 'Apenas médicos podem enviar imagens' })
    if (!Number.isFinite(patientId)) return res.status(400).json({ error: 'Paciente inválido' })

    const own = await pool.query(
      'select 1 from patient where id = $1 and doctor_id = $2',
      [patientId, doctorId]
    )
    if (!own.rowCount) return res.status(404).json({ error: 'Paciente não encontrado' })

    if (!req.file) return res.status(400).json({ error: 'Campo "file" obrigatório' })
    if (!/^image\//.test(req.file.mimetype)) {
      return res.status(415).json({ error: 'Apenas imagens são permitidas' })
    }

    const bucket = getStorage().bucket()
    const folder = `procedures/user_${userId}/patient_${patientId}`
    const safeName = (req.file.originalname || 'image').replace(/[^\w.\-]+/g, '_')
    const fileName = `${Date.now()}_${safeName}`
    const file = bucket.file(`${folder}/${fileName}`)

    await file.save(req.file.buffer, {
      contentType: req.file.mimetype,
      public: true,
      metadata: { cacheControl: 'public, max-age=31536000' }
    })

    const url = `https://storage.googleapis.com/${bucket.name}/${file.name}`
    return res.json({ url })
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao enviar imagem' })
  }
}
