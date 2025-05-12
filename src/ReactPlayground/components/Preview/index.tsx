import { useContext, useEffect, useState } from "react";
import { PlaygroundContext } from "../../PlaygroundContext";
import Editor from "../CodeEditor/Editor";
import { compile } from "./compiler";

export default function Preview() {
  const { files } = useContext(PlaygroundContext);
  const [compiledCode, setCompiledCode] = useState("");

  useEffect(() => {
    const res = compile(files);
    setCompiledCode(res);
  }, [files]);

  return (
    <div style={{ height: "100%" }}>
      <Editor
        file={{
          name: "dist.js",
          value: compiledCode,
          language: "javascript",
        }}
      />
    </div>
  );
}
