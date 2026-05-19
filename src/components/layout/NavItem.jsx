import Icon from '../ui/Icon'
import styles from './NavItem.module.css'

const iconMap = {
    'grid': 'grid',
    'calendar': 'calendar',
    'check': 'check',
    'users': 'users',
    'message': 'message',
    'bar-chart': 'barChart',
    'settings': 'settings',
    'user-check': 'userCheck',
    'user': 'user',
}

export default function NavItem({ item, active, onSelect }) {
    const isActive = active === item.id

    return (
        <div
            onClick={() => onSelect(item.id)}
            className={`${styles.item} ${isActive ? styles.active : ''}`}
        >
            {isActive && <span className={styles.indicator} />}
            <Icon name={iconMap[item.icon]} className={styles.icon} />
            {item.label}
            {item.chip && (
                <span className={`${styles.chip} ${item.chipColor === 'green' ? styles.chipGreen : ''}`}>
          {item.chip}
        </span>
            )}
        </div>
    )
}