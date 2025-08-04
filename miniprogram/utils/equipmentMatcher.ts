// 装备匹配工具函数
interface Equipment {
  id: number;
  name: string;
  type: number;
  price: number;
  image: string;
}

// 装备数据（从 equipment_simplified.json 中提取）
const equipmentData: Equipment[] = [
  { "id": 1111, "name": "铁剑", "type": 1, "price": 165, "image": "equipment_1111.jpg" },
  { "id": 1112, "name": "匕首", "type": 1, "price": 180, "image": "equipment_1112.jpg" },
  { "id": 1113, "name": "搏击拳套", "type": 1, "price": 180, "image": "equipment_1113.jpg" },
  { "id": 1114, "name": "吸血之镰", "type": 1, "price": 180, "image": "equipment_1114.jpg" },
  { "id": 1116, "name": "雷鸣刃", "type": 1, "price": 492, "image": "equipment_1116.jpg" },
  { "id": 1121, "name": "风暴巨剑", "type": 1, "price": 546, "image": "equipment_1121.jpg" },
  { "id": 1122, "name": "日冕", "type": 1, "price": 456, "image": "equipment_1122.jpg" },
  { "id": 1123, "name": "狂暴双刃", "type": 1, "price": 456, "image": "equipment_1123.jpg" },
  { "id": 1124, "name": "陨星", "type": 1, "price": 456, "image": "equipment_1124.jpg" },
  { "id": 1131, "name": "碎星锤", "type": 1, "price": 1248, "image": "equipment_1131.jpg" },
  { "id": 1126, "name": "末世", "type": 1, "price": 840, "image": "equipment_1126.jpg" },
  { "id": 1127, "name": "名刀·司命", "type": 1, "price": 1236, "image": "equipment_1127.jpg" },
  { "id": 1128, "name": "寒霜袭侵", "type": 1, "price": 1224, "image": "equipment_1128.jpg" },
  { "id": 1129, "name": "速击之枪", "type": 1, "price": 480, "image": "equipment_1129.jpg" },
  { "id": 11210, "name": "制裁之刃", "type": 1, "price": 1248, "image": "equipment_11210.jpg" },
  { "id": 1132, "name": "泣血之刃", "type": 1, "price": 808, "image": "equipment_1132.jpg" },
  { "id": 1133, "name": "无尽战刃", "type": 1, "price": 1266, "image": "equipment_1133.jpg" },
  { "id": 1134, "name": "宗师之力", "type": 1, "price": 1260, "image": "equipment_1134.jpg" },
  { "id": 1135, "name": "闪电匕首", "type": 1, "price": 1224, "image": "equipment_1135.jpg" },
  { "id": 1136, "name": "影刃", "type": 1, "price": 1224, "image": "equipment_1136.jpg" },
  { "id": 1137, "name": "暗影战斧", "type": 1, "price": 1254, "image": "equipment_1137.jpg" },
  { "id": 1138, "name": "强者破军", "type": 1, "price": 1524, "image": "equipment_1138.jpg" },
  { "id": 11311, "name": "纯净苍穹", "type": 1, "price": 1284, "image": "equipment_11311.jpg" },
  { "id": 1141, "name": "逐日之弓", "type": 1, "price": 1260, "image": "equipment_1141.jpg" },
  { "id": 1125, "name": "破魔刀", "type": 1, "price": 1236, "image": "equipment_1125.jpg" },
  { "id": 1154, "name": "穿云弓", "type": 1, "price": 480, "image": "equipment_1154.jpg" },
  { "id": 1155, "name": "仁者破晓", "type": 1, "price": 1542, "image": "equipment_1155.jpg" },
  { "id": 1211, "name": "咒术典籍", "type": 2, "price": 165, "image": "equipment_1211.jpg" },
  { "id": 1212, "name": "蓝宝石", "type": 2, "price": 165, "image": "equipment_1212.jpg" },
  { "id": 1214, "name": "圣者法典", "type": 2, "price": 480, "image": "equipment_1214.jpg" },
  { "id": 1221, "name": "大棒", "type": 2, "price": 492, "image": "equipment_1221.jpg" },
  { "id": 1222, "name": "血族之书", "type": 2, "price": 480, "image": "equipment_1222.jpg" },
  { "id": 1227, "name": "炽热支配", "type": 2, "price": 1224, "image": "equipment_1227.jpg" },
  { "id": 12211, "name": "梦魇之牙", "type": 2, "price": 1224, "image": "equipment_12211.jpg" },
  { "id": 1231, "name": "虚无法杖", "type": 2, "price": 1224, "image": "equipment_1231.jpg" },
  { "id": 1232, "name": "博学者之怒", "type": 2, "price": 1284, "image": "equipment_1232.jpg" },
  { "id": 1239, "name": "辉月", "type": 2, "price": 832, "image": "equipment_1239.jpg" },
  { "id": 1233, "name": "回响之杖", "type": 2, "price": 1260, "image": "equipment_1233.jpg" },
  { "id": 1234, "name": "凝冰之息", "type": 2, "price": 1260, "image": "equipment_1234.jpg" },
  { "id": 1235, "name": "痛苦面具", "type": 2, "price": 1248, "image": "equipment_1235.jpg" },
  { "id": 1236, "name": "巫术法杖", "type": 2, "price": 1248, "image": "equipment_1236.jpg" },
  { "id": 1226, "name": "圣杯", "type": 2, "price": 1212, "image": "equipment_1226.jpg" },
  { "id": 1237, "name": "时之预言", "type": 2, "price": 1254, "image": "equipment_1237.jpg" },
  { "id": 1238, "name": "贤者天书", "type": 2, "price": 1566, "image": "equipment_1238.jpg" },
  { "id": 1240, "name": "噬神之书", "type": 2, "price": 1254, "image": "equipment_1240.jpg" },
  { "id": 1311, "name": "红玛瑙", "type": 3, "price": 180, "image": "equipment_1311.jpg" },
  { "id": 1312, "name": "布甲", "type": 3, "price": 165, "image": "equipment_1312.jpg" },
  { "id": 1313, "name": "抗魔披风", "type": 3, "price": 165, "image": "equipment_1313.jpg" },
  { "id": 1321, "name": "力量腰带", "type": 3, "price": 540, "image": "equipment_1321.jpg" },
  { "id": 1323, "name": "神隐斗篷", "type": 3, "price": 480, "image": "equipment_1323.jpg" },
  { "id": 1324, "name": "雪山圆盾", "type": 3, "price": 450, "image": "equipment_1324.jpg" },
  { "id": 1325, "name": "守护者之铠", "type": 3, "price": 480, "image": "equipment_1325.jpg" },
  { "id": 1327, "name": "反伤刺甲", "type": 3, "price": 1212, "image": "equipment_1327.jpg" },
  { "id": 1328, "name": "血魔之怒", "type": 3, "price": 1308, "image": "equipment_1328.jpg" },
  { "id": 1331, "name": "红莲斗篷", "type": 3, "price": 1206, "image": "equipment_1331.jpg" },
  { "id": 1332, "name": "霸者重装", "type": 3, "price": 1506, "image": "equipment_1332.jpg" },
  { "id": 1341, "name": "冰霜冲击", "type": 3, "price": 1218, "image": "equipment_1341.jpg" },
  { "id": 1333, "name": "不祥征兆", "type": 3, "price": 1212, "image": "equipment_1333.jpg" },
  { "id": 1334, "name": "不死鸟之眼", "type": 3, "price": 1200, "image": "equipment_1334.jpg" },
  { "id": 1335, "name": "魔女斗篷", "type": 3, "price": 1272, "image": "equipment_1335.jpg" },
  { "id": 1336, "name": "极寒风暴", "type": 3, "price": 1224, "image": "equipment_1336.jpg" },
  { "id": 13310, "name": "冰痕之握", "type": 3, "price": 1236, "image": "equipment_13310.jpg" },
  { "id": 1337, "name": "贤者的庇护", "type": 3, "price": 1368, "image": "equipment_1337.jpg" },
  { "id": 1338, "name": "暴烈之甲", "type": 3, "price": 1230, "image": "equipment_1338.jpg" },
  { "id": 1411, "name": "神速之靴", "type": 4, "price": 150, "image": "equipment_1411.jpg" },
  { "id": 1421, "name": "影忍之足", "type": 4, "price": 420, "image": "equipment_1421.jpg" },
  { "id": 1422, "name": "抵抗之靴", "type": 4, "price": 420, "image": "equipment_1422.jpg" },
  { "id": 1423, "name": "冷静之靴", "type": 4, "price": 420, "image": "equipment_1423.jpg" },
  { "id": 1424, "name": "秘法之靴", "type": 4, "price": 420, "image": "equipment_1424.jpg" },
  { "id": 1425, "name": "急速战靴", "type": 4, "price": 420, "image": "equipment_1425.jpg" },
  { "id": 1426, "name": "疾步之靴", "type": 4, "price": 420, "image": "equipment_1426.jpg" },
  { "id": 1511, "name": "狩猎宽刃", "type": 5, "price": 150, "image": "equipment_1511.jpg" },
  { "id": 1521, "name": "游击弯刀", "type": 5, "price": 420, "image": "equipment_1521.jpg" },
  { "id": 1522, "name": "巡守利斧", "type": 5, "price": 420, "image": "equipment_1522.jpg" },
  { "id": 1523, "name": "追击刀锋", "type": 5, "price": 420, "image": "equipment_1523.jpg" },
  { "id": 1531, "name": "符文大剑", "type": 5, "price": 1296, "image": "equipment_1531.jpg" },
  { "id": 1532, "name": "巨人之握", "type": 5, "price": 1960, "image": "equipment_1532.jpg" },
  { "id": 1533, "name": "贪婪之噬", "type": 5, "price": 1296, "image": "equipment_1533.jpg" },
  { "id": 1727, "name": "日暮之流", "type": 2, "price": 1272, "image": "equipment_1727.jpg" },
  { "id": 1728, "name": "金色圣剑", "type": 2, "price": 1242, "image": "equipment_1728.jpg" },
  { "id": 1534, "name": "怒龙剑盾", "type": 3, "price": 1176, "image": "equipment_1534.jpg" },
  { "id": 1345, "name": "荆棘护手", "type": 3, "price": 450, "image": "equipment_1345.jpg" },
  { "id": 1347, "name": "永夜守护", "type": 3, "price": 1212, "image": "equipment_1347.jpg" },
  { "id": 1349, "name": "原初遗珠", "type": 3, "price": 480, "image": "equipment_1349.jpg" },
  { "id": 1350, "name": "侵掠·怒魂", "type": 3, "price": 1980, "image": "equipment_1350.jpg" },
  { "id": 1351, "name": "徐行·凛冬", "type": 3, "price": 1914, "image": "equipment_1351.jpg" },
  { "id": 1156, "name": "迅疾·日渊", "type": 1, "price": 1992, "image": "equipment_1156.jpg" },
  { "id": 1157, "name": "不动·天穹", "type": 1, "price": 1968, "image": "equipment_1157.jpg" },
  { "id": 1242, "name": "难知·月神", "type": 2, "price": 2004, "image": "equipment_1242.jpg" },
  { "id": 1224, "name": "魔道之石", "type": 2, "price": 480, "image": "equipment_1224.jpg" },
  { "id": 1243, "name": "云灵木", "type": 2, "price": 504, "image": "equipment_1243.jpg" },
  { "id": 1115, "name": "迅捷长矛", "type": 1, "price": 456, "image": "equipment_1115.jpg" },
  { "id": 1244, "name": "破茧之衣", "type": 2, "price": 848, "image": "equipment_1244.jpg" },
  { "id": 1158, "name": "血魂刃", "type": 1, "price": 480, "image": "equipment_1158.jpg" },
  { "id": 1159, "name": "逐风", "type": 1, "price": 1248, "image": "equipment_1159.jpg" },
  { "id": 1353, "name": "旭日初光", "type": 3, "price": 1212, "image": "equipment_1353.jpg" },
  { "id": 1701, "name": "学识宝石", "type": 7, "price": 180, "image": "equipment_1701.jpg" },
  { "id": 1711, "name": "极影", "type": 7, "price": 510, "image": "equipment_1711.jpg" },
  { "id": 1714, "name": "近卫", "type": 7, "price": 510, "image": "equipment_1714.jpg" },
  { "id": 1721, "name": "极影·救赎", "type": 7, "price": 1248, "image": "equipment_1721.jpg" },
  { "id": 1747, "name": "极影·星泉", "type": 7, "price": 1248, "image": "equipment_1747.jpg" },
  { "id": 1723, "name": "极影·奔狼", "type": 7, "price": 1248, "image": "equipment_1723.jpg" },
  { "id": 1737, "name": "极影·形昭", "type": 7, "price": 1248, "image": "equipment_1737.jpg" },
  { "id": 1724, "name": "近卫·救赎", "type": 7, "price": 1248, "image": "equipment_1724.jpg" },
  { "id": 1725, "name": "近卫·星泉", "type": 7, "price": 1248, "image": "equipment_1725.jpg" },
  { "id": 1753, "name": "近卫·奔狼", "type": 7, "price": 1248, "image": "equipment_1753.jpg" },
  { "id": 1754, "name": "近卫·形昭", "type": 7, "price": 1248, "image": "equipment_1754.jpg" },
  { "id": 1317, "name": "急速铠甲", "type": 3, "price": 480, "image": "equipment_1317.jpg" },
  { "id": 1217, "name": "秘法残页", "type": 2, "price": 180, "image": "" },
  { "id": 11110, "name": "附魔之羽", "type": 1, "price": 180, "image": "" },
  { "id": 1218, "name": "元流结晶", "type": 2, "price": 180, "image": "" },
  { "id": 13212, "name": "天地石", "type": 3, "price": 480, "image": "" },
  { "id": 11211, "name": "精钢锻刀", "type": 1, "price": 270, "image": "" },
  { "id": 13211, "name": "玛瑙护心镜", "type": 3, "price": 480, "image": "" },
  { "id": 22011, "name": "雌雄·双股", "type": 1, "price": 824, "image": "" },
  { "id": 22012, "name": "尚武·青釭", "type": 3, "price": 824, "image": "" },
  { "id": 22013, "name": "玄铁·古锭", "type": 1, "price": 824, "image": "" },
  { "id": 22014, "name": "传国·玉玺", "type": 3, "price": 1016, "image": "" },
  { "id": 22016, "name": "蜀·节杖", "type": 1, "price": 480, "image": "" },
  { "id": 22017, "name": "魏·虎符", "type": 3, "price": 480, "image": "" },
  { "id": 22018, "name": "吴·令牌", "type": 1, "price": 480, "image": "" }
];

