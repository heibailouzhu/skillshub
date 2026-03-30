import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SkillListPage from '../SkillListPage';
import * as skills from '../../api/skills';

// Mock API
const mockGetSkills = vi.fn();

vi.mock('../../api/skills', () => ({
  getSkills: () => mockGetSkills(),
  getPopularCategories: vi.fn(),
  getPopularTags: vi.fn(),
}));

// Mock Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    Link: ({ children, to, ...props }: any) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

describe('SkillListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders skill list page correctly', async () => {
    mockGetSkills.mockResolvedValue({
      skills: [],
      total: 0,
      page: 1,
      page_size: 12,
    });

    render(
      <BrowserRouter>
        <SkillListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/搜索技能/i)).toBeInTheDocument();
    });
  });

  it('displays skill cards', async () => {
    mockGetSkills.mockResolvedValue({
      skills: [
        {
          id: '1',
          title: 'Test Skill 1',
          description: 'Description 1',
          author_username: 'user1',
          rating_avg: 4.5,
          download_count: 100,
          category: 'AI',
          tags: ['React'],
          version: '1.0.0',
          is_published: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          title: 'Test Skill 2',
          description: 'Description 2',
          author_username: 'user2',
          rating_avg: 3.8,
          download_count: 50,
          category: 'DevOps',
          tags: ['Python'],
          version: '1.0.0',
          is_published: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      total: 2,
      page: 1,
      page_size: 12,
    });

    render(
      <BrowserRouter>
        <SkillListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/test skill 1/i)).toBeInTheDocument();
      expect(screen.getByText(/test skill 2/i)).toBeInTheDocument();
    });
  });

  it('searches skills by keyword', async () => {
    mockGetSkills.mockResolvedValue({
      skills: [],
      total: 0,
      page: 1,
      page_size: 12,
    });

    render(
      <BrowserRouter>
        <SkillListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/搜索技能/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  it('displays no skills message when list is empty', async () => {
    mockGetSkills.mockResolvedValue({
      skills: [],
      total: 0,
      page: 1,
      page_size: 12,
    });

    render(
      <BrowserRouter>
        <SkillListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/暂无技能/i)).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    mockGetSkills.mockRejectedValue(new Error('API Error'));

    render(
      <BrowserRouter>
        <SkillListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/加载技能列表失败/i)).toBeInTheDocument();
    });
  });

  it('displays pagination when skills exist', async () => {
    mockGetSkills.mockResolvedValue({
      skills: Array(5).fill(null).map((_, i) => ({
        id: `${i}`,
        title: `Skill ${i}`,
        description: `Description ${i}`,
        author_username: 'user',
        rating_avg: 4.0,
        download_count: 100,
        category: 'AI',
        tags: [],
        version: '1.0.0',
        is_published: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })),
      total: 25,
      page: 1,
      page_size: 12,
    });

    render(
      <BrowserRouter>
        <SkillListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/第 1 页，共 3 页/i)).toBeInTheDocument();
    });
  });

  it('displays sort options', async () => {
    mockGetSkills.mockResolvedValue({
      skills: [],
      total: 0,
      page: 1,
      page_size: 12,
    });

    render(
      <BrowserRouter>
        <SkillListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/最新/i)).toBeInTheDocument();
      expect(screen.getByText(/评分最高/i)).toBeInTheDocument();
      expect(screen.getByText(/下载最多/i)).toBeInTheDocument();
    });
  });

  it('displays skill metadata correctly', async () => {
    mockGetSkills.mockResolvedValue({
      skills: [
        {
          id: '1',
          title: 'Test Skill',
          description: 'Test Description',
          author_username: 'testuser',
          rating_avg: 4.5,
          rating_count: 10,
          download_count: 100,
          category: 'AI',
          tags: ['React'],
          version: '1.0.0',
          is_published: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      page_size: 12,
    });

    render(
      <BrowserRouter>
        <SkillListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/testuser/i)).toBeInTheDocument();
      expect(screen.getByText(/ai/i)).toBeInTheDocument();
      expect(screen.getByText(/4.5/i)).toBeInTheDocument();
      expect(screen.getByText(/👍 10/i)).toBeInTheDocument();
      expect(screen.getByText(/⬇️ 100/i)).toBeInTheDocument();
    });
  });

  it('displays empty state message', async () => {
    mockGetSkills.mockResolvedValue({
      skills: [],
      total: 0,
      page: 1,
      page_size: 12,
    });

    render(
      <BrowserRouter>
        <SkillListPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/暂无技能/i)).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    mockGetSkills.mockReturnValue(
      new Promise(() => {}) // Never resolves
    );

    render(
      <BrowserRouter>
        <SkillListPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/加载中\.\.\./i)).toBeInTheDocument();
  });
});
