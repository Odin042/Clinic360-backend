import pool from '../config/db';

export interface User {
  id: number;
  username: string;
  email: string;
  speciality?: string;
  password: string;
  cpf_cnpj: string;
  register: string;
  uf: string;
  phone: string;
  type: string;
  person_id: number;
}

export interface Person {
  id: number;
  name: string;
  cpf_cnpj: string;
  phone: string;
  type: string;
  status: boolean;
}

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
};

const findOrCreatePerson = async (
  client: any,
  name: string,
  cpf_cnpj: string,
  phone: string,
  gender: string
): Promise<number> => {
  const checkPerson = await client.query(
    'SELECT id FROM persons WHERE cpf_cnpj = $1',
    [cpf_cnpj]
  );
  if (checkPerson.rows.length > 0) {
    return checkPerson.rows[0].id;
  }
  const newPerson = await client.query(
    `
    INSERT INTO persons (name, cpf_cnpj, phone, gender, type, status) 
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
    `,
    [name, cpf_cnpj, phone, gender, 'person', true]
  );
  return newPerson.rows[0].id;
};

export const createUser = async (
  username: string,
  email: string,
  passwordHash: string,
  speciality: string | null,
  cpf_cnpj: string,
  gender: string,
  register: string,
  uf: string,
  phone: string
): Promise<User> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const personId = await findOrCreatePerson(client, username, cpf_cnpj, phone, gender);
    const userType = speciality ? 'Doctor' : 'User';
    const userResult = await client.query(
      `
      INSERT INTO users 
      (username, email, password, speciality, cpf_cnpj, gender, register, uf, phone, type, person_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
      `,
      [
        username,
        email,
        passwordHash,
        speciality,
        cpf_cnpj,
        gender,
        register,
        uf,
        phone,
        userType,
        personId
      ]
    );
    const newUser = userResult.rows[0];
    if (userType === 'Doctor') {
      await client.query(
        `
        INSERT INTO doctor (name, registro, uf, specialty_id, status)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [username, register, uf, speciality, true]
      );
    }
    await client.query('COMMIT');
    return newUser;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
