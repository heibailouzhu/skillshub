import apiClient from './client';

export interface Comment {
  id: string;
  skill_id: string;
  user_id: string;
  user_username?: string;
  content: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCommentRequest {
  content: string;
  parent_id?: string;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface CommentListQuery {
  page?: number;
  page_size?: number;
}

export interface CommentListResponse {
  comments: Comment[];
  total: number;
  page: number;
  page_size: number;
}

// Get comments for a skill
export const getComments = async (
  skillId: string,
  params: CommentListQuery = {}
): Promise<CommentListResponse> => {
  const response = await apiClient.get<CommentListResponse>(
    `/api/skills/${skillId}/comments`,
    { params }
  );
  return response.data;
};

// Create a new comment
export const createComment = async (
  skillId: string,
  data: CreateCommentRequest
): Promise<Comment> => {
  const response = await apiClient.post<Comment>(`/api/skills/${skillId}/comments`, data);
  return response.data;
};

// Update a comment
export const updateComment = async (
  commentId: string,
  data: UpdateCommentRequest
): Promise<Comment> => {
  const response = await apiClient.put<Comment>(`/api/comments/${commentId}`, data);
  return response.data;
};

// Delete a comment
export const deleteComment = async (commentId: string): Promise<void> => {
  await apiClient.delete(`/api/comments/${commentId}`);
};
