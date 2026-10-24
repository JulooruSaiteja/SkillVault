import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAuth from '../hooks/useAuth';

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0m';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins > 0 ? `${remMins}m` : ''}`.trim();
  }
  return `${mins}m ${secs > 0 ? `${secs}s` : ''}`.trim();
}

export function VideoPage() {
  const { videoId } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [video, setVideo] = useState(null);
  const [playlistContext, setPlaylistContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'notes' | 'quiz' | 'transcript'
  const [playerError, setPlayerError] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

  // Playback & progress states
  const [isCompleted, setIsCompleted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  const playerContainerRef = useRef(null);
  const playerRef = useRef(null);
  const saveIntervalRef = useRef(null);
  const lastSavedPositionRef = useRef(0);
  const videoRef = useRef(null);

  const fetchVideoData = useCallback(async () => {
    if (!videoId) return;
    setLoading(true);
    setError(null);
    setPlayerError(false);
    setPlayerReady(false);

    try {
      const res = await api.get(`/videos/${encodeURIComponent(videoId)}`);
      setVideo(res?.data?.video || null);
      setPlaylistContext(res?.data?.playlistContext || null);
    } catch (err) {
      setError(err.message || 'Failed to load video lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    fetchVideoData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fetchVideoData]);

  // Sync progress & bookmark state when video data is loaded
  useEffect(() => {
    videoRef.current = video;
    if (video) {
      const savedPos = video.userProgress?.lastPositionSeconds || 0;
      const completed = Boolean(video.userProgress?.isCompleted);
      setIsCompleted(completed);
      setIsBookmarked(Boolean(video.isBookmarked));
      setCurrentPosition(savedPos);
      lastSavedPositionRef.current = savedPos;
      // Show resume prompt if learner has watched at least 5 seconds
      setShowResumePrompt(savedPos > 5);
    }
  }, [video]);

  // Save playback progress to backend
  const savePlaybackProgress = useCallback(
    async (seconds) => {
      const currentVid = videoRef.current;
      if (!isAuthenticated || !currentVid?._id) return;

      const sec = Math.floor(seconds);
      const duration = currentVid.durationSeconds || 0;
      const isNinety = duration > 0 && sec >= 0.9 * duration;

      // Throttle: don't save if position has not moved by at least 2s unless 90% reached
      if (Math.abs(sec - lastSavedPositionRef.current) < 2 && !isNinety) {
        return;
      }

      try {
        lastSavedPositionRef.current = sec;
        const res = await api.post('/progress', {
          videoId: currentVid._id,
          lastPositionSeconds: sec,
          durationSeconds: duration
        });

        if (res?.data?.progress?.isCompleted) {
          setIsCompleted(true);
        }
      } catch (err) {
        console.warn('Playback progress save notice:', err.message);
      }
    },
    [isAuthenticated]
  );

  // Handle YouTube player state changes
  const handleStateChange = useCallback(
    (event) => {
      if (!window.YT) return;
      const state = event.data;

      // PLAYING (1): start 5-second interval
      if (state === window.YT.PlayerState.PLAYING) {
        if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = setInterval(() => {
          if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
            const time = playerRef.current.getCurrentTime();
            const dur = videoRef.current?.durationSeconds || 0;
            setCurrentPosition(Math.floor(time));

            if (dur > 0 && time >= 0.9 * dur) {
              setIsCompleted(true);
            }
            savePlaybackProgress(time);
          }
        }, 5000);
      }
      // PAUSED (2): clear interval and save position immediately
      else if (state === window.YT.PlayerState.PAUSED) {
        if (saveIntervalRef.current) {
          clearInterval(saveIntervalRef.current);
          saveIntervalRef.current = null;
        }
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          const time = playerRef.current.getCurrentTime();
          setCurrentPosition(Math.floor(time));
          savePlaybackProgress(time);
        }
      }
      // ENDED (0): clear interval and save 100% position (marks complete)
      else if (state === window.YT.PlayerState.ENDED) {
        if (saveIntervalRef.current) {
          clearInterval(saveIntervalRef.current);
          saveIntervalRef.current = null;
        }
        const dur = videoRef.current?.durationSeconds || 0;
        setCurrentPosition(dur);
        setIsCompleted(true);
        savePlaybackProgress(dur);
      }
    },
    [savePlaybackProgress]
  );

  // Resume handlers
  const handleResume = useCallback(() => {
    const savedPos = video?.userProgress?.lastPositionSeconds || 0;
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(savedPos, true);
      if (typeof playerRef.current.playVideo === 'function') {
        playerRef.current.playVideo();
      }
    }
    setShowResumePrompt(false);
  }, [video]);

  const handleStartFromBeginning = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(0, true);
    }
    setShowResumePrompt(false);
  }, []);

  // Initialize YouTube IFrame Player API
  useEffect(() => {
    if (!video || !video.youtubeVideoId) return;

    let isMounted = true;
    let fallbackTimeout = null;

    function initPlayer() {
      if (!isMounted || !window.YT || !window.YT.Player || !playerContainerRef.current) return;

      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }

      try {
        const savedOffset = video.userProgress?.lastPositionSeconds || 0;
        playerRef.current = new window.YT.Player(playerContainerRef.current, {
          videoId: video.youtubeVideoId,
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            enablejsapi: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            origin: window.location.origin,
            start: savedOffset > 5 ? Math.floor(savedOffset) : 0
          },
          events: {
            onReady: () => {
              if (isMounted) setPlayerReady(true);
            },
            onStateChange: (event) => {
              if (isMounted) handleStateChange(event);
            },
            onError: () => {
              if (isMounted) setPlayerError(true);
            }
          }
        });
      } catch (err) {
        console.warn('YouTube Player initialization error:', err);
        if (isMounted) setPlayerError(true);
      }
    }

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScript = document.getElementsByTagName('script')[0];
        if (firstScript && firstScript.parentNode) {
          firstScript.parentNode.insertBefore(tag, firstScript);
        } else {
          document.head.appendChild(tag);
        }
      }

      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === 'function') prevCallback();
        if (isMounted) initPlayer();
      };

      fallbackTimeout = setTimeout(() => {
        if (isMounted && (!window.YT || !playerRef.current)) {
          // Fallback iframe will remain rendered if API script is delayed or blocked
        }
      }, 3500);
    }

    return () => {
      isMounted = false;
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [video?.youtubeVideoId, handleStateChange]);

  // Toggle bookmark for video
  const handleToggleBookmark = useCallback(async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!video?._id || bookmarkLoading) return;

    setBookmarkLoading(true);
    try {
      if (isBookmarked) {
        await api.delete(`/bookmarks/${video._id}`);
        setIsBookmarked(false);
      } else {
        await api.post('/bookmarks', { videoId: video._id });
        setIsBookmarked(true);
      }
    } catch (err) {
      console.warn('Bookmark toggle error:', err.message);
    } finally {
      setBookmarkLoading(false);
    }
  }, [isAuthenticated, video, isBookmarked, bookmarkLoading, navigate]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }} aria-busy="true" aria-live="polite">
        <p style={{ color: 'var(--color-text-muted)' }}>Loading video lesson &amp; player...</p>
      </div>
    );
  }

  if (error || !video) {
    return (
      <section>
        <div
          role="alert"
          style={{
            maxWidth: '600px',
            margin: '3rem auto',
            padding: '1.5rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            textAlign: 'center'
          }}
        >
          <h2 style={{ fontSize: '1.25rem', color: '#f87171', marginBottom: '0.75rem' }}>Video Unavailable</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
            {error || 'This video could not be found or has been deactivated.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button type="button" onClick={fetchVideoData} className="btn btn-secondary">
              Retry
            </button>
            <Link to="/categories" className="btn btn-primary">
              Browse Catalog
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const skill = video.skill;
  const category = skill?.category;
  const playlist = playlistContext?.playlist;
  const progressPct = video.durationSeconds > 0
    ? Math.min(100, Math.round((currentPosition / video.durationSeconds) * 100))
    : 0;

  // Embedded YouTube URL using privacy-enhanced domain as baseline
  const embedUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.youtubeVideoId)}?enablejsapi=1&rel=0&modestbranding=1`;

  return (
    <section>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: '1.25rem', fontSize: '0.875rem' }}>
        <ol style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', listStyle: 'none', padding: 0, margin: 0, flexWrap: 'wrap' }}>
          <li>
            <Link to="/categories" style={{ color: 'var(--color-text-muted)' }}>
              Categories
            </Link>
          </li>
          {category && (
            <>
              <li style={{ color: 'var(--color-text-dim)' }} aria-hidden="true">/</li>
              <li>
                <Link to="/categories" style={{ color: 'var(--color-text-muted)' }}>
                  {category.name}
                </Link>
              </li>
            </>
          )}
          {skill && (
            <>
              <li style={{ color: 'var(--color-text-dim)' }} aria-hidden="true">/</li>
              <li>
                <Link to={`/skills/${skill.slug}`} style={{ color: 'var(--color-text-muted)' }}>
                  {skill.name}
                </Link>
              </li>
            </>
          )}
          {playlist && (
            <>
              <li style={{ color: 'var(--color-text-dim)' }} aria-hidden="true">/</li>
              <li>
                <Link to={`/playlists/${playlist._id}`} style={{ color: 'var(--color-text-muted)' }}>
                  {playlist.title}
                </Link>
              </li>
            </>
          )}
          <li style={{ color: 'var(--color-text-dim)' }} aria-hidden="true">/</li>
          <li style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{video.title}</li>
        </ol>
      </nav>

      {/* Main Grid: Player & Details (left) + Playlist Curriculum Queue (right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: playlistContext ? 'minmax(0, 2fr) minmax(300px, 1fr)' : '1fr',
          gap: '2rem',
          alignItems: 'start'
        }}
      >
        {/* Left Column: Player, Actions, Details, Shells */}
        <div>
          {/* Resume Prompt Banner */}
          {isAuthenticated && showResumePrompt && (video.userProgress?.lastPositionSeconds || 0) > 5 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                marginBottom: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>📍</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text)' }}>
                  You were watching at{' '}
                  <strong style={{ color: 'var(--color-primary)' }}>
                    {formatDuration(video.userProgress.lastPositionSeconds)}
                  </strong>
                  {video.durationSeconds > 0 &&
                    ` (${Math.min(100, Math.round((video.userProgress.lastPositionSeconds / video.durationSeconds) * 100))}%)`}
                  .
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  onClick={handleResume}
                >
                  Resume from {formatDuration(video.userProgress.lastPositionSeconds)}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  onClick={handleStartFromBeginning}
                >
                  Start from beginning
                </button>
              </div>
            </div>
          )}

          {/* Responsive 16:9 YouTube Embedded Player */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              paddingTop: '56.25%', // 16:9 Aspect Ratio
              backgroundColor: '#000',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
              marginBottom: '0.75rem'
            }}
          >
            {!playerError ? (
              <>
                {/* Mount element for YouTube Player API */}
                <div
                  ref={playerContainerRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%'
                  }}
                />
                {/* Fallback iframe in case API script did not initialize */}
                {!playerReady && (
                  <iframe
                    src={embedUrl}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    onError={() => setPlayerError(true)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: 'none'
                    }}
                  />
                )}
              </>
            ) : (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem',
                  textAlign: 'center',
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  color: 'var(--color-text-muted)'
                }}
              >
                <p style={{ color: '#f87171', marginBottom: '0.75rem', fontWeight: 600 }}>
                  Embedded YouTube Player Notice
                </p>
                <p style={{ fontSize: '0.9rem', maxWidth: '450px', marginBottom: '1rem' }}>
                  If the video is private, restricted by YouTube embedding policies, or unavailable, you can open it directly.
                </p>
                <a
                  href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem' }}
                >
                  Watch on YouTube ↗
                </a>
              </div>
            )}
          </div>

          {/* Playback Progress Status Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              color: 'var(--color-text-muted)',
              marginBottom: '1.25rem',
              padding: '0 0.25rem',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            <div>
              <span>Playback position: </span>
              <strong style={{ color: 'var(--color-text)' }}>
                {formatDuration(currentPosition)}
              </strong>
              {video.durationSeconds > 0 && (
                <>
                  <span> / {formatDuration(video.durationSeconds)}</span>
                  <span> ({progressPct}%)</span>
                </>
              )}
            </div>

            {isCompleted ? (
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                ✓ Completed (≥90% watched)
              </span>
            ) : isAuthenticated ? (
              <span style={{ color: 'var(--color-text-dim)' }}>
                (Automatically saves as you watch • 90% marks complete)
              </span>
            ) : (
              <span style={{ color: 'var(--color-text-dim)' }}>
                <Link to="/login" style={{ color: 'var(--color-primary)' }}>
                  Sign in
                </Link>{' '}
                to save playback progress and resume on any device
              </span>
            )}
          </div>

          {/* Video Header & Controls */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {skill && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--color-primary)',
                      backgroundColor: 'rgba(56, 189, 248, 0.1)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    {skill.name}
                  </span>
                )}
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  ⏱️ {formatDuration(video.durationSeconds)}
                </span>
                {video.hasTranscript ? (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: 'var(--color-success)',
                      backgroundColor: 'rgba(52, 211, 153, 0.1)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    ✓ Transcript Available
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-text-dim)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-sm)'
                    }}
                    title="AI features will use video metadata fallback"
                  >
                    Metadata Fallback
                  </span>
                )}
                {isCompleted && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--color-success)',
                      backgroundColor: 'rgba(52, 211, 153, 0.15)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    ✓ Completed (90%+)
                  </span>
                )}
              </div>

              {/* Action Buttons: Playlist Nav & Bookmark Shell */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {playlistContext?.previousVideo && (
                  <button
                    type="button"
                    onClick={() => navigate(`/videos/${playlistContext.previousVideo._id}`)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    title={`Previous: ${playlistContext.previousVideo.title}`}
                  >
                    &larr; Prev
                  </button>
                )}
                {playlistContext?.nextVideo && (
                  <button
                    type="button"
                    onClick={() => navigate(`/videos/${playlistContext.nextVideo._id}`)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    title={`Next: ${playlistContext.nextVideo.title}`}
                  >
                    Next &rarr;
                  </button>
                )}
                <button
                  type="button"
                  className={`btn ${isBookmarked ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.35rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                  title={
                    !isAuthenticated
                      ? 'Sign in to bookmark this video lesson'
                      : isBookmarked
                      ? 'Remove from personal bookmarks'
                      : 'Save to personal bookmarks'
                  }
                  aria-pressed={isBookmarked}
                  aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark video'}
                  disabled={bookmarkLoading}
                  onClick={handleToggleBookmark}
                >
                  <span>{isBookmarked ? '🔖 Bookmarked' : '🔖 Bookmark'}</span>
                </button>
              </div>
            </div>

            <h1 style={{ fontSize: '1.45rem', margin: '0.5rem 0 1rem 0' }}>
              {video.title}
            </h1>

            {/* Feature Shell Tabs */}
            <div
              role="tablist"
              aria-label="Video lesson information"
              style={{
                display: 'flex',
                gap: '0.5rem',
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: '0.5rem',
                marginBottom: '1rem',
                flexWrap: 'wrap'
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'overview'}
                onClick={() => setActiveTab('overview')}
                className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
              >
                Overview
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'notes'}
                onClick={() => setActiveTab('notes')}
                className={`btn ${activeTab === 'notes' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
              >
                AI Notes
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'quiz'}
                onClick={() => setActiveTab('quiz')}
                className={`btn ${activeTab === 'quiz' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
              >
                AI Practice Quiz
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'transcript'}
                onClick={() => setActiveTab('transcript')}
                className={`btn ${activeTab === 'transcript' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
              >
                Transcript
              </button>
            </div>

            {/* Tab: Overview */}
            {activeTab === 'overview' && (
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--color-text-dim)' }}>
                  Lesson Summary
                </h3>
                <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                  {video.description || 'No detailed description provided for this lesson.'}
                </p>
              </div>
            )}

            {/* Tab: AI Notes Shell (Phase 13) */}
            {activeTab === 'notes' && (
              <div style={{ padding: '1rem 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>Grounded AI Notes</h3>
                  {video.hasTranscript ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>
                      • Grounding: Video Transcript
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)' }}>
                      • Grounding: Metadata Fallback (Transcript unavailable)
                    </span>
                  )}
                </div>
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px dashed var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.5rem',
                    textAlign: 'center'
                  }}
                >
                  <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                    AI-powered structured video notes (summary, definitions, key concepts, and takeaways) will be active in <strong>Phase 13</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Tab: AI Quiz Shell (Phase 14) */}
            {activeTab === 'quiz' && (
              <div style={{ padding: '1rem 0' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Conceptual Retention Quiz</h3>
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px dashed var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.5rem',
                    textAlign: 'center'
                  }}
                >
                  <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                    AI-generated multiple-choice questions with server-side grading and explanation feedback will be active in <strong>Phase 14</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Tab: Transcript */}
            {activeTab === 'transcript' && (
              <div style={{ padding: '1rem 0' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Transcript Text</h3>
                {video.hasTranscript && video.transcript ? (
                  <div
                    style={{
                      maxHeight: '320px',
                      overflowY: 'auto',
                      backgroundColor: 'rgba(0, 0, 0, 0.25)',
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                      color: 'var(--color-text-muted)'
                    }}
                  >
                    {video.transcript}
                  </div>
                ) : (
                  <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>
                    No explicit transcript provided. AI features will utilize title and metadata fallback.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Playlist Curriculum Drawer (when video belongs to a playlist) */}
        {playlistContext && (
          <aside
            aria-label="Playlist curriculum"
            className="card"
            style={{
              padding: '1.25rem',
              position: 'sticky',
              top: '5rem'
            }}
          >
            <div style={{ marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--color-warning)',
                  letterSpacing: '0.05em'
                }}
              >
                Curriculum Series
              </span>
              <h2 style={{ fontSize: '1.15rem', margin: '0.25rem 0' }}>
                <Link to={`/playlists/${playlist._id}`} style={{ color: 'var(--color-text)' }}>
                  {playlist.title}
                </Link>
              </h2>
              <p style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem', margin: 0 }}>
                Lesson {playlistContext.currentIndex + 1} of {playlistContext.totalVideos}
              </p>
            </div>

            {/* Playlist Video List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '520px', overflowY: 'auto' }}>
              {playlistContext.videos.map((item, idx) => {
                const isCurrent = item._id === video._id;
                const isItemDone = (isCurrent && isCompleted) || Boolean(item.isCompleted);

                return (
                  <Link
                    key={item._id}
                    to={`/videos/${item._id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isCurrent ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      border: isCurrent ? '1px solid var(--color-primary)' : '1px solid transparent',
                      textDecoration: 'none',
                      color: isCurrent ? 'var(--color-primary)' : 'var(--color-text)',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        color: isCurrent ? 'var(--color-primary)' : 'var(--color-text-dim)',
                        minWidth: '1.5rem'
                      }}
                    >
                      #{idx + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: '0.85rem',
                          margin: 0,
                          fontWeight: isCurrent ? 600 : 400,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {item.title}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                          ⏱️ {formatDuration(item.durationSeconds)}
                        </span>
                        {isItemDone && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-success)', fontWeight: 600 }}>
                            ✓ Done
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}

export default VideoPage;
