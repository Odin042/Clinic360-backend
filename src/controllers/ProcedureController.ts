import type { RequestHandler } from 'express'
import pool from '../config/db'
import getAuthIdsFromRequest from '../helpers/auth/getDoctorIdFromRequest'

type ProcedureItem = {
  material_id?: number | null
  manual_name?: string | null
  quantity: number
  unit_cost?: number
  total_cost?: number
}

type ProcedureMachine = {
  machine_id?: number | null
  manual_name?: string | null
  cost_per_session: number
}

type ProcedureBody = {
  name: string
  patient_id?: number | null
  date_procedure: string
  notes?: string | null
  items?: ProcedureItem[]
  machines?: ProcedureMachine[]
  final_price?: number | null
  profit_percent?: number | null
  is_budget?: boolean | null
  mode?: 'BUDGET' | 'DONE' | 'APPLICATION' | null
  attachments?: { before_url: string | null; after_url: string | null } | null
}

export const listProcedures: RequestHandler = async (req, res) => {
  try {
    const { userId } = await getAuthIdsFromRequest(req)
    const patientId =
      typeof req.query.patient_id === 'string' && req.query.patient_id.trim() !== ''
        ? Number(req.query.patient_id)
        : null
    const professionalId =
      typeof req.query.professional_id === 'string' && req.query.professional_id.trim() !== ''
        ? Number(req.query.professional_id)
        : null
    const params: any[] = [userId]
    const where: string[] = ['p.user_id = $1']
    if (Number.isFinite(patientId)) {
      params.push(patientId)
      where.push(`p.patient_id = $${params.length}`)
    }
    if (Number.isFinite(professionalId)) {
      params.push(professionalId)
      where.push(`p.professional_id = $${params.length}`)
    }
    const sql = `
      select
        p.*,
        (p."mode" = 'BUDGET')::boolean as is_budget,
        a.before_url,
        a.after_url,
        coalesce(pe.name, d.name, u.username, concat('Profissional #', p.professional_id)) as professional_name
      from public.procedures p
      left join public.procedure_attachments a on a.procedure_id = p.id
      left join public.doctor d on d.id = p.professional_id
      left join public.users u on u.id = p.user_id
      left join public.persons pe on pe.id::text = u.person_id
      where ${where.join(' and ')}
      order by p.date_procedure desc, p.id desc
    `
    const { rows } = await pool.query(sql, params)
    return res.json(rows)
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erro ao listar procedimentos' })
  }
}

export const getProcedureDetails: RequestHandler = async (req, res) => {
  try {
    const { userId } = await getAuthIdsFromRequest(req)
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' })
    const head = await pool.query(
      `select p.*,
              (p."mode" = 'BUDGET')::boolean as is_budget,
              a.before_url, a.after_url,
              coalesce(pe.name, d.name, u.username, concat('Profissional #', p.professional_id)) as professional_name
         from public.procedures p
         left join public.procedure_attachments a on a.procedure_id = p.id
         left join public.doctor d on d.id = p.professional_id
         left join public.users u on u.id = p.user_id
         left join public.persons pe on pe.id::text = u.person_id
        where p.id = $1 and p.user_id = $2`,
      [id, userId]
    )
    if (!head.rowCount) return res.status(404).json({ error: 'Procedimento não encontrado' })
    const items = await pool.query(
      `select id, material_id, manual_name, quantity, unit_cost, total_cost
         from public.procedure_items
        where procedure_id = $1 and user_id = $2
        order by id`,
      [id, userId]
    )
    const machines = await pool.query(
      `select id, machine_id, manual_name, cost_per_session
         from public.procedure_machines
        where procedure_id = $1 and user_id = $2
        order by id`,
      [id, userId]
    )
    return res.json({
      ...head.rows[0],
      items: items.rows,
      machines: machines.rows
    })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erro ao buscar procedimento' })
  }
}

