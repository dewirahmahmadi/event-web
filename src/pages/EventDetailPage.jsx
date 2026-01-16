import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { eventApi, registrationApi } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import {
  CalendarDays,
  MapPin,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Radio,
} from 'lucide-react'

const POLLING_INTERVAL = 3000 // 3 seconds for real-time updates on detail page

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [registering, setRegistering] = useState(false)
  const [registrationStatus, setRegistrationStatus] = useState(null) // 'success', 'error', 'already-registered'
  const [registrationMessage, setRegistrationMessage] = useState('')
  const [userRegistration, setUserRegistration] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchEvent = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const response = await eventApi.getById(id)
      if (response.data.success) {
        setEvent(response.data.results)
        setLastUpdated(new Date())
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
    if (!isAuthenticated || !user) return

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
    }
  }, [id, isAuthenticated, user])

  useEffect(() => {
    fetchEvent(true)
  }, [fetchEvent])

  useEffect(() => {
    checkUserRegistration()
  }, [checkUserRegistration])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchEvent(false)
    }, POLLING_INTERVAL)

    return () => clearInterval(interval)
  }, [fetchEvent])

  const handleRegister = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/events/${id}` } } })
      return
    }

    setRegistering(true)
    setRegistrationStatus(null)
    setRegistrationMessage('')

    try {
      const response = await registrationApi.create(id)
      if (response.data.success) {
        setRegistrationStatus('success')
        setRegistrationMessage('You have successfully registered for this event!')
        setUserRegistration(response.data.results)
        fetchEvent(false) // Refresh event data
      }
    } catch (err) {
      setRegistrationStatus('error')
      if (err.response?.status === 400) {
        const errorMsg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message
        if (errorMsg?.toLowerCase().includes('already registered')) {
          setRegistrationStatus('already-registered')
          setRegistrationMessage('You are already registered for this event.')
          checkUserRegistration()
        } else if (errorMsg?.toLowerCase().includes('full')) {
          setRegistrationMessage('Sorry, this event is now full.')
        } else {
          setRegistrationMessage(errorMsg || 'Registration failed. Please try again.')
        }
      } else {
        setRegistrationMessage('Registration failed. Please try again.')
      }
    } finally {
      setRegistering(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (startDate, endDate) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffMs = end - start
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    if (diffHours > 24) {
      const days = Math.floor(diffHours / 24)
      return `${days} day${days > 1 ? 's' : ''}`
    }
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes > 0 ? `${diffMinutes}m` : ''}`
    }
    return `${diffMinutes}m`
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" className="mb-6" disabled>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Events
        </Button>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full mt-2" />
            <Skeleton className="h-4 w-2/3 mt-1" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/events">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">{error}</h2>
            <p className="text-muted-foreground mb-4">The event you're looking for doesn't exist or has been removed.</p>
            <Link to="/events">
              <Button>Browse Events</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const startDate = new Date(event.startDate)
  const endDate = new Date(event.endDate)
  const isUpcoming = startDate > new Date()
  const isOngoing = startDate <= new Date() && endDate >= new Date()
  const isPast = endDate < new Date()
  const availableSpots = event.maxAttendees ? event.maxAttendees - event.currentRegistrations : null
  const isUserRegistered = !!userRegistration

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link to="/events">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Events
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl md:text-3xl">{event.title}</CardTitle>
              <CardDescription className="mt-2 text-base">
                {event.description || 'No description available'}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              {event.isFull && <Badge variant="destructive">Full</Badge>}
              {isOngoing && <Badge variant="success">Live Now</Badge>}
              {isUpcoming && !isOngoing && <Badge variant="secondary">Upcoming</Badge>}
              {isPast && <Badge variant="outline">Ended</Badge>}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CalendarDays className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Start</p>
                  <p className="text-muted-foreground">{formatDate(event.startDate)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CalendarDays className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">End</p>
                  <p className="text-muted-foreground">{formatDate(event.endDate)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-muted-foreground">{event.location}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Duration</p>
                  <p className="text-muted-foreground">{formatDuration(event.startDate, event.endDate)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Registration Status */}
          {registrationStatus && (
            <Alert variant={registrationStatus === 'success' ? 'success' : registrationStatus === 'already-registered' ? 'default' : 'destructive'}>
              {registrationStatus === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {registrationStatus === 'success' ? 'Registration Successful!' :
                 registrationStatus === 'already-registered' ? 'Already Registered' : 'Registration Failed'}
              </AlertTitle>
              <AlertDescription>{registrationMessage}</AlertDescription>
            </Alert>
          )}

          {/* User Registration Status */}
          {isUserRegistered && !registrationStatus && (
            <Alert variant="success">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>You're Registered!</AlertTitle>
              <AlertDescription>
                You registered for this event on {new Date(userRegistration.registeredAt).toLocaleDateString()}.
                {userRegistration.isAttending && ' You are marked as attending.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Join Live Button - Show when user is registered and event is ongoing */}
          {isUserRegistered && isOngoing && (
            <Link to={`/events/${id}/live`} className="block">
              <Button className="w-full bg-green-600 hover:bg-green-700">
                <Radio className="mr-2 h-4 w-4 animate-pulse" />
                Join Live Event
              </Button>
            </Link>
          )}

          {/* Registration Button */}
          <div className="flex gap-4">
            {isPast ? (
              <Button disabled className="flex-1">
                Event Has Ended
              </Button>
            ) : isUserRegistered ? (
              <Button disabled variant="secondary" className="flex-1">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Already Registered
              </Button>
            ) : event.isFull ? (
              <Button disabled className="flex-1">
                Event is Full
              </Button>
            ) : (
              <Button
                onClick={handleRegister}
                disabled={registering}
                className="flex-1"
              >
                {registering ? (
                  <>
                    <Spinner className="mr-2" />
                    Registering...
                  </>
                ) : isAuthenticated ? (
                  'Register for Event'
                ) : (
                  'Sign in to Register'
                )}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => fetchEvent(true)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
