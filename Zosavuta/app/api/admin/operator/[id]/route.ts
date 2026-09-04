import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { Operator } from '@/types/operator';

export async function GET(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id?: string };
  if (!id) {
    res.status(400).json({ error: 'Operator id required' });
    return;
  }
  try {
    const [rows] = await pool.query('SELECT id, email, name, phone, suspended FROM operators WHERE id = ?', [id]);
    const operators = rows as Operator[];
    const op = operators[0];
    if (!op) {
      res.status(404).json({ error: 'Operator not found' });
      return;
    }
    res.status(200).json(op);
  } catch (error) {
    console.error('Operator GET error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function PATCH(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id?: string };
  if (!id) {
    res.status(400).json({ error: 'Operator id required' });
    return;
  }
  const { email, name, phone, suspended } = req.body as Partial<Operator>;
  const fields: string[] = [];
  const values: any[] = [];
  if (email !== undefined) { fields.push('email = ?'); values.push(email); }
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
  if (suspended !== undefined) { fields.push('suspended = ?'); values.push(suspended); }
  if (fields.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }
  const sql = `UPDATE operators SET ${fields.join(', ')} WHERE id = ?`;
  values.push(id);
  try {
    await pool.execute(sql, values);
    const [updatedRows] = await pool.query('SELECT id, email, name, phone, suspended FROM operators WHERE id = ?', [id]);
    const updated = (updatedRows as Operator[])[0];
    res.status(200).json(updated);
  } catch (error) {
    console.error('Operator PATCH error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function DELETE(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id?: string };
  if (!id) {
    res.status(400).json({ error: 'Operator id required' });
    return;
  }
  try {
    await pool.execute('UPDATE operators SET suspended = true WHERE id = ?', [id]);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Operator DELETE error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
