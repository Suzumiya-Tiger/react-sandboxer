# 初期准备

## 1. 导入和工具函数

```ts
import React, { createContext, useState, type PropsWithChildren } from "react";
import { fileName2Language } from "./utils";
```

- `createContext`：用来创建一个 Context 实例，让组件树中的任意层级都能通过 `useContext` 访问同一份状态。
- `useState`：管理局部状态。
- `PropsWithChildren`：为 Provider 组件声明 props 类型时，让 `children` 可用而不需要手动定义。
- `fileName2Language`：前面讲过的函数，根据文件名后缀返回语言标识（`javascript`、`typescript`、`json`、`css` 等）。

------

## 2. 类型定义

```ts
export interface File {
  name: string;
  value: string;
  language: string;
}

export interface Files {
  [key: string]: File;
}
```

- `File`：表示一个文件标签（Tab）要存储的信息——
  - `name`：文件名（如 `"App.tsx"`）
  - `value`：文件内容（编辑器里的代码字符串）
  - `language`：语法高亮/三方库需要的语言标识（由 `fileName2Language` 得到）
- `Files`：用一个对象保存多份 `File`，键名就是 `File.name`，值是对应的 `File` 对象。

接着是 Playground Context 的整体接口：

```ts
export interface PlaygroundContext {
  files: Files;
  selectedFileName: string;
  setSelectedFileName: (fileName: string) => void;
  setFiles: (files: Files) => void;
  addFile: (fileName: string) => void;
  removeFile: (fileName: string) => void;
  updateFileName: (oldFieldName: string, newFieldName: string) => void;
}
```

- 这里定义了 Context 暴露给消费者（页面上用 `useContext(PlaygroundContext)` 的组件）的所有方法和属性：
  1. `files`：当前所有文件集合
  2. `selectedFileName`：哪个文件是「激活」状态（打开的 tab）
  3. `setSelectedFileName`：切换激活文件
  4. `setFiles`：直接重置整个文件集合
  5. `addFile` / `removeFile` / `updateFileName`：新增、删除、重命名文件

------

## 3. 创建 Context

```ts
export const PlaygroundContext = createContext<PlaygroundContext>({
  selectedFileName: "App.tsx",
} as PlaygroundContext);
```

这里给了一个「默认值」对象，只初始化了 `selectedFileName`。实际使用时，Provider 会覆盖掉这一份默认值。

------

## 4. Provider 组件

```tsx
export const PlaygroundProvider = (props: PropsWithChildren) => {
  const { children } = props;
  const [files, setFiles] = useState<Files>({});
  const [selectedFileName, setSelectedFileName] = useState<string>("App.tsx");
  // ...
  return (
    <PlaygroundContext.Provider value={/* ... */}>
      {children}
    </PlaygroundContext.Provider>
  );
};
```

- `files`：初始为空对象 `{}`，表示还没创建任何文件。
- `selectedFileName`：初始值 `"App.tsx"`，表示默认打开的标签。

### 4.1 增删改方法

#### `addFile`

```ts
const addFile = (name: string) => {
setFiles({ ...files, [name]: { name, value: "", language: fileName2Language(name) } });
};
```

- 以键 `files[name]` 新增一个空内容文件；
- `language` 由 `fileName2Language` 决定；
- 最后调用 `setFiles(files)`，触发重渲染。

> **Tip**：直接修改 `files` 对象再传给 `setFiles`，在某些情况下可能不会触发更新（相同引用），通常会拷贝一份更保险：
>
> ```ts
> setFiles({ ...files, [name]: { name, value: "", language: fileName2Language(name) } });
> ```

#### `removeFile`

```ts
const removeFile = (name: string) => {
  delete files[name];
  setFiles({ ...files });
};
```

- `delete` 掉指定键；
- 用 `{ ...files }` 创建新对象，确保 React 识别到状态变化。

#### `updateFileName`

```ts
const updateFileName = (oldFieldName: string, newFieldName: string) => {
  if (!files[oldFieldName] || newFieldName == null) return;

  const { [oldFieldName]: value, ...rest } = files;
  const newFile = {
    [newFieldName]: {
      ...value,
      languages: fileName2Language(newFieldName),
      name: newFieldName,
    },
  };
  setFiles({
    ...rest,
    ...newFile,
  });
};
```

- **校验**：确保 `oldFieldName` 存在且 `newFieldName` 不为 `null/undefined`。
- **解构重建**：
  1. 用解构 `{ [oldFieldName]: value, ...rest } = files` 拿到要改名的文件数据 `value`，其余文件放在 `rest`。
  2. 构造 `newFile`：给它新的键名 `newFieldName`，同时更新内部的 `name` 和 `language`（后缀可能变了）。
  3. `setFiles({ ...rest, ...newFile })`：合并其它文件和重命名后的新文件，完成更新。

------

## 5. 在组件树中使用

```tsx
//App.tsx
<PlaygroundProvider>
  {/* App 里任意位置，都能通过 useContext(PlaygroundContext) 拿到 files、addFile 等方法 */}
  <YourPlaygroundEditor />
</PlaygroundProvider>
```

- **播放台（Playground）** 里的任何子组件，只要调用：

  ```ts
  const { files, selectedFileName, addFile, removeFile, updateFileName } =
    useContext(PlaygroundContext);
  ```

  就能读写、增删改 `files`，以及切换当前打开的文件。

------

### 小结

1. **Context**：统一管理「文件集合 + 当前激活文件 + 一系列对文件的操作」；
2. **工具函数**：`fileName2Language` 用于根据后缀自动设置语法类型；
3. **Provider**：封装 `useState` 和增删改逻辑，通过 context 暴露给下游组件；
4. **使用场景**：在线 IDE、组件文档演示、代码沙箱等等，需要在不同组件之间共享和操作多份文件时非常方便。

