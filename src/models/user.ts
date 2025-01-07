import pool from '../config/db';

export interface User {
  id: number;
  username: string;
  email: string;
  speciality: string;
  password: string;
  passwordConfirm: string;
  cpf_cnpj: string;
  register: string; 
  phone: string;
}

export const createUser = async (
  username: string,
  email: string,
  passwordHash: string,
  speciality: string,
  cpf_cnpj: string,
  register: string,
  phone: string
): Promise<User> => {
  console.log("Senha recebida no createUser:", passwordHash)

  const result = await pool.query(
    'INSERT INTO users (username, email, password, speciality, cpf_cnpj, register,phone) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [username, email, passwordHash, speciality, cpf_cnpj, register, phone]
  )
  return result.rows[0]
}

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1;', [email]);
  return result.rows[0] || null;
};
