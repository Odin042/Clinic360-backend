import type { RequestHandler } from 'express'
import pool from '../config/db'

export const createMaterial: RequestHandler = async (req, res) => {
  const { name, category, unit, measures, stock, price, brand, user_id, expiration } = req.body
  if (!name || !category || !unit || !measures || stock === undefined || price === undefined || !brand) {
    res.status(400).json({ error: 'Todos os campos são obrigatórios' })
    return
  }
  try {
    const q = `
      insert into public.materials
      (name, category, unit, measures, stock, price, brand, user_id, expiration)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      returning *
    `
    const params = [name, category, unit, measures, stock, price, brand, user_id, expiration]
    const result = await pool.query(q, params)
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('CREATE_MATERIAL_ERROR', err)
    res.status(500).json({ error: 'Erro ao criar material' })
  }
}

export const listMaterials: RequestHandler = async (_req, res) => {
  try {
    const result = await pool.query('select * from public.materials order by id desc')
    res.json(result.rows)
  } catch (err) {
    console.error('LIST_MATERIALS_ERROR', {
      message: err?.message,
      code: err?.code,
      detail: err?.detail,
      schema: err?.schema,
      table: err?.table,
      constraint: err?.constraint
    })
    res.status(500).json({ error: 'Erro ao listar materiais' })
  }
}

export const updateMaterial: RequestHandler = async (req, res) => {
  const { id } = req.params
  const { name, category, unit, measures, stock, price, brand, user_id, expiration } = req.body
  try {
    const q = `
      update public.materials
      set name=$1, category=$2, unit=$3, measures=$4, stock=$5, price=$6, brand=$7, user_id=$8, expiration=$9
      where id=$10
      returning *
    `
    const result = await pool.query(q, [name, category, unit, measures, stock, price, brand, user_id, expiration, id])
    if (!result.rowCount) {
      res.status(404).json({ error: 'Material não encontrado' })
      return
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('UPDATE_MATERIAL_ERROR', err)
    res.status(500).json({ error: 'Erro ao atualizar material' })
  }
}

export const deleteMaterial: RequestHandler = async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query('delete from public.materials where id=$1', [id])
    if (!result.rowCount) {
      res.status(404).json({ error: 'Material não encontrado' })
      return
    }
    res.json({ message: 'Material excluído com sucesso' })
  } catch (err) {
    console.error('DELETE_MATERIAL_ERROR', err)
    res.status(500).json({ error: 'Erro ao excluir material' })
  }
}