在同一个文件中使用 createContext 创建 React context，然后定义一个 Provider 组件来提供 context 的值，有以下几个好处：

1. **组织性 (Colocation)：将 context 的定义和其 Provider 放在一起，使得代码更容易理解和维护。当你需要查找 context 的相关逻辑时，你知道去哪里找。**
2. **封装性 (Encapsulation)：Provider 组件可以封装 context 值的状态管理逻辑。例如，在代码中，PlaygroundProvider 组件内部使用了 useState 来管理 files 和 selectedFileName，以及相关的更新函数。这些实现细节对 context 的消费者是隐藏的。**
3. **易用性 (Usability)：消费者只需要导入 Provider 组件并将其包裹在需要访问 context 的组件树的顶层，然后通过 useContext Hook 来消费 context，非常方便。**

PlaygroundContext.tsx 文件就是一个很好的例子，它清晰地展示了这种模式：

- PlaygroundContext 是通过 createContext 创建的。

- PlaygroundProvider 是一个组件，它管理状态并通过 PlaygroundContext.Provider 将这些状态和更新函数提供给其子组件。

这种模式使得 context 的创建、管理和消费都非常清晰和模块化。



## fileName2Language

```typescript
export const fileName2Language = (name: string) => {
  const suffix = name.split(".").pop() || "";
  if (["js", "jsx"].includes(suffix)) return "javascript";
  if (["ts", "tsx"].includes(suffix)) return "typescript";
  if (["json"].includes(suffix)) return "json";
  if (["css"].includes(suffix)) return "css";
  return "javascript";
};

```

这段 TypeScript 代码定义了一个名为 `fileName2Language` 的箭头函数，用来根据文件名的后缀（扩展名）返回对应的语言标识。下面逐行说明它的逻辑：

```typescript
export const fileName2Language = (name: string) => {
```



- 使用 `export const` 导出一个常量函数，函数名为 `fileName2Language`，接收一个参数 `name`，类型是字符串（`string`）。

```ts
  const suffix = name.split(".").pop() || "";
```

先把文件名 `name` 按 “点号” `.` 分割成若干段（例如 `"index.tsx"` 会分成 `["index", "tsx"]`），然后取最后一段作为后缀（`pop()` 方法）。

如果分割结果是空数组（没有点号），`pop()` 会返回 `undefined`，此时通过 `|| ""` 把后缀设置为空字符串。

```typescript
  if (["js", "jsx"].includes(suffix)) return "javascript";
```

- 如果后缀是 `"js"` 或 `"jsx"`，函数返回 `"javascript"`。

```ts
if (["ts", "tsx"].includes(suffix)) return "typescript";
```

- 如果后缀是 `"ts"` 或 `"tsx"`，函数返回 `"typescript"`。

```ts
if (["json"].includes(suffix)) return "json";
```

- 如果后缀是 `"json"`，函数返回 `"json"`。

```ts
if (["css"].includes(suffix)) return "css";
```

- 如果后缀是 `"css"`，函数返回 `"css"`。

```ts
 return "javascript";
};
```

- 如果以上条件都不满足（比如后缀是 `"html"`、`"md"` 或没有后缀），默认返回 `"javascript"`。

------

**总结**：

- 这个函数的作用是把一个文件名（带后缀）映射到一个简单的语言标识字符串，用于后续根据文件类型执行不同处理（比如语法高亮、编译流程判断等）。
- 支持识别的后缀及其返回值：
  - `.js`, `.jsx` → `"javascript"`
  - `.ts`, `.tsx` → `"typescript"`
  - `.json` → `"json"`
  - `.css` → `"css"`
  - 其他情况 → 默认 `"javascript"`。



# context的初始化和应用

## 生成初始化文件内容

我们需要为初始化的代码模板创建对应的文件，文件如下:
files.ts:

```typescript
import { Files } from "./PlaygroundContext";
import importMap from "./template/import-map.json?raw";
import AppCss from "./template/App.css?raw";
import App from "./template/App.tsx?raw";
import main from "./template/main.tsx?raw";
import { fileName2Language } from "./utils";


export const APP_COMPONENT_FILE_NAME = "App.tsx";

export const IMPORT_MAP_FILE_NAME = "import-map.json";

export const ENTRY_FILE_NAME = "main.tsx";

export const initFiles: Files = {
  [ENTRY_FILE_NAME]: {
    name: ENTRY_FILE_NAME,
    language: fileName2Language(ENTRY_FILE_NAME),
    value: main,
  },
  [APP_COMPONENT_FILE_NAME]: {
    name: APP_COMPONENT_FILE_NAME,
    language: fileName2Language(APP_COMPONENT_FILE_NAME),
    value: App,
  },
  "App.css": {
    name: "App.css",
    language: "css",
    value: AppCss,
  },
  [IMPORT_MAP_FILE_NAME]: {
    name: IMPORT_MAP_FILE_NAME,
    language: fileName2Language(IMPORT_MAP_FILE_NAME),
    value: importMap,
  },
};

```

#### 为什么要在后面加 ?raw？

在 src/ReactPlayground/files.ts 文件中，我们看到类似这样的导入语句：

```typescript
import importMap from "./template/import-map.json?raw";
import AppCss from "./template/App.css?raw";
import App from "./template/App.tsx?raw";
import main from "./template/main.tsx?raw";
```

这里的 ?raw 后缀是 Vite (一个前端构建工具) 或类似构建工具提供的一个特殊功能。

它的作用是告诉构建工具将目标文件作为原始文本字符串导入，而不是尝试像处理 JavaScript模块、CSS模块或 JSON对象那样去解析或处理它。

