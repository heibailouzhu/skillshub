import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route, MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';

// Mock pages for testing
const MockPublicPage = () => <div>Public Page</div>;
const MockProtectedPage = () => <div>Protected Page</div>;
const MockLoginPage = () => <div>Login Page</div>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('renders protected route when token exists', () => {
    localStorage.setItem('token', 'fake-jwt-token');

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/" element={<MockPublicPage />} />
          <Route path="/login" element={<MockLoginPage />} />
          <Route path="/protected" element={
            <ProtectedRoute>
              <MockProtectedPage />
            </ProtectedRoute>
          } />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Page')).toBeInTheDocument();
  });

  it('redirects to login when no token', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/" element={<MockPublicPage />} />
          <Route path="/login" element={<MockLoginPage />} />
          <Route path="/protected" element={
            <ProtectedRoute>
              <MockProtectedPage />
            </ProtectedRoute>
          } />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Protected Page')).not.toBeInTheDocument();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects to login when token is empty', () => {
    localStorage.setItem('token', '');

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/" element={<MockPublicPage />} />
          <Route path="/login" element={<MockLoginPage />} />
          <Route path="/protected" element={
            <ProtectedRoute>
              <MockProtectedPage />
            </ProtectedRoute>
          } />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Protected Page')).not.toBeInTheDocument();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders children when token exists', () => {
    localStorage.setItem('token', 'fake-jwt-token');

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/protected" element={
            <ProtectedRoute>
              <MockProtectedPage />
            </ProtectedRoute>
          } />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Page')).toBeInTheDocument();
  });
});
