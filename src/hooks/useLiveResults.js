import { useEffect, useRef, useState } from 'react'
import { fetchEventSource } from '@microsoft/fetch-event-source'

/**
 * useLiveResults
 *
 * Connects to GET /api/elections/results/{pollId}/stream via SSE.
 * Uses @microsoft/fetch-event-source to support JWT Authorization header.
 *
 * Auto-disconnects when:
 *   - component unmounts
 *   - enabled flips to false (poll status left VOTING_OPEN)
 *
 * @param {number|string} pollId
 * @param {boolean} enabled  — pass (poll.status === 'VOTING_OPEN')
 */
export function useLiveResults(pollId, enabled = true) {
    const [results, setResults]     = useState(null)
    const [connected, setConnected] = useState(false)
    const [error, setError]         = useState(null)

    // AbortController to cancel the fetch-event-source request
    const abortRef = useRef(null)

    useEffect(() => {
        // Kill any existing connection first
        if (abortRef.current) {
            abortRef.current.abort()
            abortRef.current = null
            setConnected(false)
        }

        if (!pollId || !enabled) return

        const controller = new AbortController()
        abortRef.current = controller

        const token = localStorage.getItem('token')
        const url   = `http://localhost:8080/api/elections/results/${pollId}/stream`

        fetchEventSource(url, {
            signal: controller.signal,
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'text/event-stream',
            },

            onopen(response) {
                if (response.ok) {
                    setConnected(true)
                    setError(null)
                } else if (response.status === 401) {
                    // Token expired — same behaviour as axiosClient
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    window.location.href = '/login'
                    throw new Error('Unauthorized')
                } else {
                    throw new Error(`SSE open failed: ${response.status}`)
                }
            },

            onmessage(event) {
                // Backend emits: event: result, data: <JSON>
                if (!event.data) return
                try {
                    const data = JSON.parse(event.data)
                    setResults(data)
                } catch {
                    // heartbeat / non-JSON ping — ignore
                }
            },

            onerror(err) {
                if (controller.signal.aborted) return // intentional close
                setConnected(false)
                setError('Live results connection lost.')
                // Throw to stop auto-retry
                throw err
            },

            openWhenHidden: true,
        })

        return () => {
            controller.abort()
            abortRef.current = null
            setConnected(false)
        }
    }, [pollId, enabled])

    const totalVotes = results?.candidates?.reduce(
        (sum, c) => sum + (c.forVotes ?? 0) + (c.againstVotes ?? 0) + (c.blankVotes ?? 0),
        0
    ) ?? 0

    return { results, totalVotes, connected, error }
}