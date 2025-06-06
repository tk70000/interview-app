import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
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
      
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'Test1234!' } })
        fireEvent.click(submitButton)
      })
      
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
      
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'admin@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'Admin1234!' } })
        fireEvent.click(submitButton)
      })
      
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
      
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'demo@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'Demo1234!' } })
        fireEvent.click(submitButton)
      })
      
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
      
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'WrongPassword!' } })
        fireEvent.click(submitButton)
      })
      
      // テストモードでは間違ったパスワードでもSupabaseに問い合わせる
      await waitFor(() => {
        expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
        expect(mockPush).not.toHaveBeenCalled()
      })
    })
  })

  describe('本番モードでのログイン', () => {
    const originalNodeEnv = process.env.NODE_ENV
    
    beforeEach(() => {
      // @ts-ignore - Override readonly property for testing
      process.env.NODE_ENV = 'production'
      delete process.env.NEXT_PUBLIC_DISABLE_AUTH
    })

    afterEach(() => {
      // @ts-ignore - Restore original value
      process.env.NODE_ENV = originalNodeEnv
    })

    test('Supabaseでのログイン成功', async () => {
      const { supabase } = require('@/lib/supabase')
      supabase.auth.signInWithPassword.mockResolvedValue({ error: null })
      
      render(<SignInPage />)
      
      const emailInput = screen.getByLabelText('メールアドレス')
      const passwordInput = screen.getByLabelText('パスワード')
      const submitButton = screen.getByRole('button', { name: /サインイン/ })
      
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'user@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'Password123!' } })
        fireEvent.click(submitButton)
      })
      
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
      
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'user@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'WrongPassword' } })
        fireEvent.click(submitButton)
      })
      
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
      
      await act(async () => {
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'Test1234!' } })
      })
      
      // フォームが送信された直後のローディング状態を確認
      act(() => {
        fireEvent.click(submitButton)
      })
      
      // 短い時間でローディング状態をチェック
      await waitFor(() => {
        expect(submitButton).toHaveTextContent('サインイン中...')
      }, { timeout: 100 })
    })

    test('ホームへ戻るボタンが機能する', async () => {
      render(<SignInPage />)
      
      const homeButton = screen.getByRole('button', { name: /ホームへ戻る/ })
      await act(async () => {
        fireEvent.click(homeButton)
      })
      
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