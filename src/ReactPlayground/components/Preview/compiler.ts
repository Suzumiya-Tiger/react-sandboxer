import { transform } from "@babel/standalone";
import type { Files } from "../../PlaygroundContext";
import { ENTRY_FILE_NAME } from "../../files";
import type { PluginObj } from "@babel/core";
export const babelTransform = (
  filename: string,
  code: string,
  files: Files
) => {
  let result = "";
  try {
    result = transform(code, {
      presets: ["react", "typescript"],
      filename,
      plugins: [customResolver(files)],
      retainLines: true,
    }).code!;
  } catch (e) {
    console.log("编译出错", e);
  }
  return result;
};
export const compile = (files: Files) => {
  const main = files[ENTRY_FILE_NAME];
  return babelTransform(ENTRY_FILE_NAME, main.value, files);
};

function customResolver(files: Files): PluginObj {
  return {
    visitor: {
      ImportDeclaration(path) {
        path.node.source.value = "333";
      },
    },
  };
}

const getModuleFile = (files: Files, modulePath: string) => {
  console.log("files", files);

  let moduleName = modulePath.split("./").pop() || "";
  if (!moduleName.includes(".")) {
    const realModuleName = Object.keys(files)
      .filter(key => {
        return (
          key.endsWith(".ts") ||
          key.endsWith(".tsx") ||
          key.endsWith(".js") ||
          key.endsWith(".jsx")
        );
      })
      .find(key => {
        return key.split(".").includes(moduleName);
      });
    if (realModuleName) {
      moduleName = realModuleName;
    }
  }
  return files[moduleName];
};
