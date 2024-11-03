import pool from '../config/db';

export interface User {
  id: number;
  username: string;
  email: string;
  profession: string;
  password: string;
}

export const createUser = async (
  username: string,
  email: string,
  passwordHash: string,
  profession: string
): Promise<User> => {
  const result = await pool.query(
    'INSERT INTO clinic_users (username, email, password, profession) VALUES ($1, $2, $3, $4) RETURNING *',
    [username, email, passwordHash, profession]
  );
  return result.rows[0];
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await pool.query('SELECT * FROM clinic_users WHERE email = $1;', [email]);
  return result.rows[0] || null;
};
