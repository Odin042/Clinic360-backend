import type { RequestHandler } from 'express'
import pool from '../config/db'
import getAuthIdsFromRequest from '../helpers/auth/getDoctorIdFromRequest'

type Item = { exam_code?: string | null, exam_name: string, observations?: string | null }

export const createExamOrder: RequestHandler = async (req, res) => {
  try {
    const { doctorId } = await getAuthIdsFromRequest(req)
    const patientId = Number(req.body.patientId)
    const notes = String(req.body.notes ?? '')
    const items = Array.isArray(req.body.items) ? req.body.items : []

    if (!Number.isFinite(patientId)) return res.status(400).json({ error: 'patientId inválido' })
    if (!items.length) return res.status(400).json({ error: 'Informe ao menos um exame' })

    const own = await pool.query(
      'select 1 from patient where id = $1 and doctor_id = $2',
      [patientId, Number(doctorId)]
    )
    if (!own.rowCount) return res.status(404).json({ error: 'Paciente não encontrado' })

    const ins = await pool.query(
      `insert into exam_orders (patient_id, doctor_id, status, notes, requested_at, created_at, updated_at)
       values ($1, $2, 'DRAFT', $3, now(), now(), now())
       returning id`,
      [patientId, Number(doctorId), notes]
    )
    const orderId = ins.rows[0].id

    const values = []
    const params = []
    items.forEach((it, idx) => {
      const base = idx * 3
      params.push(`($${base + 1}, $${base + 2}, $${base + 3})`)
      values.push(orderId, it.exam_code ?? null, it.exam_name)
    })

    await pool.query(
      `insert into exam_order_items (order_id, exam_code, exam_name) values ${params.join(',')}`,
      values
    )

    return res.json({ id: orderId })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Falha ao criar pedido de exame' })
  }
}

export const getExamOrderById: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id inválido' })

    const { rows: orders } = await pool.query(
      `SELECT id, patient_id, doctor_id, status, notes, requested_at, due_date, created_at, updated_at
       FROM public.exam_orders WHERE id = $1`, [id]
    )
    if (orders.length === 0) return res.status(404).json({ error: 'Pedido não encontrado' })

    const { rows: items } = await pool.query(
      `SELECT id, order_id, exam_code, exam_name, observations, created_at, updated_at
       FROM public.exam_order_items WHERE order_id = $1 ORDER BY id`, [id]
    )

    return res.json({ order: orders[0], items })
  } catch (e: any) {
    return res.status(500).json({ error: 'Falha ao buscar pedido', detail: e?.message })
  }
}

export const listExamOrdersByPatient: RequestHandler = async (req, res) => {
  try {
    const { doctorId } = await getAuthIdsFromRequest(req)
    const patientId = Number(req.params.id ?? req.query.patientId)
    if (!Number.isFinite(patientId)) return res.status(400).json({ error: 'patientId inválido' })

    const q = await pool.query(
      `
      select
        o.id,
        o.status,
        o.notes,
        o.requested_at,
        o.created_at,
        o.updated_at,
        coalesce(
          json_agg(
            json_build_object(
              'id', i.id,
              'exam_code', i.exam_code,
              'exam_name', i.exam_name
            )
          ) filter (where i.id is not null),
          '[]'
        ) as items
      from exam_orders o
      left join exam_order_items i on i.order_id = o.id
      where o.patient_id = $1 and o.doctor_id = $2
      group by o.id
      order by o.created_at desc
      `,
      [patientId, Number(doctorId)]
    )

    return res.json(q.rows)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Falha ao listar pedidos de exame' })
  }
}

export const updateExamOrder: RequestHandler = async (req, res) => {
  const client = await pool.connect()
  try {
    const { doctorId } = await getAuthIdsFromRequest(req)
    const id = Number(req.params.id)
    const notes = req.body.notes
    const status = req.body.status
    const items = Array.isArray(req.body.items) ? req.body.items : undefined
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id inválido' })

    const own = await client.query('select patient_id from exam_orders where id = $1 and doctor_id = $2', [id, Number(doctorId)])
    if (!own.rowCount) return res.status(404).json({ error: 'Pedido não encontrado' })

    await client.query('begin')

    if (notes !== undefined || status !== undefined) {
      await client.query(
        `update exam_orders
           set notes = coalesce($2, notes),
               status = coalesce($3, status),
               updated_at = now()
         where id = $1`,
        [id, notes ?? null, status ?? null]
      )
    }

    if (items) {
      await client.query('delete from exam_order_items where order_id = $1', [id])
      if (items.length) {
        const values = []
        const params = []
        items.forEach((it: any, idx: number) => {
          const b = idx * 3
          params.push(`($${b + 1}, $${b + 2}, $${b + 3})`)
          values.push(id, it.exam_code ?? null, it.exam_name)
        })
        await client.query(
          `insert into exam_order_items (order_id, exam_code, exam_name) values ${params.join(',')}`,
          values
        )
      }
      await client.query('update exam_orders set updated_at = now() where id = $1', [id])
    }

    await client.query('commit')
    return res.json({ id })
  } catch (e) {
    await client.query('rollback')
    console.error(e)
    return res.status(500).json({ error: 'Falha ao atualizar pedido de exame' })
  } finally {
    client.release()
  }
}

export const deleteExamOrder: RequestHandler = async (req, res) => {
  try {
    const { doctorId } = await getAuthIdsFromRequest(req)
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'id inválido' })
    const del = await pool.query('delete from exam_orders where id = $1 and doctor_id = $2 returning id', [id, Number(doctorId)])
    if (!del.rowCount) return res.status(404).json({ error: 'Pedido não encontrado' })
    return res.json({ ok: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Falha ao remover pedido de exame' })
  }
}