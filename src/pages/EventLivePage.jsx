import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { eventApi, registrationApi } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { useSignalR } from '@/hooks/useSignalR'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  ArrowLeft,
  Wifi,
  WifiOff,
  Users,
  Bell,
  UserPlus,
  UserMinus,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  Calendar,
  AlertCircle,
} from 'lucide-react'

const EVENT_ICONS = {
  Connected: Wifi,
  JoinedEvent: CheckCircle2,
  LeftEvent: XCircle,
  UserJoined: UserPlus,
  UserLeft: UserMinus,
  RegistrationCreated: UserPlus,
  RegistrationCancelled: XCircle,
  AttendeeCheckedIn: CheckCircle2,
  CapacityUpdate: Users,
  EventUpdated: RefreshCw,
  EventDeleted: Trash2,
  System: Bell,
}

const EVENT_COLORS = {
  Connected: 'text-green-500',
  JoinedEvent: 'text-green-500',
  LeftEvent: 'text-yellow-500',
  UserJoined: 'text-blue-500',
  UserLeft: 'text-orange-500',
  RegistrationCreated: 'text-green-500',
  RegistrationCancelled: 'text-red-500',
  AttendeeCheckedIn: 'text-green-500',
  CapacityUpdate: 'text-blue-500',
  EventUpdated: 'text-purple-500',
  EventDeleted: 'text-red-500',
  System: 'text-gray-500',
}

