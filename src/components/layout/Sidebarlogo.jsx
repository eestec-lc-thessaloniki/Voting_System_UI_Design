import styles from './Sidebarlogo.module.css'
import logoImg from '../../assets/eestec.logo.png'

export default function Sidebarlogo() {
    return (
        <div className={styles.logo}>
            <div className={styles.crest}>
                <img
                    src={logoImg}
                    alt="Logo"
                    className={styles.logoImage}
                />
            </div>
            <div>
                <div className={styles.name}>EESTEC</div>
                <div className={styles.sub}>2026</div>
            </div>
        </div>
    )
}