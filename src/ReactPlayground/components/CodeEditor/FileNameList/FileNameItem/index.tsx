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
    if (name.trim() === "") {
      // 如果名称为空，恢复原始名称但不调用onEditComplete
      setName(value);
    } else if (name !== value) {
      // 如果名称有变化且不为空，调用onEditComplete传递新名称
      onEditComplete(name);
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
