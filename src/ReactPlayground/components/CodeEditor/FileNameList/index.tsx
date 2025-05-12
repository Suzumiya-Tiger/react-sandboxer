import { useContext, useEffect, useState } from "react";
import { PlaygroundContext } from "../../../PlaygroundContext";

import { FileNameItem } from "./FileNameItem";
import styles from "./index.module.scss";

export default function FileNameList() {
  const {
    files,
    selectedFileName,
    setSelectedFileName,
  } = useContext(PlaygroundContext);
  const [tabs, setTabs] = useState<string[]>([]);
  useEffect(() => {
    setTabs(Object.keys(files));
  }, [files]);
  return (
    <div className={styles.tabs}>
      {tabs.map((item, index) => {
        return (
          <FileNameItem
            key={item + index}
            value={item}
            actived={item === selectedFileName}
            onClick={() => {
              console.log("click", item);

              setSelectedFileName(item);
            }}
          />
        );
      })}
    </div>
  );
}
