import { transform } from "@babel/standalone";
import type { Files } from "../../PlaygroundContext";
import { ENTRY_FILE_NAME } from "../../files";
import type { PluginObj } from "@babel/core";

/**
 * 在Babel转换代码之前进行预处理。
 * 主要用于为JSX/TSX文件自动添加 React的导入语句，如果尚未导入的话。
 * @param filename 文件名
 * @param code 原始代码字符串
 * @returns 处理后的代码字符串
 */
export const beforeTransformCode = (filename: string, code: string) => {
  // 默认使用原始代码
  let _code = code;
  // 定义一个正则表达式，用于检测代码中是否已经导入了 React
  // \s+ 匹配一个或多个空白字符
  // g 表示全局匹配
  const regexReact = /import\s+React/g;
  // 检查文件是否以 .jsx 或 .tsx 结尾，并且代码中没有导入 React
  if (
    (filename.endsWith(".jsx") || filename.endsWith(".tsx")) &&
    !regexReact.test(code)
  ) {
    // 如果满足条件，则在代码开头添加 React 的导入语句
    // \n 用于换行，确保导入语句在新的一行
    _code = `import React from 'react';\n${code}`;
  }
  // 返回处理后（可能被修改）的代码
  return _code;
};
/**
 * 使用 Babel 转换单个文件
 * @param filename 文件名
 * @param code 文件代码
 * @param files 所有文件的映射对象
 * @returns 编译后的 JavaScript 代码，如果出错则为空字符串
 * 
 * babelTransform 函数是编译过程的核心。
 * 它使用 @babel/standalone 配合 presets: ["react", "typescript"] 
 * 来将 JSX 和 TypeScript 转换为纯 JavaScript。

 */

export const babelTransform = (
  filename: string,
  code: string,
  files: Files
) => {
  const _code = beforeTransformCode(filename, code);
  let result = "";
  try {
    // 调用 Babel 的 transform API
    result = transform(_code, {
      // 预设：启用 react (JSX) 和 typescript 语法转换
      presets: ["react", "typescript"],
      // 文件名：用于错误报告和 sourcemap
      filename,
      // 插件：应用自定义的模块解析器
      plugins: [customResolver(files)],
      // 尝试保留原始行号，便于调试
      retainLines: true,
    }).code!; // 获取编译后的代码，使用非空断言 (!) 因为我们期望总是有代码或错误
  } catch (e) {
    // 捕获并打印编译错误
    console.error("编译出错 in", filename, e);
  }
  return result;
};

/**
 * 根据模块路径从文件列表中获取对应的文件对象
 * @param files 所有文件的映射对象
 * @param modulePath 模块导入路径 (e.g., './utils', './styles.css')
 * @returns 找到的文件对象，如果找不到则为 undefined
 * getModuleFile函数不仅仅是返回文件名，而是返回了files对象中对应的完整文件对象
 * 返回完整文件对象：函数最终返回的是files[moduleName]，这是一个文件对象，包含了文件的各种属性，比如：
 * name：文件名
 * value：文件内容（代码）
 * language：文件类型（js,ts,jsx,tsx,css,json）
 */
const getModuleFile = (
  files: Files,
  modulePath: string
): Files[string] | undefined => {
  // 移除 './' 前缀
  let moduleName = modulePath.split("./").pop() || "";
  // 如果模块名不包含 '.'，说明可能省略了扩展名
  if (!moduleName.includes(".")) {
    // 查找可能的实际文件名 (ts, tsx, js, jsx)
    const realModuleName = Object.keys(files)
      .filter(key => {
        // 只考虑这几种脚本文件扩展名
        return (
          key.endsWith(".ts") ||
          key.endsWith(".tsx") ||
          key.endsWith(".js") ||
          key.endsWith(".jsx")
        );
      })
      .find(key => {
        // 检查文件名去除扩展名后是否与模块名匹配
        return key.split(".").slice(0, -1).join(".") === moduleName;
      });
    // 如果找到了匹配的文件名，更新 moduleName
    if (realModuleName) {
      moduleName = realModuleName;
    }
    // 如果仍然没有找到，或者原始 moduleName 就带有扩展名，直接使用
  }
  return files[moduleName];
};

/**
 * 将 JSON 文件内容转换为一个导出默认对象的 JavaScript 模块的 Blob URL
 * @param file JSON 文件对象
 * @returns 表示该 JS 模块的 Blob URL
 */
const json2Js = (file: Files[string]): string => {
  // 创建一个导出 JSON 内容的 JS 字符串
  const js = `export default ${file.value}`;
  // 创建一个 JS 类型的 Blob
  const blob = new Blob([js], { type: "application/javascript" });
  // 为 Blob 创建一个 URL
  return URL.createObjectURL(blob);
};

