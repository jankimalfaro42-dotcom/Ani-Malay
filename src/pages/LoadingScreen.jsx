import './LoadingScreen.css'

function LoadingScreen({ isOffline = false }) {
  return (
    <div
      className={`ani-loading-screen ${isOffline ? 'is-offline' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="loading-content">

        <div className="palay-scene" aria-hidden="true">
          <div className="palay-glow" />

          <div className="palay-stalk stalk-left">
            <div className="palay-stem" />
            <div className="palay-leaf leaf-one" />
            <div className="palay-leaf leaf-two" />
            <div className="palay-head">
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className="palay-grain" />
              ))}
            </div>
          </div>

          <div className="palay-stalk stalk-center">
            <div className="palay-stem" />
            <div className="palay-leaf leaf-one" />
            <div className="palay-leaf leaf-two" />
            <div className="palay-head">
              {Array.from({ length: 8 }).map((_, i) => (
                <span key={i} className="palay-grain" />
              ))}
            </div>
          </div>

          <div className="palay-stalk stalk-right">
            <div className="palay-stem" />
            <div className="palay-leaf leaf-one" />
            <div className="palay-leaf leaf-two" />
            <div className="palay-head">
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className="palay-grain" />
              ))}
            </div>
          </div>

          <div className="palay-ground" />
        </div>

        <div className="loading-brand">
          <img
            src="/logo.jpg"
            alt="Ani-Malay Logo"
            className="loading-logo"
          />

          <h1>Ani-Malay</h1>

          <p className="loading-tagline">
            FRESH. LOCAL. SUSTAINABLE.
          </p>
        </div>

        <div className="grain-loader" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="loading-grain" />
          ))}
        </div>

        <p
          className={`loading-message ${isOffline ? 'offline-message' : ''}`}
        >
          {isOffline
            ? 'Reconnecting... Please check your internet connection.'
            : 'Growing a better future...'}
        </p>

      </div>
    </div>
  )
}

export default LoadingScreen