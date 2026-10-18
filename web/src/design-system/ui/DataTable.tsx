import {
  Box,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  /** En pantallas angostas, esta columna es el título de la fila. */
  primary?: boolean;
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
 * Tabla paginada en el servidor, con el estilo de tablas del manual de marca
 * (encabezado crema, filete inferior en negro lavado).
 *
 * En pantallas angostas cada fila se apila: la columna `primary` como título y
 * el resto como pares "encabezado: valor". Nunca hay scroll horizontal.
 * La página que recibe y emite empieza en 1, como la API.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  loading = false,
  empty,
  pagination,
}: DataTableProps<T>) {
  const theme = useTheme();
  const stacked = useMediaQuery(theme.breakpoints.down('sm'));
  const showEmpty = !loading && rows.length === 0 && empty;

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      {loading ? <LinearProgress color="secondary" /> : null}
      {showEmpty ? (
        empty
      ) : stacked ? (
        <StackedRows columns={columns} rows={rows} getRowId={getRowId} />
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column.key} align={column.align} sx={{ width: column.width }}>
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
          rowsPerPageOptions={stacked ? [] : [10, 20, 50]}
          onPageChange={(_event, page) => pagination.onPageChange(page + 1)}
          onRowsPerPageChange={(event) => pagination.onLimitChange(Number(event.target.value))}
          labelRowsPerPage="Filas por página"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          sx={{ borderTop: '1px solid', borderColor: 'divider' }}
        />
      ) : null}
    </Paper>
  );
}

function StackedRows<T>({
  columns,
  rows,
  getRowId,
}: Pick<DataTableProps<T>, 'columns' | 'rows' | 'getRowId'>) {
  const primary = columns.find((column) => column.primary) ?? columns[0];
  // Las columnas sin encabezado (acciones) van al pie de la fila, alineadas a la derecha.
  const details = columns.filter((column) => column !== primary && column.header);
  const actions = columns.filter((column) => column !== primary && !column.header);

  return (
    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {rows.map((row) => (
        <Box
          component="li"
          key={getRowId(row)}
          sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Box sx={{ fontWeight: 600, mb: 0.5 }}>{primary.render(row)}</Box>
          <Box
            component="dl"
            sx={{
              m: 0,
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              columnGap: 1.5,
              rowGap: 0.25,
            }}
          >
            {details.map((column) => (
              <Box key={column.key} sx={{ display: 'contents' }}>
                <Box component="dt" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  {column.header}
                </Box>
                <Box
                  component="dd"
                  sx={{ m: 0, fontSize: '0.875rem', minWidth: 0, overflowWrap: 'anywhere' }}
                >
                  {column.render(row)}
                </Box>
              </Box>
            ))}
          </Box>
          {actions.length ? (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
              {actions.map((column) => (
                <Box key={column.key}>{column.render(row)}</Box>
              ))}
            </Box>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}
