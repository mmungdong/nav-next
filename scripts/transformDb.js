const fs = require('fs');
const path = require('path');

// 读取原始db.json文件
const inputFile = path.join(__dirname, '../public/data/db.json');
const outputFile = path.join(__dirname, '../public/data/transformed_db.json');

// 读取数据
const rawData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// 转换函数：将四层结构转换为两层结构
const transformCategories = (rawData) => {
  return rawData.map(category => {
    // 第一层分类
    const websites = [];

    // 遍历第二层分类
    if (category.nav && Array.isArray(category.nav)) {
      category.nav.forEach(subCategory => {
        // 遍历第三层分类
        if (subCategory.nav && Array.isArray(subCategory.nav)) {
          subCategory.nav.forEach(subSubCategory => {
            // 获取第四层网站数据
            if (subSubCategory.nav && Array.isArray(subSubCategory.nav)) {
              subSubCategory.nav.forEach(website => {
                websites.push({
                  id: website.id,
                  name: website.name || website.title || '未知网站',
                  desc: website.desc || '',
                  url: website.url || '',
                  icon: website.icon || '',
                  tags: website.tags || [],
                  rate: website.rate || 0,
                  top: website.top || false,
                  ownVisible: website.ownVisible || false,
                  ...website // 保留其他字段
                });
              });
            }
          });
        }
      });
    }

    return {
      id: category.id,
      title: category.title || category.name || '未知分类',
      icon: category.icon || '',
      nav: websites
    };
  });
};

// 转换数据
const transformedData = transformCategories(rawData);

// 写入新文件
fs.writeFileSync(outputFile, JSON.stringify(transformedData, null, 2), 'utf8');

console.log('数据转换完成！');
console.log(`输入文件: ${inputFile}`);
console.log(`输出文件: ${outputFile}`);
console.log(`转换后的分类数量: ${transformedData.length}`);

// 显示转换后的数据结构示例
console.log('\n转换后的数据结构示例:');
transformedData.slice(0, 2).forEach((category, index) => {
  console.log(`\n分类 ${index + 1}:`);
  console.log(`  ID: ${category.id}`);
  console.log(`  标题: ${category.title}`);
  console.log(`  图标: ${category.icon}`);
  console.log(`  网站数量: ${category.nav.length}`);
  if (category.nav.length > 0) {
    console.log(`  前3个网站:`);
    category.nav.slice(0, 3).forEach((website, webIndex) => {
      console.log(`    ${webIndex + 1}. ${website.name} - ${website.url}`);
    });
  }
});