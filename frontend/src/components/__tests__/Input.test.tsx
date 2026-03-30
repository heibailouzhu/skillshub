import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from '../Input';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Username" />);
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  it('renders without label', () => {
    const { container } = render(<Input />);
    const input = container.querySelector('input');
    expect(input).toBeInTheDocument();
    expect(screen.queryByRole('label')).not.toBeInTheDocument();
  });

  it('displays error message', () => {
    render(<Input label="Username" error="Username is required" />);
    expect(screen.getByText('Username is required')).toBeInTheDocument();
  });

  it('updates value on change', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Input label="Username" onChange={handleChange} />);
    const input = screen.getByLabelText('Username');

    await user.type(input, 'testuser');

    expect(handleChange).toHaveBeenCalled();
  });

  it('applies fullWidth wrapper div', () => {
    const { container } = render(<Input fullWidth />);
    const wrapper = container.querySelector('div');
    expect(wrapper).toHaveClass('w-full');
  });

  it('does not apply fullWidth wrapper when false', () => {
    const { container } = render(<Input fullWidth={false} />);
    const wrapper = container.querySelector('div');
    expect(wrapper).not.toHaveClass('w-full');
  });

  it('sets type attribute', () => {
    const { container } = render(<Input type="password" />);
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('sets placeholder', () => {
    const { container } = render(<Input placeholder="Enter username" />);
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('placeholder', 'Enter username');
  });

  it('sets name attribute', () => {
    const { container } = render(<Input name="username" />);
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('name', 'username');
  });
});
