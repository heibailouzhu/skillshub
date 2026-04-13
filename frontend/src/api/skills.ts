import apiClient from './client';

export interface Skill {
  id: string;
  slug: string;
  title: string;
  description?: string;
  content: string;
  author_id: string;
  author_username?: string;
  category?: string;
  tags: string[];
  version: string;
  download_count: number;
  rating_avg: number;
  rating_count: number;
  favorite_count?: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  versions?: SkillVersion[];
  package?: SkillPackageSummary | null;
}

export interface SkillPackageSummary {
  version: string;
  file_count: number;
  total_size: number;
  bundle_hash: string;
  download_url: string;
}

export interface SkillVersion {
  id: string;
  skill_id: string;
  version: string;
  changelog?: string;
  content: string;
  created_at: string;
}

export interface CreateSkillRequest {
  title: string;
  description?: string;
  content: string;
  category?: string;
  tags?: string[];
}

export interface UpdateSkillRequest {
  title?: string;
  description?: string;
  content?: string;
  category?: string;
  tags?: string[];
}

export interface SkillListQuery {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  tags?: string;
  sort_by?: 'created_at' | 'updated_at' | 'rating_avg' | 'download_count' | 'favorite_count' | 'relevance';
  sort_order?: 'asc' | 'desc';
}

export interface SkillListResponse {
  skills: Skill[];
  total: number;
  page: number;
  page_size: number;
}

export interface PopularCategory {
  category: string;
  skill_count: number;
}

export interface PopularTag {
  tag: string;
  skill_count: number;
}

export interface SkillRatingStats {
  total_ratings: number;
  average_rating: number;
  distribution: { [key: number]: number };
}

export interface SkillDetailResponse {
  skill: Skill;
  favorite_count: number;
  versions: SkillVersion[];
  package: SkillPackageSummary | null;
}

export interface SearchSuggestion {
  title: string;
  category?: string;
}

// Get skills list
export const getSkills = async (params: SkillListQuery): Promise<SkillListResponse> => {
  const response = await apiClient.get<SkillListResponse>('/api/skills', { params });
  return response.data;
};

// Get skill details
export const getSkill = async (id: string): Promise<Skill> => {
  const response = await apiClient.get<SkillDetailResponse>(`/api/skills/${id}`);
  return {
    ...response.data.skill,
    favorite_count: response.data.favorite_count,
    versions: response.data.versions,
    package: response.data.package,
  };
};

// Create a new skill
export const createSkill = async (data: CreateSkillRequest): Promise<Skill> => {
  const response = await apiClient.post<Skill>('/api/skills', data);
  return response.data;
};

export const createSkillPackage = async (formData: FormData): Promise<Skill> => {
  const response = await apiClient.post<Skill>('/api/skills/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Update a skill
export const updateSkill = async (id: string, data: UpdateSkillRequest): Promise<Skill> => {
  const response = await apiClient.put<Skill>(`/api/skills/${id}`, data);
  return response.data;
};

// Delete a skill
export const deleteSkill = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/skills/${id}`);
};

// Get popular categories
export const getPopularCategories = async (): Promise<PopularCategory[]> => {
  const response = await apiClient.get<PopularCategory[]>('/api/skills/categories/popular');
  return response.data;
};

// Get popular tags
export const getPopularTags = async (): Promise<PopularTag[]> => {
  const response = await apiClient.get<PopularTag[]>('/api/skills/tags/popular');
  return response.data;
};

// Get search suggestions
export const getSearchSuggestions = async (query: string): Promise<SearchSuggestion[]> => {
  const response = await apiClient.get<SearchSuggestion[]>('/api/skills/search/suggestions', {
    params: { q: query },
  });
  return response.data;
};

// Get rating stats
export const getRatingStats = async (skillId: string): Promise<SkillRatingStats> => {
  const response = await apiClient.get<SkillRatingStats>(`/api/skills/${skillId}/ratings`);
  return response.data;
};

// Create skill version
export const createSkillVersion = async (
  skillId: string,
  version: string,
  content: string,
  changelog?: string
): Promise<SkillVersion> => {
  const response = await apiClient.post<SkillVersion>(`/api/skills/${skillId}/versions`, {
    version,
    content,
    changelog,
  });
  return response.data;
};

// Rollback skill version
export const rollbackSkillVersion = async (skillId: string, version: string): Promise<Skill> => {
  const response = await apiClient.post<Skill>(
    `/api/skills/${skillId}/versions/${version}/rollback`
  );
  return response.data;
};
