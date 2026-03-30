import { render, screen } from '@testing-library/react';
import Badge from '../Badge';

describe('Badge', () => {
  it('renders with text', () => {
    render(<Badge>React</Badge>);
    expect(screen.getByText('React')).toBeInTheDocument();
  });

  it('applies primary variant', () => {
    const { container } = render(<Badge variant="primary">Primary</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('applies success variant', () => {
    const { container } = render(<Badge variant="success">Success</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('applies warning variant', () => {
    const { container } = render(<Badge variant="warning">Warning</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });

  it('applies danger variant', () => {
    const { container } = render(<Badge variant="danger">Danger</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-red-100', 'text-red-800');
  });

  it('applies sm size', () => {
    const { container } = render(<Badge size="sm">Small</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('px-2', 'py-0.5', 'text-xs');
  });

  it('applies default (md) size', () => {
    const { container } = render(<Badge>Default</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('px-2.5', 'py-0.5', 'text-sm');
  });
});
