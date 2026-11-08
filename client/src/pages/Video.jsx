import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import './Video.css';

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

export function Video() {
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

  // AI Notes states (Phase 12)
  const [notes, setNotes] = useState(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesGenerating, setNotesGenerating] = useState(false);
  const [notesError, setNotesError] = useState(null);
  const [notesQuota, setNotesQuota] = useState(null);

  // AI Quiz states (Phase 13)
  const [quiz, setQuiz] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizGenerating, setQuizGenerating] = useState(false);
  const [quizError, setQuizError] = useState(null);
  const [quizQuota, setQuizQuota] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResults, setQuizResults] = useState(null);

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

  // Fetch AI Notes and quota availability
  const fetchNotes = useCallback(async () => {
    if (!videoId) return;
    setNotesLoading(true);
    setNotesError(null);
    try {
      const res = await api.get(`/videos/${encodeURIComponent(videoId)}/notes`);
      setNotes(res?.data?.notes || null);
      setNotesQuota({
        canGenerate: res?.data?.canGenerate,
        userQuota: res?.data?.userQuota,
        globalQuota: res?.data?.globalQuota
      });
    } catch (err) {
      setNotesError(err.message || 'Failed to load notes for this lesson.');
    } finally {
      setNotesLoading(false);
    }
  }, [videoId]);

  // Load notes whenever notes tab is activated or videoId changes
  useEffect(() => {
    if (activeTab === 'notes') {
      fetchNotes();
    }
  }, [activeTab, fetchNotes]);

  // Reset notes when videoId changes
  useEffect(() => {
    setNotes(null);
    setNotesQuota(null);
    setNotesError(null);
  }, [videoId]);

  // Generate Notes action
  const handleGenerateNotes = async () => {
    if (!videoId || notesGenerating) return;
    setNotesGenerating(true);
    setNotesError(null);
    try {
      const res = await api.post(`/videos/${encodeURIComponent(videoId)}/notes`);
      setNotes(res?.data?.notes || null);
      await fetchNotes();
    } catch (err) {
      setNotesError(err.message || 'Failed to generate notes. Please try again.');
    } finally {
      setNotesGenerating(false);
    }
  };

  // Fetch AI Quiz and quota availability (Phase 13)
  const fetchQuiz = useCallback(async () => {
    if (!videoId) return;
    setQuizLoading(true);
    setQuizError(null);
    try {
      const res = await api.get(`/videos/${encodeURIComponent(videoId)}/quiz`);
      setQuiz(res?.data?.quiz || null);
      setQuizQuota({
        canGenerate: res?.data?.canGenerate,
        userQuota: res?.data?.userQuota,
        globalQuota: res?.data?.globalQuota
      });
    } catch (err) {
      setQuizError(err.message || 'Failed to load practice quiz for this lesson.');
    } finally {
      setQuizLoading(false);
    }
  }, [videoId]);

  // Load quiz whenever quiz tab is activated
  useEffect(() => {
    if (activeTab === 'quiz') {
      fetchQuiz();
    }
  }, [activeTab, fetchQuiz]);

  // Reset quiz when videoId changes
  useEffect(() => {
    setQuiz(null);
    setQuizQuota(null);
    setQuizError(null);
    setSelectedAnswers({});
    setQuizResults(null);
  }, [videoId]);

  // Generate Quiz action (Phase 13)
  const handleGenerateQuiz = async () => {
    if (!videoId || quizGenerating) return;
    setQuizGenerating(true);
    setQuizError(null);
    setSelectedAnswers({});
    setQuizResults(null);
    try {
      const res = await api.post(`/videos/${encodeURIComponent(videoId)}/quiz`);
      setQuiz(res?.data?.quiz || null);
      await fetchQuiz();
    } catch (err) {
      setQuizError(err.message || 'Failed to generate practice quiz. Please try again.');
    } finally {
      setQuizGenerating(false);
    }
  };

  // Select Option for a question
  const handleSelectOption = (questionIndex, optionIndex) => {
    if (quizResults || quizSubmitting) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex
    }));
  };

  // Submit Quiz for evaluation (Phase 13)
  const handleSubmitQuiz = async () => {
    if (!videoId || quizSubmitting || !quiz) return;
    setQuizSubmitting(true);
    setQuizError(null);
    try {
      const res = await api.post(`/videos/${encodeURIComponent(videoId)}/quiz/submit`, {
        answers: selectedAnswers
      });
      setQuizResults(res?.data || null);
    } catch (err) {
      setQuizError(err.message || 'Failed to submit quiz for grading. Please try again.');
    } finally {
      setQuizSubmitting(false);
    }
  };

  // Retake Quiz
  const handleRetakeQuiz = () => {
    setSelectedAnswers({});
    setQuizResults(null);
    setQuizError(null);
  };

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
      <div className="video-loading-container" aria-busy="true" aria-live="polite">
        <p className="video-loading-text">Loading video lesson &amp; player...</p>
      </div>
    );
  }

  if (error || !video) {
    return (
      <section>
        <div
          role="alert"
          className="video-error-card"
        >
          <h2 className="video-error-title">Video Unavailable</h2>
          <p className="video-error-desc">
            {error || 'This video could not be found or has been deactivated.'}
          </p>
          <div className="video-error-actions">
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
      <nav aria-label="Breadcrumb" className="video-breadcrumb">
        <ol className="video-breadcrumb-list">
          <li>
            <Link to="/categories" className="video-breadcrumb-link">
              Categories
            </Link>
          </li>
          {category && (
            <>
              <li className="video-breadcrumb-sep" aria-hidden="true">/</li>
              <li>
                <Link to="/categories" className="video-breadcrumb-link">
                  {category.name}
                </Link>
              </li>
            </>
          )}
          {skill && (
            <>
              <li className="video-breadcrumb-sep" aria-hidden="true">/</li>
              <li>
                <Link to={`/skills/${skill.slug}`} className="video-breadcrumb-link">
                  {skill.name}
                </Link>
              </li>
            </>
          )}
          {playlist && (
            <>
              <li className="video-breadcrumb-sep" aria-hidden="true">/</li>
              <li>
                <Link to={`/playlists/${playlist._id}`} className="video-breadcrumb-link">
                  {playlist.title}
                </Link>
              </li>
            </>
          )}
          <li className="video-breadcrumb-sep" aria-hidden="true">/</li>
          <li className="video-breadcrumb-current">{video.title}</li>
        </ol>
      </nav>

      {/* Main Grid: Player & Details (left) + Playlist Curriculum Queue (right) */}
      <div className={`video-layout-grid ${playlistContext ? 'with-playlist' : ''}`}>
        {/* Left Column: Player, Actions, Details, Shells */}
        <div>
          {/* Resume Prompt Banner */}
          {isAuthenticated && showResumePrompt && (video.userProgress?.lastPositionSeconds || 0) > 5 && (
            <div className="video-resume-banner">
              <div className="video-resume-info">
                <span className="video-resume-icon">📍</span>
                <span className="video-resume-text">
                  You were watching at{' '}
                  <strong className="video-resume-highlight">
                    {formatDuration(video.userProgress.lastPositionSeconds)}
                  </strong>
                  {video.durationSeconds > 0 &&
                    ` (${Math.min(100, Math.round((video.userProgress.lastPositionSeconds / video.durationSeconds) * 100))}%)`}
                  .
                </span>
              </div>
              <div className="video-resume-actions">
                <button
                  type="button"
                  className="btn btn-primary video-sm-btn"
                  onClick={handleResume}
                >
                  Resume from {formatDuration(video.userProgress.lastPositionSeconds)}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary video-sm-btn"
                  onClick={handleStartFromBeginning}
                >
                  Start from beginning
                </button>
              </div>
            </div>
          )}

          {/* Responsive 16:9 YouTube Embedded Player */}
          <div className="video-player-wrapper">
            {!playerError ? (
              <>
                {/* Mount element for YouTube Player API */}
                <div
                  ref={playerContainerRef}
                  className="video-player-mount"
                />
                {/* Fallback iframe in case API script did not initialize */}
                {!playerReady && (
                  <iframe
                    src={embedUrl}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    onError={() => setPlayerError(true)}
                    className="video-player-iframe"
                  />
                )}
              </>
            ) : (
              <div className="video-player-fallback">
                <p className="video-player-notice-title">
                  Embedded YouTube Player Notice
                </p>
                <p className="video-player-notice-desc">
                  If the video is private, restricted by YouTube embedding policies, or unavailable, you can open it directly.
                </p>
                <a
                  href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary video-tab-btn"
                >
                  Watch on YouTube ↗
                </a>
              </div>
            )}
          </div>

          {/* Playback Progress Status Bar */}
          <div className="video-playback-bar">
            <div>
              <span>Playback position: </span>
              <strong className="video-playback-bold">
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
              <span className="video-completed-text">
                ✓ Completed (≥90% watched)
              </span>
            ) : isAuthenticated ? (
              <span className="video-dim-text">
                (Automatically saves as you watch • 90% marks complete)
              </span>
            ) : (
              <span className="video-dim-text">
                <Link to="/login" className="video-resume-highlight">
                  Sign in
                </Link>{' '}
                to save playback progress and resume on any device
              </span>
            )}
          </div>

          {/* Video Header & Controls */}
          <div className="card video-card-main">
            <div className="video-header-top">
              <div className="video-badges-row">
                {skill && (
                  <span className="video-skill-badge">
                    {skill.name}
                  </span>
                )}
                <span className="video-duration-badge">
                  ⏱️ {formatDuration(video.durationSeconds)}
                </span>
                {video.hasTranscript ? (
                  <span className="video-transcript-badge">
                    ✓ Transcript Available
                  </span>
                ) : (
                  <span
                    className="video-fallback-badge"
                    title="AI features will use video metadata fallback"
                  >
                    Metadata Fallback
                  </span>
                )}
                {isCompleted && (
                  <span className="video-done-badge">
                    ✓ Completed (90%+)
                  </span>
                )}
              </div>

              {/* Action Buttons: Playlist Nav & Bookmark Shell */}
              <div className="video-header-actions">
                {playlistContext?.previousVideo && (
                  <button
                    type="button"
                    onClick={() => navigate(`/videos/${playlistContext.previousVideo._id}`)}
                    className="btn btn-secondary video-sm-btn"
                    title={`Previous: ${playlistContext.previousVideo.title}`}
                  >
                    &larr; Prev
                  </button>
                )}
                {playlistContext?.nextVideo && (
                  <button
                    type="button"
                    onClick={() => navigate(`/videos/${playlistContext.nextVideo._id}`)}
                    className="btn btn-secondary video-sm-btn"
                    title={`Next: ${playlistContext.nextVideo.title}`}
                  >
                    Next &rarr;
                  </button>
                )}
                <button
                  type="button"
                  className={`btn ${isBookmarked ? 'btn-primary' : 'btn-secondary'} video-bookmark-btn`}
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

            <h1 className="video-title-heading">
              {video.title}
            </h1>

            {/* Feature Shell Tabs */}
            <div
              role="tablist"
              aria-label="Video lesson information"
              className="video-tabs-list"
            >
              <button
                type="button"
                role="tab"
                id="tab-overview"
                aria-controls="panel-overview"
                aria-selected={activeTab === 'overview'}
                onClick={() => setActiveTab('overview')}
                className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'} video-tab-btn`}
              >
                Overview
              </button>
              <button
                type="button"
                role="tab"
                id="tab-notes"
                aria-controls="panel-notes"
                aria-selected={activeTab === 'notes'}
                onClick={() => setActiveTab('notes')}
                className={`btn ${activeTab === 'notes' ? 'btn-primary' : 'btn-secondary'} video-tab-btn`}
              >
                AI Notes
              </button>
              <button
                type="button"
                role="tab"
                id="tab-quiz"
                aria-controls="panel-quiz"
                aria-selected={activeTab === 'quiz'}
                onClick={() => setActiveTab('quiz')}
                className={`btn ${activeTab === 'quiz' ? 'btn-primary' : 'btn-secondary'} video-tab-btn`}
              >
                AI Practice Quiz
              </button>
              <button
                type="button"
                role="tab"
                id="tab-transcript"
                aria-controls="panel-transcript"
                aria-selected={activeTab === 'transcript'}
                onClick={() => setActiveTab('transcript')}
                className={`btn ${activeTab === 'transcript' ? 'btn-primary' : 'btn-secondary'} video-tab-btn`}
              >
                Transcript
              </button>
            </div>

            {/* Tab: Overview */}
            {activeTab === 'overview' && (
              <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview" tabIndex={0}>
                <h3 className="video-overview-heading">
                  Lesson Summary
                </h3>
                <p className="video-overview-desc">
                  {video.description || 'No detailed description provided for this lesson.'}
                </p>
              </div>
            )}

            {/* Tab: AI Notes (Phase 12) */}
            {activeTab === 'notes' && (
              <div role="tabpanel" id="panel-notes" aria-labelledby="tab-notes" tabIndex={0} className="video-tab-content">
                <div className="video-notes-header">
                  <div>
                    <h3 className="video-notes-title">Grounded Learning Notes</h3>
                    <span className="video-notes-subtitle">
                      Model: Gemini 3.8 Flash • Source: Video Title & Description
                    </span>
                  </div>
                  {notes && (
                    <span className="video-cached-badge">
                      ✓ Cached in SkillVault
                    </span>
                  )}
                </div>

                {/* Error Banner */}
                {notesError && (
                  <div
                    role="alert"
                    className="video-notes-error"
                  >
                    <span>{notesError}</span>
                    <button
                      type="button"
                      onClick={() => setNotesError(null)}
                      className="video-notes-error-close"
                      aria-label="Dismiss error"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Loading state */}
                {notesLoading && !notes && (
                  <div className="video-notes-loading">
                    Loading notes...
                  </div>
                )}

                {/* Notes Display */}
                {notes && (
                  <div className="video-notes-list">
                    {/* Summary */}
                    <div className="video-notes-card">
                      <h4 className="video-notes-section-title title-primary">
                        Summary
                      </h4>
                      <p className="video-notes-body">
                        {notes.summary}
                      </p>
                    </div>

                    {/* Key Concepts */}
                    {notes.keyConcepts?.length > 0 && (
                      <div>
                        <h4 className="video-notes-section-title title-accent">
                          Key Concepts
                        </h4>
                        <div className="video-quiz-options-list">
                          {notes.keyConcepts.map((item, idx) => (
                            <div
                              key={idx}
                              className="video-concept-item"
                            >
                              <strong className="video-concept-title">
                                {item.concept}
                              </strong>
                              <p className="video-concept-desc">
                                {item.explanation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Definitions */}
                    {notes.definitions?.length > 0 && (
                      <div>
                        <h4 className="video-notes-section-title title-success">
                          Technical Definitions
                        </h4>
                        <div className="video-quiz-options-list">
                          {notes.definitions.map((def, idx) => (
                            <div
                              key={idx}
                              className="video-concept-item"
                            >
                              <code className="video-def-code">
                                {def.term}
                              </code>
                              <p className="video-concept-desc">
                                {def.definition}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key Takeaways */}
                    {notes.takeaways?.length > 0 && (
                      <div className="video-notes-card">
                        <h4 className="video-notes-section-title title-warning">
                          Key Takeaways
                        </h4>
                        <ul className="video-takeaways-list">
                          {notes.takeaways.map((point, idx) => (
                            <li key={idx} className="video-takeaway-item">
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Empty State / Generate Button */}
                {!notes && !notesLoading && (
                  <div className="video-notes-empty-box">
                    <div className="video-notes-empty-inner">
                      <h4 className="video-notes-empty-title">
                        No notes generated for this lesson yet
                      </h4>
                      <p className="video-notes-empty-desc">
                        Generate AI learning notes covering the summary, key concepts, technical definitions, and takeaways strictly grounded in this video's curriculum topics.
                      </p>

                      {!isAuthenticated ? (
                        <div>
                          <p className="video-quota-allowance-text">
                            Sign in with your SkillVault learner account to generate notes.
                          </p>
                          <Link
                            to={`/login?redirect=/videos/${encodeURIComponent(videoId)}`}
                            className="btn btn-primary"
                          >
                            Sign In to Generate Notes
                          </Link>
                        </div>
                      ) : (
                        <div>
                          {/* Quota feedback messaging */}
                          {notesQuota?.globalQuota?.isExhausted ? (
                            <div className="video-quota-warn-banner">
                              The daily global AI quota for Notes generation has been reached. Please try again after 00:00 UTC.
                            </div>
                          ) : notesQuota?.userQuota && !notesQuota.userQuota.allowed ? (
                            <div className="video-quota-info-banner">
                              You have used your daily limit of 1 notes generation. Your allowance resets at 00:00 UTC.
                            </div>
                          ) : (
                            <p className="video-quota-allowance-text">
                              Daily Allowance: {notesQuota?.userQuota?.used || 0}/1 used today (resets at 00:00 UTC)
                            </p>
                          )}

                          <button
                            type="button"
                            onClick={handleGenerateNotes}
                            disabled={
                              notesGenerating ||
                              notesQuota?.globalQuota?.isExhausted ||
                              (notesQuota?.userQuota && !notesQuota.userQuota.allowed)
                            }
                            className={`btn btn-primary video-generate-btn ${
                              notesQuota?.globalQuota?.isExhausted ||
                              (notesQuota?.userQuota && !notesQuota.userQuota.allowed)
                                ? 'is-disabled'
                                : ''
                            }`}
                          >
                            {notesGenerating ? 'Generating Notes with Gemini 3.8 Flash...' : 'Generate Notes'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: AI Practice Quiz (Phase 13) */}
            {activeTab === 'quiz' && (
              <div role="tabpanel" id="panel-quiz" aria-labelledby="tab-quiz" tabIndex={0} className="video-tab-content">
                <div className="video-notes-header">
                  <div>
                    <h3 className="video-notes-title">Conceptual Practice Quiz</h3>
                    <span className="video-notes-subtitle">
                      Model: Gemini 3.1 Flash Lite • Source: Video Title & Description
                    </span>
                  </div>
                  {quiz && (
                    <span className="video-quiz-badge">
                      5 MCQs • 4 Options
                    </span>
                  )}
                </div>

                {/* Quota & Allowance Information Bar */}
                <div className="video-quiz-quota-bar">
                  <div>
                    {isAuthenticated ? (
                      <span className="video-loading-text">
                        Daily Allowance:{' '}
                        <strong
                          className={
                            quizQuota?.userQuota && !quizQuota.userQuota.allowed
                              ? 'video-resume-highlight'
                              : 'video-playback-bold'
                          }
                        >
                          {quizQuota?.userQuota ? quizQuota.userQuota.used : 0} of 2 quizzes
                        </strong>{' '}
                        used today
                      </span>
                    ) : (
                      <span className="video-dim-text">
                        Sign in to generate and take conceptual practice quizzes (2 quizzes/day).
                      </span>
                    )}
                  </div>
                  {quizQuota?.globalQuota?.isExhausted && (
                    <span className="video-quiz-quota-danger">
                      ⚠️ Global daily budget exhausted. Resets at 00:00 UTC.
                    </span>
                  )}
                </div>

                {/* Error Banner */}
                {quizError && (
                  <div
                    role="alert"
                    className="video-quiz-error"
                  >
                    {quizError}
                  </div>
                )}

                {/* Loading State */}
                {quizLoading && (
                  <div className="video-notes-loading">
                    Loading practice quiz...
                  </div>
                )}

                {/* Evaluated Quiz Results (Post-Submission) */}
                {!quizLoading && quizResults && (
                  <div className="video-quiz-results-list">
                    {/* Score summary banner */}
                    <div className="video-quiz-score-banner">
                      <div>
                        <span className="video-quiz-eval-label">
                          Quiz Evaluation Complete
                        </span>
                        <div className="video-quiz-score-val">
                          Score: {quizResults.scoreDisplay}
                          <span className="video-quiz-score-pct">
                            ({quizResults.percentage}%)
                          </span>
                        </div>
                        <p className="video-quiz-score-msg">
                          {quizResults.score === 5
                            ? '🎉 Perfect score! You fully mastered all concepts tested in this lesson.'
                            : quizResults.score >= 3
                            ? '👍 Solid effort! Review the detailed concept explanations below.'
                            : '📚 Keep reviewing! Read each explanation carefully to master these topics.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRetakeQuiz}
                        className="btn btn-secondary video-quiz-retake-btn"
                      >
                        Retake Quiz
                      </button>
                    </div>

                    {/* Evaluated Questions List with Explanations */}
                    <div className="video-quiz-results-list">
                      {quizResults.results?.map((res, qIdx) => (
                        <div
                          key={res.questionIndex ?? qIdx}
                          className={`video-quiz-eval-card ${res.isCorrect ? 'is-correct' : 'is-incorrect'}`}
                        >
                          <div className="video-quiz-eval-header">
                            <span className="video-quiz-eval-label">
                              Question {qIdx + 1} of {quizResults.totalQuestions || 5}
                            </span>
                            <span
                              className={`video-quiz-eval-badge ${res.isCorrect ? 'is-correct' : 'is-incorrect'}`}
                            >
                              {res.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                            </span>
                          </div>

                          <h4 className="video-quiz-question-title">
                            {res.questionText}
                          </h4>

                          <div className="video-quiz-options-list">
                            {res.options?.map((opt, optIdx) => {
                              const isCorrectAnswer = optIdx === res.correctOptionIndex;
                              const isUserPick = optIdx === res.selectedOption;

                              let optClass = 'video-quiz-eval-opt';
                              if (isCorrectAnswer) {
                                optClass += ' opt-correct';
                              } else if (isUserPick && !res.isCorrect) {
                                optClass += ' opt-incorrect';
                              }

                              return (
                                <div
                                  key={optIdx}
                                  className={optClass}
                                >
                                  <span>{opt}</span>
                                  <div>
                                    {isCorrectAnswer && (
                                      <span className="video-quiz-opt-correct-label">
                                        ✓ Correct Option
                                      </span>
                                    )}
                                    {isUserPick && !isCorrectAnswer && (
                                      <span className="video-quiz-opt-wrong-label">
                                        ✗ Your Choice
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Explanation Card */}
                          <div className="video-quiz-explanation-box">
                            <strong className="video-quiz-explanation-title">
                              💡 Explanation
                            </strong>
                            {res.explanation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Taking the Quiz (Before Submission) */}
                {!quizLoading && !quizResults && quiz && (
                  <div className="video-quiz-results-list">
                    <div className="video-quiz-instruction-card">
                      Answer all 5 questions below, then click <strong>Submit Quiz for Grading</strong> to receive your score and explanations.
                    </div>

                    <div className="video-quiz-results-list">
                      {quiz.questions?.map((q, qIdx) => {
                        const selected = selectedAnswers[qIdx];
                        return (
                          <div
                            key={q._id || qIdx}
                            className="video-quiz-take-card"
                          >
                            <span className="video-quiz-eval-label">
                              Question {qIdx + 1} of 5
                            </span>
                            <h4 className="video-quiz-take-title">
                              {q.questionText}
                            </h4>

                            <div className="video-quiz-options-list">
                              {q.options?.map((opt, optIdx) => {
                                const isSelected = selected === optIdx;
                                return (
                                  <button
                                    key={optIdx}
                                    type="button"
                                    onClick={() => handleSelectOption(qIdx, optIdx)}
                                    className={`video-quiz-opt-btn ${isSelected ? 'is-selected' : ''}`}
                                  >
                                    <span
                                      className={`video-quiz-radio-circle ${isSelected ? 'is-selected' : ''}`}
                                    />
                                    <span>{opt}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quiz Submission Action Bar */}
                    <div className="video-quiz-submit-bar">
                      <span className="video-loading-text">
                        Answered: <strong>{Object.keys(selectedAnswers).length}</strong> of 5 questions
                      </span>

                      <button
                        type="button"
                        onClick={handleSubmitQuiz}
                        disabled={quizSubmitting || Object.keys(selectedAnswers).length === 0}
                        className={`btn btn-primary video-quiz-submit-btn ${
                          quizSubmitting || Object.keys(selectedAnswers).length === 0
                            ? 'is-disabled'
                            : ''
                        }`}
                      >
                        {quizSubmitting ? 'Submitting & Grading...' : 'Submit Quiz for Grading'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Empty State: Prompt to Generate Quiz */}
                {!quizLoading && !quiz && (
                  <div className="video-quiz-empty-box">
                    <div className="video-quiz-empty-icon">🎯</div>
                    <h4 className="video-quiz-empty-title">No Practice Quiz Generated Yet</h4>
                    <p className="video-quiz-empty-desc">
                      Test your conceptual understanding of this lesson with a personalized 5-question multiple-choice practice quiz generated by Gemini 3.1 Flash Lite.
                    </p>

                    <div>
                      {!isAuthenticated ? (
                        <button
                          type="button"
                          onClick={() => navigate('/login')}
                          className="btn btn-primary video-quiz-signin-btn"
                        >
                          Sign In to Practice
                        </button>
                      ) : (
                        <div className="video-quiz-prompt-actions">
                          {quizQuota?.globalQuota?.isExhausted && (
                            <p className="video-quiz-error-msg">
                              Daily global request limit for Gemini 3.1 Flash Lite reached. Try again after 00:00 UTC.
                            </p>
                          )}
                          {quizQuota?.userQuota && !quizQuota.userQuota.allowed && (
                            <p className="video-quiz-error-msg">
                              You have used your 2 practice quizzes for today. Your allowance resets at 00:00 UTC.
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={handleGenerateQuiz}
                            disabled={
                              quizGenerating ||
                              quizQuota?.globalQuota?.isExhausted ||
                              (quizQuota?.userQuota && !quizQuota.userQuota.allowed)
                            }
                            className={`btn btn-primary video-quiz-submit-btn ${
                              quizGenerating ||
                              quizQuota?.globalQuota?.isExhausted ||
                              (quizQuota?.userQuota && !quizQuota.userQuota.allowed)
                                ? 'is-disabled'
                                : ''
                            }`}
                          >
                            {quizGenerating ? 'Generating Quiz with Gemini 3.1 Flash Lite...' : 'Generate Practice Quiz'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Transcript */}
            {activeTab === 'transcript' && (
              <div role="tabpanel" id="panel-transcript" aria-labelledby="tab-transcript" tabIndex={0} className="video-tab-content">
                <h3 className="video-overview-heading">Transcript Text</h3>
                {video.hasTranscript && video.transcript ? (
                  <div className="video-transcript-box">
                    {video.transcript}
                  </div>
                ) : (
                  <p className="video-dim-text">
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
            className="card video-playlist-aside"
          >
            <div className="video-playlist-header">
              <span className="video-playlist-kicker">
                Curriculum Series
              </span>
              <h2 className="video-playlist-title">
                <Link to={`/playlists/${playlist._id}`} className="video-playlist-link">
                  {playlist.title}
                </Link>
              </h2>
              <p className="video-playlist-meta">
                Lesson {playlistContext.currentIndex + 1} of {playlistContext.totalVideos}
              </p>
            </div>

            {/* Playlist Video List */}
            <div className="video-playlist-items-list">
              {playlistContext.videos.map((item, idx) => {
                const isCurrent = item._id === video._id;
                const isItemDone = (isCurrent && isCompleted) || Boolean(item.isCompleted);

                return (
                  <Link
                    key={item._id}
                    to={`/videos/${item._id}`}
                    className={`video-playlist-item-link ${isCurrent ? 'is-current' : ''}`}
                  >
                    <span
                      className={`video-playlist-item-num ${isCurrent ? 'is-current' : ''}`}
                    >
                      #{idx + 1}
                    </span>
                    <div className="video-playlist-item-body">
                      <p
                        className={`video-playlist-item-title ${isCurrent ? 'is-current' : ''}`}
                      >
                        {item.title}
                      </p>
                      <div className="video-playlist-item-sub">
                        <span className="video-playlist-item-duration">
                          ⏱️ {formatDuration(item.durationSeconds)}
                        </span>
                        {isItemDone && (
                          <span className="video-playlist-item-done">
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

export const VideoPage = Video;
export default Video;
