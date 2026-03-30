import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HomePage from '../HomePage';
import * as skills from '../../api/skills';

// Mock API
vi.mock('../../api/skills', () => ({
  getSkills: vi.fn(),
  getPopularCategories: vi.fn(),
  getPopularTags: vi.fn(),
}));

// Mock Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to, ...props }: any) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders home page correctly', async () => {
    vi.mocked(skills.getSkills).mockResolvedValue({
      skills: [],
      total: 0,
      page: 1,
      page_size: 6,
    });
    vi.mocked(skills.getPopularCategories).mockResolvedValue([]);
    vi.mocked(skills.getPopularTags).mockResolvedValue([]);

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/发现和分享优秀技能/i)).toBeInTheDocument();
      // Check for hero section specifically
      const heroText = screen.getAllByText(/SkillShub 是一个技能分享平台/i);
      expect(heroText.length).toBeGreaterThan(0);
    });
  });

  it('displays loading state initially', () => {
    vi.mocked(skills.getSkills).mockReturnValue(
      new Promise(() => {}) // Never resolves
    );
    vi.mocked(skills.getPopularCategories).mockReturnValue(
      new Promise(() => {})
    );
    vi.mocked(skills.getPopularTags).mockReturnValue(
      new Promise(() => {})
    );

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    expect(screen.getByText(/加载中\.\.\./i)).toBeInTheDocument();
  });

  it('displays popular categories', async () => {
    vi.mocked(skills.getSkills).mockResolvedValue({
      skills: [],
      total: 0,
      page: 1,
      page_size: 6,
    });
    vi.mocked(skills.getPopularCategories).mockResolvedValue([
      { category: 'AI', skill_count: 10 },
      { category: 'DevOps', skill_count: 8 },
      { category: 'Web', skill_count: 6 },
    ]);
    vi.mocked(skills.getPopularTags).mockResolvedValue([]);

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/ai/i)).toBeInTheDocument();
      expect(screen.getByText(/devops/i)).toBeInTheDocument();
      expect(screen.getByText(/web/i)).toBeInTheDocument();
    });
  });

  it('displays popular tags', async () => {
    vi.mocked(skills.getSkills).mockResolvedValue({
      skills: [],
      total: 0,
      page: 1,
      page_size: 6,
    });
    vi.mocked(skills.getPopularCategories).mockResolvedValue([]);
    vi.mocked(skills.getPopularTags).mockResolvedValue([
      { tag: 'React', skill_count: 15 },
      { tag: 'Rust', skill_count: 12 },
      { tag: 'Python', skill_count: 10 },
    ]);

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/react/i)).toBeInTheDocument();
      expect(screen.getByText(/rust/i)).toBeInTheDocument();
      expect(screen.getByText(/python/i)).toBeInTheDocument();
    });
  });

  it('displays skill cards', async () => {
    vi.mocked(skills.getSkills).mockResolvedValue({
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
      page_size: 6,
    });
    vi.mocked(skills.getPopularCategories).mockResolvedValue([]);
    vi.mocked(skills.getPopularTags).mockResolvedValue([]);

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/test skill 1/i)).toBeInTheDocument();
      expect(screen.getByText(/test skill 2/i)).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    vi.mocked(skills.getSkills).mockRejectedValue(new Error('API Error'));
    vi.mocked(skills.getPopularCategories).mockResolvedValue([]);
    vi.mocked(skills.getPopularTags).mockResolvedValue([]);

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/加载数据失败/i)).toBeInTheDocument();
    });
  });

  it('navigates to skill list when clicking browse skills button', async () => {
    vi.mocked(skills.getSkills).mockResolvedValue({
      skills: [],
      total: 0,
      page: 1,
      page_size: 6,
    });
    vi.mocked(skills.getPopularCategories).mockResolvedValue([]);
    vi.mocked(skills.getPopularTags).mockResolvedValue([]);

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const browseButton = screen.getByText(/浏览技能/i);
      expect(browseButton.closest('a')).toHaveAttribute('href', '/skills');
    });
  });

  it('navigates to skill creation when clicking publish skill button', async () => {
    vi.mocked(skills.getSkills).mockResolvedValue({
      skills: [],
      total: 0,
      page: 1,
      page_size: 6,
    });
    vi.mocked(skills.getPopularCategories).mockResolvedValue([]);
    vi.mocked(skills.getPopularTags).mockResolvedValue([]);

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const publishButton = screen.getByText(/发布技能/i);
      expect(publishButton.closest('a')).toHaveAttribute('href', '/skills/create');
    });
  });

  it('displays hero section with correct text', async () => {
    vi.mocked(skills.getSkills).mockResolvedValue({
      skills: [],
      total: 0,
      page: 1,
      page_size: 6,
    });
    vi.mocked(skills.getPopularCategories).mockResolvedValue([]);
    vi.mocked(skills.getPopularTags).mockResolvedValue([]);

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/发现和分享优秀技能/i)).toBeInTheDocument();
      const heroText = screen.getAllByText(/让用户可以轻松发现、分享和使用各种技能/i);
      expect(heroText.length).toBeGreaterThan(0);
    });
  });

  it('displays section headers', async () => {
    vi.mocked(skills.getSkills).mockResolvedValue({
      skills: [],
      total: 0,
      page: 1,
      page_size: 6,
    });
    vi.mocked(skills.getPopularCategories).mockResolvedValue([]);
    vi.mocked(skills.getPopularTags).mockResolvedValue([]);

    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const hotSkillsHeader = screen.getAllByText(/热门技能/i);
      expect(hotSkillsHeader.length).toBeGreaterThan(0);

      const popularCategoriesHeader = screen.getAllByText(/热门分类/i);
      expect(popularCategoriesHeader.length).toBeGreaterThan(0);

      const popularTagsHeader = screen.getAllByText(/热门标签/i);
      expect(popularTagsHeader.length).toBeGreaterThan(0);
    });
  });
});
