import { useContext, useEffect, useState } from "react";
import { PlaygroundContext } from "../../PlaygroundContext";
import { compile } from "./compiler";

import iframeRaw from "./iframe.html?raw";
import { IMPORT_MAP_FILE_NAME } from "../../files";

/**
 * Preview 组件负责编译用户代码并在 iframe 中展示实时预览。
 */
export default function Preview() {
  const { files } = useContext(PlaygroundContext);
  const [compiledCode, setCompiledCode] = useState("");
  const [iframeUrl, setIframeUrl] = useState("");

  useEffect(() => {
    const res = compile(files);
    setCompiledCode(res);
  }, [files]);

  // 函数：生成 iframe 的 HTML 内容并为其创建一个 Blob URL
  const getIframeUrl = () => {
    // 1. 准备 iframe 的 HTML 内容
    const res = iframeRaw // iframeRaw 是从 iframe.html 导入的 HTML 模板字符串
      .replace(
        // 替换操作 1: 注入 import map
        '<script type="importmap"></script>', // 查找模板中 import map 的占位符
        // 动态生成 import map script 标签。
        // files[IMPORT_MAP_FILE_NAME]?.value 获取 import-map.json 文件的内容。
        // ?.value 是可选链，如果文件不存在或 value 为空，则使用 || "{}" 作为备选（一个空的 JSON 对象）。
        `<script type="importmap">${
          files[IMPORT_MAP_FILE_NAME]?.value || "{}"
        }</script>`
      )
      .replace(
        // 替换操作 2: 注入编译后的用户代码
        '<script type="module" id="appSrc"></script>', // 查找模板中用户代码的占位符
        // 动态生成模块脚本标签，其中包含编译后的 JavaScript 代码 (compiledCode)。
        `<script type="module" id="appSrc">${compiledCode}</script>`
      );

    // 2. 内存管理：释放旧的 Blob URL
    // 如果之前已经生成过 iframeUrl (即 iframeUrl 变量有值),
    // 调用 URL.revokeObjectURL() 来释放它占用的内存资源，防止内存泄漏。
    if (iframeUrl) {
      URL.revokeObjectURL(iframeUrl);
    }

    // 3. 创建新的 Blob URL
    // 使用生成的 HTML 内容 (res) 创建一个新的 Blob 对象，指定其类型为 'text/html'。
    // URL.createObjectURL() 会为这个 Blob 对象生成一个临时的、唯一的 URL。
    // 这个 URL 可以被用作 iframe 的 src 属性。
    return URL.createObjectURL(new Blob([res], { type: "text/html" }));
  };

  // React Hook: useEffect 用于处理副作用
  // 当依赖项数组中的值发生变化时，此 effect 将被重新执行。
  useEffect(() => {
    // 1. 条件检查：确保必要数据已准备就绪
    // 只有当 import-map.json 文件存在于 files 对象中 (files[IMPORT_MAP_FILE_NAME] 为真)
    // 并且 compiledCode (编译后的代码) 也有值时，才执行后续操作。
    // 这是为了防止在数据不完整的情况下生成无效的 iframe 内容。
    if (files[IMPORT_MAP_FILE_NAME] && compiledCode) {
      // 2. 更新 iframe URL
      // 调用 getIframeUrl() 函数获取新生成的 iframe URL。
      const newUrl = getIframeUrl();
      // 使用 setIframeUrl 更新组件的 state，这将触发 iframe 的 src 属性更新，从而刷新预览。
      setIframeUrl(newUrl);
    }

    // 3. 清理函数 (Cleanup Function)
    // 此函数会在以下情况被调用：
    //   a. 组件卸载 (unmount) 时。
    //   b. 在下一次 effect 执行之前 (如果依赖项发生变化导致 effect 重新运行)。
    // 主要目的是进行资源清理，防止内存泄漏。
    return () => {
      // 如果 iframeUrl 存在，则释放它。
      if (iframeUrl) {
        URL.revokeObjectURL(iframeUrl);
      }
    };
    // 依赖项数组:
    // 当 files[IMPORT_MAP_FILE_NAME]?.value (import map 的内容) 或 compiledCode (编译后的代码) 发生变化时，
    // 此 useEffect 会重新执行。
    // 使用 ?.value 是为了确保只有在 import map 的实际内容变化时才触发，而不仅仅是文件对象引用的变化。
  }, [files[IMPORT_MAP_FILE_NAME]?.value, compiledCode]);

  useEffect(() => {
    if (files[IMPORT_MAP_FILE_NAME] && compiledCode) {
      const newUrl = getIframeUrl();
      setIframeUrl(newUrl);
    }

    return () => {
      if (iframeUrl) {
        URL.revokeObjectURL(iframeUrl);
      }
    };
  }, [files[IMPORT_MAP_FILE_NAME]?.value, compiledCode]);

  return (
    <div style={{ height: "100%" }}>
      <iframe
        src={iframeUrl}
        style={{
          width: "100%",
          height: "100%",
          padding: 0,
          border: "none",
        }}
        sandbox="allow-scripts allow-same-origin"
        title="Preview"
      />
      {/* <Editor file={{
      name: 'dist.js',
      value: compiledCode,
      language: 'javascript'
  }}/> */}
    </div>
  );
}
