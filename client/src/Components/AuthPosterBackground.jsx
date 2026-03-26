import React from "react";

const moviePosterGroups = [
  [
    {
      title: "Avengers: Endgame",
      src: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    },
    {
      title: "Inception",
      src: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
    },
    {
      title: "Interstellar",
      src: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    },
    {
      title: "Oppenheimer",
      src: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    },
  ],
  [
    {
      title: "The Dark Knight",
      src: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    },
    {
      title: "Dune",
      src: "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
    },
    {
      title: "Joker",
      src: "https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg",
    },
    {
      title: "Avatar",
      src: "https://image.tmdb.org/t/p/w500/kyeqWdyUXW608qlYkRqosgbbJyK.jpg",
    },
  ],
  [
    {
      title: "Spider-Man: No Way Home",
      src: "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
    },
    {
      title: "La La Land",
      src: "https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",
    },
    {
      title: "Barbie",
      src: "https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg",
    },
    {
      title: "The Batman",
      src: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg",
    },
  ],
];

function AuthPosterBackground() {
  return (
    <div className="login-cinema-bg" aria-hidden="true">
      <div className="login-poster-catalogue">
        {moviePosterGroups.map((group, groupIndex) => (
          <div
            key={`poster-column-${groupIndex}`}
            className={`login-poster-column login-poster-column-${groupIndex + 1}`}
          >
            {[...group, ...group].map((poster, posterIndex) => (
              <div
                key={`${poster.title}-${posterIndex}`}
                className="login-poster-card"
              >
                <img src={poster.src} alt="" loading="lazy" />
                <div className="login-poster-card-shadow" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="login-cinema-vignette" />
      <div className="login-cinema-overlay" />
    </div>
  );
}

export default AuthPosterBackground;