例如，`import AppCss from "./template/App.css?raw";` 这行代码执行后，AppCss 这个变量的值就会是 App.css 文件的完整内容的字符串形式。这对于需要直接访问文件原始内容的场景非常有用，比如在这个演练场中，我们需要将这些模板文件的内容作为初始值填充到编辑器中。

#### 请详细讲解一下 src/ReactPlayground/files.ts 文件的实现目的，并结合 @template 目录和 PlaygroundContext.tsx 进行说明。

src/ReactPlayground/files.ts 文件、@template 目录 (即 src/ReactPlayground/template/) 以及 src/ReactPlayground/PlaygroundContext.tsx 文件共同协作，构成了代码演练场初始文件加载和管理的基础。

a. @template 目录 (例如：src/ReactPlayground/template/)

- 目的：这个目录存放了代码演练场启动时默认加载的一组模板文件。这些文件是用户在演练场中看到的初始代码。

- 内容：根据你提供的列表，它包含了：

- import-map.json：通常用于浏览器原生 ES模块，定义模块的导入映射。

- main.tsx：React 应用的入口文件。

- App.css：App 组件的样式文件。

- App.tsx：一个示例 React 组件，通常是演练场的主要展示组件。

b. src/ReactPlayground/files.ts 文件

- 目的：该文件的核心目的是加载 @template 目录中的模板文件内容，并将它们构造成 PlaygroundContext 所需的初始文件状态结构 (initFiles)。

- 实现细节：

1. 导入原始文件内容：

```typescript
        import importMap from "./template/import-map.json?raw";
        import AppCss from "./template/App.css?raw";
        import App from "./template/App.tsx?raw";
        import main from "./template/main.tsx?raw";
```

如第2点所述，使用 ?raw 后缀将这些模板文件的内容作为字符串导入到各个变量中（importMap, AppCss, App, main）。

2. 定义文件结构：

它依赖于 PlaygroundContext.tsx 中定义的 File 和 Files 接口：

```typescript
        export interface File {
          name: string;
          value: string; // 文件内容字符串
          language: string;
        }

        export interface Files {
          [key: string]: File; // 文件名作为键
        }
```

3. 定义常量文件名：

```typescript
        export const APP_COMPONENT_FILE_NAME = "App.tsx";
        export const IMPORT_MAP_FILE_NAME = "import-map.json";
        export const ENTRY_FILE_NAME = "main.tsx";
```

这些常量方便在代码中引用特定的文件名。

4. 创建初始文件对象 initFiles：

   ```typescript
           export const initFiles: Files = {
             [ENTRY_FILE_NAME]: {
               name: ENTRY_FILE_NAME,
               language: fileName2Language(ENTRY_FILE_NAME), // 根据文件名后缀判断语言
               value: main, // 之前导入的 main.tsx 文件内容字符串
             },
             [APP_COMPONENT_FILE_NAME]: {
               name: APP_COMPONENT_FILE_NAME,
               language: fileName2Language(APP_COMPONENT_FILE_NAME),
               value: App, // App.tsx 文件内容字符串
             },
             "App.css": {
               name: "App.css",
               language: "css",
               value: AppCss, // App.css 文件内容字符串
             },
             [IMPORT_MAP_FILE_NAME]: {
               name: IMPORT_MAP_FILE_NAME,
               language: fileName2Language(IMPORT_MAP_FILE_NAME),
               value: importMap, // import-map.json 文件内容字符串
             },
           };
   ```

这里，initFiles 对象被构建出来。它的键是文件名，值是一个 File 对象，包含了文件名 (name)、从文件名推断出的语言类型 (language，通过 fileName2Language 工具函数实现)，以及通过 ?raw 导入的文件原始内容 (value)。

c. src/ReactPlayground/PlaygroundContext.tsx 文件如何使用 files.ts

- 目的：PlaygroundContext.tsx 利用 files.ts 提供的 initFiles 来初始化演练场的文件状态。

- 实现细节：

```typescript
    // PlaygroundContext.tsx
    import { initFiles } from "./files"; // 从 files.ts 导入 initFiles
    // ...
    export const PlaygroundProvider = (props: PropsWithChildren) => {
      // ...
      // 使用 initFiles 作为 files 状态的初始值
      const [files, setFiles] = useState<Files>(initFiles);
      const [selectedFileName, setSelectedFileName] = useState<string>("App.tsx"); // 默认选中 App.tsx
      // ...
    };
```

在 PlaygroundProvider 组件中，useState<Files>(initFiles) 这行代码意味着当 PlaygroundProvider 首次渲染时，它内部管理的 files 状态会被初始化为 files.ts 中定义的 initFiles。

总结关系：

1. @template 目录：提供原始的、作为演练场起点的代码文件。
2. src/ReactPlayground/files.ts：扮演“数据准备者”的角色。它读取 @template 目录中的文件内容，将这些内容格式化成应用程序（特别是 PlaygroundContext）能够理解和使用的结构 (initFiles)。
3. src/ReactPlayground/PlaygroundContext.tsx：扮演“状态管理者”的角色。它使用 files.ts 准备好的 initFiles作为其文件状态的初始数据，并提供了一系列方法来在用户与演练场交互时修改这些文件数据（如添加、删除、重命名文件，修改文件内容等）。

通过这种方式，演练场在加载时就能拥有一套预设的文件和代码，用户可以直接在此基础上进行学习和实验。



# 编辑器和预览区

## 实时编译

我们来看compiler.ts的实现：
```ts
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

```

这个文件的核心作用是在 React Playground 环境中 动态编译和处理用户输入的代码。它使得用户可以在 Playground 中编写包含 React、TypeScript、CSS 和 JSON 的代码，并将这些代码实时转换成浏览器可以执行的 JavaScript。

