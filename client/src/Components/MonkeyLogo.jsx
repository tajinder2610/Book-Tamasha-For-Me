import { useEffect, useState } from "react";
import "./monkeyLogo.css";

export default function MonkeyLogo() {
  const [wink, setWink] = useState(false);

  useEffect(() => {
    let winkTimeout;

    const interval = setInterval(() => {
      setWink(true);

      winkTimeout = setTimeout(() => {
        setWink(false);
      }, 450);
    }, 2077);

    return () => {
      clearInterval(interval);
      clearTimeout(winkTimeout);
    };
  }, []);

  return (
    <div className={`monkey-container ${wink ? "is-winking" : ""}`}>
      <img
        src="/monkey_final.png"
        className="monkey-logo-layer monkey-logo-base"
        alt="BookMyTamasha"
      />
      <img
        src="/monkey-wink_final.png"
        className="monkey-logo-layer monkey-logo-wink"
        alt=""
        aria-hidden="true"
      />
    </div>
  );
}
