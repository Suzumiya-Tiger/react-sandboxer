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