// 计算字符串相似度（Levenshtein距离）
function calculateSimilarity(str1: string, str2: string): number {
  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;

  // 初始化矩阵
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // 计算编辑距离
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // 删除
          matrix[i][j - 1] + 1,     // 插入
          matrix[i - 1][j - 1] + 1  // 替换
        );
      }
    }
  }

  // 计算相似度（0-1之间，1表示完全相同）
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : (maxLen - matrix[len1][len2]) / maxLen;
}

// 模糊匹配装备
export function findEquipmentByName(equipmentName: string): Equipment | null {
  if (!equipmentName) return null;

  let bestMatch: Equipment | null = null;
  let bestScore = 0;
  const threshold = 0.6; // 相似度阈值

  for (const equipment of equipmentData) {
    // 计算相似度
    const similarity = calculateSimilarity(equipmentName, equipment.name);
    
    // 如果相似度超过阈值且比当前最佳匹配更好
    if (similarity > threshold && similarity > bestScore) {
      bestScore = similarity;
      bestMatch = equipment;
    }
  }

  return bestMatch;
}

// 获取装备图片URL
export async function getEquipmentImageUrl(equipmentName: string): Promise<string> {
  const equipment = findEquipmentByName(equipmentName);
  
  if (equipment && equipment.image) {
    try {
      // 构建云存储路径
      const cloudPath = `cloud://cloudbase-1gk9t6w2d1d090af.636c-cloudbase-1gk9t6w2d1d090af-1371508497/images/equipment/${equipment.image}`;
      
      // 获取临时URL
      const tempURLs = await wx.cloud.getTempFileURL({
        fileList: [cloudPath]
      });

      if (tempURLs.fileList && tempURLs.fileList[0] && tempURLs.fileList[0].tempFileURL) {
        return tempURLs.fileList[0].tempFileURL;
      }
    } catch (error) {
      console.error('获取装备图片失败:', error);
    }
  }

  // 如果匹配失败或获取图片失败，返回默认图片
  return '../images/unused/default-avatar.png';
}

import { equipmentCache } from './equipmentCache';

// 批量处理装备列表
export async function processEquipmentList(equipmentList: any[]): Promise<any[]> {
  if (!equipmentList || equipmentList.length === 0) {
    return [];
  }

  // 批量获取所有装备的图片URL
  const equipmentNames = equipmentList.map(equipment => equipment.name);
  const imageUrls = await equipmentCache.getEquipmentImageUrls(equipmentNames);
  
  const processedList = [];
  
  for (const equipment of equipmentList) {
    const processedEquipment = { ...equipment };
    
    // 查找装备信息
    const foundEquipment = findEquipmentByName(equipment.name);
    if (foundEquipment) {
      processedEquipment.equipmentInfo = foundEquipment;
    }
    
    // 使用缓存的图片URL
    processedEquipment.imageUrl = imageUrls[equipment.name] || '../images/unused/default-avatar.png';
    
    processedList.push(processedEquipment);
  }
  
  return processedList;
} 