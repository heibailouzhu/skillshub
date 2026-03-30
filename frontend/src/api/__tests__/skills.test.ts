import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as skills from '../skills';
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

describe('Skills API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSkills', () => {
    it('should call GET /api/skills with correct params', async () => {
      const mockResponse = {
        data: {
          skills: [],
          total: 0,
          page: 1,
          page_size: 20,
        },
      };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      const params = { page: 1, page_size: 20, search: 'test' };
      await skills.getSkills(params);

      expect(apiClient.get).toHaveBeenCalledWith('/api/skills', { params });
    });

    it('should return response data on success', async () => {
      const mockData = {
        skills: [
          {
            id: '1',
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
        ],
        total: 1,
        page: 1,
        page_size: 20,
      };
      const mockResponse = { data: mockData };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      const result = await skills.getSkills({});

      expect(result).toEqual(mockData);
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Failed to fetch skills');
      (apiClient.get as any).mockRejectedValue(mockError);

      await expect(skills.getSkills({})).rejects.toThrow('Failed to fetch skills');
    });
  });

  describe('getSkill', () => {
    it('should call GET /api/skills/:id', async () => {
      const mockResponse = {
        data: {
          id: '1',
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
      };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      await skills.getSkill('1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/skills/1');
    });

    it('should return skill data on success', async () => {
      const mockData = {
        id: '1',
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
      };
      const mockResponse = { data: mockData };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      const result = await skills.getSkill('1');

      expect(result).toEqual(mockData);
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Failed to fetch skill');
      (apiClient.get as any).mockRejectedValue(mockError);

      await expect(skills.getSkill('1')).rejects.toThrow('Failed to fetch skill');
    });
  });

  describe('createSkill', () => {
    it('should call POST /api/skills with correct data', async () => {
      const mockResponse = {
        data: {
          id: '1',
          title: 'New Skill',
          content: 'Skill content',
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
      };
      (apiClient.post as any).mockResolvedValue(mockResponse);

      const skillData = {
        title: 'New Skill',
        content: 'Skill content',
        category: 'Test',
        tags: ['test'],
      };
      await skills.createSkill(skillData);

      expect(apiClient.post).toHaveBeenCalledWith('/api/skills', skillData);
    });

    it('should return created skill on success', async () => {
      const mockData = {
        id: '1',
        title: 'New Skill',
        content: 'Skill content',
        author_id: '123',
        tags: [],
        version: '1.0.0',
        download_count: 0,
        rating_avg: 0,
        rating_count: 0,
        is_published: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      const mockResponse = { data: mockData };
      (apiClient.post as any).mockResolvedValue(mockResponse);

      const result = await skills.createSkill({
        title: 'New Skill',
        content: 'Skill content',
      });

      expect(result).toEqual(mockData);
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Failed to create skill');
      (apiClient.post as any).mockRejectedValue(mockError);

      await expect(
        skills.createSkill({ title: 'New Skill', content: 'Skill content' })
      ).rejects.toThrow('Failed to create skill');
    });
  });

  describe('updateSkill', () => {
    it('should call PUT /api/skills/:id with correct data', async () => {
      const mockResponse = {
        data: {
          id: '1',
          title: 'Updated Skill',
          content: 'Updated content',
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
      };
      (apiClient.put as any).mockResolvedValue(mockResponse);

      const updateData = { title: 'Updated Skill', description: 'Updated description' };
      await skills.updateSkill('1', updateData);

      expect(apiClient.put).toHaveBeenCalledWith('/api/skills/1', updateData);
    });

    it('should return updated skill on success', async () => {
      const mockData = {
        id: '1',
        title: 'Updated Skill',
        content: 'Updated content',
        author_id: '123',
        tags: [],
        version: '1.0.0',
        download_count: 0,
        rating_avg: 0,
        rating_count: 0,
        is_published: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      const mockResponse = { data: mockData };
      (apiClient.put as any).mockResolvedValue(mockResponse);

      const result = await skills.updateSkill('1', { title: 'Updated Skill' });

      expect(result).toEqual(mockData);
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Failed to update skill');
      (apiClient.put as any).mockRejectedValue(mockError);

      await expect(skills.updateSkill('1', {})).rejects.toThrow('Failed to update skill');
    });
  });

  describe('deleteSkill', () => {
    it('should call DELETE /api/skills/:id', async () => {
      (apiClient.delete as any).mockResolvedValue({});

      await skills.deleteSkill('1');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/skills/1');
    });

    it('should resolve on success', async () => {
      (apiClient.delete as any).mockResolvedValue({});

      await expect(skills.deleteSkill('1')).resolves.toBeUndefined();
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Failed to delete skill');
      (apiClient.delete as any).mockRejectedValue(mockError);

      await expect(skills.deleteSkill('1')).rejects.toThrow('Failed to delete skill');
    });
  });

  describe('getPopularCategories', () => {
    it('should call GET /api/skills/categories/popular', async () => {
      const mockResponse = {
        data: [
          { category: 'AI', skill_count: 10 },
          { category: 'Data', skill_count: 5 },
        ],
      };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      await skills.getPopularCategories();

      expect(apiClient.get).toHaveBeenCalledWith('/api/skills/categories/popular');
    });

    it('should return categories on success', async () => {
      const mockData = [
        { category: 'AI', skill_count: 10 },
        { category: 'Data', skill_count: 5 },
      ];
      const mockResponse = { data: mockData };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      const result = await skills.getPopularCategories();

      expect(result).toEqual(mockData);
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Failed to fetch popular categories');
      (apiClient.get as any).mockRejectedValue(mockError);

      await expect(skills.getPopularCategories()).rejects.toThrow(
        'Failed to fetch popular categories'
      );
    });
  });

  describe('getPopularTags', () => {
    it('should call GET /api/skills/tags/popular', async () => {
      const mockResponse = {
        data: [
          { tag: 'python', skill_count: 15 },
          { tag: 'rust', skill_count: 8 },
        ],
      };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      await skills.getPopularTags();

      expect(apiClient.get).toHaveBeenCalledWith('/api/skills/tags/popular');
    });

    it('should return tags on success', async () => {
      const mockData = [
        { tag: 'python', skill_count: 15 },
        { tag: 'rust', skill_count: 8 },
      ];
      const mockResponse = { data: mockData };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      const result = await skills.getPopularTags();

      expect(result).toEqual(mockData);
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Failed to fetch popular tags');
      (apiClient.get as any).mockRejectedValue(mockError);

      await expect(skills.getPopularTags()).rejects.toThrow('Failed to fetch popular tags');
    });
  });

  describe('getSearchSuggestions', () => {
    it('should call GET /api/skills/search/suggestions with query', async () => {
      const mockResponse = {
        data: [
          { title: 'Python Skill', category: 'AI' },
          { title: 'Python Data', category: 'Data' },
        ],
      };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      await skills.getSearchSuggestions('python');

      expect(apiClient.get).toHaveBeenCalledWith('/api/skills/search/suggestions', {
        params: { q: 'python' },
      });
    });

    it('should return suggestions on success', async () => {
      const mockData = [
        { title: 'Python Skill', category: 'AI' },
        { title: 'Python Data', category: 'Data' },
      ];
      const mockResponse = { data: mockData };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      const result = await skills.getSearchSuggestions('python');

      expect(result).toEqual(mockData);
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Failed to fetch search suggestions');
      (apiClient.get as any).mockRejectedValue(mockError);

      await expect(skills.getSearchSuggestions('python')).rejects.toThrow(
        'Failed to fetch search suggestions'
      );
    });
  });

  describe('getRatingStats', () => {
    it('should call GET /api/skills/:id/ratings', async () => {
      const mockResponse = {
        data: {
          total_ratings: 10,
          average_rating: 4.5,
          distribution: { 1: 0, 2: 0, 3: 1, 4: 2, 5: 7 },
        },
      };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      await skills.getRatingStats('skill-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/skills/skill-1/ratings');
    });

    it('should return rating stats on success', async () => {
      const mockData = {
        total_ratings: 10,
        average_rating: 4.5,
        distribution: { 1: 0, 2: 0, 3: 1, 4: 2, 5: 7 },
      };
      const mockResponse = { data: mockData };
      (apiClient.get as any).mockResolvedValue(mockResponse);

      const result = await skills.getRatingStats('skill-1');

      expect(result).toEqual(mockData);
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Failed to fetch rating stats');
      (apiClient.get as any).mockRejectedValue(mockError);

      await expect(skills.getRatingStats('skill-1')).rejects.toThrow('Failed to fetch rating stats');
    });
  });

  describe('createSkillVersion', () => {
    it('should call POST /api/skills/:id/versions with correct data', async () => {
      const mockResponse = {
        data: {
          id: 'version-1',
          skill_id: 'skill-1',
          version: '2.0.0',
          content: 'Updated content',
          created_at: '2024-01-01T00:00:00Z',
        },
      };
      (apiClient.post as any).mockResolvedValue(mockResponse);

      await skills.createSkillVersion('skill-1', '2.0.0', 'Updated content', 'New features');

      expect(apiClient.post).toHaveBeenCalledWith('/api/skills/skill-1/versions', {
        version: '2.0.0',
        content: 'Updated content',
        changelog: 'New features',
      });
    });

    it('should return version on success', async () => {
      const mockData = {
        id: 'version-1',
        skill_id: 'skill-1',
        version: '2.0.0',
        content: 'Updated content',
        created_at: '2024-01-01T00:00:00Z',
      };
      const mockResponse = { data: mockData };
      (apiClient.post as any).mockResolvedValue(mockResponse);

      const result = await skills.createSkillVersion('skill-1', '2.0.0', 'Updated content');

      expect(result).toEqual(mockData);
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Failed to create skill version');
      (apiClient.post as any).mockRejectedValue(mockError);

      await expect(skills.createSkillVersion('skill-1', '2.0.0', 'content')).rejects.toThrow(
        'Failed to create skill version'
      );
    });
  });

  describe('rollbackSkillVersion', () => {
    it('should call POST /api/skills/:id/versions/:version/rollback', async () => {
      const mockResponse = {
        data: {
          id: 'skill-1',
          title: 'Test Skill',
          content: 'Rolled back content',
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
      };
      (apiClient.post as any).mockResolvedValue(mockResponse);

      await skills.rollbackSkillVersion('skill-1', '1.0.0');

      expect(apiClient.post).toHaveBeenCalledWith('/api/skills/skill-1/versions/1.0.0/rollback');
    });

    it('should return rolled back skill on success', async () => {
      const mockData = {
        id: 'skill-1',
        title: 'Test Skill',
        content: 'Rolled back content',
        author_id: '123',
        tags: [],
        version: '1.0.0',
        download_count: 0,
        rating_avg: 0,
        rating_count: 0,
        is_published: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      const mockResponse = { data: mockData };
      (apiClient.post as any).mockResolvedValue(mockResponse);

      const result = await skills.rollbackSkillVersion('skill-1', '1.0.0');

      expect(result).toEqual(mockData);
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Failed to rollback skill version');
      (apiClient.post as any).mockRejectedValue(mockError);

      await expect(skills.rollbackSkillVersion('skill-1', '1.0.0')).rejects.toThrow(
        'Failed to rollback skill version'
      );
    });
  });
});
