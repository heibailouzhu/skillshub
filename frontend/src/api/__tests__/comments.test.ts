import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as comments from '../comments';
import apiClient from '../client';

// Mock apiClient
vi.mock('../client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Comments API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getComments', () => {
    it('should call GET /api/skills/:skillId/comments with correct params', async () => {
      const mockResponse = {
        data: {
          comments: [],
          total: 0,
          page: 1,
          page_size: 20,
        },
      };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      const params = { page: 1, page_size: 20 };
      await comments.getComments('skill-1', params);

      expect(apiClient.get).toHaveBeenCalledWith('/api/skills/skill-1/comments', { params });
    });

    it('should return comments on success', async () => {
      const mockData = {
        comments: [
          {
            id: '1',
            skill_id: 'skill-1',
            user_id: 'user-1',
            user_username: 'testuser',
            content: 'Test comment',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
      };
      const mockResponse = { data: mockData };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      const result = await comments.getComments('skill-1');

      expect(result).toEqual(mockData);
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Failed to fetch comments');
      (apiClient.get as any).mockRejectedValue(mockError);

      await expect(comments.getComments('skill-1')).rejects.toThrow('Failed to fetch comments');
    });
  });

  describe('createComment', () => {
    it('should call POST /api/skills/:skillId/comments with correct data', async () => {
      const mockResponse = {
        data: {
          id: '1',
          skill_id: 'skill-1',
          user_id: 'user-1',
          user_username: 'testuser',
          content: 'New comment',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };
      (apiClient.post as any).mockResolvedValue(mockResponse);

      const commentData = { content: 'New comment' };
      await comments.createComment('skill-1', commentData);

      expect(apiClient.post).toHaveBeenCalledWith('/api/skills/skill-1/comments', commentData);
    });

    it('should return created comment on success', async () => {
      const mockData = {
        id: '1',
        skill_id: 'skill-1',
        user_id: 'user-1',
        user_username: 'testuser',
        content: 'New comment',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      const mockResponse = { data: mockData };
      (apiClient.post as any).mockResolvedValue(mockResponse);

      const result = await comments.createComment('skill-1', { content: 'New comment' });

      expect(result).toEqual(mockData);
    });

    it('should support nested comments with parent_id', async () => {
      const mockResponse = {
        data: {
          id: '2',
          skill_id: 'skill-1',
          user_id: 'user-1',
          content: 'Reply comment',
          parent_id: '1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };
      (apiClient.post as any).mockResolvedValue(mockResponse);

      const result = await comments.createComment('skill-1', {
        content: 'Reply comment',
        parent_id: '1',
      });

      expect(result.parent_id).toBe('1');
      expect(apiClient.post).toHaveBeenCalledWith('/api/skills/skill-1/comments', {
        content: 'Reply comment',
        parent_id: '1',
      });
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Failed to create comment');
      (apiClient.post as any).mockRejectedValue(mockError);

      await expect(comments.createComment('skill-1', { content: 'Test' })).rejects.toThrow(
        'Failed to create comment'
      );
    });
  });

  describe('updateComment', () => {
    it('should call PUT /api/comments/:id with correct data', async () => {
      const mockResponse = {
        data: {
          id: '1',
          skill_id: 'skill-1',
          user_id: 'user-1',
          content: 'Updated comment',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T01:00:00Z',
        },
      };
      (apiClient.put as any).mockResolvedValue(mockResponse);

      const updateData = { content: 'Updated comment' };
      await comments.updateComment('1', updateData);

      expect(apiClient.put).toHaveBeenCalledWith('/api/comments/1', updateData);
    });

    it('should return updated comment on success', async () => {
      const mockData = {
        id: '1',
        skill_id: 'skill-1',
        user_id: 'user-1',
        content: 'Updated comment',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
      };
      const mockResponse = { data: mockData };
      (apiClient.put as any).mockResolvedValue(mockResponse);

      const result = await comments.updateComment('1', { content: 'Updated comment' });

      expect(result).toEqual(mockData);
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Failed to update comment');
      (apiClient.put as any).mockRejectedValue(mockError);

      await expect(comments.updateComment('1', { content: 'Test' })).rejects.toThrow(
        'Failed to update comment'
      );
    });
  });

  describe('deleteComment', () => {
    it('should call DELETE /api/comments/:id', async () => {
      (apiClient.delete as any).mockResolvedValue({});

      await comments.deleteComment('1');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/comments/1');
    });

    it('should resolve on success', async () => {
      (apiClient.delete as any).mockResolvedValue({});

      await expect(comments.deleteComment('1')).resolves.toBeUndefined();
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Failed to delete comment');
      (apiClient.delete as any).mockRejectedValue(mockError);

      await expect(comments.deleteComment('1')).rejects.toThrow('Failed to delete comment');
    });
  });
});