具体来说，它利用 Babel (通过 @babel/standalone) 将 JSX 和 TypeScript 语法转换为普通的 JavaScript。更重要的是，它实现了一个自定义的 Babel 插件 (customResolver) 来处理项目内部的模块导入（例如 import App from './App'）。这个插件能够识别不同类型的文件（.ts, .tsx, .js, .jsx, .css, .json），并将它们转换成浏览器可以通过 Blob URL 加载的 JavaScript 模块。这样就模拟了一个简单的模块打包器的功能，让用户可以在 Playground 中组织和导入不同的代码文件。

主要函数讲解:

0. beforeTransformCode

- 这个函数的作用是在Babel正式转换代码之前，对代码进行一些预处理。
- 具体来说，它会检查文件是否为JSX或TSX文件，并且是否已经导入了React。
- 如果是一个JSX/TSX文件但没有导入React，它会自动在代码的开头添加 import React from 'react';。
- 这是因为JSX语法在编译后会转换成 React.createElement 的调用，所以必须有React的引入。

1. babelTransform(filename, code, files):

- 这是核心的编译函数。它接收文件名、代码字符串和所有文件对象 (files) 作为输入。

- 使用 Babel 的 transform 方法进行编译。

- 预设 (presets) 配置为支持 react (JSX) 和 typescript。

- filename 参数用于 Babel 的错误信息和 sourcemap 生成。

- plugins: 应用了 customResolver 插件来处理本地模块导入。

- retainLines: true: 尝试在转换后保留原始行号，方便调试。

- 如果编译成功，返回转换后的 JavaScript 代码；如果出错，会在控制台打印错误并返回空字符串。

2. customResolver(files):

- 这是一个 Babel 插件，专门用于解析 ImportDeclaration（即 import ... from ... 语句）。

- 它检查导入路径 (modulePath) 是否以 . 开头，表示这是一个本地模块导入。

- 调用 getModuleFile 查找对应的文件。

- 根据找到的文件的扩展名：

- .css: 调用 css2Js 将 CSS 文件转换为一个动态注入 <style> 标签的 JS 模块，并用生成的 Blob URL 替换原始导入路径。

- .json: 调用 json2Js 将 JSON 文件转换为一个导出 JSON 内容的 JS 模块，并用生成的 Blob URL 替换原始导入路径。

- 其他 ( .ts, .tsx, .js, .jsx): 递归调用 babelTransform 编译这个模块文件，将编译结果包装成 Blob URL，并用这个 URL 替换原始导入路径。这实现了模块的按需编译和加载。

3. getModuleFile(files, modulePath):

- 根据导入路径 (modulePath) 在 files 对象中查找对应的文件。

- 它处理了导入路径中可能省略文件扩展名的情况。它会查找 .ts, .tsx, .js, .jsx 后缀的文件名，看哪个文件的基本名（去掉后缀）与导入路径匹配。

4. json2Js(file):

- 接收一个文件对象（包含 name 和 value）。

- 将 JSON 文件的内容 (file.value) 包装在一个 export default ... 语句中，形成一个有效的 JavaScript 模块。

- 使用 Blob 创建一个包含这个 JS 代码的对象，类型为 application/javascript。

- 使用 URL.createObjectURL 为这个 Blob 创建一个临时的 URL，可以被 import 语句加载。

4. css2Js(file):

- 接收一个 CSS 文件对象。

- 创建一个立即执行函数 (IIFE)，该函数会在执行时：

- 创建一个 <style> 元素，并为其分配一个唯一的 ID (基于时间戳和文件名)。

- 将 <style> 元素添加到文档的 <head> 中。

- 将 CSS 文件内容 (file.value) 作为文本节点添加到 <style> 元素中，从而将样式应用到页面。

- 同样使用 Blob 和 URL.createObjectURL 创建一个可供 import 加载的 JS 模块 URL。

5. compile(files):

- 这是编译过程的入口函数。

- 它获取入口文件 (ENTRY_FILE_NAME，通常是 App.tsx 或类似文件)。

- 调用 babelTransform 来编译入口文件，这会触发整个依赖图的递归编译（通过 customResolver 处理 import）。

- 返回最终编译完成的入口文件的 JavaScript 代码。



## 预览代码

Previrew/index.tsx

```typescript
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

```

iframe.html

```html
<!doctype html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>
</head>

<body>
  <script type="importmap"></script>
  <script type="module" id="appSrc"></script>
  <div id="root"></div>
</body>

</html>
```

### 原理讲解

1. getIframeUrl 函数:

- 动态构建 HTML: 此函数的核心任务是动态地创建一个完整的 HTML 文档字符串。它首先获取一个基础的 HTML 模板 (iframeRaw)，然后通过字符串替换操作，将两个关键部分注入到这个模板中：

- Import Map: <script type="importmap">...</script> 标签内的内容被替换为实际的 import map JSON。这个 JSON 定义了如何在运行时解析模块导入（例如，将 import React from 'react' 解析为从特定 CDN URL 加载 React）。代码 files[IMPORT_MAP_FILE_NAME]?.value || "{}" 确保即使 import-map.json 文件不存在或内容为空，也会插入一个有效的（空的）JSON 对象，避免 HTML 结构错误。

- 编译后的应用代码: <script type="module" id="appSrc">...</script> 标签内的内容被替换为 compiledCode，这是用户在编辑器中编写的 React/JSX 代码经过编译后生成的纯 JavaScript 代码。

- Blob URL 创建与管理:

- 释放旧 URL: 在创建新的 Blob URL 之前，if (iframeUrl) { URL.revokeObjectURL(iframeUrl); } 这段代码非常重要。URL.createObjectURL() 创建的 URL 是临时的，并且会占用内存。如果不及时释放，反复生成新的 URL 会导致内存泄漏。因此，这里会先释放掉上一次生成的 iframeUrl。

