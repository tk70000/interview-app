import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import SignInPage from '../page'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
    },
  },
}))

describe('Authentication', () => {
  const mockPush = jest.fn()
  const mockRouter = {
    push: mockPush,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    // Clear localStorage
    localStorage.clear()
  })

  describe('テストモードでのログイン', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_DISABLE_AUTH = 'true'
    })

    afterEach(() => {
      delete process.env.NEXT_PUBLIC_DISABLE_AUTH
    })

    test('テストアカウントでログイン成功', async () => {
      render(<SignInPage />)
      
      const emailInput = screen.getByLabelText('メールアドレス')
      const passwordInput = screen.getByLabelText('パスワード')
      const submitButton = screen.getByRole('button', { name: /サインイン/ })
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'Test1234!' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(localStorage.getItem('isAuthenticated')).toBe('true')
        expect(localStorage.getItem('userEmail')).toBe('test@example.com')
        expect(mockPush).toHaveBeenCalledWith('/upload')
      })
    })

    test('adminアカウントでログイン成功', async () => {
      render(<SignInPage />)
      
      const emailInput = screen.getByLabelText('メールアドレス')
      const passwordInput = screen.getByLabelText('パスワード')
      const submitButton = screen.getByRole('button', { name: /サインイン/ })
      
      fireEvent.change(emailInput, { target: { value: 'admin@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'Admin1234!' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(localStorage.getItem('isAuthenticated')).toBe('true')
        expect(localStorage.getItem('userEmail')).toBe('admin@example.com')
        expect(mockPush).toHaveBeenCalledWith('/upload')
      })
    })

    test('demoアカウントでログイン成功', async () => {
      render(<SignInPage />)
      
      const emailInput = screen.getByLabelText('メールアドレス')
      const passwordInput = screen.getByLabelText('パスワード')
      const submitButton = screen.getByRole('button', { name: /サインイン/ })
      
      fireEvent.change(emailInput, { target: { value: 'demo@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'Demo1234!' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(localStorage.getItem('isAuthenticated')).toBe('true')
        expect(localStorage.getItem('userEmail')).toBe('demo@example.com')
        expect(mockPush).toHaveBeenCalledWith('/upload')
      })
    })

    test('間違ったパスワードでログイン失敗', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.auth.signInWithPassword.mockRejectedValue(
        new Error('Invalid login credentials')
      )
      
      render(<SignInPage />)
      
      const emailInput = screen.getByLabelText('メールアドレス')
      const passwordInput = screen.getByLabelText('パスワード')
      const submitButton = screen.getByRole('button', { name: /サインイン/ })
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'WrongPassword!' } })
      fireEvent.click(submitButton)
      
      // テストモードでは間違ったパスワードでもSupabaseに問い合わせる
      await waitFor(() => {
        expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
        expect(mockPush).not.toHaveBeenCalled()
      })
    })
  })

  describe('本番モードでのログイン', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
      delete process.env.NEXT_PUBLIC_DISABLE_AUTH
    })

    test('Supabaseでのログイン成功', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.auth.signInWithPassword.mockResolvedValue({ error: null })
      
      render(<SignInPage />)
      
      const emailInput = screen.getByLabelText('メールアドレス')
      const passwordInput = screen.getByLabelText('パスワード')
      const submitButton = screen.getByRole('button', { name: /サインイン/ })
      
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: 'Password123!',
        })
        expect(mockPush).toHaveBeenCalledWith('/upload')
      })
    })

    test('Supabaseでのログイン失敗', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.auth.signInWithPassword.mockResolvedValue({
        error: { message: '認証に失敗しました' }
      })
      
      render(<SignInPage />)
      
      const emailInput = screen.getByLabelText('メールアドレス')
      const passwordInput = screen.getByLabelText('パスワード')
      const submitButton = screen.getByRole('button', { name: /サインイン/ })
      
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'WrongPassword' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('認証に失敗しました')).toBeInTheDocument()
        expect(mockPush).not.toHaveBeenCalled()
      })
    })
  })

  describe('UI要素の動作', () => {
    test('ローディング中はフォームが無効化される', async () => {
      render(<SignInPage />)
      
      const emailInput = screen.getByLabelText('メールアドレス')
      const passwordInput = screen.getByLabelText('パスワード')
      const submitButton = screen.getByRole('button', { name: /サインイン/ })
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.change(passwordInput, { target: { value: 'Test1234!' } })
      fireEvent.click(submitButton)
      
      // ローディング中の確認
      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
      expect(submitButton).toBeDisabled()
    })

    test('ホームへ戻るボタンが機能する', () => {
      render(<SignInPage />)
      
      const homeButton = screen.getByRole('button', { name: /ホームへ戻る/ })
      fireEvent.click(homeButton)
      
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    test('サインアップページへのリンクが存在する', () => {
      render(<SignInPage />)
      
      const signupLink = screen.getByText('新規登録')
      expect(signupLink).toBeInTheDocument()
      expect(signupLink).toHaveAttribute('href', '/auth/signup')
    })
  })
})