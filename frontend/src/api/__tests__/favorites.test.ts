import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as favorites from '../favorites';
import apiClient from '../client';

// Mock apiClient
vi.mock('../client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Favorites API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFavorites', () => {
    it('should call GET /api/favorites with correct params', async () => {
      const mockResponse = {
        data: {
          favorites: [],
          total: 0,
          page: 1,
          page_size: 20,
        },
      };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      const params = { page: 1, page_size: 20 };
      await favorites.getFavorites(params);

      expect(apiClient.get).toHaveBeenCalledWith('/api/favorites', { params });
    });

    it('should return favorites on success', async () => {
      const mockData = {
        favorites: [
          {
            id: '1',
            user_id: 'user-1',
            skill_id: 'skill-1',
            skill: {
              id: 'skill-1',
              title: 'Test Skill',
              content: 'Test content',
              author_id: '123',
              tags: [],
              version: '1.0.0',
              download_count: 0,
              rating_avg: 0,
              rating_count: 0,
              is_published: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
      };
      const mockResponse = { data: mockData };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      const result = await favorites.getFavorites();

      expect(result).toEqual(mockData);
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Failed to fetch favorites');
      (apiClient.get as any).mockRejectedValue(mockError);

      await expect(favorites.getFavorites()).rejects.toThrow('Failed to fetch favorites');
    });
  });

  describe('addFavorite', () => {
    it('should call POST /api/skills/:id/favorite', async () => {
      const mockResponse = {
        data: {
          id: '1',
          user_id: 'user-1',
          skill_id: 'skill-1',
          created_at: '2024-01-01T00:00:00Z',
        },
      };
      (apiClient.post as any).mockResolvedValue(mockResponse);

      await favorites.addFavorite('skill-1');

      expect(apiClient.post).toHaveBeenCalledWith('/api/skills/skill-1/favorite');
    });

    it('should return favorite on success', async () => {
      const mockData = {
        id: '1',
        user_id: 'user-1',
        skill_id: 'skill-1',
        created_at: '2024-01-01T00:00:00Z',
      };
      const mockResponse = { data: mockData };
      (apiClient.post as any).mockResolvedValue(mockResponse);

      const result = await favorites.addFavorite('skill-1');

      expect(result).toEqual(mockData);
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Failed to add favorite');
      (apiClient.post as any).mockRejectedValue(mockError);

      await expect(favorites.addFavorite('skill-1')).rejects.toThrow('Failed to add favorite');
    });
  });

  describe('removeFavorite', () => {
    it('should call DELETE /api/skills/:id/favorite', async () => {
      (apiClient.delete as any).mockResolvedValue({});

      await favorites.removeFavorite('skill-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/skills/skill-1/favorite');
    });

    it('should resolve on success', async () => {
      (apiClient.delete as any).mockResolvedValue({});

      await expect(favorites.removeFavorite('skill-1')).resolves.toBeUndefined();
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Failed to remove favorite');
      (apiClient.delete as any).mockRejectedValue(mockError);

      await expect(favorites.removeFavorite('skill-1')).rejects.toThrow('Failed to remove favorite');
    });
  });
});
