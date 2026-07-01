export const RENAME_SCHEME_TEMPLATE = (savePath: string = '') => `// 方案将保存到：${savePath || '（未知路径）'}
// 使用 JavaScript 编写重命名逻辑。
// 可用参数：
//   file  - 当前文件对象：{ name, ext, path, isDir, size }
//   index - 当前文件在列表中的索引
//   files - 全部文件数组
// 返回值：新的文件名（不含扩展名），系统会自动追加扩展名。
function rename(file, index, files) {
  let result = file.name;
  return result;
}`
