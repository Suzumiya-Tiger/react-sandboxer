// 导入 @typescript/ata 包中的 setupTypeAcquisition 函数，这是ATA功能的核心入口
import { setupTypeAcquisition } from "@typescript/ata";
// 导入 TypeScript 对象，ATA 需要它来进行类型处理
import typescriprt from "typescript";

/**
 * 创建并配置 ATA (Automatic Type Acquisition) 实例。
 * ATA 用于自动从 npm 下载 TypeScript 类型声明文件（.d.ts），
 * 以便在 Monaco Editor 中为 JavaScript 或 TypeScript 代码提供更丰富的智能提示和类型检查，
 * 特别是针对那些从 npm 导入的但项目中未直接包含其类型定义的库。
 *
 * @param onDownloadFile 当 ATA 下载完成一个类型声明文件后调用的回调函数。
 *                       这个回调函数负责将下载的类型文件内容和路径
 *                       添加到 Monaco Editor 的 TypeScript 语言服务中。
 * @returns 返回一个 ATA 实例函数。这个函数接收代码字符串作为参数，
 *          ATA 会分析代码中的 import 语句，并尝试获取相应的类型声明。
 */
export function createATA(
  onDownloadFile: (code: string, path: string) => void
) {
  // 调用 setupTypeAcquisition 初始化 ATA
  const ata = setupTypeAcquisition({
    // 项目名称，可以是任意字符串，用于 ATA 内部标识
    projectName: "my-ata",
    // 传入 TypeScript 的实例，ATA 需要用它来解析代码和处理类型
    typescript: typescriprt,
    // 配置一个日志记录器，这里使用浏览器的 console 对象
    // ATA 会通过这个 logger 输出其工作过程中的一些信息，例如开始下载、下载完成等
    logger: console,
    // delegate (委托) 对象用于处理 ATA 的特定事件
    delegate: {
      /**
       * 当 ATA 成功接收到一个类型声明文件时调用此方法。
       * @param code 类型声明文件的文本内容。
       * @param path 类型声明文件在虚拟文件系统中的路径 (例如: 'node_modules/@types/react/index.d.ts')。
       */
      receivedFile: (code, path) => {
        // console.log('自动下载的包类型文件内容:', code);
        // console.log('自动下载的包类型文件路径:', path);
        // 调用传入的 onDownloadFile 回调，将文件内容和路径传递出去
        // 主调函数 (Editor/index.tsx) 会利用这个回调将类型定义注入到 Monaco Editor 中
        onDownloadFile(code, path);
      },
      // delegate 还可以包含其他方法，如:
      // cacheWillUpdate?: (p: string, c: string) => void;
      // started?: () => void;
      // finished?: (files: Map<string, string>) => void;
      // progress?: (downloaded: number, total: number) => void;
      // errorMessage?: (userFacingMessage: string, error: Error) => void;
      // infoMessage?: (message: string) => void;
    },
  });

  // 返回初始化后的 ATA 实例函数
  // 调用这个函数并传入代码字符串时，ATA 会开始工作
  return ata;
}