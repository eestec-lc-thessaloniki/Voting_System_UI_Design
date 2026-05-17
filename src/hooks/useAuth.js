import useAuthStore from '../services/authStore'

export function useAuth() {
    const { user } = useAuthStore()
    const isPrivileged = ['MODERATOR', 'ADMIN'].includes(user?.role)
    const isAdmin = user?.role === 'ADMIN'
    return { user, isPrivileged, isAdmin }
}