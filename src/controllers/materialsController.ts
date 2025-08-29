import type { RequestHandler } from 'express'
import pool from '../config/db'
import { getAuthIdsFromRequest } from '../helpers/auth/getDoctorIdFromRequest'

export const createMaterial: RequestHandler = async (req, res) => {
  try {
    const { userId } = await getAuthIdsFromRequest(req)
    const { name, category, unit, measures, stock, price, brand, expiration } = req.body

    if (!name || !category || !unit || !measures || stock === undefined || price === undefined || !brand) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' })
    }

    const result = await pool.query(
      'insert into materials (name, category, unit, measures, stock, price, brand, user_id, expiration) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *',
      [name, category, unit, measures, stock, price, brand, userId, expiration || null]
    )

    return res.status(201).json(result.rows[0])
  } catch (err: any) {
    const status = err?.status ?? 500
    const msg = err?.msg ?? 'Erro ao criar material'
    return res.status(status).json({ error: msg })
  }
}

export const listMaterials: RequestHandler = async (req, res) => {
  try {
    const { userId } = await getAuthIdsFromRequest(req)
    const result = await pool.query(
      'select * from materials where user_id = $1 order by id desc',
      [userId]
    )
    return res.json(result.rows)
  } catch (err: any) {
    const status = err?.status ?? 500
    const msg = err?.msg ?? 'Erro ao listar materiais'
    return res.status(status).json({ error: msg })
  }
}

export const updateMaterial: RequestHandler = async (req, res) => {
  try {
    const { userId } = await getAuthIdsFromRequest(req)
    const { id } = req.params
    const { name, category, unit, measures, stock, price, brand, expiration } = req.body

    const result = await pool.query(
      'update materials set name=$1, category=$2, unit=$3, measures=$4, stock=$5, price=$6, brand=$7, expiration=$8 where id=$9 and user_id=$10 returning *',
      [name, category, unit, measures, stock, price, brand, expiration || null, id, userId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Material não encontrado' })
    }

    return res.json(result.rows[0])
  } catch (err: any) {
    const status = err?.status ?? 500
    const msg = err?.msg ?? 'Erro ao atualizar material'
    return res.status(status).json({ error: msg })
  }
}

export const deleteMaterial: RequestHandler = async (req, res) => {
  try {
    const { userId } = await getAuthIdsFromRequest(req)
    const { id } = req.params

    const result = await pool.query(
      'delete from materials where id=$1 and user_id=$2',
      [id, userId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Material não encontrado' })
    }

    return res.json({ message: 'Material excluído com sucesso' })
  } catch (err: any) {
    const status = err?.status ?? 500
    const msg = err?.msg ?? 'Erro ao excluir material'
    return res.status(status).json({ error: msg })
  }
}
