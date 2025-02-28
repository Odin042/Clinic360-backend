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
}

export interface Person {
  id: number;
  name: string;
  cpf_cnpj: string;
  phone: string;
  gender?: string;
}


export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1;', [email])
  return result.rows.length > 0 ? result.rows[0] : null
}

export const createUser = async (
  username: string,
  email: string,
  passwordHash: string,
  speciality: string | null,
  cpf_cnpj: string,
  register: string,
  uf: string,
  phone: string
): Promise<User> => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    let person = await client.query('SELECT id FROM persons WHERE cpf_cnpj = $1', [cpf_cnpj])

    let personId: number
    if (person.rows.length === 0) {
      const personResult = await client.query(
        'INSERT INTO public.persons (name, cpf_cnpj, phone) VALUES ($1, $2, $3) RETURNING id',
        [username, cpf_cnpj, phone]
      )
      personId = personResult.rows[0].id
    } else {
      personId = person.rows[0].id
    }

    const userType = speciality ? 'Doctor' : 'User'

    const userResult = await client.query(
      'INSERT INTO users (username, email, password, speciality, cpf_cnpj, register, uf, phone, type, person_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [username, email, passwordHash, speciality, cpf_cnpj, register, uf, phone, userType, personId]
    )

    await client.query('COMMIT')
    return userResult.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
