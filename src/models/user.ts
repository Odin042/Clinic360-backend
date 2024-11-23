import pool from '../config/db';

export interface User {
  id: number;
  username: string;
  email: string;
  speciality: string;
  password: string;
  passwordConfirm: string;
}

export const createUser = async (
  username: string,
  email: string,
  passwordHash: string,
  passwordConfirm: string,
  speciality: string
): Promise<User> => {
  const result = await pool.query(
    'INSERT INTO users (username, email, password,passwordConfirm, speciality) VALUES ($1, $2, $3, $4) RETURNING *',
    [username, email, passwordHash, passwordConfirm, speciality]
  );
  return result.rows[0];
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1;', [email]);
  return result.rows[0] || null;
};
