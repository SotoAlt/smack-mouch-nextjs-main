import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const filePath = path.join(process.cwd(), '..', '..', 'metadata', `${id}.json`);

  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const metadata = JSON.parse(fileContents);
    res.status(200).json(metadata);
  } catch (error) {
    res.status(404).json({ error: 'Metadata not found' });
  }
}
