import logoSvg from "../icons/logo.svg";
import styles from "./index.module.scss";
import {
  DownloadOutlined,
  MoonOutlined,
  ShareAltOutlined,
  SunOutlined,
} from "@ant-design/icons";
import { useContext } from "react";
import { PlaygroundContext } from "../../PlaygroundContext";
import { message } from "antd";
import { downloadFiles } from "../../utils";
import copy from "copy-to-clipboard";
export default function Header() {
  const { theme, setTheme, files } = useContext(PlaygroundContext);

  return (
    <div>
      <div>
        <div className={styles.header}>
          <div className={styles.logo}>
            <img alt="logo" src={logoSvg} />
            <span>React Sandbox</span>
          </div>
          <div className={styles.links}>
            {theme === "light" && (
              <MoonOutlined
                className={styles.theme}
                onClick={() => setTheme("dark")}
              />
            )}
            {theme === "dark" && (
              <SunOutlined
                className={styles.theme}
                onClick={() => setTheme("light")}
              />
            )}
            <ShareAltOutlined
              style={{ marginLeft: "10px" }}
              onClick={() => {
                copy(window.location.href);
                message.success("分享链接已复制。");
              }}
            />
            <DownloadOutlined
              style={{ marginLeft: "10px" }}
              onClick={async () => {
                await downloadFiles(files);
                message.success("下载完成");
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
