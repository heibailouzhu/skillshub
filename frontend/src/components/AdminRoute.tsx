import React from 'react';
import { Navigate } from 'react-router-dom';

interface AdminRouteProps {
  children: React.ReactNode;
}

function isAdminUser() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed.is_admin);
  } catch {
    return false;
  }
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdminUser()) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
