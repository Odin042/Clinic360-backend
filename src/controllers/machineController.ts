import type { RequestHandler } from 'express'
import pool from '../config/db'
import getAuthIdsFromRequest from '../helpers/auth/getDoctorIdFromRequest'


export const createMachine: RequestHandler = async (req, res) => {
  try {
    const { userId } = await getAuthIdsFromRequest(req)
    const {
      name,
      brand,
      category,
      quantity,
      cost_per_session,
      machine_value,
      description,
      acquisition_date,
      is_active
    } = req.body

    if (
      !name || !brand || !category ||
      quantity === undefined ||
      cost_per_session === undefined ||
      machine_value === undefined
    ) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' })
    }

    const result = await pool.query(
      'insert into machines (name, brand, category, quantity, cost_per_session, machine_value, description, acquisition_date, is_active, user_id) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *',
      [
        name,
        brand,
        category,
        quantity,
        cost_per_session,
        machine_value,
        description ?? null,
        acquisition_date ?? null,
        is_active ?? true,
        userId
      ]
    )

    return res.status(201).json(result.rows[0])
  } catch (err: any) {
    return res.status(err?.status ?? 500).json({ error: err?.msg ?? 'Erro ao criar máquina' })
  }
}

export const listMachines: RequestHandler = async (req, res) => {
  try {
    const { userId } = await getAuthIdsFromRequest(req)
    const result = await pool.query(
      'select * from machines where user_id = $1 order by id desc',
      [userId]
    )
    return res.json(result.rows)
  } catch (err: any) {
    return res.status(err?.status ?? 500).json({ error: err?.msg ?? 'Erro ao listar máquinas' })
  }
}

export const updateMachine: RequestHandler = async (req, res) => {
  try {
    const { userId } = await getAuthIdsFromRequest(req)
    const { id } = req.params
    const {
      name,
      brand,
      category,
      quantity,
      cost_per_session,
      machine_value,
      description,
      acquisition_date,
      is_active
    } = req.body

    const result = await pool.query(
      'update machines set name=$1, brand=$2, category=$3, quantity=$4, cost_per_session=$5, machine_value=$6, description=$7, acquisition_date=$8, is_active=$9, updated_at=now() where id=$10 and user_id=$11 returning *',
      [
        name,
        brand,
        category,
        quantity,
        cost_per_session,
        machine_value,
        description ?? null,
        acquisition_date ?? null,
        is_active ?? true,
        id,
        userId
      ]
    )

    if (result.rowCount === 0) return res.status(404).json({ error: 'Máquina não encontrada' })
    return res.json(result.rows[0])
  } catch (err: any) {
    return res.status(err?.status ?? 500).json({ error: err?.msg ?? 'Erro ao atualizar máquina' })
  }
}

export const deleteMachine: RequestHandler = async (req, res) => {
  try {
    const { userId } = await getAuthIdsFromRequest(req)
    const { id } = req.params

    const result = await pool.query(
      'delete from machines where id=$1 and user_id=$2',
      [id, userId]
    )

    if (result.rowCount === 0) return res.status(404).json({ error: 'Máquina não encontrada' })
    return res.json({ message: 'Máquina excluída com sucesso' })
  } catch (err: any) {
    return res.status(err?.status ?? 500).json({ error: err?.msg ?? 'Erro ao excluir máquina' })
  }
}
