import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPollOptions, castVote, hasUserVoted, getVoteCount, getElectionResults, startNextRound } from '../services/VotingApi'

export function usePollOptions(pollId) {
    return useQuery({
        queryKey: ['pollOptions', pollId],
        queryFn: () => getPollOptions(pollId),
        enabled: !!pollId,
    })
}
export function useHasVoted(userId, pollId) {
    return useQuery({
        queryKey: ['hasVoted', userId, pollId],
        queryFn: () => hasUserVoted(userId, pollId),
        enabled: !!userId && !!pollId,
    })
}

export function useVoteCount(pollId) {
    return useQuery({
        queryKey: ['voteCount', pollId],
        queryFn: () => getVoteCount(pollId),
        enabled: !!pollId,
    })
}

export function useElectionResults(pollId) {
    return useQuery({
        queryKey: ['electionResults', pollId],
        queryFn: () => getElectionResults(pollId),
        enabled: !!pollId,
    })
}

export function useCastVote() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: castVote,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['hasVoted', variables.userId, variables.pollId] })
            queryClient.invalidateQueries({ queryKey: ['voteCount', variables.pollId] })
            queryClient.invalidateQueries({ queryKey: ['electionResults', variables.pollId] })
        },
    })
}

export function useStartNextRound() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: startNextRound,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['polls'] })
            queryClient.invalidateQueries({ queryKey: ['electionResults', variables.pollId] })
            queryClient.invalidateQueries({ queryKey: ['voteCount', variables.pollId] })
            queryClient.invalidateQueries({ queryKey: ['hasVoted'] })
        },
    })
}