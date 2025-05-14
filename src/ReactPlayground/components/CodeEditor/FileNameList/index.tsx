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
    const newFileName = "Comp" + Math.random().toString().slice(2, 6) + ".tsx";
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