export const getProcedureById: RequestHandler = async (req, res) => {
  try {
    const { userId } = await getAuthIdsFromRequest(req)
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' })
    const { rows } = await pool.query(
      `
      select
        p.*,
        (p."mode" = 'BUDGET')::boolean as is_budget,
        a.before_url,
        a.after_url,
        coalesce(pe.name, d.name, u.username, concat('Profissional #', p.professional_id)) as professional_name,
        coalesce(pm.machines, '[]'::json) as machines,
        coalesce(pi.items, '[]'::json) as items
      from public.procedures p
      left join public.procedure_attachments a on a.procedure_id = p.id
      left join public.doctor  d on d.id = p.professional_id
      left join public.users   u on u.id = p.user_id
      left join public.persons pe on pe.id::text = u.person_id
      left join lateral (
        select json_agg(json_build_object(
          'id', m.id,
          'machine_id', m.machine_id,
          'manual_name', m.manual_name,
          'cost_per_session', m.cost_per_session,
          'name', coalesce(mm.name, m.manual_name)
        ) order by m.id) as machines
        from public.procedure_machines m
        left join public.machines mm
          on mm.id = m.machine_id and mm.user_id = m.user_id
        where m.procedure_id = p.id and m.user_id = p.user_id
      ) pm on true
      left join lateral (
        select json_agg(json_build_object(
          'id', i.id,
          'material_id', i.material_id,
          'manual_name', i.manual_name,
          'quantity', i.quantity,
          'unit_cost', i.unit_cost,
          'total_cost', i.total_cost,
          'name', coalesce(mat.name, i.manual_name)
        ) order by i.id) as items
        from public.procedure_items i
        left join public.materials mat
          on mat.id = i.material_id and mat.user_id = i.user_id
        where i.procedure_id = p.id and i.user_id = p.user_id
      ) pi on true
      where p.user_id = $1 and p.id = $2
      `,
      [userId, id]
    )
    if (!rows.length) return res.status(404).json({ error: 'Procedimento não encontrado' })
    return res.json(rows[0])
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erro ao buscar procedimento' })
  }
}

export const getDayReport: RequestHandler = async (req, res) => {
  try {
    const { userId } = await getAuthIdsFromRequest(req)
    const date = String(req.params.date || '')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Parâmetro de data inválido' })
    }
    const head = await pool.query(
      'select * from public.vw_day_report where user_id = $1 and date = $2',
      [userId, date]
    )
    const byProf = await pool.query(
      'select * from public.vw_day_report_by_professional where user_id = $1 and date = $2',
      [userId, date]
    )
    return res.json({
      data: date,
      total_registros: head.rows[0]?.total_records ?? 0,
      totais: {
        custo_total: head.rows[0]?.total_cost ?? 0,
        faturamento: head.rows[0]?.revenue ?? 0,
        lucro_total: head.rows[0]?.total_profit ?? 0,
        margem_media_percentual: head.rows[0]?.avg_margin_percent ?? null
      },
      por_profissional: byProf.rows.map(r => ({
        profissional_id: r.professional_id,
        custo_total: r.total_cost,
        preco_final: r.final_price,
        lucro_reais: r.profit_value,
        margem_percentual: r.margin_percent
      }))
    })
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erro no relatório do dia' })
  }
}