- 创建新 URL: URL.createObjectURL(new Blob([res], { type: "text/html" })) 将构建好的 HTML 字符串 (res) 包装成一个 Blob 对象（可以看作是一块二进制数据），然后为这个 Blob 创建一个临时的 URL。这个 URL 类似于 blob:http://localhost:3000/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx，可以直接用作 iframe 的 src。

2. useEffect Hook:

- 响应式更新: 这个 useEffect 负责在关键数据发生变化时更新 iframe 的预览。它的依赖项是 files[IMPORT_MAP_FILE_NAME]?.value (import map 的内容) 和 compiledCode (编译后的用户代码)。这意味着：

- 如果用户修改了导致 import-map.json 内容变化的代码（虽然在这个场景下 import-map.json 通常是固定的，但依赖其 value 是更精确的做法）。

- 或者，如果用户修改了任何参与编译的源文件，导致 compiledCode 发生变化。

这个 useEffect 就会重新执行。

- 条件执行: if (files[IMPORT_MAP_FILE_NAME] && compiledCode) 确保只有在 import map 文件数据和编译后的代码都准备好的情况下，才会调用 getIframeUrl() 并更新 iframeUrl 状态。这避免了在数据不完整时尝试渲染 iframe。

- 清理机制: useEffect 返回的函数是一个清理函数。

- 它会在组件被销毁（卸载）时执行。

- 也会在下一次 useEffect 因依赖变化而重新运行之前执行。

这里的清理操作 URL.revokeObjectURL(iframeUrl) 同样是为了释放不再使用的 Blob URL，防止内存泄漏。当 iframeUrl 即将被一个新的 URL 替换，或者组件不再需要这个 iframe 时，对应的 Blob 资源应当被浏览器回收。

3. iframeUrl 最后生成的是什么？

iframeUrl 最终生成的是一个 Blob URL。

让我们回顾一下 getIframeUrl 函数中的关键部分：

```typescript
// ... (代码替换部分，生成 HTML 字符串 `res`) ...

// 3. 创建新的 Blob URL
return URL.createObjectURL(new Blob([res], { type: "text/html" }));
```

这里发生了什么：

- new Blob([res], { type: "text/html" }):

- res 是包含了完整 HTML（包括注入的 import map 和编译后的用户代码）的字符串。

- new Blob(...) 将这个 HTML 字符串转换成一个 Blob 对象。Blob（Binary Large Object）对象表示一个不可变的、原始数据的类文件对象。在这里，它代表了一个 HTML 文档。

- { type: "text/html" } 指定了这个 Blob 对象的 MIME 类型为 HTML。

- URL.createObjectURL(...):

- 这个静态方法会为传入的 Blob 对象（或 File 对象）创建一个临时的、唯一的 URL。

- 这个 URL 的格式通常是 blob:<origin>/<uuid>，例如 blob:http://localhost:3000/a1b2c3d4-e5f6-7890-1234-56789abcdef0。

- 这个 URL 引用了内存中的 Blob 数据。只要这个 URL 存在并且没有被 URL.revokeObjectURL() 撤销，浏览器就可以通过它访问 Blob 的内容。

所以，iframeUrl 最终存储的是这样一个指向动态生成的、包含完整预览内容的 HTML 文档的 Blob URL。当 iframe 的 src 属性被设置为这个 Blob URL 时，iframe 就会加载并渲染这个内存中的 HTML 文档。

4. 为什么要使用 iframe 来展示生成代码？

在代码游乐场（Playground）或在线代码编辑器这类应用中，使用 iframe 来展示用户代码的运行结果是一个非常常见且推荐的做法，主要有以下几个原因：

- 环境隔离 (Isolation):

- CSS 隔离: iframe 内部的 CSS 样式不会影响到父页面（即你的 Playground 应用本身），反之亦然。这确保了用户在预览中编写的样式只作用于预览内容，不会搞乱 Playground 的界面。

- JavaScript 隔离: iframe 拥有自己独立的 window 对象、document 对象和 JavaScript 执行环境。这意味着：

- 用户在 iframe 中运行的代码（即使是全局变量或对内置对象的修改）不会影响到 Playground 应用的 JavaScript。

- Playground 应用的 JavaScript 也不会意外地干扰到用户代码的运行。

- 这对于安全性至关重要，可以防止用户代码意外或恶意地操作父页面的功能或数据。

- DOM 隔离: iframe 内部有自己独立的 DOM 树，用户代码对 DOM 的操作被限制在 iframe 内部。

- 干净的运行环境 (Clean Environment):

每次 iframeUrl 更新时，iframe 实际上是加载了一个全新的文档。这为用户的代码提供了一个干净、可预测的执行环境，不受上一次运行结果的残留状态影响。

- 安全性 (Security via Sandboxing):

iframe 元素有一个 sandbox 属性，可以用来对 iframe 中加载的内容施加一系列限制，从而增强安全性。例如，你可以通过 sandbox 属性禁止 iframe 中的内容执行某些操作，如：

- 运行脚本 (allow-scripts 可以开启)

- 访问父窗口的 localStorage 或 cookies

- 提交表单 (allow-forms 可以开启)

- 弹出新窗口 (allow-popups 可以开启)

- 导航顶级窗口

在你的代码中，sandbox="allow-scripts allow-same-origin" 是一个常见的配置，它允许脚本执行，并允许内容被视为来自同源（这对于脚本和资源加载通常是必要的），但仍然提供了比没有 sandbox 属性更强的隔离。

- 模拟独立的网页:

用户的代码（尤其是前端代码）通常是设计来在完整的 HTML 文档中运行的。iframe 提供了一个完整的、独立的文档上下文，包括 <html>, <head>, <body> 标签，这使得预览环境更接近真实的网页环境。

- 防止主应用崩溃:

