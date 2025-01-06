import bcryptjs from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { createUser, findUserByEmail } from '../models/user';
import dotenv from 'dotenv';

dotenv.config();

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, speciality } = req.body
    
    console.log("Senha recebida:", password)

    if (!password) {
      res.status(400).json({ message: 'Senha é obrigatória.' })
      return;
    }

    const hashedPassword = await bcryptjs.hash(password, 10)
    console.log("Senha hash:", hashedPassword)

    const user = await createUser(username, email, hashedPassword, speciality)
    
    res.status(201).json({ message: 'Usuário registrado com sucesso!', user })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Erro interno no servidor.' })
  }
}

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!password) {
      res.status(400).json({ message: 'Senha é obrigatória.' });
      return;
    }

    const user = await findUserByEmail(email);

    if (!user) {
      res.status(400).json({ message: "Credenciais inválidas." });
      return;
    }


    if (!user.password) {
      console.log("❌ Senha não encontrada no banco!");
      res.status(500).json({ message: "Erro interno no servidor. (Senha ausente)" });
      return;
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(400).json({ message: 'Credenciais inválidas.' });
      return;
    }

    if (!process.env.JWT_SECRET) {
      console.error("❌ ERRO: JWT_SECRET não definido no .env!");
      throw new Error("JWT_SECRET não está definido no .env");
    }
    
    console.log("✅ JWT_SECRET encontrado:", process.env.JWT_SECRET)

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.json({ message: 'Login realizado com sucesso!', token });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno no servidor.', error: error.message });
  }
}