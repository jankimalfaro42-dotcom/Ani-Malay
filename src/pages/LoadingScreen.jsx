
import './LoadingScreen.css'

function LoadingScreen({ isOffline = false }) {
  return (
    <div className="ani-loading-screen">
      <div className="loading-content">

        <div className="palay-scene">
          <div className="palay-glow"></div>

          <div className="palay-stalk stalk-left">
            <div className="palay-stem"></div>
            <div className="palay-leaf leaf-one"></div>
            <div className="palay-leaf leaf-two"></div>
            <div className="palay-head">
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className="palay-grain"></span>
              ))}
            </div>
          </div>

          <div className="palay-stalk stalk-center">
            <div className="palay-stem"></div>
            <div className="palay-leaf leaf-one"></div>
            <div className="palay-leaf leaf-two"></div>
            <div className="palay-head">
              {Array.from({ length: 8 }).map((_, i) => (
                <span key={i} className="palay-grain"></span>
              ))}
            </div>
          </div>

          <div className="palay-stalk stalk-right">
            <div className="palay-stem"></div>
            <div className="palay-leaf leaf-one"></div>
            <div className="palay-leaf leaf-two"></div>
            <div className="palay-head">
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className="palay-grain"></span>
              ))}
            </div>
          </div>

          <div className="palay-ground"></div>
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

        <div className="grain-loader">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="loading-grain"></span>
          ))}
        </div>

        <p className="loading-message">
          {isOffline
            ? 'Reconnecting... Please check your internet connection.'
            : 'Growing a better future...'}
        </p>

      </div>
    </div>
  )
}

export default LoadingScreen
