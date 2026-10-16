import {
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from '@mui/material';
import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  loading?: boolean;
  /** Se muestra en lugar de la tabla cuando no hay filas y no está cargando. */
  empty?: ReactNode;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
  };
}

/**
 * Tabla paginada en el servidor. La página que recibe y emite empieza en 1,
 * como la API; MUI la cuenta desde 0 y la conversión vive solo aquí.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  loading = false,
  empty,
  pagination,
}: DataTableProps<T>) {
  return (
    <Paper variant="outlined">
      {loading ? <LinearProgress /> : null}
      {!loading && rows.length === 0 && empty ? (
        empty
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    align={column.align}
                    sx={{ fontWeight: 700, width: column.width }}
                  >
                    {column.header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={getRowId(row)} hover>
                  {columns.map((column) => (
                    <TableCell key={column.key} align={column.align}>
                      {column.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {pagination ? (
        <TablePagination
          component="div"
          count={pagination.total}
          page={pagination.page - 1}
          rowsPerPage={pagination.limit}
          rowsPerPageOptions={[10, 20, 50]}
          onPageChange={(_event, page) => pagination.onPageChange(page + 1)}
          onRowsPerPageChange={(event) => pagination.onLimitChange(Number(event.target.value))}
          labelRowsPerPage="Filas por página"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        />
      ) : null}
    </Paper>
  );
}
