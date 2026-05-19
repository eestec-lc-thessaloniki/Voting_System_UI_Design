import styles from './MainPanel.module.css'
import Topbar from './TopBar'

export default function MainPanel({ children }) {
    return (
        <div className={styles.main}>
            <Topbar />
            {children}
        </div>
    )
}