import type { RequestHandler } from 'express'
import pool from '../config/db'

const sanitize = v => typeof v === 'string' && v.trim() === '' ? null : v

export const createPrescription: RequestHandler = async (req, res) => {
  const {
    patient_id,
    doctor_id,
    title,
    date,
    posology_phytotherapy,
    posology_supplement,
    posology_medication,
    notes,
    items
  } = req.body

  if (!patient_id || !doctor_id || !title || !date) {
    return res.status(400).json({ error: 'Campos obrigatórios: patient_id, doctor_id, title, date' })
  }

  try {
    const prescriptionResult = await pool.query(
      `INSERT INTO prescriptions
        (patient_id, doctor_id, title, date, posology_phytotherapy, posology_supplement, posology_medication, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        patient_id,
        doctor_id,
        title,
        date,
        sanitize(posology_phytotherapy),
        sanitize(posology_supplement),
        sanitize(posology_medication),
        sanitize(notes)
      ]
    )

    const prescription = prescriptionResult.rows[0]

    if (items && Array.isArray(items)) {
      for (const item of items) {
        const { type, name, dosage, frequency, duration, notes } = item
        await pool.query(
          `INSERT INTO prescription_items (prescription_id, type, name, dosage, frequency, duration, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [prescription.id, type, name, dosage, frequency, duration, notes]
        )
      }
    }

    res.status(201).json(prescription)
  } catch (error) {
    console.error('ERRO SQL', error)
    const errorMsg = error instanceof Error ? error.message : String(error)
    res.status(500).json({ error: errorMsg || 'Erro ao criar prescrição' })
  }
}

export const listPrescriptions: RequestHandler = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*,
              COALESCE(
                json_agg(pi.*) FILTER (WHERE pi.id IS NOT NULL), '[]'
              ) AS items
       FROM prescriptions p
       LEFT JOIN prescription_items pi ON p.id = pi.prescription_id
       GROUP BY p.id
       ORDER BY p.id DESC`
    )
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar prescrições' })
  }
}

export const updatePrescription: RequestHandler = async (req, res) => {
  const { id } = req.params
  const {
    title,
    date,
    posology_phytotherapy,
    posology_supplement,
    posology_medication,
    notes,
    items
  } = req.body

  try {
    const result = await pool.query(
      `UPDATE prescriptions
         SET title = $1,
             date = $2,
             posology_phytotherapy = $3,
             posology_supplement = $4,
             posology_medication = $5,
             notes = $6,
             updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        title,
        date,
        sanitize(posology_phytotherapy),
        sanitize(posology_supplement),
        sanitize(posology_medication),
        sanitize(notes),
        id
      ]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Prescrição não encontrada' })
    }

    if (items && Array.isArray(items)) {
      await pool.query(`DELETE FROM prescription_items WHERE prescription_id = $1`, [id])
      for (const item of items) {
        const { type, name, dosage, frequency, duration, notes } = item
        await pool.query(
          `INSERT INTO prescription_items (prescription_id, type, name, dosage, frequency, duration, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, type, name, dosage, frequency, duration, notes]
        )
      }
    }

    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar prescrição' })
  }
}

export const deletePrescription: RequestHandler = async (req, res) => {
  const { id } = req.params

  try {
    await pool.query(`DELETE FROM prescription_items WHERE prescription_id = $1`, [id])
    const result = await pool.query(`DELETE FROM prescriptions WHERE id = $1`, [id])

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Prescrição não encontrada' })
    }

    res.json({ message: 'Prescrição excluída com sucesso' })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir prescrição' })
  }
}
