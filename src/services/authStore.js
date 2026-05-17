import { create } from 'zustand'
import { authApi } from './authApi'

const useAuthStore = create((set) => ({
    user: authApi.getCurrentUser(),
    isAuthenticated: authApi.isAuthenticated(),
    isLoading: false,
    error: null,

    login: async (credentials) => {
        set({ isLoading: true, error: null })
        try {
            const data = await authApi.login(credentials)
            set({
                user: { username: data.username, role: data.role, userId: data.userId, loginProperty: data.loginProperty },
                isAuthenticated: true,
                isLoading: false
            })
            return data
        } catch (error) {
            set({
                error: error.response?.data?.message || 'Login failed',
                isLoading: false
            })
            throw error
        }
    },
    logout: () => {
        authApi.logout()
        set({ user: null, isAuthenticated: false })
    },

    clearError: () => set({ error: null }),
}))

export default useAuthStore