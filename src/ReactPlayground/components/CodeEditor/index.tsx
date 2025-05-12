import { PlaygroundContext } from "../../PlaygroundContext";
import Editor from "./Editor";
import FileNameList from "./FileNameList";
import { useContext } from "react";
import { debounce } from "lodash";
export default function CodeEditor() {
  const { files, setFiles, selectedFileName } =
    useContext(PlaygroundContext);

  const file = files[selectedFileName];
  // 只要输入了就确保内容被有效保存
  function onEditorChange(value?: string) {
    if (value) {
      files[file.name].value = value;
      setFiles({ ...files });
    }
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <FileNameList />
      <Editor file={file} onChange={debounce(onEditorChange, 500)} />
    </div>
  );
}
