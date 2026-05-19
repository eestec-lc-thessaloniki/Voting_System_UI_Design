import Icon from '../ui/Icon'
import styles from './TopBar.module.css'
import Breadcrumb from '../ui/BreadCrumb'
import RoleTag from '../ui/RoleTag'
import SearchBar from '../ui/SearchBar'
import IconButton from '../ui/IconButton'

export default function Topbar({ section = 'Dashboard', role = 'captain' }) {
    return (
        <header className={styles.topbar}>
            <div className={styles.left}>
                <Breadcrumb items={['EESTEC', section]} />
                <RoleTag role={role} />
            </div>
            <SearchBar placeholder="Search members, events…" />
            <div className={styles.actions}>
                <IconButton hasNotification>
                    <Icon name="bell" size={15} />
                </IconButton>
                <IconButton>
                    <Icon name="user" size={15} />
                </IconButton>
            </div>
        </header>
    )
}