如果用户的代码有严重错误，比如导致无限循环或浏览器崩溃的bug，由于它在 iframe 这个隔离的环境中运行，通常只会影响到 iframe 本身，而不太可能导致整个 Playground 应用崩溃。

综上所述，使用 iframe 是为了在安全、隔离、干净的环境中可靠地渲染和执行用户动态生成的代码，同时保护主应用程序不受用户代码的潜在负面影响。

### 疑问

为什么Preview显示的是App.tsx？这里导入的是main.tsx。Preview 组件确实默认显示的是 App.tsx 的渲染结果，但这是因为编译流程的执行顺序和 React 应用的结构，而不是直接显示某个文件的代码。

具体来说：

1. 编译流程的入口确实是 main.tsx：

```typescript
   // src/ReactPlayground/components/Preview/compiler.ts
   export const compile = (files: Files): string => {
     const main = files[ENTRY_FILE_NAME]; // 这里的 ENTRY_FILE_NAME 是 "main.tsx"
     // ...
     return babelTransform(ENTRY_FILE_NAME, main.value, files);
   };
```

2. 但是 main.tsx 的内容决定了实际渲染的是什么：

```ts
   // src/ReactPlayground/template/main.tsx
   import React from "react";
   import ReactDOM from "react-dom/client";
   import App from "./App";
   
   ReactDOM.createRoot(document.getElementById("root")!).render(
     <React.StrictMode>
       <App />
     </React.StrictMode>
   );
```

3. **执行流程：**

- Preview 组件调用 compile(files) 编译所有文件

- 编译从 main.tsx 开始

- 在编译过程中，编译器发现 main.tsx 导入了 "./App"

- 编译器找到并编译 App.tsx

- 最终编译结果包含处理过的 main.tsx 代码，这段代码会在 iframe 中执行

- 当 main.tsx 代码执行时，它会渲染 App 组件到 root div

4. iframe 的结构：

```html
   <!-- src/ReactPlayground/components/Preview/iframe.html -->
   <body>
     <script type="importmap"></script>
     <script type="module" id="appSrc"></script>
     <div id="root"></div>
   </body>
```

这里的 <div id="root"></div> 是 React 应用挂载的目标元素，与 main.tsx 中的 document.getElementById("root") 对应。

所以，虽然 Preview 组件的编译起点是 main.tsx，但最终显示的是 App.tsx 的内容，这是因为 main.tsx 的代码在执行时导入并渲染了 App 组件。这完全符合标准 React 应用的结构：入口文件（main.tsx）负责应用的引导和初始化，而用户界面则来自于 App 组件及其子组件。

如果你修改了 main.tsx 来渲染不同的组件，或者修改了 App.tsx 的内容，Preview 会相应地更新显示内容，因为编译流程始终从 main.tsx 开始，然后跟随其导入链。

### 总结

这段代码通过 getIframeUrl 动态生成包含最新代码和依赖映射的 HTML 内容，并为其创建 Blob URL。然后，useEffect 监听代码和 import map 的变化，在它们更新时，重新调用 getIframeUrl 来生成新的 URL 并更新 iframe 的 src，从而实现实时预览。同时，通过 URL.revokeObjectURL 进行细致的内存管理，确保临时 URL 占用的资源能够被及时释放。



# 标签页管理

如果我们需要对标签页进行增删改查，则可以考虑采取非受控模式来处理FileName的列表和子项。

同时我们需要谨记，核心状态管理还是通过Context来实现的。

**FileNameList.tsx**

```tsx
import { useContext, useEffect, useState } from "react";
import { PlaygroundContext } from "../../../PlaygroundContext";

import { FileNameItem } from "./FileNameItem";
import styles from "./index.module.scss";
import {
  APP_COMPONENT_FILE_NAME,
  ENTRY_FILE_NAME,
  IMPORT_MAP_FILE_NAME,
} from "../../../files";

/**
 * FileNameList 组件
 * 负责展示和管理文件标签页列表。
 */
export default function FileNameList() {
  const {
    files, // 当前所有文件的对象
    removeFile, // 从 Context 中获取的删除文件的方法
    addFile, // 从 Context 中获取的新增文件的方法
    updateFileName, // 从 Context 中获取的更新文件名的方法
    selectedFileName, // 当前选中的文件名
    setSelectedFileName, // 从 Context 中获取的设置选中文件的方法
  } = useContext(PlaygroundContext);

  // 用于渲染的标签页名称数组
  const [tabs, setTabs] = useState<string[]>([]);
  //标记是否正在创建新文件，用于让新创建的 tab 自动进入编辑模式
  const [creating, setCreating] = useState(false);

  // 当 files 对象变化时，更新 tabs 数组
  useEffect(() => {
    setTabs(Object.keys(files));
  }, [files]);

  /**
   * 处理文件名编辑完成的事件
   * @param name 新文件名
   * @param prevName 旧文件名
   */
  const handleEditComplete = (name: string, prevName: string) => {
    updateFileName(prevName, name); // 更新 Context 中的文件名
    setSelectedFileName(name); // 将新文件设置为选中状态
    setCreating(false); // 重置正在创建的状态
  };

  /**
   * 处理删除文件的事件
   * @param name 要删除的文件名
   */
  const handleRemove = (name: string) => {
    removeFile(name); // 从 Context 中删除文件
    // 如果删除的是当前选中的文件，或者为了确保有文件被选中，
    // 将选中文件重置为入口文件。
    setSelectedFileName(ENTRY_FILE_NAME);
  };

  // 定义只读文件列表，这些文件不允许被重命名或删除
  const readonlyFileNames = [
    ENTRY_FILE_NAME,
    IMPORT_MAP_FILE_NAME,
    APP_COMPONENT_FILE_NAME,
  ];

  /**
   * 添加新的标签页（文件）
   */
  const addTab = () => {
    // 生成一个唯一的新文件名
    const newFileName = "Comp" + Math.random().toString().slice(2, 8) + ".tsx";
    addFile(newFileName); // 将新文件添加到 Context
    setCreating(true); // 设置正在创建的状态，新 tab 会进入编辑模式
    setSelectedFileName(newFileName); // 将新 tab 设置为选中状态
  };

  return (
    <div className={styles.tabs}>
      {/* 遍历 tabs 数组，为每个文件渲染一个 FileNameItem */}
      {tabs.map((item, index, arr) => {
        return (
          <FileNameItem
            key={item + index} // 使用文件名和索引作为 key
            value={item} // 文件名
            readonly={readonlyFileNames.includes(item)} // 是否为只读文件
            // 是否为正在创建的文件（仅当是最后一个 tab 且 creating 为 true 时）
            creating={creating && index === arr.length - 1}
            actived={item === selectedFileName} // 是否为当前激活的 tab
            onClick={() => {
              // 点击 tab 时，设置该 tab 为选中状态
              setSelectedFileName(item);
            }}
            onEditComplete={(name: string) => handleEditComplete(name, item)} // 编辑完成时的回调
            onRemove={() => {
              // 删除按钮点击时的回调
              // 注意：事件冒泡已在 FileNameItem 的 Popconfirm onConfirm 中处理
              handleRemove(item);
            }}
          />
        );
      })}
      {/* 添加新标签页的按钮 */}
      <div className={styles.add} onClick={addTab}>
        +
      </div>
    </div>
  );
}

```

