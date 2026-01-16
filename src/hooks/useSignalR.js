import { useState, useEffect, useCallback, useRef } from 'react'
import * as signalR from '@microsoft/signalr'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5228'
const HUB_URL = `${API_BASE_URL}/eventhub`

export function useSignalR() {
  const [connection, setConnection] = useState(null)
  const [connectionState, setConnectionState] = useState('Disconnected')
  const [connectionId, setConnectionId] = useState(null)
  const [error, setError] = useState(null)
  const [events, setEvents] = useState([])
  const reconnectTimeoutRef = useRef(null)
  const connectionRef = useRef(null)
  const isConnectingRef = useRef(false)
  const isStoppingRef = useRef(false)

  const addEvent = useCallback((eventName, payload) => {
    setEvents((prev) => [
      {
        id: Date.now() + Math.random(),
        name: eventName,
        payload,
        timestamp: new Date(),
      },
      ...prev,
    ].slice(0, 100))
  }, [])

  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  const buildConnection = useCallback(() => {
    const token = localStorage.getItem('accessToken')

    const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL, {
          accessTokenFactory: () => token,
          withCredentials: true,
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Information)
        .build()

    return newConnection
  }, [])

  const startConnection = useCallback(async () => {
    if (isConnectingRef.current) {
      return
    }

    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      return
    }

    if (connectionRef.current?.state === signalR.HubConnectionState.Connecting) {
      return
    }

    isConnectingRef.current = true
    isStoppingRef.current = false

    try {
      setError(null)
      const newConnection = buildConnection()
      connectionRef.current = newConnection

      newConnection.onreconnecting((err) => {
        setConnectionState('Reconnecting')
        setError(err?.message || 'Connection lost, attempting to reconnect...')
        addEvent('System', { message: 'Reconnecting...', error: err?.message })
      })

      newConnection.onreconnected((connectionId) => {
        setConnectionState('Connected')
        setConnectionId(connectionId)
        setError(null)
        addEvent('System', { message: 'Reconnected', connectionId })
      })

      newConnection.onclose((err) => {
        setConnectionState('Disconnected')
        setConnectionId(null)
        isStoppingRef.current = false
        if (err) {
          setError(err.message)
          addEvent('System', { message: 'Disconnected', error: err.message })
        } else {
          addEvent('System', { message: 'Disconnected' })
        }
      })

      newConnection.on('Connected', (data) => {
        setConnectionId(data.connectionId)
        addEvent('Connected', data)
      })

      newConnection.on('JoinedEvent', (data) => {
        addEvent('JoinedEvent', data)
      })

      newConnection.on('LeftEvent', (data) => {
        addEvent('LeftEvent', data)
      })

      newConnection.on('UserJoined', (data) => {
        addEvent('UserJoined', data)
      })

      newConnection.on('UserLeft', (data) => {
        addEvent('UserLeft', data)
      })

      setConnectionState('Connecting')
      await newConnection.start()
      setConnectionState('Connected')
      setConnection(newConnection)
      isConnectingRef.current = false
      addEvent('System', { message: 'Connected to SignalR hub' })
    } catch (err) {
      isConnectingRef.current = false
      setConnectionState('Disconnected')
      setError(err.message)
      addEvent('System', { message: 'Connection failed', error: err.message })

      reconnectTimeoutRef.current = setTimeout(() => {
        startConnection()
      }, 5000)
    }
  }, [buildConnection, addEvent])

  const stopConnection = useCallback(async () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    isConnectingRef.current = false
    isStoppingRef.current = true

    if (connectionRef.current) {
      try {
        const currentState = connectionRef.current.state
        if (currentState !== signalR.HubConnectionState.Disconnected &&
            currentState !== signalR.HubConnectionState.Disconnecting) {
          await connectionRef.current.stop()
        }
      } catch (err) {
        console.error('Error stopping connection:', err)
      } finally {
        connectionRef.current = null
        setConnection(null)
        setConnectionState('Disconnected')
        setConnectionId(null)
        isStoppingRef.current = false
      }
    }
  }, [])

  const joinEvent = useCallback(async (eventId, userId) => {
    if (connectionRef.current?.state !== signalR.HubConnectionState.Connected) {
      throw new Error('Not connected to SignalR hub')
    }

    try {
      await connectionRef.current.invoke('JoinEvent', eventId, userId)
    } catch (err) {
      setError(`Failed to join event: ${err.message}`)
      throw err
    }
  }, [])

  const leaveEvent = useCallback(async (eventId, userId) => {
    if (!connectionRef.current || isStoppingRef.current) {
      console.log('Skipping leaveEvent - connection already stopping or null')
      return
    }

    const currentState = connectionRef.current.state

    if (currentState !== signalR.HubConnectionState.Connected) {
      console.log(`Skipping leaveEvent - connection state is: ${currentState}`)
      return
    }

    try {
      const leavePromise = connectionRef.current.invoke('LeaveEvent', eventId, userId)
      const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('LeaveEvent timeout')), 3000)
      )

      await Promise.race([leavePromise, timeoutPromise])
    } catch (err) {
      console.warn('Error leaving event (expected during cleanup):', err.message)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (connectionRef.current) {
        connectionRef.current.stop().catch(err => {
          console.error('Error during unmount cleanup:', err)
        })
      }
    }
  }, [])

  return {
    connection,
    connectionState,
    connectionId,
    error,
    events,
    isConnected: connectionState === 'Connected',
    isConnecting: connectionState === 'Connecting',
    isReconnecting: connectionState === 'Reconnecting',
    startConnection,
    stopConnection,
    joinEvent,
    leaveEvent,
    clearEvents,
  }
}