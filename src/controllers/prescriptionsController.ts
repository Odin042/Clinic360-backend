import type { RequestHandler } from 'express'
import pool from '../config/db'
import getAuthIdsFromRequest from '../helpers/auth/getDoctorIdFromRequest'

const sanitize = v => (typeof v === 'string' && v.trim() === '' ? null : v)

export const createPrescription: RequestHandler = async (req, res) => {
  const client = await pool.connect()
  try {
    const { doctorId } = await getAuthIdsFromRequest(req)
    const {
      patient_id,
      title,
      date,
      posology_phytotherapy,
      posology_supplement,
      posology_medication,
      notes,
      items = []
    } = req.body

    if (!patient_id || !title || !date) {
      res.status(400).json({ error: 'Campos obrigatórios: patient_id, title, date' })
      return
    }

    const patientId = Number(patient_id)
    if (!Number.isFinite(patientId)) {
      res.status(400).json({ error: 'patient_id inválido' })
      return
    }

    const own = await client.query(
      'select 1 from patient where id = $1 and doctor_id = $2',
      [patientId, Number(doctorId)]
    )
    if (!own.rowCount) {
      res.status(404).json({ error: 'Paciente não encontrado' })
      return
    }

    await client.query('BEGIN')

    const ins = await client.query(
      `insert into prescriptions
         (patient_id, doctor_id, title, date,
          posology_phytotherapy, posology_supplement,
          posology_medication, notes)
       values ($1,$2,$3,$4::date,$5,$6,$7,$8)
       returning id`,
      [
        patientId,
        Number(doctorId),
        title,
        String(date).split('T')[0],
        sanitize(posology_phytotherapy),
        sanitize(posology_supplement),
        sanitize(posology_medication),
        sanitize(notes)
      ]
    )
    const pid = ins.rows[0].id

    for (const it of Array.isArray(items) ? items.filter(i => i?.type && i.name) : []) {
      const { type, name, dosage, frequency, duration, notes: n } = it
      await client.query(
        `insert into prescription_items
           (prescription_id, type, name, dosage, frequency, duration, notes)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [pid, type, name, dosage, frequency, duration, n]
      )
    }

    await client.query('COMMIT')
    res.status(201).json({ id: pid })
  } catch (e) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erro ao salvar prescrição' })
  } finally {
    client.release()
  }
}

export const listPrescriptions: RequestHandler = async (req, res) => {
  try {
    const { doctorId } = await getAuthIdsFromRequest(req)
    const patientId = Number(req.query.patient_id)
    if (!Number.isFinite(patientId)) {
      res.status(400).json({ error: 'patient_id inválido' })
      return
    }

    const own = await pool.query(
      'select 1 from patient where id = $1 and doctor_id = $2',
      [patientId, Number(doctorId)]
    )
    if (!own.rowCount) {
      res.status(404).json({ error: 'Paciente não encontrado' })
      return
    }

    const result = await pool.query(
      `
      select p.*,
             coalesce(json_agg(pi.*) filter (where pi.id is not null), '[]') as items
      from prescriptions p
      left join prescription_items pi on p.id = pi.prescription_id
      where p.patient_id = $1 and p.doctor_id = $2
      group by p.id
      order by p.id desc
      `,
      [patientId, Number(doctorId)]
    )
    res.json(result.rows)
  } catch {
    res.status(500).json({ error: 'Erro ao listar prescrições' })
  }
}

export const updatePrescription: RequestHandler = async (req, res) => {
  const client = await pool.connect()
  try {
    const { doctorId } = await getAuthIdsFromRequest(req)
    const pid = Number(req.params.id)
    if (!Number.isFinite(pid)) {
      res.status(400).json({ error: 'ID inválido' })
      return
    }

    const own = await client.query(
      'select 1 from prescriptions where id = $1 and doctor_id = $2',
      [pid, Number(doctorId)]
    )
    if (!own.rowCount) {
      res.status(404).json({ error: 'Prescrição não encontrada' })
      return
    }

    const {
      title,
      date,
      posology_phytotherapy,
      posology_supplement,
      posology_medication,
      notes,
      items
    } = req.body

    const updates: string[] = []
    const values: any[] = []
    let i = 1

    if (title !== undefined) { updates.push(`title = $${i++}`); values.push(title) }
    if (date !== undefined)  { updates.push(`date = $${i++}`); values.push(String(date).split('T')[0]) }
    if (posology_phytotherapy !== undefined) { updates.push(`posology_phytotherapy = $${i++}`); values.push(sanitize(posology_phytotherapy)) }
    if (posology_supplement !== undefined)   { updates.push(`posology_supplement = $${i++}`); values.push(sanitize(posology_supplement)) }
    if (posology_medication !== undefined)   { updates.push(`posology_medication = $${i++}`); values.push(sanitize(posology_medication)) }
    if (notes !== undefined)                 { updates.push(`notes = $${i++}`); values.push(sanitize(notes)) }

    if (!updates.length && !Array.isArray(items)) {
      res.status(400).json({ error: 'Nada para atualizar' })
      return
    }

    await client.query('BEGIN')

    if (updates.length) {
      updates.push('updated_at = now()')
      values.push(pid)
      values.push(Number(doctorId))
      await client.query(
        `
        update prescriptions
           set ${updates.join(', ')}
         where id = $${i++}
           and doctor_id = $${i}
        `,
        values
      )
    }

    if (Array.isArray(items)) {
      await client.query(`delete from prescription_items where prescription_id = $1`, [pid])
      for (const it of items) {
        const { type, name, dosage, frequency, duration, notes: n } = it
        await client.query(
          `insert into prescription_items
             (prescription_id, type, name, dosage, frequency, duration, notes)
           values ($1,$2,$3,$4,$5,$6,$7)`,
          [pid, type, name, dosage, frequency, duration, n]
        )
      }
    }

    await client.query('COMMIT')

    const refreshed = await client.query(
      `
      select p.*,
             coalesce(json_agg(pi.*) filter (where pi.id is not null), '[]') as items
      from prescriptions p
      left join prescription_items pi on p.id = pi.prescription_id
      where p.id = $1 and p.doctor_id = $2
      group by p.id
      `,
      [pid, Number(doctorId)]
    )

    res.json(refreshed.rows[0])
  } catch {
    await client.query('ROLLBACK')
    res.status(500).json({ error: 'Erro ao atualizar prescrição' })
  } finally {
    client.release()
  }
}

export const deletePrescription: RequestHandler = async (req, res) => {
  const client = await pool.connect()
  try {
    const { doctorId } = await getAuthIdsFromRequest(req)
    const pid = Number(req.params.id)
    if (!Number.isFinite(pid)) {
      res.status(400).json({ error: 'ID inválido' })
      return
    }

    await client.query('BEGIN')

    const own = await client.query(
      'select 1 from prescriptions where id = $1 and doctor_id = $2',
      [pid, Number(doctorId)]
    )
    if (!own.rowCount) {
      await client.query('ROLLBACK')
      res.status(404).json({ error: 'Prescrição não encontrada' })
      return
    }

    await client.query(`delete from prescription_items where prescription_id = $1`, [pid])
    await client.query(`delete from prescriptions where id = $1 and doctor_id = $2`, [pid, Number(doctorId)])

    await client.query('COMMIT')
    res.json({ message: 'Prescrição excluída com sucesso' })
  } catch {
    await client.query('ROLLBACK')
    res.status(500).json({ error: 'Erro ao excluir prescrição' })
  } finally {
    client.release()
  }
}
