import { useEffect, useState } from "react";

export default function NetworkStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const connected = () => setOnline(true);
    const disconnected = () => setOnline(false);
    const reported = (event) => setOnline(event.detail?.online !== false);
    window.addEventListener("online", connected);
    window.addEventListener("offline", disconnected);
    window.addEventListener("axonlink:network", reported);
    return () => { window.removeEventListener("online", connected); window.removeEventListener("offline", disconnected); window.removeEventListener("axonlink:network", reported); };
  }, []);
  if (online) return null;
  return <div role="status" style={{position:"fixed",inset:"0 0 auto 0",zIndex:10000,padding:"10px 16px",textAlign:"center",background:"#fff3cd",color:"#624b00",fontWeight:600}}>You are offline. Administrative changes require a connection.</div>;
}
