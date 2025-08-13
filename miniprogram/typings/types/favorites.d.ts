// 收藏数据缓存类型定义
export interface FavoritesCacheData {
  favorites: any[];
  allFavorites: any[];
  total: number;
  timestamp: number;
}

// 收藏项类型定义
export interface FavoriteItem {
  _id: string;
  planId: string;
  userId: string;
  createTime: string;
  plan?: {
    _id: string;
    heroName: string;
    title: string;
    creatorName: string;
    likeCount: number;
    favoriteCount: number;
    heroId: string;
    description: string;
    equipment: any[];
    skillOne: any;
    skillTwo: any;
    skillThree: any;
    views: number;
    status: string;
  };
  // 展开到顶层的字段
  heroName?: string;
  title?: string;
  creatorName?: string;
  likeCount?: number;
  favoriteCount?: number;
  heroId?: string;
  description?: string;
  equipment?: any[];
  skillOne?: any;
  skillTwo?: any;
  skillThree?: any;
  views?: number;
  status?: string;
}
