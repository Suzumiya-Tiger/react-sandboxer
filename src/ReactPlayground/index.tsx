import { Allotment } from "allotment";
import "allotment/dist/style.css";
import Header from "./components/Header";
import CodeEditor from "./components/CodeEditor";
import Preview from "./components/Preview";
import { useContext } from "react";
import { PlaygroundContext } from './PlaygroundContext';
import './index.scss'


export default function ReactPlayground() {
  const { theme, setTheme } = useContext(PlaygroundContext);

  return (
    <div className={theme} style={{ height: "100vh" }}>
      <Header />
      {/* Allotment是react-use的组件，用于实现响应式布局 */}
      <Allotment defaultSizes={[100, 100]}>
        <Allotment.Pane minSize={200}>
          <CodeEditor />
        </Allotment.Pane>
        <Allotment.Pane minSize={0}>
          <Preview />
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}