/**
 * 将 CSS 文件内容转换为一个动态注入 <style> 标签的 JavaScript 模块的 Blob URL
 * @param file CSS 文件对象
 * @returns 表示该 JS 模块的 Blob URL
 */
const css2Js = (file: Files[string]): string => {
  // 使用时间戳和文件名生成一个唯一的 ID
  const randomId = new Date().getTime();
  // 创建一个立即执行函数 (IIFE) 的 JS 字符串
  const js = `
(() => {
    // 创建一个新的 <style> 元素
    const stylesheet = document.createElement('style');
    // 设置一个唯一的 ID 属性，方便识别和管理
    stylesheet.setAttribute('id', 'style_${randomId}_${file.name}');
    // 将 <style> 元素添加到文档的 <head> 中
    document.head.appendChild(stylesheet);

    // 创建包含 CSS 内容的文本节点
    const styles = document.createTextNode(\`${file.value}\`);
    // 清空样式表内容（以防万一）
    stylesheet.innerHTML = '';
    // 将 CSS 文本节点添加到 <style> 元素中
    stylesheet.appendChild(styles);
})()
    `;
  // 创建一个 JS 类型的 Blob
  const blob = new Blob([js], { type: "application/javascript" });
  // 为 Blob 创建一个 URL
  return URL.createObjectURL(blob);
};

/**
 * 自定义 Babel 插件，用于解析本地模块导入
 * @param files 所有文件的映射对象
 * @returns Babel 插件对象
 */
function customResolver(files: Files): PluginObj {
  return {
    visitor: {
      // 访问所有的 ImportDeclaration 节点 (import 语句)
      ImportDeclaration(path) {
        // 获取导入的模块路径 (e.g., './App', 'react')
        const modulePath = path.node.source.value;
        // 只处理本地相对路径导入 (以 '.' 开头)
        if (modulePath.startsWith(".")) {
          // 查找对应的文件
          const file = getModuleFile(files, modulePath);
          // 如果找不到文件，则不做处理
          if (!file) {
            console.warn(`无法找到模块: ${modulePath}`);
            return;
          }
          // 根据文件类型处理
          if (file.name.endsWith(".css")) {
            // 如果是 CSS 文件，将其转换为 JS 模块 URL 并替换原始路径
            path.node.source.value = css2Js(file);
          } else if (file.name.endsWith(".json")) {
            // 如果是 JSON 文件，将其转换为 JS 模块 URL 并替换原始路径
            path.node.source.value = json2Js(file);
          } else {
            // 否则，假定是 JS/TS/JSX 文件
            // 递归调用 babelTransform 编译该模块文件
            const compiledCode = babelTransform(file.name, file.value, files);
            // 创建包含编译后代码的 Blob URL
            const blob = new Blob([compiledCode], {
              type: "application/javascript",
            });
            const blobUrl = URL.createObjectURL(blob);
            // 用 Blob URL 替换原始导入路径
            path.node.source.value = blobUrl;
          }
        }
      },
    },
  };
}

/**
 * 编译整个项目入口文件及其依赖
 * @param files 所有文件的映射对象
 * @returns 编译后的入口文件的 JavaScript 代码
 */
export const compile = (files: Files): string => {
  // 获取入口文件对象
  const main = files[ENTRY_FILE_NAME];
  if (!main) {
    console.error(`入口文件 ${ENTRY_FILE_NAME} 未找到!`);
    return "";
  }
  // 调用 babelTransform 编译入口文件，这将触发依赖的递归编译
  return babelTransform(ENTRY_FILE_NAME, main.value, files);
};

/**
 * 监听来自主线程的消息。
 * 当主线程通过 postMessage 发送数据时，此事件监听器会被触发。
 * 'data' (解构自事件对象 event.data) 是主线程发送过来的实际数据，这里期望是 files 对象。
 */
self.addEventListener("message", async ({ data: filesToCompile }) => {
  try {
    // 调用原有的 compile 函数处理接收到的文件数据
    const compiledCode = compile(filesToCompile);

    // 将编译结果通过 postMessage 发送回主线程
    self.postMessage({
      type: "COMPILED_CODE", // 消息类型：表示编译成功
      data: compiledCode, // 编译后的代码字符串
    });
  } catch (e) {
    // 如果在编译过程中发生错误，捕获错误并将其发送回主线程
    self.postMessage({
      type: "ERROR", // 消息类型：表示发生错误
      error: e, // 错误对象
    });
  }
});
