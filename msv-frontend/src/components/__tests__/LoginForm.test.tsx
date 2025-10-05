// MVS 3.0 Frontend Unit Test Example
// msv-frontend/src/components/__tests__/LoginForm.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';
import LoginForm from '../LoginForm';

// Mock API calls
jest.mock('../../services/api', () => ({
  login: jest.fn(),
}));

const MockedLoginForm = () => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      <LoginForm />
    </ThemeProvider>
  </BrowserRouter>
);

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Login form renders correctly', () => {
    render(<MockedLoginForm />);
    
    expect(screen.getByLabelText(/user id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('User input is handled correctly', () => {
    render(<MockedLoginForm />);
    
    const useridInput = screen.getByLabelText(/user id/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    fireEvent.change(useridInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    expect(useridInput).toHaveValue('admin');
    expect(passwordInput).toHaveValue('password123');
  });

  test('Error message displayed for empty fields', async () => {
    render(<MockedLoginForm />);
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/user id is required/i)).toBeInTheDocument();
    });
  });

  test('Login attempt with valid input', async () => {
    const mockLogin = require('../../services/api').login;
    mockLogin.mockResolvedValue({
      success: true,
      token: 'mock-token',
      user: { userid: 'admin', name: 'Administrator' }
    });

    render(<MockedLoginForm />);
    
    const useridInput = screen.getByLabelText(/user id/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(useridInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        userid: 'admin',
        password: 'password123'
      });
    });
  });

  test('Error message displayed on login failure', async () => {
    const mockLogin = require('../../services/api').login;
    mockLogin.mockRejectedValue({
      response: {
        data: { error: 'Invalid credentials' }
      }
    });

    render(<MockedLoginForm />);
    
    const useridInput = screen.getByLabelText(/user id/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(useridInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  test('Password visibility toggle functionality', () => {
    render(<MockedLoginForm />);
    
    const passwordInput = screen.getByLabelText(/password/i);
    const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i });
    
    // Password is hidden by default
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click toggle button
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    // Click toggle button again
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('Loading state display', async () => {
    const mockLogin = require('../../services/api').login;
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    render(<MockedLoginForm />);
    
    const useridInput = screen.getByLabelText(/user id/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(useridInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    // Check loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });
});
