import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { createPoll, getAllPolls, openPollVoting } from '../services/PollsApi'

export function usePolls() {
    return useQuery({
        queryKey: ['polls'],
        queryFn: getAllPolls,
        staleTime: 0,
        refetchInterval: 15 * 1000,
    })
}

export function useCreatePoll() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: createPoll,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['polls'] })
        },
    })
}

export function useOpenPollVoting() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: openPollVoting,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['polls'] })
        },
    })
}