module.exports = {
  ...require('mwts/.prettierrc.json'),
  printWidth: 200,       // 一行最多 300 字符
  singleQuote: true,
  endOfLine: "lf",        // 换行符使用 lf
  semi: true,             // 行尾需要有分号
  proseWrap: "preserve",  // 使用默认的折行标准
}
