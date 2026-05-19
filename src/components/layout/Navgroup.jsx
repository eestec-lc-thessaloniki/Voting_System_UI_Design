import styles from './Navgroup.module.css'
import NavItem from './NavItem'

export default function NavGroup({ group, active, onSelect }) {
    return (
        <div className={styles.group}>
            <div className={styles.label}>{group.group}</div>
            {group.items.map(item => (
                <NavItem key={item.id} item={item} active={active} onSelect={onSelect} />
            ))}
        </div>
    )
}