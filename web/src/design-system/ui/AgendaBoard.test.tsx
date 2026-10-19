import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AgendaBoard, type AgendaRow } from './AgendaBoard';

/** 18 de octubre de 2026 a la hora indicada de Managua (UTC-6). */
const at = (h: number, m = 0) => new Date(Date.UTC(2026, 9, 18, h + 6, m));
const day = at(12);

const rows: AgendaRow[] = [
  {
    id: 'v1',
    kind: 'VEHICLE',
    identifier: 'M 123-456',
    name: 'Hilux blanca',
    blocks: [{ id: 'a', start: at(7), end: at(12), state: 'ASSIGNED', label: 'El Rosario' }],
  },
  {
    id: 'e1',
    kind: 'EQUIPMENT',
    identifier: 'INV-0042',
    name: 'Proyector Epson',
    blocks: [{ id: 'b', start: at(9), end: at(11), state: 'PENDING', label: 'Taller' }],
  },
];

describe('AgendaBoard', () => {
  it('muestra una fila por medio, sin importar su tipo', () => {
    render(<AgendaBoard rows={rows} day={day} />);
    expect(screen.getByText('M 123-456')).toBeInTheDocument();
    expect(screen.getByText('INV-0042')).toBeInTheDocument();
    expect(screen.getByText('Proyector Epson')).toBeInTheDocument();
  });

  it('describe cada bloque para lectores de pantalla con medio, horario y estado', () => {
    render(<AgendaBoard rows={rows} day={day} />);
    expect(
      screen.getByLabelText('Hilux blanca M 123-456, 07:00–12:00, El Rosario, asignado'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Proyector Epson INV-0042, 09:00–11:00, Taller, solicitud pendiente'),
    ).toBeInTheDocument();
  });

  it('ubica el bloque en proporcion a la hora de Managua', () => {
    render(<AgendaBoard rows={rows} day={day} fromHour={6} toHour={18} />);
    const block = screen.getByLabelText(/El Rosario/);
    // 07:00 en una escala de 6 a 18 → 1/12 del ancho; dura 5 horas → 5/12.
    expect(block.style.left || getComputedStyle(block).left).toMatch(/^8\.33/);
    expect(block.style.width || getComputedStyle(block).width).toMatch(/^41\.6/);
  });

  it('recorta al borde un bloque que dura todo el dia o varios dias', () => {
    const allDay: AgendaRow[] = [
      {
        ...rows[0],
        blocks: [
          // De medianoche a medianoche: debe cubrir toda la franja visible.
          { id: 'm', start: at(0), end: at(24), state: 'UNAVAILABLE', label: 'En mantenimiento' },
        ],
      },
    ];
    render(<AgendaBoard rows={allDay} day={at(12)} fromHour={6} toHour={18} />);
    const block = screen.getByLabelText(/En mantenimiento/);
    expect(block.style.left || getComputedStyle(block).left).toMatch(/^0(%|px)?$/);
    expect(block.style.width || getComputedStyle(block).width).toMatch(/^100/);
  });

  it('no dibuja bloques de otro dia', () => {
    const yesterday: AgendaRow[] = [
      {
        ...rows[0],
        blocks: [{ id: 'y', start: at(-14), end: at(-10), state: 'ASSIGNED', label: 'Ayer' }],
      },
    ];
    render(<AgendaBoard rows={yesterday} day={at(12)} />);
    expect(screen.queryByLabelText(/Ayer/)).not.toBeInTheDocument();
  });

  it('muestra el estado vacio dentro del tablero cuando no hay medios', () => {
    render(<AgendaBoard rows={[]} empty={<p>Todavía no hay medios registrados</p>} />);
    expect(screen.getByText('Todavía no hay medios registrados')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('usa la etiqueta del tipo de medio en el identificador', () => {
    render(<AgendaBoard rows={rows} day={day} />);
    const tag = screen.getByTitle('Equipo INV-0042');
    expect(within(tag).getByText(/Equipo/)).toBeInTheDocument();
  });
});