export const createProcedure: RequestHandler = async (req, res) => {
  const client = await pool.connect()
  try {
    const { userId, doctorId } = await getAuthIdsFromRequest(req)
    if (!doctorId) return res.status(403).json({ error: 'Apenas médicos podem criar procedimentos.' })
    const {
      name,
      patient_id,
      date_procedure,
      notes,
      items = [],
      machines = [],
      final_price,
      profit_percent,
      is_budget = false,
      mode = null,
      attachments = null
    } = req.body as ProcedureBody
    if (!name || String(name).trim().length < 3) {
      return res.status(400).json({ error: 'Informe o nome do procedimento (mín. 3 caracteres).' })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date_procedure))) {
      return res.status(400).json({ error: 'Data do procedimento inválida.' })
    }
    const today = new Date().toISOString().slice(0, 10)
    if (date_procedure !== today) {
      return res.status(400).json({ error: `A data do procedimento deve ser o dia ${today}.` })
    }
    const hasAnyMachine = Array.isArray(machines) && machines.length > 0
    const hasAnyItem = Array.isArray(items) && items.length > 0
    if (!hasAnyMachine && !hasAnyItem) {
      return res.status(400).json({ error: 'Adicione ao menos uma máquina ou um insumo.' })
    }
    const normMachines = (machines ?? []).map((m: any) => ({
      machine_id: m.machine_id ?? m.stock_id ?? null,
      manual_name: m.manual_name ?? null,
      cost_per_session: m.cost_per_session
    }))
    const normItems = (items ?? []).map((it: any) => ({
      material_id: it.material_id ?? it.stock_id ?? null,
      manual_name: it.manual_name ?? null,
      quantity: it.quantity,
      unit_cost: it.unit_cost,
      total_cost: it.total_cost
    }))
    await client.query('begin')
    const head = await client.query(
      `insert into public.procedures
        (user_id, name, professional_id, patient_id, date_procedure, final_price, profit_percent, notes, "mode")
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       returning *`,
      [
        userId,
        name.trim(),
        doctorId,
        patient_id || null,
        date_procedure,
        final_price ?? null,
        profit_percent ?? null,
        notes || null,
        (mode ?? (is_budget ? 'BUDGET' : 'DONE')) as 'BUDGET' | 'DONE' | 'APPLICATION'
      ]
    )
    const pid = head.rows[0].id
    if (attachments && (attachments.before_url || attachments.after_url)) {
      await client.query(
        `insert into public.procedure_attachments (procedure_id, before_url, after_url)
         values ($1,$2,$3)`,
        [pid, attachments.before_url || null, attachments.after_url || null]
      )
    }
    for (const m of normMachines) {
      const hasOrigin = (m.machine_id != null) !== (m.manual_name != null)
      if (!hasOrigin) {
        await client.query('rollback')
        return res.status(400).json({ error: 'Informe machine_id OU manual_name em cada máquina.' })
      }
      let cps = m.cost_per_session != null ? Number(m.cost_per_session) : NaN
      if (m.machine_id != null) {
        const q = await client.query(
          'select cost_per_session from public.machines where id=$1 and user_id=$2',
          [m.machine_id, userId]
        )
        if (!q.rowCount) {
          await client.query('rollback')
          return res.status(400).json({ error: 'Máquina não encontrada.' })
        }
        if (!Number.isFinite(cps)) cps = Number(q.rows[0].cost_per_session ?? NaN)
      }
      if (!Number.isFinite(cps) || cps < 0) {
        await client.query('rollback')
        return res.status(400).json({ error: 'Custo por sessão inválido em máquinas' })
      }
      await client.query(
        `insert into public.procedure_machines
          (procedure_id, user_id, machine_id, manual_name, cost_per_session)
         values ($1,$2,$3,$4,$5)`,
        [pid, userId, m.machine_id ?? null, m.manual_name ?? null, cps]
      )
    }
    for (const it of normItems) {
      const hasOrigin = (it.material_id != null) !== (it.manual_name != null)
      if (!hasOrigin) {
        await client.query('rollback')
        return res.status(400).json({ error: 'Informe material_id OU manual_name em cada insumo.' })
      }
      const qty = Number(it.quantity ?? 0)
      if (!Number.isFinite(qty) || qty < 0) {
        await client.query('rollback')
        return res.status(400).json({ error: 'Quantidade inválida em insumos' })
      }
      let unitCost = it.unit_cost != null ? Number(it.unit_cost) : NaN
      if (it.material_id != null) {
        const q = await client.query(
          'select price from public.materials where id=$1 and user_id=$2',
          [it.material_id, userId]
        )
        if (!q.rowCount) {
          await client.query('rollback')
          return res.status(400).json({ error: 'Material não encontrado' })
        }
        if (!Number.isFinite(unitCost)) unitCost = Number(q.rows[0].price ?? NaN)
      }
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        await client.query('rollback')
        return res.status(400).json({ error: 'Custo unitário inválido em insumos' })
      }
      const total = it.total_cost != null ? Number(it.total_cost) : Number((qty * unitCost).toFixed(2))
      if (!Number.isFinite(total) || total < 0) {
        await client.query('rollback')
        return res.status(400).json({ error: 'Custo total inválido em insumos' })
      }
      const currentMode = ((mode ?? (is_budget ? 'BUDGET' : 'DONE')) as 'BUDGET' | 'DONE' | 'APPLICATION')
      if (currentMode !== 'BUDGET' && it.material_id != null) {
        const upd = await client.query(
          `update public.materials
             set stock = stock - $1
           where id = $2 and user_id = $3 and stock >= $1
           returning stock`,
          [qty, it.material_id, userId]
        )
        if (!upd.rowCount) {
          await client.query('rollback')
          return res.status(400).json({ error: 'Estoque insuficiente para o material selecionado' })
        }
      }
      await client.query(
        `insert into public.procedure_items
          (procedure_id, user_id, material_id, manual_name, quantity, unit_cost, total_cost)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [pid, userId, it.material_id ?? null, it.manual_name ?? null, qty, unitCost, total]
      )
    }
    await client.query('commit')
    try {
      const { rows } = await pool.query(
        "select to_regprocedure('public.recompute_procedure_totals(integer)') is not null as ok"
      )
      if (rows[0]?.ok) {
        await pool.query('select public.recompute_procedure_totals($1)', [pid])
      }
    } catch {}
    const full = await pool.query(
      `select p.*,
              (p."mode" = 'BUDGET')::boolean as is_budget,
              a.before_url, a.after_url
         from public.procedures p
         left join public.procedure_attachments a on a.procedure_id = p.id
        where p.id = $1 and p.user_id = $2`,
      [pid, userId]
    )
    return res.status(201).json({
      ...full.rows[0]
    })
  } catch (err: any) {
    try { await client.query('rollback') } catch {}
    if (err?.code === '23503') return res.status(400).json({ error: 'FK inválida (material/máquina).' })
    if (err?.code === '23514') return res.status(400).json({ error: 'Origem do item inválida (material_id OU manual_name).' })
    return res.status(500).json({ error: 'Erro ao criar procedimento' })
  } finally {
    client.release()
  }
}

export default {
  listProcedures,
  getDayReport,
  getProcedureById,
  getProcedureDetails,
  createProcedure
}
