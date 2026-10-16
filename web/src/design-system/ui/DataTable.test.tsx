import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataTable } from './DataTable';

interface Row {
  id: string;
  name: string;
}

const columns = [{ key: 'name', header: 'Nombre', render: (row: Row) => row.name }];

describe('DataTable', () => {
  it('muestra las filas y el encabezado', () => {
    render(
      <DataTable columns={columns} rows={[{ id: '1', name: 'Hilux' }]} getRowId={(r) => r.id} />,
    );
    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('Hilux')).toBeInTheDocument();
  });

  it('muestra el estado vacio en lugar de una tabla sin filas', () => {
    render(
      <DataTable columns={columns} rows={[]} getRowId={(r) => r.id} empty={<p>Sin vehículos</p>} />,
    );
    expect(screen.getByText('Sin vehículos')).toBeInTheDocument();
    expect(screen.queryByText('Nombre')).not.toBeInTheDocument();
  });

  it('emite la pagina siguiente contando desde 1, como la API', async () => {
    const onPageChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={[{ id: '1', name: 'Hilux' }]}
        getRowId={(r) => r.id}
        pagination={{ page: 1, limit: 10, total: 25, onPageChange, onLimitChange: vi.fn() }}
      />,
    );
    expect(screen.getByText('1–10 de 25')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /siguiente|next/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
