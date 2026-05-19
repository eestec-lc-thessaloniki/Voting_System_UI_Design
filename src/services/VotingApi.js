import client from './axiosClient'

export const castVote = async (data) => {
    const response = await client.post('/voting/cast', data)
    return response.data
}

export const hasUserVoted = async (userId, pollId) => {
    const response = await client.get(`/voting/has-voted?userId=${userId}&pollId=${pollId}`)
    return response.data
}

export const getVoteCount = async (pollId) => {
    const response = await client.get(`/voting/count/${pollId}`)
    return response.data
}

export const getElectionResults = async (pollId) => {
    const response = await client.get(`/elections/results/${pollId}`)
    return response.data
}

export const getPollOptions = async (pollId) => {
    const response = await client.get(`/poll-options/poll/${pollId}`)
    return response.data
}

export const startNextRound = async ({ pollId, candidateIds, moderatorId }) => {
    const response = await client.post(`/elections/start-next-round/${pollId}`, {
        candidateIds,
        moderatorId,
    })
    return response.data
}