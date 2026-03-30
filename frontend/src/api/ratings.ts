import apiClient from './client';

export interface Rating {
  id: string;
  user_id: string;
  skill_id: string;
  rating: number;
  created_at: string;
  skill?: {
    id: string;
    title: string;
    description: string;
    category?: string;
    tags: string[];
  };
}

export interface CreateRatingRequest {
  rating: number;
}

export interface UpdateRatingRequest {
  rating: number;
}

export interface RatingListQuery {
  page?: number;
  page_size?: number;
}

export interface RatingListResponse {
  ratings: Rating[];
  total: number;
  page: number;
  page_size: number;
}

export interface RatingStats {
  total_ratings: number;
  average_rating: number;
}

// Get user's ratings
export const getRatings = async (
  params: RatingListQuery = {}
): Promise<RatingListResponse> => {
  const response = await apiClient.get<RatingListResponse>('/api/ratings', { params });
  return response.data;
};

// Create a rating for a skill
export const createRating = async (
  skillId: string,
  data: CreateRatingRequest
): Promise<Rating> => {
  const response = await apiClient.post<Rating>(`/api/skills/${skillId}/rating`, data);
  return response.data;
};

// Update a rating
export const updateRating = async (
  ratingId: string,
  data: UpdateRatingRequest
): Promise<Rating> => {
  const response = await apiClient.put<Rating>(`/api/ratings/${ratingId}`, data);
  return response.data;
};

// Delete a rating
export const deleteRating = async (ratingId: string): Promise<void> => {
  await apiClient.delete(`/api/ratings/${ratingId}`);
};

// Get rating stats for a skill
export const getRatingStats = async (skillId: string): Promise<RatingStats> => {
  const response = await apiClient.get<RatingStats>(`/api/skills/${skillId}/ratings`);
  return response.data;
};
