import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '../Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByText('Click me'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick} disabled>Click me</Button>);
    await user.click(screen.getByText('Click me'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('applies primary variant', () => {
    const { container } = render(<Button variant="primary">Primary</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-blue-600', 'hover:bg-blue-700');
  });

  it('applies danger variant', () => {
    const { container } = render(<Button variant="danger">Danger</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-red-600', 'hover:bg-red-700');
  });

  it('applies different sizes', () => {
    const { container: smContainer } = render(<Button size="sm">Small</Button>);
    const smButton = smContainer.querySelector('button');
    expect(smButton).toHaveClass('px-3', 'py-1.5', 'text-sm');

    const { container: lgContainer } = render(<Button size="lg">Large</Button>);
    const lgButton = lgContainer.querySelector('button');
    expect(lgButton).toHaveClass('px-6', 'py-3', 'text-lg');
  });

  it('applies fullWidth class', () => {
    const { container } = render(<Button fullWidth>Full Width</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('w-full');
  });
});
