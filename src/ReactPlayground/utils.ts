import { strFromU8, strToU8, unzlibSync, zlibSync } from "fflate";
import saveAs from "file-saver";
import type { Files } from "./PlaygroundContext";
import JSZip from "jszip";

export const fileName2Language = (name: string) => {
  const suffix = name.split(".").pop() || "";
  if (["js", "jsx"].includes(suffix)) return "javascript";
  if (["ts", "tsx"].includes(suffix)) return "typescript";
  if (["json"].includes(suffix)) return "json";
  if (["css"].includes(suffix)) return "css";
  return "javascript";
};

/**
 * 将字符串数据进行压缩。
 * 压缩流程:
 * 1. 将字符串转换为 Uint8Array (UTF-8 编码的字节数组)。
 * 2. 使用 zlib (fflate库的同步版本) 对字节数组进行压缩 (级别9，最高压缩率)。
 * 3. 将压缩后的字节数组转换回字符串 (使用 latin1/binary 编码以保留所有字节值)。
 * 4. 将得到的二进制字符串通过 Base64 编码，使其变为可打印的 ASCII 字符串。
 *
 * @param data 要压缩的原始字符串。
 * @returns 经过 zlib 压缩和 Base64 编码后的字符串。
 */
export function compress(data: string): string {
  // 1. 将输入字符串转换为 Uint8Array (UTF-8 编码)
  // strToU8 是 fflate 库提供的函数，用于将字符串按 UTF-8 编码转换为字节数组
  const buffer = strToU8(data);

  // 2. 使用 zlib (同步) 压缩字节数组
  // zlibSync 是 fflate 库提供的同步压缩函数
  // { level: 9 } 指定压缩级别为 9 (0-9，9为最高压缩率，但耗时也最长)
  const zipped = zlibSync(buffer, { level: 9 });

  // 3. 将压缩后的 Uint8Array 转换回字符串
  // strFromU8 是 fflate 库提供的函数，用于将字节数组转换为字符串
  // 第二个参数 true 表示将 Uint8Array 中的每个字节视为一个 latin1 (或二进制) 字符码点，
  // 这样可以确保所有字节值都能正确表示为字符串，避免因多字节UTF-8编码导致数据损坏。
  const str = strFromU8(zipped, true);

  // 4. 将二进制字符串进行 Base64 编码
  // btoa 是浏览器内置函数，用于将二进制字符串编码为 Base64 字符串。
  return btoa(str);
}

/**
 * 将经过 Base64 编码和 zlib 压缩的字符串数据进行解压缩。
 * 解压缩流程:
 * 1. 对 Base64 编码的字符串进行解码，得到原始的二进制字符串。
 * 2. 将二进制字符串转换为 Uint8Array (每个字符代表一个字节)。
 * 3. 使用 zlib (fflate库的同步版本) 对字节数组进行解压缩。
 * 4. 将解压缩后的字节数组转换回原始的 UTF-8 字符串。
 *
 * @param base64 经过 Base64 编码的压缩字符串。
 * @returns 解压缩并解码后的原始字符串。
 */
export function uncompress(base64: string): string {
  // 1. 对 Base64 编码的字符串进行解码，得到二进制字符串
  // atob 是浏览器内置函数，用于解码 Base64 字符串。
  const binary = atob(base64);

  // 2. 将二进制字符串转换为 Uint8Array
  // strToU8 的第二个参数为 true，意味着将输入字符串中的每个字符的码点视为一个字节值。
  // 这与 compress 函数中 strFromU8(zipped, true) 的操作相对应。
  const buffer = strToU8(binary, true);

  // 3. 使用 zlib (同步) 解压缩字节数组
  // unzlibSync 是 fflate 库提供的同步解压缩函数
  const unzipped = unzlibSync(buffer);

  // 4. 将解压缩后的 Uint8Array 按 UTF-8 解码为字符串
  // strFromU8 默认会将字节数组视为 UTF-8 编码进行解码。
  return strFromU8(unzipped);
}

/**
 * 将项目中的所有文件打包成一个 zip 文件并触发下载。
 * @param files 一个对象，键是文件名，值是包含文件内容 (value) 的对象。
 *              通常是 PlaygroundContext 中的 files 对象。
 */
export async function downloadFiles(files: Files) {
  // 创建一个新的 JSZip 实例
  const zip = new JSZip();

  // 遍历 files 对象中的每一个文件
  Object.keys(files).forEach(name => {
    // 将每个文件添加到 zip 实例中
    // name 是文件名 (例如 "App.tsx", "style.css")
    // files[name].value 是该文件的实际内容 (字符串形式的代码或文本)
    zip.file(name, files[name].value);
  });

  // 异步生成 zip 文件的内容
  // { type: "blob" } 指定生成的内容类型为 Blob 对象
  // Blob 对象表示一个不可变的、原始数据的类文件对象，非常适合用于文件下载
  const blob = await zip.generateAsync({ type: "blob" });

  // 使用 file-saver 的 saveAs 函数触发浏览器下载
  // 第一个参数是 Blob 对象 (即要下载的 zip 文件内容)
  // 第二个参数是下载时默认显示的文件名
  // `code${Math.random().toString().slice(2, 8)}.zip` 生成一个类似 "code123456.zip" 的随机文件名
  saveAs(blob, `code${Math.random().toString().slice(2, 8)}.zip`);
}
