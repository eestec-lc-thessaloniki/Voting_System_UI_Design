import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    createAttendanceCheck,
    closeAttendanceCheck,
    openRound,
    closeRoundAndOpenVoting,
    checkIn,
    checkOut,
    getAttendanceSummary,
} from '../services/AttendanceApi'

// --- Attendance Check ---

export function useCreateAttendanceCheck() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (pollId) => createAttendanceCheck(pollId),
        onSuccess: (_, pollId) => {
            queryClient.invalidateQueries({ queryKey: ['polls'] })
            queryClient.invalidateQueries({ queryKey: ['attendanceSummary', pollId] })
        },
    })
}

export function useCloseAttendanceCheck() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (checkId) => closeAttendanceCheck(checkId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['polls'] })
        },
    })
}

// --- Rounds ---

export function useOpenRound() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ checkId, moderatorId }) => openRound(checkId, moderatorId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['polls'] })
        },
    })
}

export function useCloseRoundAndOpenVoting() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ roundId, moderatorId }) => closeRoundAndOpenVoting(roundId, moderatorId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['polls'] })
        },
    })
}

// --- Per-user check-in / check-out ---

export function useCheckIn() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ roundId, userId }) => checkIn({ roundId, userId }),
        onSuccess: (_, { pollId }) => {
            queryClient.invalidateQueries({ queryKey: ['attendanceSummary', pollId] })
        },
    })
}

export function useCheckOut() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ recordId }) => checkOut({ recordId }),
        onSuccess: (_, { pollId }) => {
            queryClient.invalidateQueries({ queryKey: ['attendanceSummary', pollId] })
        },
    })
}

// --- Summary (member status breakdown across all rounds for a poll) ---

export function useAttendanceSummary(pollId) {
    return useQuery({
        queryKey: ['attendanceSummary', pollId],
        queryFn: () => getAttendanceSummary(pollId),
        enabled: !!pollId,
        staleTime: 30 * 1000, // 30s — this changes frequently during a meeting
    })
}