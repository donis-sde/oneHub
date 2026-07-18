import type { NextApiResponse } from 'next';

import {
  isAstraToolDatabase,
  listAstraColumns,
  listAstraDatabaseStatus,
  listAstraTables,
} from '@/lib/astraPgPool';
import { HttpMethod } from '@/enums/HttpMethod';
import { withAstraToolsAccess } from '@/pages/api/astra/_withAstraToolsAccess';

type DatabasesResponse =
  | Awaited<ReturnType<typeof listAstraDatabaseStatus>>
  | {
      database: string;
      tables: Awaited<ReturnType<typeof listAstraTables>>;
    }
  | {
      database: string;
      table: string;
      columns: Awaited<ReturnType<typeof listAstraColumns>>;
    }
  | { error: string };

export default withAstraToolsAccess<DatabasesResponse>(
  HttpMethod.GET,
  async (req, res: NextApiResponse<DatabasesResponse>) => {
    const databaseRaw = req.query.database;
    const tableRaw = req.query.table;
    const database =
      typeof databaseRaw === 'string' ? databaseRaw.trim() : '';
    const table = typeof tableRaw === 'string' ? tableRaw.trim() : '';

    if (!database) {
      const status = await listAstraDatabaseStatus();
      res.status(200).json(status);
      return;
    }

    if (!isAstraToolDatabase(database)) {
      res.status(400).json({
        error: `Database "${database}" is not allowlisted for Astra Tools`,
      });
      return;
    }

    if (table) {
      const columns = await listAstraColumns(database, table);
      res.status(200).json({ database, table, columns });
      return;
    }

    const tables = await listAstraTables(database);
    res.status(200).json({ database, tables });
  },
);