**FileNameItem**

```typescript
import classnames from "classnames";
import React, { useRef, useEffect, useState } from "react";

import styles from "./index.module.scss";
import { Popconfirm } from "antd"; // Ant Design 的气泡确认框组件

export interface FileNameItemProps {
  value: string; // 文件名 (来自父组件的 props)
  actived: boolean; // 是否为激活状态
  creating: boolean; // 是否为正在创建的状态
  readonly: boolean; // 是否为只读文件
  onRemove: () => void; // 删除文件时的回调函数 (不带事件对象，因为事件处理在父组件)
  onEditComplete: (name: string) => void; // 编辑完成时的回调函数
  onClick: () => void; // 点击标签项时的回调函数
}

/**
 * FileNameItem 组件
 * 代表文件标签列表中的单个标签项。
 */
export const FileNameItem: React.FC<FileNameItemProps> = props => {
  const {
    value,
    actived = false, // 默认为 false
    creating,
    readonly,
    onClick,
    onEditComplete,
    onRemove,
  } = props;

  // 组件内部状态，用于管理当前显示/编辑的文件名
  const [name, setName] = useState(value);
  // 组件内部状态，用于控制是否处于编辑模式
  const [editing, setEditing] = useState(creating); // 如果是正在创建，则初始进入编辑模式
  const inputRef = useRef<HTMLInputElement>(null); // 用于获取 input 元素的引用

  /**
   * 处理双击事件，进入编辑模式
   */
  const handleDoubleClick = () => {
    if (readonly) return; // 只读文件不允许编辑
    setEditing(true);
    // 使用 setTimeout 确保 input 元素已渲染完成，然后获取焦点
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  /**
   * 处理输入框失去焦点事件，完成编辑
   */
  const handleInputBlur = () => {
    setEditing(false); // 退出编辑模式
    // 如果文件名没有改变，或者为空，则恢复为原始文件名 value
    if (name.trim() === "" || name === value) {
      setName(value);
      if (name.trim() !== "" && name !== value) {
        // 确保原始值不是空且确实有修改但改回去了
        onEditComplete(value); // 如果原先是有效的修改，但改回去了，也通知父组件
      }
    } else {
      onEditComplete(name); // 调用父组件的编辑完成回调，传递新文件名
    }
  };

  // 当 `creating` prop 变化时，如果是 true，则使输入框获取焦点
  useEffect(() => {
    if (creating) {
      inputRef?.current?.focus();
    }
  }, [creating]);

  // 当父组件传入的 value (文件名) 发生变化时，同步更新组件内部的 name 状态
  // 这主要用于确保外部修改文件名后，该组件能正确显示最新的文件名
  useEffect(() => {
    setName(value);
  }, [value]);

  return (
    <div
      className={classnames(
        styles["tab-item"],
        actived ? styles.actived : null // 根据 actived prop 添加激活样式
      )}
      onClick={onClick} // 点击整个标签项时，调用父组件传入的 onClick 回调
    >
      {editing ? ( // 如果处于编辑模式
        <input
          ref={inputRef}
          className={styles["tabs-item-input"]}
          value={name} // 输入框的值绑定到内部 name 状态
          onBlur={handleInputBlur} // 失去焦点时完成编辑
          onChange={e => setName(e.target.value)} // 输入时更新内部 name 状态
          onKeyDown={e => {
            // 处理回车键和 Esc 键
            if (e.key === "Enter") {
              handleInputBlur();
            } else if (e.key === "Escape") {
              setName(value); // 按 Esc 恢复原始文件名
              setEditing(false); // 退出编辑模式
            }
          }}
        />
      ) : (
        // 如果不处于编辑模式，显示文件名和删除按钮
        <>
          <span onDoubleClick={handleDoubleClick}>
            {" "}
            {/* 双击文件名进入编辑模式 */}
            {name}
          </span>

          {!readonly ? ( // 如果文件不是只读的，则显示删除按钮
            <Popconfirm
              title="确认删除该文件吗？"
              okText="确定"
              cancelText="取消"
              // Popconfirm 的 onConfirm 事件，参数 e 是可选的 MouseEvent
              onConfirm={(e?: React.MouseEvent<HTMLElement>) => {
                e?.stopPropagation(); // 关键：阻止事件冒泡到父 div 的 onClick
                onRemove(); // 调用父组件传入的 onRemove 回调
              }}
              // 阻止删除图标本身的点击事件冒泡，避免触发外层 FileNameItem 的 onClick
              // （Popconfirm 内部可能会处理，但为了保险起见可以加上）
              onCancel={(e?: React.MouseEvent<HTMLElement>) => {
                e?.stopPropagation();
              }}>
              <span
                className={styles["tab-item-remove_icon"]}
                style={{ marginLeft: 5, display: "flex" }}
                // onClick={(e) => e.stopPropagation()} // 也可以直接在 span 上阻止冒泡
              >
                <svg width="12" height="12" viewBox="0 0 24 24">
                  <line stroke="#999" x1="18" y1="6" x2="6" y2="18"></line>
                  <line stroke="#999" x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </span>
            </Popconfirm>
          ) : null}
        </>
      )}
    </div>
  );
};

```



