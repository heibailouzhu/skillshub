// User types
export interface User {
  id: string;
  username: string;
  email: string;
  is_admin?: boolean;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPublic {
  id: string;
  username: string;
  email: string;
  is_admin?: boolean;
  avatar_url?: string;
  bio?: string;
}

// Skill types
export interface Skill {
  id: string;
  title: string;
  description: string;
  content: string;
  author: string;
  author_id: string;
  category?: string;
  tags: string[];
  version: string;
  download_count: number;
  rating_avg: number;
  rating_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface SkillListItem {
  id: string;
  title: string;
  description: string;
  author: string;
  author_id: string;
  category?: string;
  tags: string[];
  rating_avg: number;
  rating_count: number;
  download_count: number;
  created_at: string;
}

// Comment types
export interface Comment {
  id: string;
  skill_id: string;
  user_id: string;
  author: string;
  content: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

// Favorite types
export interface Favorite {
  id: string;
  user_id: string;
  skill_id: string;
  skill: SkillListItem;
  created_at: string;
}

// Rating types
export interface Rating {
  id: string;
  user_id: string;
  skill_id: string;
  skill: SkillListItem;
  score: number;
  created_at: string;
}

export interface RatingStats {
  total_ratings: number;
  average_rating: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

// Version types
export interface SkillVersion {
  id: string;
  skill_id: string;
  version: string;
  changelog?: string;
  content: string;
  created_at: string;
}

// Popular types
export interface PopularCategory {
  category: string;
  count: number;
}

export interface PopularTag {
  tag: string;
  count: number;
}

export interface SearchSuggestion {
  id: string;
  title: string;
  description: string;
}

// List response types
export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// Auth types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  user_id: string;
  username: string;
  token: string;
  is_admin: boolean;
}

export interface RegisterResponse {
  user_id: string;
  token: string;
  username?: string;
  is_admin?: boolean;
}
