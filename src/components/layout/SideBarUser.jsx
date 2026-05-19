import Icon from '../ui/Icon'
import useAuthStore from '../../services/authStore'
import { useCurrentUserProfile } from '../../hooks/useUsers'
import styles from './SideBarUser.module.css'

export default function SidebarUser() {
    const { logout } = useAuthStore()
    const { data: profile, isLoading } = useCurrentUserProfile()

    const getInitials = () => {
        if (profile?.username) {
            return profile.username.substring(0, 2).toUpperCase()
        }
        return '??'
    }

    const displayName = isLoading ? 'Loading...' : profile?.username || 'User'

    const roleDisplay = profile?.loginProperty === 'ADMIN' ? 'Admin' :
        profile?.loginProperty === 'MODERATOR' ? 'Moderator' :
            'Member'

    return (
        <div className={styles.footer}>
            <div className={styles.userCard} title="Click to logout" onClick={logout}>
                <div className={styles.avatar}>{getInitials()}</div>
                <div className={styles.info}>
                    <div className={styles.name}>{displayName}</div>
                    <span className={styles.badge}>● {roleDisplay}</span>
                </div>
                <Icon name="moreHorizontal" size={14} className={styles.moreIcon} />
            </div>
        </div>
    )
}