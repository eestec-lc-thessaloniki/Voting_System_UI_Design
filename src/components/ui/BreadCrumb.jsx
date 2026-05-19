import styles from './BreadCrumb.module.css'

export default function Breadcrumb({ items }) {
    return (
        <div className={styles.breadcrumb}>
            {items.map((item, i) => (
                <span key={i}>
          {i > 0 && <span className={styles.sep}>/</span>}
                    <span className={i === items.length - 1 ? styles.active : ''}>{item}</span>
        </span>
            ))}
        </div>
    )
}