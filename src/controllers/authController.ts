import bcryptjs from 'bcryptjs'
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { createUser, findUserByEmail } from '../models/user'
import { JWT_SECRET } from '../config/env'
import { toHttpError } from '../helpers/httpError'

export const register =  async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      username,
      email,
      password,
      speciality,
      cpf_cnpj,
      gender,
      register,
      uf,
      phone,
    } = req.body

    const passwordHash = await bcryptjs.hash(password, 10)
    const newUser = await createUser(
      username,
      email,
      passwordHash,
      speciality,
      cpf_cnpj,
      gender,
      register,
      uf,
      phone
    )

    res.status(201).json({ message: 'Usuário criado com sucesso', user: newUser })
  } catch (err: unknown) {
    const { status, message } = toHttpError(err, 'Erro ao criar usuário.')
    res.status(status).json({ error: message })
  }
}

export const login = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body

    if (!password) {
      res.status(400).json({ message: 'Senha é obrigatória.' })
      return
    }

    const user = await findUserByEmail(email)

    if (!user) {
      res.status(400).json({ message: 'Credenciais inválidas.' })
      return
    }

    if (!user.password) {
      res.status(500).json({ message: 'Erro interno no servidor. (Senha ausente)' })
      return
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password)

    if (!isPasswordValid) {
      res.status(400).json({ message: 'Credenciais inválidas.' })
      return
    }

    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET não está definido no ambiente')
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: '1h'
    })

    res.json({ message: 'Login realizado com sucesso!', token })
  } catch (err: unknown) {
    const { status, message } = toHttpError(err, 'Erro interno no servidor.')
    res.status(status).json({ message })
  }
}
