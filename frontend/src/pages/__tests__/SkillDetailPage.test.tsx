import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SkillDetailPage from '../SkillDetailPage';

// Mock API functions
const mockGetSkill = vi.fn();
const mockGetComments = vi.fn();
const mockGetRatingStats = vi.fn();
const mockGetRatings = vi.fn();
const mockGetFavorites = vi.fn();

vi.mock('../../api/skills', () => ({
  getSkill: () => mockGetSkill(),
  getRatingStats: () => mockGetRatingStats(),
}));

vi.mock('../../api/comments', () => ({
  getComments: () => mockGetComments(),
}));

vi.mock('../../api/ratings', () => ({
  getRatings: () => mockGetRatings(),
}));

vi.mock('../../api/favorites', () => ({
  getFavorites: () => mockGetFavorites(),
}));

// Mock Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
    Link: ({ children, to, ...props }: any) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => 'test-token'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as Storage;

describe('SkillDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders skill detail page correctly', async () => {
    mockGetSkill.mockResolvedValue({
      id: '1',
      title: 'Test Skill',
      description: 'Test Description',
      content: 'Test Content',
      author_username: 'testuser',
      category: 'AI',
      tags: ['React', 'TypeScript'],
      version: '1.0.0',
      rating_avg: 4.5,
      rating_count: 10,
      download_count: 100,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
    mockGetComments.mockResolvedValue({ comments: [], total: 0, page: 1, page_size: 10 });
    mockGetRatingStats.mockResolvedValue({ total_ratings: 10, average_rating: 4.5, distribution: { 5: 2, 4: 3, 3: 3, 2: 1, 1: 1 } });

    render(
      <BrowserRouter>
        <SkillDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/test skill/i)).toBeInTheDocument();
      expect(screen.getByText(/test description/i)).toBeInTheDocument();
    });
  });

  it('displays skill details', async () => {
    mockGetSkill.mockResolvedValue({
      id: '1',
      title: 'Test Skill',
      description: 'Test Description',
      content: 'Test Content',
      author_username: 'testuser',
      category: 'AI',
      tags: ['React', 'TypeScript'],
      version: '1.0.0',
      rating_avg: 4.5,
      rating_count: 10,
      download_count: 100,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
    mockGetComments.mockResolvedValue({ comments: [], total: 0, page: 1, page_size: 10 });
    mockGetRatingStats.mockResolvedValue({ total_ratings: 10, average_rating: 4.5, distribution: { 5: 2, 4: 3, 3: 3, 2: 1, 1: 1 } });

    render(
      <BrowserRouter>
        <SkillDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/ai/i)).toBeInTheDocument();
      expect(screen.getByText(/react/i)).toBeInTheDocument();
      expect(screen.getByText(/typescript/i)).toBeInTheDocument();
      expect(screen.getByText(/1\.0\.0/i)).toBeInTheDocument();
      expect(screen.getByText(/testuser/i)).toBeInTheDocument();
    });
  });

  it('displays rating stats', async () => {
    mockGetSkill.mockResolvedValue({
      id: '1',
      title: 'Test Skill',
      description: 'Test Description',
      content: 'Test Content',
      author_username: 'testuser',
      category: 'AI',
      tags: ['React'],
      version: '1.0.0',
      rating_avg: 4.5,
      rating_count: 10,
      download_count: 100,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
    mockGetComments.mockResolvedValue({ comments: [], total: 0, page: 1, page_size: 10 });
    mockGetRatingStats.mockResolvedValue({ total_ratings: 10, average_rating: 4.5, distribution: { 5: 2, 4: 3, 3: 3, 2: 1, 1: 1 } });

    render(
      <BrowserRouter>
        <SkillDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Check for 10 人评分 specifically
      expect(screen.getByText(/10 人评分/i)).toBeInTheDocument();
    });
  });

  it('displays comments', async () => {
    mockGetSkill.mockResolvedValue({
      id: '1',
      title: 'Test Skill',
      description: 'Test Description',
      content: 'Test Content',
      author_username: 'testuser',
      category: 'AI',
      tags: ['React'],
      version: '1.0.0',
      rating_avg: 4.5,
      rating_count: 10,
      download_count: 100,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
    mockGetComments.mockResolvedValue({
      comments: [
        {
          id: '1',
          content: 'Great skill!',
          user_username: 'commenter1',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          content: 'Very useful',
          user_username: 'commenter2',
          created_at: '2024-01-02T00:00:00Z',
        },
      ],
      total: 2,
      page: 1,
      page_size: 10,
    });
    mockGetRatingStats.mockResolvedValue({ total_ratings: 10, average_rating: 4.5, distribution: { 5: 2, 4: 3, 3: 3, 2: 1, 1: 1 } });

    render(
      <BrowserRouter>
        <SkillDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/great skill!/i)).toBeInTheDocument();
      expect(screen.getByText(/very useful/i)).toBeInTheDocument();
    });
  });

  it('displays rating distribution', async () => {
    mockGetSkill.mockResolvedValue({
      id: '1',
      title: 'Test Skill',
      description: 'Test Description',
      content: 'Test Content',
      author_username: 'testuser',
      category: 'AI',
      tags: ['React'],
      version: '1.0.0',
      rating_avg: 4.5,
      rating_count: 10,
      download_count: 100,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
    mockGetComments.mockResolvedValue({ comments: [], total: 0, page: 1, page_size: 10 });
    mockGetRatingStats.mockResolvedValue({ total_ratings: 10, average_rating: 4.5, distribution: { 5: 2, 4: 3, 3: 3, 2: 1, 1: 1 } });

    render(
      <BrowserRouter>
        <SkillDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/评分分布/i)).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    mockGetSkill.mockRejectedValue(new Error('API Error'));

    render(
      <BrowserRouter>
        <SkillDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/加载技能详情失败/i)).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    mockGetSkill.mockReturnValue(
      new Promise(() => {}) // Never resolves
    );

    render(
      <BrowserRouter>
        <SkillDetailPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/加载中\.\.\./i)).toBeInTheDocument();
  });

  it('displays skill content section', async () => {
    mockGetSkill.mockResolvedValue({
      id: '1',
      title: 'Test Skill',
      description: 'Test Description',
      content: 'Test Content',
      author_username: 'testuser',
      category: 'AI',
      tags: ['React'],
      version: '1.0.0',
      rating_avg: 4.5,
      rating_count: 10,
      download_count: 100,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
    mockGetComments.mockResolvedValue({ comments: [], total: 0, page: 1, page_size: 10 });
    mockGetRatingStats.mockResolvedValue({ total_ratings: 10, average_rating: 4.5, distribution: { 5: 2, 4: 3, 3: 3, 2: 1, 1: 1 } });

    render(
      <BrowserRouter>
        <SkillDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/技能内容/i)).toBeInTheDocument();
    });
  });

  it('displays download button', async () => {
    mockGetSkill.mockResolvedValue({
      id: '1',
      title: 'Test Skill',
      description: 'Test Description',
      content: 'Test Content',
      author_username: 'testuser',
      category: 'AI',
      tags: ['React'],
      version: '1.0.0',
      rating_avg: 4.5,
      rating_count: 10,
      download_count: 100,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
    mockGetComments.mockResolvedValue({ comments: [], total: 0, page: 1, page_size: 10 });
    mockGetRatingStats.mockResolvedValue({ total_ratings: 10, average_rating: 4.5, distribution: { 5: 2, 4: 3, 3: 3, 2: 1, 1: 1 } });

    render(
      <BrowserRouter>
        <SkillDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Look for the download button specifically in the skill detail section
      const downloadButtons = screen.getAllByText(/下载/i);
      expect(downloadButtons.length).toBeGreaterThan(0);
    });
  });

  it('displays stats cards', async () => {
    mockGetSkill.mockResolvedValue({
      id: '1',
      title: 'Test Skill',
      description: 'Test Description',
      content: 'Test Content',
      author_username: 'testuser',
      category: 'AI',
      tags: ['React'],
      version: '1.0.0',
      rating_avg: 4.5,
      rating_count: 10,
      download_count: 100,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });
    mockGetComments.mockResolvedValue({ comments: [], total: 0, page: 1, page_size: 10 });
    mockGetRatingStats.mockResolvedValue({ total_ratings: 10, average_rating: 4.5, distribution: { 5: 2, 4: 3, 3: 3, 2: 1, 1: 1 } });

    render(
      <BrowserRouter>
        <SkillDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/总评分/i)).toBeInTheDocument();
      expect(screen.getByText(/下载次数/i)).toBeInTheDocument();
      expect(screen.getByText(/平均评分/i)).toBeInTheDocument();
    });
  });
});
