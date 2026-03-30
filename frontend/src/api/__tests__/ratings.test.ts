import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as ratings from '../ratings';
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

describe('Ratings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRatings', () => {
    it('should call GET /api/ratings with correct params', async () => {
      const mockResponse = {
        data: {
          ratings: [],
          total: 0,
          page: 1,
          page_size: 20,
        },
      };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      const params = { page: 1, page_size: 20 };
      await ratings.getRatings(params);

      expect(apiClient.get).toHaveBeenCalledWith('/api/ratings', { params });
    });

    it('should return ratings on success', async () => {
      const mockData = {
        ratings: [
          {
            id: '1',
            user_id: 'user-1',
            skill_id: 'skill-1',
            rating: 5,
            skill: {
              id: 'skill-1',
              title: 'Test Skill',
              content: 'Test content',
              author_id: '123',
              tags: [],
              version: '1.0.0',
              download_count: 0,
              rating_avg: 5.0,
              rating_count: 1,
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

      const result = await ratings.getRatings();

      expect(result).toEqual(mockData);
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Failed to fetch ratings');
      (apiClient.get as any).mockRejectedValue(mockError);

      await expect(ratings.getRatings()).rejects.toThrow('Failed to fetch ratings');
    });
  });

  describe('createRating', () => {
    it('should call POST /api/skills/:id/rating with correct data', async () => {
      const mockResponse = {
        data: {
          id: '1',
          user_id: 'user-1',
          skill_id: 'skill-1',
          rating: 5,
          created_at: '2024-01-01T00:00:00Z',
        },
      };
      (apiClient.post as any).mockResolvedValue(mockResponse);

      await ratings.createRating('skill-1', { rating: 5 });

      expect(apiClient.post).toHaveBeenCalledWith('/api/skills/skill-1/rating', { rating: 5 });
    });

    it('should return created rating on success', async () => {
      const mockData = {
        id: '1',
        user_id: 'user-1',
        skill_id: 'skill-1',
        rating: 5,
        created_at: '2024-01-01T00:00:00Z',
      };
      const mockResponse = { data: mockData };
      (apiClient.post as any).mockResolvedValue(mockResponse);

      const result = await ratings.createRating('skill-1', { rating: 5 });

      expect(result).toEqual(mockData);
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Failed to create rating');
      (apiClient.post as any).mockRejectedValue(mockError);

      await expect(ratings.createRating('skill-1', { rating: 5 })).rejects.toThrow('Failed to create rating');
    });
  });

  describe('updateRating', () => {
    it('should call PUT /api/ratings/:id with correct data', async () => {
      const mockResponse = {
        data: {
          id: '1',
          user_id: 'user-1',
          skill_id: 'skill-1',
          rating: 4,
          created_at: '2024-01-01T00:00:00Z',
        },
      };
      (apiClient.put as any).mockResolvedValue(mockResponse);

      await ratings.updateRating('1', { rating: 4 });

      expect(apiClient.put).toHaveBeenCalledWith('/api/ratings/1', { rating: 4 });
    });

    it('should return updated rating on success', async () => {
      const mockData = {
        id: '1',
        user_id: 'user-1',
        skill_id: 'skill-1',
        rating: 4,
        created_at: '2024-01-01T00:00:00Z',
      };
      const mockResponse = { data: mockData };
      (apiClient.put as any).mockResolvedValue(mockResponse);

      const result = await ratings.updateRating('1', { rating: 4 });

      expect(result).toEqual(mockData);
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Failed to update rating');
      (apiClient.put as any).mockRejectedValue(mockError);

      await expect(ratings.updateRating('1', { rating: 4 })).rejects.toThrow('Failed to update rating');
    });
  });

  describe('deleteRating', () => {
    it('should call DELETE /api/ratings/:id', async () => {
      (apiClient.delete as any).mockResolvedValue({});

      await ratings.deleteRating('1');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/ratings/1');
    });

    it('should resolve on success', async () => {
      (apiClient.delete as any).mockResolvedValue({});

      await expect(ratings.deleteRating('1')).resolves.toBeUndefined();
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Failed to delete rating');
      (apiClient.delete as any).mockRejectedValue(mockError);

      await expect(ratings.deleteRating('1')).rejects.toThrow('Failed to delete rating');
    });
  });
});
