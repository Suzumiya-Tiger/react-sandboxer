import classnames from "classnames";
import React, { useEffect, useState } from "react";

import styles from "./index.module.scss";

/**
 * @interface MessageProps
 * @description Message 组件的 props 类型定义
 * @property {'error' | 'warn'} type - 消息的类型，可以是 'error' 或 'warn'。
 * @property {string} content - 消息的具体内容，支持 HTML。
 */
export interface MessageProps {
  type: "error" | "warn";
  content: string;
}

/**
 * @component Message
 * @description 一个用于显示错误或警告信息的组件。
 * @param {MessageProps} props - 组件的 props。
 * @returns {React.ReactElement | null} - 如果 content 为空，则返回 null，否则返回消息组件。
 */
export const Message: React.FC<MessageProps> = props => {
  const { type, content } = props;
  // 控制消息组件是否可见的状态
  const [visible, setVisible] = useState(false);

  // 当 content prop 发生变化时，更新 visible 状态
  // 如果 content 有内容，则显示消息；否则隐藏。
  useEffect(() => {
    setVisible(!!content);
  }, [content]);

  // 如果不可见，则不渲染任何内容
  return visible ? (
    // 使用 classnames 根据消息类型 (type) 和基础样式 (styles.msg) 合并 className
    <div className={classnames(styles.msg, styles[type])}>
      {/* 使用 pre 标签来保留内容的格式，并通过 dangerouslySetInnerHTML 渲染 HTML 内容 */}
      <pre dangerouslySetInnerHTML={{ __html: content }}></pre>
      {/* 关闭按钮，点击时将 visible 设置为 false 来隐藏消息 */}
      <button className={styles.dismiss} onClick={() => setVisible(false)}>
        ✕
      </button>
    </div>
  ) : null;
};
