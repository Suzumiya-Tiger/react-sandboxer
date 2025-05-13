import logoSvg from '../icons/logo.svg'
import styles from './index.module.scss'
import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { useContext } from 'react'
import { PlaygroundContext } from '../../PlaygroundContext'
export default function Header() {
  const { theme, setTheme } = useContext(PlaygroundContext);
  return <div>
    <div>

      <div className={styles.header}>
        <div className={styles.logo}>
          <img alt="logo" src={logoSvg} />
          <span>React Playground</span>
        </div>
        <div className={styles.links}>
          {theme === 'light' && <MoonOutlined className={styles.theme} onClick={() => setTheme('dark')} />}
          {theme === 'dark' && <SunOutlined className={styles.theme} onClick={() => setTheme('light')} />}
        </div>
      </div>
    </div>
  </div>
}