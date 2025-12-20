import fs from 'fs';
import path from 'path';

// 读取db.json文件
const dbPath = path.join(__dirname, '..', 'public', 'data', 'db.json');
const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// 清理数据的函数
function cleanDbData(data) {
  return data.map((category) => {
    // 删除分类中的icon字段（如果为空字符串）
    const cleanedCategory = { ...category };
    if (cleanedCategory.icon === '') {
      delete cleanedCategory.icon;
    }

    // 清理分类中的网站数据
    cleanedCategory.nav = cleanedCategory.nav.map((website) => {
      const cleanedWebsite = { ...website };

      // 删除空的tags数组
      if (
        Array.isArray(cleanedWebsite.tags) &&
        cleanedWebsite.tags.length === 0
      ) {
        delete cleanedWebsite.tags;
      }

      // 删除默认的rate值（5）
      if (cleanedWebsite.rate === 5) {
        delete cleanedWebsite.rate;
      }

      // 删除默认的top值（false）
      if (cleanedWebsite.top === false) {
        delete cleanedWebsite.top;
      }

      // 删除默认的ownVisible值（false）
      if (cleanedWebsite.ownVisible === false) {
        delete cleanedWebsite.ownVisible;
      }

      // 删除空的topTypes数组
      if (
        Array.isArray(cleanedWebsite.topTypes) &&
        cleanedWebsite.topTypes.length === 0
      ) {
        delete cleanedWebsite.topTypes;
      }

      return cleanedWebsite;
    });

    return cleanedCategory;
  });
}

// 清理数据
const cleanedData = cleanDbData(dbData);

// 写入清理后的数据
fs.writeFileSync(dbPath, JSON.stringify(cleanedData, null, 2), 'utf8');

console.log('db.json 清理完成！');
