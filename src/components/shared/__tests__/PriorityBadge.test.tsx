import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PriorityBadge from '../PriorityBadge';

describe('PriorityBadge', () => {
  it.each([
    ['normal', 'Звичайний'],
    ['elevated', 'Підвищений'],
    ['critical', 'Критично'],
    ['urgent', 'Терміново'],
  ] as const)('renders label for priority "%s" as "%s"', (priority, expectedLabel) => {
    render(<PriorityBadge priority={priority} />);
    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });

  it('shows dot by default (showDot defaults to true)', () => {
    const { container } = render(<PriorityBadge priority="urgent" />);
    // The dot is a nested span with w-1.5 h-1.5 classes
    const dots = container.querySelectorAll('span span');
    expect(dots.length).toBe(1);
    expect(dots[0].className).toContain('rounded-full');
  });

  it('hides dot when showDot is false', () => {
    const { container } = render(<PriorityBadge priority="urgent" showDot={false} />);
    const dots = container.querySelectorAll('span span');
    expect(dots.length).toBe(0);
  });

  it('applies correct color classes for each priority', () => {
    const { container: c1 } = render(<PriorityBadge priority="urgent" />);
    const badge1 = c1.querySelector('span');
    expect(badge1?.className).toContain('bg-red-100');
    expect(badge1?.className).toContain('text-red-800');

    const { container: c2 } = render(<PriorityBadge priority="normal" />);
    const badge2 = c2.querySelector('span');
    expect(badge2?.className).toContain('bg-green-100');
    expect(badge2?.className).toContain('text-green-800');
  });

  it('applies animate-pulse class to urgent dot', () => {
    const { container } = render(<PriorityBadge priority="urgent" />);
    const dot = container.querySelector('span span');
    expect(dot?.className).toContain('animate-pulse');
  });
});
