import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DataTable, { type Column } from '../DataTable';

interface Item {
  id: string;
  name: string;
  value: number;
}

const columns: Column<Item>[] = [
  { key: 'name', header: 'Name', render: (item) => item.name },
  { key: 'value', header: 'Value', render: (item) => item.value },
];

const keyExtractor = (item: Item) => item.id;

function makeItems(count: number): Item[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i + 1}`,
    name: `Item ${i + 1}`,
    value: (i + 1) * 10,
  }));
}

describe('DataTable', () => {
  it('shows empty message when data is empty', () => {
    render(<DataTable columns={columns} data={[]} keyExtractor={keyExtractor} />);
    expect(screen.getByText('Немає даних')).toBeInTheDocument();
  });

  it('shows custom empty message', () => {
    render(
      <DataTable columns={columns} data={[]} keyExtractor={keyExtractor} emptyMessage="Nothing here" />
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders correct columns and rows', () => {
    const data = makeItems(3);
    render(<DataTable columns={columns} data={data} keyExtractor={keyExtractor} />);

    // Check headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();

    // Check rows
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('does not show pagination when data fits one page', () => {
    const data = makeItems(5);
    render(<DataTable columns={columns} data={data} keyExtractor={keyExtractor} pageSize={10} />);

    expect(screen.queryByLabelText('Наступна сторінка')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Попередня сторінка')).not.toBeInTheDocument();
  });

  it('shows pagination when data exceeds page size', () => {
    const data = makeItems(15);
    render(<DataTable columns={columns} data={data} keyExtractor={keyExtractor} pageSize={5} />);

    // Should show page info like "1–5 з 15"
    expect(screen.getByText(/1–5 з 15/)).toBeInTheDocument();

    // Pagination buttons should exist
    expect(screen.getByLabelText('Наступна сторінка')).toBeInTheDocument();
    expect(screen.getByLabelText('Попередня сторінка')).toBeInTheDocument();
  });

  it('navigates to next page', () => {
    const data = makeItems(15);
    render(<DataTable columns={columns} data={data} keyExtractor={keyExtractor} pageSize={5} />);

    // First page shows items 1-5
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.queryByText('Item 6')).not.toBeInTheDocument();

    // Click next
    fireEvent.click(screen.getByLabelText('Наступна сторінка'));

    // Second page shows items 6-10
    expect(screen.getByText('Item 6')).toBeInTheDocument();
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    expect(screen.getByText(/6–10 з 15/)).toBeInTheDocument();
  });

  it('navigates back to previous page', () => {
    const data = makeItems(15);
    render(<DataTable columns={columns} data={data} keyExtractor={keyExtractor} pageSize={5} />);

    // Go to page 2 then back to page 1
    fireEvent.click(screen.getByLabelText('Наступна сторінка'));
    expect(screen.getByText('Item 6')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Попередня сторінка'));
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    const data = makeItems(15);
    render(<DataTable columns={columns} data={data} keyExtractor={keyExtractor} pageSize={5} />);

    expect(screen.getByLabelText('Попередня сторінка')).toBeDisabled();
    expect(screen.getByLabelText('Перша сторінка')).toBeDisabled();
  });

  it('disables next button on last page', () => {
    const data = makeItems(15);
    render(<DataTable columns={columns} data={data} keyExtractor={keyExtractor} pageSize={5} />);

    // Go to last page
    fireEvent.click(screen.getByLabelText('Остання сторінка'));

    expect(screen.getByLabelText('Наступна сторінка')).toBeDisabled();
    expect(screen.getByLabelText('Остання сторінка')).toBeDisabled();
  });
});
