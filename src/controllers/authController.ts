import bcryptjs from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { createUser, findUserByEmail } from '../models/user';
import dotenv from 'dotenv';

dotenv.config();

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username, email, password, passwordConfirm, speciality } = req.body;

    if (!password) {
      res.status(400).json({ message: 'Senha é obrigatória.' });
      return;
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      res.status(400).json({ message: 'Usuário já registrado.' });
      return;
    }

    const passwordHash = await bcryptjs.hash(password, 10);
    const passwordConfirmHash = await bcryptjs.hash(passwordConfirm, 10);
    const user = await createUser(username, email, passwordHash, passwordConfirmHash, speciality);

    res.status(201).json({ message: 'Usuário registrado com sucesso!', user });
  } catch (error) {
    console.error(error); 
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!password) {
      res.status(400).json({ message: 'Senha é obrigatória.' });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      res.status(400).json({ message: 'Credenciais inválidas.' });
      return;
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(400).json({ message: 'Credenciais inválidas.' });
      return;
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET não está definido no arquivo .env');
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.json({ message: 'Login realizado com sucesso!', token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};