import type { RequestHandler } from 'express'
import pool from '../config/db'

export const createMachine: RequestHandler = async (req, res) => {
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

  if (!name || !brand || !category || quantity === undefined || cost_per_session === undefined || machine_value === undefined) {
    return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos' })
  }

  try {
    const result = await pool.query(
      'INSERT INTO machines (name, brand, category, quantity, cost_per_session, machine_value, description, acquisition_date, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [name, brand, category, quantity, cost_per_session, machine_value, description, acquisition_date, is_active]
    )
    res.status(201).json(result.rows[0])
  } catch {
    res.status(500).json({ error: 'Erro ao criar máquina' })
  }
}

export const listMachines: RequestHandler = async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM machines ORDER BY id DESC')
    res.json(result.rows)
  } catch {
    res.status(500).json({ error: 'Erro ao listar máquinas' })
  }
}

export const updateMachine: RequestHandler = async (req, res) => {
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

  try {
    const result = await pool.query(
      'UPDATE machines SET name = $1, brand = $2, category = $3, quantity = $4, cost_per_session = $5, machine_value = $6, description = $7, acquisition_date = $8, is_active = $9, updated_at = NOW() WHERE id = $10 RETURNING *',
      [name, brand, category, quantity, cost_per_session, machine_value, description, acquisition_date, is_active, id]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Máquina não encontrada' })
    }
    res.json(result.rows[0])
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar máquina' })
  }
}

export const deleteMachine: RequestHandler = async (req, res) => {
  const { id } = req.params

  try {
    const result = await pool.query('DELETE FROM machines WHERE id = $1', [id])
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Máquina não encontrada' })
    }
    res.json({ message: 'Máquina excluída com sucesso' })
  } catch {
    res.status(500).json({ error: 'Erro ao excluir máquina' })
  }
}
