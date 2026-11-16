import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AgendaBoard, AgendaLegend, type AgendaRow } from './AgendaBoard';

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

describe('AgendaBoard de varios días', () => {
  /** Lunes 19 de octubre de 2026, a la hora de Managua indicada (puede pasar de 24). */
  const week = (h: number) => new Date(Date.UTC(2026, 9, 19, h + 6));
  const monday = week(0);
  const row = (blocks: AgendaRow['blocks']): AgendaRow[] => [{ ...rows[0], blocks }];
  const left = (el: HTMLElement) => Number.parseFloat(el.style.left || getComputedStyle(el).left);
  const width = (el: HTMLElement) =>
    Number.parseFloat(el.style.width || getComputedStyle(el).width);

  it('encabeza cada día con su nombre y número', () => {
    render(<AgendaBoard rows={rows} day={monday} days={7} />);
    for (const label of ['lun 19', 'mar 20', 'mié 21', 'jue 22', 'vie 23', 'sáb 24', 'dom 25']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('ubica un viaje en la columna de su día, con la misma franja horaria', () => {
    // Miércoles (tercer día) de 6 a 12, en una franja de 6 a 18: primera mitad de su columna.
    const blocks = [
      { id: 'w', start: week(48 + 6), end: week(48 + 12), state: 'ASSIGNED', label: 'Somoto' },
    ] as const;
    render(<AgendaBoard rows={row([...blocks])} day={monday} days={7} fromHour={6} toHour={18} />);
    const block = screen.getByLabelText(/Somoto/);
    expect(left(block)).toBeCloseTo((2 / 7) * 100, 1);
    expect(width(block)).toBeCloseTo((0.5 / 7) * 100, 1);
  });

  it('un viaje de varios días sigue de largo de un día al otro', () => {
    // Del lunes a las 12 al miércoles a las 12: media columna + una entera + media.
    const blocks = [
      { id: 'l', start: week(12), end: week(48 + 12), state: 'ASSIGNED', label: 'Gira' },
    ] as const;
    render(<AgendaBoard rows={row([...blocks])} day={monday} days={7} fromHour={6} toHour={18} />);
    const block = screen.getByLabelText(/Gira/);
    expect(left(block)).toBeCloseTo((0.5 / 7) * 100, 1);
    expect(width(block)).toBeCloseTo((2 / 7) * 100, 1);
  });

  it('dice la fecha de cada bloque, porque la hora sola no basta', () => {
    const blocks = [
      { id: 'w', start: week(48 + 7), end: week(48 + 12), state: 'ASSIGNED', label: 'Somoto' },
    ] as const;
    render(<AgendaBoard rows={row([...blocks])} day={monday} days={7} />);
    expect(
      screen.getByLabelText('Hilux blanca M 123-456, 21/10/2026 07:00–12:00, Somoto, asignado'),
    ).toBeInTheDocument();
  });

  it('no dibuja lo que cae fuera de la semana ni lo que ocurre solo de noche', () => {
    const blocks = [
      { id: 'p', start: week(-30), end: week(-20), state: 'ASSIGNED', label: 'Semana pasada' },
      { id: 'n', start: week(20), end: week(23), state: 'ASSIGNED', label: 'De noche' },
    ] as const;
    render(<AgendaBoard rows={row([...blocks])} day={monday} days={7} />);
    expect(screen.queryByLabelText(/Semana pasada/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/De noche/)).not.toBeInTheDocument();
  });

  it('el encabezado de un día lo abre cuando se puede elegir', async () => {
    const onDaySelect = vi.fn();
    render(<AgendaBoard rows={rows} day={monday} days={7} onDaySelect={onDaySelect} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ver el día mié 21' }));
    expect(onDaySelect).toHaveBeenCalledWith(week(48));
  });
});

describe('AgendaLegend', () => {
  it('nombra los cuatro estados que se ven en el tablero', () => {
    render(<AgendaLegend />);
    const legend = screen.getByRole('list', { name: 'Colores de la agenda' });
    expect(
      within(legend)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Asignado', 'En curso', 'Solicitud pendiente', 'No disponible']);
  });
});