## 文件功能概述

- FileNameList/index.tsx: 这个组件负责管理和展示整个标签页列表。它从 PlaygroundContext 获取文件数据和操作文件的方法，然后遍历这些文件，为每个文件渲染一个 FileNameItem 组件。它还处理添加新标签的逻辑。

- FileNameItem/index.tsx: 这个组件代表列表中的单个标签页。它负责展示文件名，并处理单个标签的编辑（重命名）、删除以及激活状态的显示。对于只读文件，它会禁止编辑和删除操作。

## 增删改查实现逻辑

### 查 (Read - 展示标签列表和内容)

- FileNameList:

- 通过 useContext(PlaygroundContext) 获取 files 对象和 selectedFileName。

- 使用 useEffect 监听 files 的变化，当 files 更新时，提取 Object.keys(files) 作为 tabs 数组，并通过 setTabs 更新状态，从而触发列表的重新渲染。

- 在 JSX 中，通过 tabs.map 遍历 tabs 数组，为每个文件名 item 渲染一个 FileNameItem。

- 将 item === selectedFileName 作为 actived prop 传递给 FileNameItem，用于高亮当前选中的标签。

- onClick prop 传递给 FileNameItem 的是一个函数，调用 setSelectedFileName(item) 来切换当前选中的文件。

- FileNameItem:

- 接收 value (即文件名) 和 actived (是否选中) props。

- 内部用 useState(value) 初始化 name 状态来显示文件名。

- 根据 actived prop 添加高亮样式。

- 点击整个 div (如果不是删除按钮的点击) 会触发从父组件传来的 onClick 回调，从而改变选中的文件。

### 增 (Create - 添加新标签)

- FileNameList:

- 提供一个 "添加" 按钮 (<div className={styles.add} onClick={addTab}>+</div>)。

- addTab 函数：

- 生成一个唯一的新文件名 (例如: "Comp" + 随机数 + ".tsx")。

- 调用从 Context 获取的 addFile(newFileName) 方法，将新文件信息添加到全局状态 files 中。

- 设置 creating 状态为 true。这个状态会传递给新创建的 FileNameItem。

- 调用 setSelectedFileName(newFileName) 将新添加的标签设为当前选中项。

- FileNameItem:

- 接收 creating prop。

- useEffect 监听 creating prop，如果为 true (意味着这个 FileNameItem 是刚刚被添加的)，则使输入框自动获得焦点 (inputRef?.current?.focus())，并进入编辑模式 (setEditing(true)，因为 editing 初始值就是 creating)。

### 改 (Update - 重命名标签)

- FileNameItem:

- 非只读文件 (!readonly) 的文件名 <span> 元素支持双击 (onDoubleClick)。

- handleDoubleClick 函数将 editing 状态设为 true，显示一个 <input> 元素，并将文件名当前的 name 状态作为其 value。

- <input> 的 onChange 事件会实时更新组件内部的 name 状态。

- 当 <input> 失去焦点时 (onBlur)，会触发 handleInputBlur 函数。

- handleInputBlur 函数：

- 将 editing 状态设回 false，隐藏输入框，显示 <span>。

- 调用从父组件 FileNameList 传入的 onEditComplete(name) 回调，将新的文件名 name 传递回去。

- FileNameList:

- handleEditComplete(name, prevName) 函数 (作为 onEditComplete prop 传递给 FileNameItem):

- 调用从 Context 获取的 updateFileName(prevName, name) 方法，用新的文件名更新全局状态 files 中的对应文件。

- 调用 setSelectedFileName(name) 将重命名后的标签设为当前选中项。

- 设置 creating 状态为 false (如果之前是新创建的标签，编辑完成后就不是创建中了)。

### 删 (Delete - 删除标签)

- FileNameItem:

- 对于非只读文件 (!readonly)，会显示一个删除图标。这个图标被包裹在 Ant Design 的 Popconfirm 组件中，用于删除前二次确认。

- Popconfirm 的 onConfirm 事件绑定了一个回调函数。这个回调函数会调用从父组件传入的 onRemove prop。

- 关键点: onConfirm={e => { e?.stopPropagation(); onRemove(); }}。这里的 e?.stopPropagation() 非常重要，它阻止了点击确认删除按钮的事件冒泡到 FileNameItem 的根 div 上，否则会触发根 div 的 onClick 事件，导致尝试选中一个刚刚被删除的文件而出错。

- FileNameList:

- handleRemove(name) 函数 (作为 onRemove prop 传递给 FileNameItem, 外层用一个匿名函数包裹以直接传递 item，并处理事件冒泡):

- 调用从 Context 获取的 removeFile(name) 方法，从全局状态 files 中删除该文件。

- 调用 setSelectedFileName(ENTRY_FILE_NAME)，将选中文件切换到一个默认存在的文件 (例如入口文件)，避免选中一个已被删除的文件。



































































