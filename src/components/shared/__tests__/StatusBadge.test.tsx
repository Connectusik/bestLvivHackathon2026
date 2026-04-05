import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../StatusBadge';

describe('StatusBadge', () => {
  it.each([
    ['available', 'Доступний'],
    ['on_route', 'В дорозі'],
    ['inactive', 'Неактивний'],
    ['pending', 'Очікує'],
    ['approved', 'Підтверджено'],
    ['in_transit', 'В дорозі'],
    ['delivered', 'Доставлено'],
    ['rejected', 'Відхилено'],
  ])('renders label "%s" as "%s"', (status, expectedLabel) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });

  it('falls back gracefully for unknown status', () => {
    render(<StatusBadge status="some_unknown" />);
    expect(screen.getByText('some unknown')).toBeInTheDocument();
  });

  it('uses fallback CSS classes for unknown status', () => {
    render(<StatusBadge status="unknown_status" />);
    const badge = screen.getByText('unknown status');
    expect(badge.className).toContain('bg-gray-100');
    expect(badge.className).toContain('text-gray-800');
  });

  it('has correct CSS classes for known statuses', () => {
    render(<StatusBadge status="available" />);
    const badge = screen.getByText('Доступний');
    expect(badge.className).toContain('bg-green-100');
    expect(badge.className).toContain('text-green-800');
    expect(badge.className).toContain('rounded-full');
    expect(badge.className).toContain('text-xs');
    expect(badge.className).toContain('font-medium');
  });

  it('renders as a span element', () => {
    render(<StatusBadge status="pending" />);
    const badge = screen.getByText('Очікує');
    expect(badge.tagName).toBe('SPAN');
  });
});
