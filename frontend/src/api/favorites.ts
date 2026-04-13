import apiClient from './client';

export interface Favorite {
  id: string;
  user_id: string;
  skill_id: string;
  created_at: string;
  skill_title?: string;
  skill_description?: string;
  skill_category?: string;
  skill_author_id?: string;
  skill?: {
    id: string;
    title: string;
    description?: string;
    category?: string;
    tags: string[];
    rating_avg: number;
    rating_count: number;
    author_username?: string;
  };
}

export interface FavoriteListQuery {
  page?: number;
  page_size?: number;
}

export interface FavoriteListResponse {
  favorites: Favorite[];
  total: number;
  page: number;
  page_size: number;
}

interface FavoriteApiItem {
  id: string;
  user_id?: string;
  skill_id: string;
  created_at: string;
  skill_title?: string;
  skill_description?: string;
  skill_category?: string;
  skill_author_id?: string;
  skill?: {
    id: string;
    title: string;
    description?: string;
    category?: string;
    tags?: string[];
    rating_avg?: number;
    rating_count?: number;
    author_username?: string;
  };
}

const normalizeFavorite = (item: FavoriteApiItem): Favorite => ({
  id: item.id,
  user_id: item.user_id || '',
  skill_id: item.skill_id,
  created_at: item.created_at,
  skill_title: item.skill_title,
  skill_description: item.skill_description,
  skill_category: item.skill_category,
  skill_author_id: item.skill_author_id,
  skill: item.skill
    ? {
        id: item.skill.id,
        title: item.skill.title,
        description: item.skill.description,
        category: item.skill.category,
        tags: item.skill.tags ?? [],
        rating_avg: item.skill.rating_avg ?? 0,
        rating_count: item.skill.rating_count ?? 0,
        author_username: item.skill.author_username,
      }
    : {
        id: item.skill_id,
        title: item.skill_title || '',
        description: item.skill_description,
        category: item.skill_category,
        tags: [],
        rating_avg: 0,
        rating_count: 0,
      },
});

// Get user's favorites
export const getFavorites = async (
  params: FavoriteListQuery = {}
): Promise<FavoriteListResponse> => {
  const response = await apiClient.get<{
    favorites: FavoriteApiItem[];
    total: number;
    page: number;
    page_size: number;
  }>('/api/favorites', { params });

  return {
    ...response.data,
    favorites: (response.data.favorites || []).map(normalizeFavorite),
  };
};

// Add a skill to favorites
export const addFavorite = async (skillId: string): Promise<Favorite> => {
  const response = await apiClient.post<Favorite>(`/api/skills/${skillId}/favorite`);
  return response.data;
};

// Remove a skill from favorites
export const removeFavorite = async (skillId: string): Promise<void> => {
  await apiClient.delete(`/api/skills/${skillId}/favorite`);
};
