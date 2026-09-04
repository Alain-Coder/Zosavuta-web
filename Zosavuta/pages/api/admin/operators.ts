import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { Operator } from '@/types/operator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    switch (method) {
      case 'GET': {
        const [rows] = await pool.query(
          'SELECT id, email, name, phone, suspended FROM bus_operators LIMIT ? OFFSET ?',
          [limit, offset]
        );
        const operators = rows as Operator[];
        const [countRows] = await pool.query('SELECT COUNT(*) as total FROM bus_operators');
        const total = (countRows as any)[0].total;
        res.status(200).json({ data: operators, total, page, limit });
        break;
      }
      case 'POST': {
        const { email, name, phone } = req.body as Partial<Operator>;
        if (!email || !name) {
          res.status(400).json({ error: 'email and name required' });
          return;
        }
        const id = Date.now().toString();
        await pool.execute(
          'INSERT INTO bus_operators (id, email, name, phone, suspended) VALUES (?, ?, ?, ?, false)',
          [id, email, name, phone ?? '']
        );
        const newOp: Operator = { id, email, name, phone: phone ?? '', suspended: false };
        res.status(201).json(newOp);
        break;
      }
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Operators API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
