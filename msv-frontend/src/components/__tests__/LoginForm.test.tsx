// MVS 3.0 프론트엔드 단위 테스트 예제
// msv-frontend/src/components/__tests__/LoginForm.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';
import LoginForm from '../LoginForm';

// Mock API 호출
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

  test('로그인 폼이 올바르게 렌더링된다', () => {
    render(<MockedLoginForm />);
    
    expect(screen.getByLabelText(/user id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('사용자 입력이 올바르게 처리된다', () => {
    render(<MockedLoginForm />);
    
    const useridInput = screen.getByLabelText(/user id/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    fireEvent.change(useridInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    expect(useridInput).toHaveValue('admin');
    expect(passwordInput).toHaveValue('password123');
  });

  test('빈 필드로 제출 시 에러 메시지 표시', async () => {
    render(<MockedLoginForm />);
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/user id is required/i)).toBeInTheDocument();
    });
  });

  test('유효한 입력으로 로그인 시도', async () => {
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

  test('로그인 실패 시 에러 메시지 표시', async () => {
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

  test('비밀번호 표시/숨기기 토글 기능', () => {
    render(<MockedLoginForm />);
    
    const passwordInput = screen.getByLabelText(/password/i);
    const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i });
    
    // 기본적으로 비밀번호는 숨겨져 있음
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    // 토글 버튼 클릭
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    // 다시 토글 버튼 클릭
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('로딩 상태 표시', async () => {
    const mockLogin = require('../../services/api').login;
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    render(<MockedLoginForm />);
    
    const useridInput = screen.getByLabelText(/user id/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(useridInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    // 로딩 상태 확인
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });
});
