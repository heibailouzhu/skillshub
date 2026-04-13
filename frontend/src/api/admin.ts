import apiClient from './client';

export interface AdminSkillItem {
  id: string;
  slug: string;
  title: string;
  description?: string;
  author_id: string;
  author_username?: string;
  category?: string;
  version: string;
  download_count: number;
  rating_avg: number;
  is_published: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminSkillListResponse {
  skills: AdminSkillItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminSkillListParams {
  page?: number;
  page_size?: number;
  search?: string;
}

export interface AdminSkillStatusUpdateRequest {
  is_published?: boolean;
  is_deleted?: boolean;
}

export interface AdminUserItem {
  id: string;
  username: string;
  email: string;
  is_admin: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUserListResponse {
  users: AdminUserItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminUserListParams {
  page?: number;
  page_size?: number;
  search?: string;
}

export interface AdminUserRoleUpdateRequest {
  is_admin: boolean;
}

export const getAdminSkills = async (params: AdminSkillListParams = {}): Promise<AdminSkillListResponse> => {
  const response = await apiClient.get<AdminSkillListResponse>('/api/admin/skills', { params });
  return response.data;
};

export const updateAdminSkillStatus = async (
  skillId: string,
  data: AdminSkillStatusUpdateRequest,
): Promise<void> => {
  await apiClient.patch(`/api/admin/skills/${skillId}/status`, data);
};

export const getAdminUsers = async (params: AdminUserListParams = {}): Promise<AdminUserListResponse> => {
  const response = await apiClient.get<AdminUserListResponse>('/api/admin/users', { params });
  return response.data;
};

export const updateAdminUserRole = async (
  userId: string,
  data: AdminUserRoleUpdateRequest,
): Promise<void> => {
  await apiClient.patch(`/api/admin/users/${userId}/role`, data);
};