export default function EventLivePage() {
  const { id } = useParams()
  const { isAuthenticated, user } = useAuth()

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [registrationLoading, setRegistrationLoading] = useState(true)
  const [error, setError] = useState('')
  const [userRegistration, setUserRegistration] = useState(null)
  const [viewerCount, setViewerCount] = useState(0)
  const processedEventsRef = useRef(new Set())
  const hasJoinedRef = useRef(false)
  const isLeavingRef = useRef(false)
  const recentJoinsRef = useRef(new Map()) // Track recent joins to detect StrictMode

  const {
    connectionState,
    connectionId,
    error: signalRError,
    events,
    isConnected,
    isConnecting,
    isReconnecting,
    startConnection,
    stopConnection,
    joinEvent,
    leaveEvent,
    clearEvents,
  } = useSignalR()

  const fetchEvent = useCallback(async () => {
    try {
      const response = await eventApi.getById(id)
      if (response.data.success) {
        setEvent(response.data.results)
      } else {
        setError('Event not found')
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Event not found')
      } else {
        setError('Failed to load event details')
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  const checkUserRegistration = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setRegistrationLoading(false)
      return
    }

    try {
      const response = await registrationApi.getByEventId(id)
      if (response.data.success) {
        const userReg = response.data.results.data.find(
            (reg) => reg.userId === user.userId
        )
        setUserRegistration(userReg || null)
      }
    } catch (err) {
      console.error('Failed to check registration status', err)
    } finally {
      setRegistrationLoading(false)
    }
  }, [id, isAuthenticated, user])

  useEffect(() => {
    fetchEvent()
    checkUserRegistration()
  }, [fetchEvent, checkUserRegistration])

  useEffect(() => {
    if (!loading && !registrationLoading && event) {
      const now = new Date()
      const startDate = new Date(event.startDate)
      const endDate = new Date(event.endDate)

      if (!userRegistration && isAuthenticated) {
        setError('You must be registered for this event to access the live page')
        return
      }
      if (now < startDate || now > endDate) {
        setError('This event is not currently live')
      }
    }
  }, [loading, registrationLoading, event, userRegistration, isAuthenticated])

  useEffect(() => {
    let isMounted = true

    if (!loading && !registrationLoading && event && userRegistration && !error) {
      const initializeSignalR = async () => {
        if (isMounted) {
          await startConnection()
        }
      }
      initializeSignalR()
    }

    return () => {
      isMounted = false

      if (hasJoinedRef.current && !isLeavingRef.current && user) {
        isLeavingRef.current = true

        leaveEvent(id, user.userId)
            .then(() => {
              console.log('Successfully left event group')
            })
            .catch((err) => {
              console.error('Failed to leave event:', err)
            })
            .finally(() => {
              hasJoinedRef.current = false

              setTimeout(() => {
                stopConnection()
                clearEvents()
                processedEventsRef.current.clear()
                isLeavingRef.current = false
              }, 100)
            })
      } else {
        stopConnection()
      }
    }
  }, [loading, registrationLoading, event, userRegistration, error, startConnection, stopConnection, leaveEvent, id])

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasJoinedRef.current && isConnected && user) {
        leaveEvent(id, user.userId)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [id, isConnected, leaveEvent, user])

  useEffect(() => {
    if (isConnected && id && !error && !hasJoinedRef.current && !isLeavingRef.current && user) {
      hasJoinedRef.current = true
      const joinGroup = async () => {
        try {
          await joinEvent(id, user.userId)
          console.log('Successfully joined event group')
        } catch (err) {
          console.error('Failed to join event:', err)
          hasJoinedRef.current = false
        }
      }
      joinGroup()
    }
  }, [isConnected, id, error, joinEvent, user])


  useEffect(() => {
    if (events.length === 0) return

    const latestEvent = events[0]

    if (processedEventsRef.current.has(latestEvent.id)) {
      console.log('⏭️ Skipping already processed event:', latestEvent.id)
      return
    }
    processedEventsRef.current.add(latestEvent.id)

    console.log('📊 Processing event:', {
      name: latestEvent.name,
      payload: latestEvent.payload,
      isLeaving: isLeavingRef.current,
      currentViewerCount: viewerCount
    })

    if (latestEvent.name === 'UserJoined' && latestEvent.payload?.currentViewers !== undefined) {
      const userId = latestEvent.payload.userId
      const connectionId = latestEvent.payload.connectionId

      recentJoinsRef.current.set(connectionId, Date.now())

      for (const [connId, timestamp] of recentJoinsRef.current.entries()) {
        if (Date.now() - timestamp > 2000) {
          recentJoinsRef.current.delete(connId)
        }
      }

      setViewerCount(latestEvent.payload.currentViewers)
    }
    else if (latestEvent.name === 'UserLeft' && latestEvent.payload?.currentViewers !== undefined) {
      const connectionId = latestEvent.payload.connectionId
      const recentJoinTime = recentJoinsRef.current.get(connectionId)

      if (recentJoinTime && Date.now() - recentJoinTime < 500) {
        recentJoinsRef.current.delete(connectionId)
        return
      }

      if (!isLeavingRef.current) {
        setViewerCount(latestEvent.payload.currentViewers)
        recentJoinsRef.current.delete(connectionId)
      } else {
        console.log('⏭️ Skipping UserLeft update - we are leaving')
      }
    }
  }, [events, viewerCount])

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getConnectionBadge = () => {
    switch (connectionState) {
      case 'Connected':
        return <Badge variant="success">Connected</Badge>
      case 'Connecting':
        return <Badge variant="warning">Connecting...</Badge>
      case 'Reconnecting':
        return <Badge variant="warning">Reconnecting...</Badge>
      default:
        return <Badge variant="destructive">Disconnected</Badge>
    }
  }

  if (loading || registrationLoading) {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button variant="ghost" className="mb-6" disabled>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Event
          </Button>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
    )
  }

  if (error) {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Link to={`/events/${id}`}>
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Event
            </Button>
          </Link>
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Link to={`/events/${id}`}>
                <Button>Return to Event Details</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
    )
  }

  return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to={`/events/${id}`}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Event
          </Button>
        </Link>

        {/* Event Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                  {event.title}
                </CardTitle>
                <CardDescription className="mt-2">
                  Live Event Dashboard
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2">
                {getConnectionBadge()}
                {connectionId && (
                    <span className="text-xs text-muted-foreground">
                  ID: {connectionId.substring(0, 8)}...
                </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Live Viewers Card */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Live Viewers</span>
                </div>
                <p className="text-3xl font-bold flex items-center gap-2">
                  {viewerCount}
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Currently viewing this event
                </p>
              </div>

              {/* Connection Status */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {isConnected ? (
                      <Wifi className="h-5 w-5 text-green-500" />
                  ) : (
                      <WifiOff className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">Connection</span>
                </div>
                <p className="text-lg font-semibold">{connectionState}</p>
                {signalRError && (
                    <p className="text-sm text-destructive mt-1">{signalRError}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real-time Events Feed */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Live Activity Feed
              </CardTitle>
              <Badge variant="outline">{events.length} events</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No events yet. Activity will appear here in real-time.</p>
                </div>
            ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {events.map((event) => {
                    const Icon = EVENT_ICONS[event.name] || Bell
                    const colorClass = EVENT_COLORS[event.name] || 'text-gray-500'

                    return (
                        <div
                            key={event.id}
                            className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <Icon className={`h-5 w-5 mt-0.5 ${colorClass}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{event.name}</span>
                              <span className="text-xs text-muted-foreground">
                          {formatTime(event.timestamp)}
                        </span>
                            </div>
                            <pre className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-all font-mono bg-muted/50 rounded p-2">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                          </div>
                        </div>
                    )
                  })}
                </div>
            )}
          </CardContent>
        </Card>

        {/* Connection Error Alert */}
        {signalRError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>{signalRError}</AlertDescription>
            </Alert>
        )}
      </div>
  )
}