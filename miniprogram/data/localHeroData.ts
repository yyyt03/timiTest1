// 本地英雄数据 - 用于替代云函数调用
// 数据来源：从云数据库导出并本地化

// 英雄分类数据 - 使用原有的分类
export const heroCategories = [
  {
    key: 'shooter',
    name: '射手',
    order: 1
  },
  {
    key: 'support',
    name: '辅助',
    order: 2
  },
  {
    key: 'assassin',
    name: '刺客',
    order: 3
  },
  {
    key: 'warrior',
    name: '战士',
    order: 4
  },
  {
    key: 'mage',
    name: '法师',
    order: 5
  }
];

// 英雄基础数据 - 使用原有的27个英雄
export const heroes = [
  // 射手
  {
    _id: 'sunshangxiang',
    name: '孙尚香',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/sunshangxiang.jpg',
    category: 'shooter'
  },
  {
    _id: 'makeboluo',
    name: '马可波罗',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/makeboluo.jpg',
    category: 'shooter'
  },
  {
    _id: 'houyi',
    name: '后羿',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/houyi.jpg',
    category: 'shooter'
  },
  {
    _id: 'direnjie',
    name: '狄仁杰',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/direnjie.jpg',
    category: 'shooter'
  },
  {
    _id: 'lubanqihao',
    name: '鲁班七号',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/lubanqihao.jpg',
    category: 'shooter'
  },
  
  // 辅助
  {
    _id: 'donghuangtaiyi',
    name: '东皇太一',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/donghuangtaiyi.jpg',
    category: 'support'
  },
  {
    _id: 'zhongkui',
    name: '钟馗',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/zhongkui.jpg',
    category: 'support'
  },
  {
    _id: 'mingshiyin',
    name: '明世隐',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/mingshiyin.jpg',
    category: 'support'
  },
  {
    _id: 'yao',
    name: '瑶',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/yao.jpg',
    category: 'support'
  },
  
  // 刺客
  {
    _id: 'zhaoyun',
    name: '赵云',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/zhaoyun.jpg',
    category: 'assassin'
  },
  {
    _id: 'libai',
    name: '李白',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/libai.jpg',
    category: 'assassin'
  },
  {
    _id: 'dianwei',
    name: '典韦',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/dianwei.jpg',
    category: 'assassin'
  },
  {
    _id: 'sunwukong',
    name: '孙悟空',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/sunwukong.jpg',
    category: 'assassin'
  },
  
  // 战士
  {
    _id: 'sunce',
    name: '孙策',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/sunce.jpg',
    category: 'warrior'
  },
  {
    _id: 'sikongzhen',
    name: '司空震',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/sikongzhen.jpg',
    category: 'warrior'
  },
  {
    _id: 'kai',
    name: '铠',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/kai.jpg',
    category: 'warrior'
  },
  {
    _id: 'yase',
    name: '亚瑟',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/yase.jpg',
    category: 'warrior'
  },
  {
    _id: 'chengyaojin',
    name: '程咬金',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/chengyaojin.jpg',
    category: 'warrior'
  },
  {
    _id: 'lvbu',
    name: '吕布',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/lvbu.jpg',
    category: 'warrior'
  },
  
  // 法师
  {
    _id: 'yangyuhuan',
    name: '杨玉环',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/yangyuhuan.jpg',
    category: 'mage'
  },
  {
    _id: 'daji',
    name: '妲己',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/daji.jpg',
    category: 'mage'
  },
  {
    _id: 'zhugeliang',
    name: '诸葛亮',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/zhugeliang.jpg',
    category: 'mage'
  },
  {
    _id: 'anqila',
    name: '安琪拉',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/anqila.jpg',
    category: 'mage'
  },
  {
    _id: 'zhenji',
    name: '甄姬',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/zhenji.jpg',
    category: 'mage'
  },
  {
    _id: 'xiaoqiao',
    name: '小乔',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/xiaoqiao.jpg',
    category: 'mage'
  },
  {
    _id: 'wuzetian',
    name: '武则天',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/wuzetian.jpg',
    category: 'mage'
  },
  {
    _id: 'diaochan',
    name: '貂蝉',
    avatar: 'cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/heroes/diaochan.jpg',
    category: 'mage'
  }
];

// 构建分类映射
const categoryMap: { [key: string]: string } = {};
heroCategories.forEach((cat) => {
  categoryMap[cat.key] = cat.name;
});

// 按分类组织英雄数据
export const getHeroesByCategory = () => {
  const categories: { [key: string]: any } = {};
  let totalHeroes = 0;
  
  heroes.forEach((hero) => {
    const chineseCategory = categoryMap[hero.category] || hero.category;
    
    if (!categories[chineseCategory]) {
      categories[chineseCategory] = {
        name: chineseCategory,
        heroes: []
      };
    }
    
    categories[chineseCategory].heroes.push({
      id: hero._id,
      name: hero.name,
      avatar: hero.avatar,
      category: chineseCategory
    });
    
    totalHeroes++;
  });
  
  return {
    categories,
    totalHeroes
  };
};

// 根据英雄ID查找英雄
export const getHeroById = (heroId: string) => {
  return heroes.find(hero => hero._id === heroId) || null;
};

// 根据英雄名称查找英雄
export const getHeroByName = (heroName: string) => {
  return heroes.find(hero => hero.name === heroName) || null;
};

// 获取所有英雄
export const getAllHeroes = () => {
  return heroes;
};

// 获取所有分类
export const getAllCategories = () => {
  return heroCategories;
}; 