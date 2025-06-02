// Create mock Octokit instance
const mockOctokit = {
  repos: {
    listForAuthenticatedUser: jest.fn(),
    get: jest.fn()
  },
  actions: {
    createWorkflowDispatch: jest.fn(),
    listRepoWorkflows: jest.fn()
  }
}

// Mock Octokit and OAuth
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => mockOctokit)
}))

jest.mock('@octokit/oauth-app', () => ({
  OAuthApp: jest.fn()
}))

// Mock fetch globally
global.fetch = jest.fn()

import { getUserRepositories, triggerWorkflow } from '../github'

describe('GitHub API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getUserRepositories', () => {
    test('正常にリポジトリ一覧を取得できる', async () => {
      const mockRepos = [
        { id: 1, name: 'repo1', full_name: 'user/repo1' },
        { id: 2, name: 'repo2', full_name: 'user/repo2' }
      ]
      
      mockOctokit.repos.listForAuthenticatedUser.mockResolvedValueOnce({
        data: mockRepos
      })
      
      const result = await getUserRepositories('valid-token')
      
      expect(result).toEqual(mockRepos)
      expect(mockOctokit.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
        sort: 'updated',
        per_page: 100,
      })
    })

    test('401エラーで認証エラーを返す', async () => {
      mockOctokit.repos.listForAuthenticatedUser.mockRejectedValueOnce(
        new Error('認証エラー: Unauthorized')
      )
      
      await expect(getUserRepositories('invalid-token')).rejects.toThrow('認証エラー: Unauthorized')
    })

    test('レート制限エラーを適切に処理する', async () => {
      mockOctokit.repos.listForAuthenticatedUser.mockRejectedValueOnce(
        new Error('レート制限に達しました')
      )
      
      await expect(getUserRepositories('valid-token')).rejects.toThrow('レート制限に達しました')
    })

    test('その他のエラーを適切に処理する', async () => {
      mockOctokit.repos.listForAuthenticatedUser.mockRejectedValueOnce(
        new Error('GitHub APIエラー: Internal Server Error')
      )
      
      await expect(getUserRepositories('valid-token')).rejects.toThrow('GitHub APIエラー: Internal Server Error')
    })

    test('ネットワークエラーを処理する', async () => {
      mockOctokit.repos.listForAuthenticatedUser.mockRejectedValueOnce(
        new Error('Network error')
      )
      
      await expect(getUserRepositories('valid-token')).rejects.toThrow('Network error')
    })
  })

  describe('triggerWorkflow', () => {
    test('正常にワークフローをトリガーできる', async () => {
      mockOctokit.actions.createWorkflowDispatch.mockResolvedValueOnce({
        status: 204
      })
      
      const result = await triggerWorkflow(
        'valid-token',
        'testowner',
        'testrepo',
        'test.yml',
        'main',
        { test: 'value' }
      )
      
      expect(result).toEqual({ success: true })
      expect(mockOctokit.actions.createWorkflowDispatch).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'testrepo',
        workflow_id: 'test.yml',
        ref: 'main',
        inputs: { test: 'value' }
      })
    })

    test('権限不足エラーを処理する', async () => {
      mockOctokit.actions.createWorkflowDispatch.mockRejectedValueOnce(
        new Error('権限エラー: Forbidden')
      )
      
      await expect(
        triggerWorkflow(
          'valid-token',
          'testowner',
          'testrepo',
          'test.yml',
          'main'
        )
      ).rejects.toThrow('権限エラー: Forbidden')
    })

    test('ワークフローが見つからないエラーを処理する', async () => {
      mockOctokit.actions.createWorkflowDispatch.mockRejectedValueOnce(
        new Error('ワークフローが見つかりません: Not Found')
      )
      
      await expect(
        triggerWorkflow(
          'valid-token',
          'testowner',
          'testrepo',
          'nonexistent.yml',
          'main'
        )
      ).rejects.toThrow('ワークフローが見つかりません: Not Found')
    })
  })
})