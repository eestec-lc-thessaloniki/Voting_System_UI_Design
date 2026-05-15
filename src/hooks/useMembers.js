import { useQuery } from '@tanstack/react-query'
import { getMembershipSummary, getCommitteesSummary, getUserById } from '../services/MembersApi'

export function useMemberships() {
    return useQuery({
        queryKey: ['memberships'],
        queryFn: getMembershipSummary,
        staleTime: 5 * 60 * 1000,
    })
}

export function useCommittees() {
    return useQuery({
        queryKey: ['committees'],
        queryFn: getCommitteesSummary,
        staleTime: 5 * 60 * 1000,
    })
}

// Fetch full user record for a single member — used in MembersPage detail view
export function useUserById(id) {
    return useQuery({
        queryKey: ['user', id],
        queryFn: () => getUserById(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    })
}