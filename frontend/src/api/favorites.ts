import apiClient from './client';

export interface Favorite {
  id: string;
  user_id: string;
  skill_id: string;
  created_at: string;
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

// Get user's favorites
export const getFavorites = async (
  params: FavoriteListQuery = {}
): Promise<FavoriteListResponse> => {
  const response = await apiClient.get<FavoriteListResponse>('/api/favorites', { params });
  return response.data;
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
