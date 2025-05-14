import React, {
  createContext,
  useState,
  useEffect,
  type PropsWithChildren,
} from "react";
import { compress, fileName2Language, uncompress } from "./utils";
import { initFiles } from "./files";

export interface File {
  name: string;
  value: string;
  language: string;
}

export interface Files {
  [key: string]: File;
}

export type Theme = "light" | "dark";
/**
 * files的信息是以:
 * 文件标签名，文件内容，文件语言来构成一个标签对象的
 * 它的键是文件名，值是上面所说的三个元素信息
 */
export interface PlaygroundContext {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  files: Files;
  selectedFileName: string;
  setSelectedFileName: (fileName: string) => void;
  setFiles: (files: Files) => void;
  addFile: (fileName: string) => void;
  removeFile: (fileName: string) => void;
  updateFileName: (oldFieldName: string, newFieldName: string) => void;
}
// context先初始化了selectedFileName这个当前选中的文件
export const PlaygroundContext = createContext<PlaygroundContext>({
  selectedFileName: "App.tsx",
} as PlaygroundContext);
const getFilesFromUrl = () => {
  let files: Files | undefined;
  try {
    // const hash = decodeURIComponent(window.location.hash.slice(1));
    const hash = uncompress(window.location.hash.slice(1));
    files = JSON.parse(hash);
  } catch (error) {
    console.error(error);
  }
  return files;
};
export const PlaygroundProvider = (props: PropsWithChildren) => {
  const { children } = props;
  const [files, setFiles] = useState<Files>(getFilesFromUrl() || initFiles);
  const [selectedFileName, setSelectedFileName] = useState<string>("App.tsx");
  const [theme, setTheme] = useState<Theme>("light");
  const addFile = (name: string) => {
    setFiles({
      ...files,
      [name]: { name, value: "", language: fileName2Language(name) },
    });
  };

  const removeFile = (name: string) => {
    delete files[name];
    setFiles({ ...files });
  };

  const updateFileName = (oldFieldName: string, newFieldName: string) => {
    if (
      !files[oldFieldName] ||
      newFieldName === undefined ||
      newFieldName === null
    ) {
      return;
    }

    const { [oldFieldName]: value, ...rest } = files;
    const newFile = {
      /* 因为files是React状态变量（通过useState钩子创建的），
      updateFileName函数在执行时获取的是当前最新的状态值。
      函数内部处理完后，再通过setFiles更新状态。 */
      [newFieldName]: {
        ...value,
        language: fileName2Language(newFieldName),
        name: newFieldName,
      },
    };
    setFiles({
      ...rest,
      ...newFile,
    });
  };
  useEffect(() => {
    const hash = compress(JSON.stringify(files));
    /* encodeURIComponent() 是一个全局函数，用来对字符串进行 URI 编码，
    将特殊字符（如空格、中文、标点等）转换成 %XX 的形式，以避免它们在 URL 里造成歧义或不合法
    与 encodeURI() 不同，encodeURIComponent() 会对所有非标准字符都进行转义，
    包括 ?、&、# 等，使得编码后的结果可以安全地放在查询串或 hash 中
 */
    // window.location.hash = encodeURIComponent(hash);
    window.location.hash = hash;
  }, [files]);
  return (
    <PlaygroundContext.Provider
      value={{
        theme,
        setTheme,
        files,
        selectedFileName,
        setSelectedFileName,
        setFiles,
        addFile,
        removeFile,
        updateFileName,
      }}>
      {children}
    </PlaygroundContext.Provider>
  );
};
