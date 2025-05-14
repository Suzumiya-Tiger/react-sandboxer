import { Allotment } from "allotment"; // 导入 Allotment 组件库
import "allotment/dist/style.css"; // 导入 Allotment 的必要样式
import Header from "./components/Header"; // 导入头部组件
import CodeEditor from "./components/CodeEditor"; // 导入代码编辑器组件
import Preview from "./components/Preview"; // 导入预览组件
import { useContext } from "react"; // 导入 React 的 useContext Hook
import { PlaygroundContext } from "./PlaygroundContext"; // 导入应用的上下文
import "./index.scss"; // 导入该组件的特定样式

// ReactPlayground 组件定义
export default function ReactPlayground() {
  // 从 PlaygroundContext 中获取当前主题 (theme) 和设置主题的方法 (setTheme)
  // 注意：虽然 setTheme 在这个组件中被解构出来，但实际上并未使用，可以移除以避免混淆
  const { theme } = useContext(PlaygroundContext);

  return (
    // 最外层的 div 容器
    // className={theme} 将当前主题 (如 'light' 或 'dark') 应用为 CSS 类名，用于全局主题切换
    // style={{ height: "100vh" }} 使容器高度占满整个视口
    <div className={theme} style={{ height: "100vh" }}>
      {/* 渲染 Header 组件 */}
      <Header />
      {/*
        使用 Allotment 组件实现可调整大小的左右分割布局。
        defaultSizes={[100, 100]} 设置左右两个窗格初始时各占一半的空间。
        (这里的比例单位由 Allotment 内部决定，通常表示相对大小或权重)
      */}
      <Allotment defaultSizes={[100, 100]}>
        {/* 左侧窗格 */}
        <Allotment.Pane minSize={200}>
          {/* 在左侧窗格中渲染 CodeEditor 组件 */}
          <CodeEditor />
        </Allotment.Pane>
        {/* 右侧窗格 */}
        <Allotment.Pane minSize={0}>
          {/* 在右侧窗格中渲染 Preview 组件 */}
          <Preview />
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}
