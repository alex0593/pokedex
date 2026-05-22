import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';

vi.mock('../../src/services/authService', () => ({
  login: vi.fn().mockResolvedValue('token123'),
  logout: vi.fn(),
  getLoggedUser: vi.fn().mockReturnValue(null),
}));

const TestComponent = () => {
  const { user, isLoading, login, logout } = useAuth();

  return (
    <div>
      <p>{isLoading ? 'Loading' : 'Ready'}</p>
      <p>{user ? `User: ${user}` : 'No user'}</p>
      <button onClick={() => login('test', 'pass')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should provide auth context', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('should throw error when used outside provider', () => {
    expect(() => {
      const TestInvalid = () => {
        useAuth();
        return null;
      };
      render(<TestInvalid />);
    }).toThrow('useAuth must be used within AuthProvider');
  });

  it('should handle login', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByText('Login');
    loginButton.click();

    await waitFor(() => {
      expect(localStorage.getItem('poke_token')).toBeTruthy();
    });
  });
});
