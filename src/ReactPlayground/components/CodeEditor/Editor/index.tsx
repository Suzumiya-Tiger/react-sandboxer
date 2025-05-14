import MonacoEditor, {
  type OnMount,
  type EditorProps,
} from "@monaco-editor/react";
import { createATA } from "./ata";
import { editor } from "monaco-editor";
export interface EditorFile {
  name: string;
  value: string;
  language: string;
}

interface Props {
  file: EditorFile;
  onChange?: EditorProps["onChange"];
  options?: editor.IStandaloneEditorConstructionOptions;
}

export default function Editor(props: Props) {
  const { file, onChange, options } = props;

  const handleEditorMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ, () => {
      editor.getAction("editor.action.formatDocument")?.run();
      // let actions = editor.getSupportedActions().map((a) => a.id);
      // console.log(actions);
    });

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      jsx: monaco.languages.typescript.JsxEmit.Preserve,
      esModuleInterop: true,
    });
    const ata = createATA((code, path) => {
      // monaco.languages.typescript.typescriptDefaults.addExtraLib
      // 这是 Monaco Editor 的 API，用于向 TypeScript 语言服务添加额外的库文件（在这里是类型声明文件）
      // code: 下载到的类型声明文件内容 (字符串形式)
      // `file://${path}`: 为这个类型声明文件指定一个 Monaco Editor 内部可识别的 URI 路径。
      //                  'file://' 前缀是必须的，表明它是一个文件资源。
      //                  通过这种方式，Monaco Editor 就能找到并使用这些动态下载的类型定义。
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        code,
        `file://${path}`
      );
    });
    // 编辑器内容改变时触发 ATA
    // 当用户在编辑器中输入或修改代码时，这个事件会被触发
    editor.onDidChangeModelContent(() => {
      // editor.getValue() 获取编辑器当前全部的代码内容
      // 将当前代码传递给 ATA 实例函数
      // ATA 会分析这些代码中的 import 语句 (例如 import React from 'react')
      // 如果发现有它不认识的包（即没有对应的类型声明），它会尝试从网络上（通常是 npm）下载这些包的 @types 类型声明文件。
      ata(editor.getValue());
    });
    // 编辑器初次加载时也触发一次 ATA
    // 这样可以确保编辑器一加载进来，就会对当前已有的代码进行类型获取尝试。
    ata(editor.getValue());
  };
  return (
    <MonacoEditor
      height={"100%"}
      path={file.name}
      language={file.language}
      onMount={handleEditorMount}
      onChange={onChange}
      value={file.value}
      options={{
        fontSize: 14,
        scrollBeyondLastLine: false,
        minimap: {
          enabled: false,
        },
        scrollbar: {
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
        },
        ...options,
      }}
    />
  );
}
