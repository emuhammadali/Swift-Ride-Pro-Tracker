import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, push } from "firebase/database";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Icons Setup ---
const carIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/744/744465.png',
    iconSize: [35, 35], iconAnchor: [17, 17]
});
const homeIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/619/619153.png',
    iconSize: [35, 35], iconAnchor: [17, 35]
});

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", 
  authDomain: "location-tracker-2785d.firebaseapp.com",
  databaseURL: "https://location-tracker-2785d-default-rtdb.firebaseio.com",
  projectId: "location-tracker-2785d",
  storageBucket: "location-tracker-2785d.appspot.com",
  messagingSenderId: "639581816143",
  appId: "1:639581816143:web:a071b6422d74eda1c2713a"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- Helper: Distance Calculator (Haversine Formula) ---
const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(2); 
};

function App() {
  const [role, setRole] = useState('customer'); 
  const [userLoc, setUserLoc] = useState(null);
  const [otherLoc, setOtherLoc] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const orderId = "order_premium_johar";
    
    // 1. Watch User Location
    const watchId = navigator.geolocation.watchPosition((pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const currentSpeed = pos.coords.speed ? (pos.coords.speed * 3.6).toFixed(0) : 0;
      
      // Update Firebase
      set(ref(db, `orders/${orderId}/${role}`), { ...coords, speed: currentSpeed, lastUpdated: Date.now() });
      
      setUserLoc([coords.lat, coords.lng]);
      if (role === 'rider') setSpeed(currentSpeed);
    }, (err) => console.error(err), { enableHighAccuracy: true });

    // 2. Listen for Other Role
    const otherRole = role === 'rider' ? 'customer' : 'rider';
    const otherRef = ref(db, `orders/${orderId}/${otherRole}`);
    
    const unsubscribe = onValue(otherRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.lat) {
        setOtherLoc([data.lat, data.lng]);
        if (role === 'customer') setSpeed(data.speed || 0);
      }
    });

    // 3. Listen for Chat
    onValue(ref(db, `orders/${orderId}/messages`), (snapshot) => {
      const data = snapshot.val();
      if (data) setChatLog(Object.values(data));
    });

    return () => {
        navigator.geolocation.clearWatch(watchId);
        unsubscribe();
    };
  }, [role]);

  // Update Distance whenever locations change
  useEffect(() => {
    if (userLoc && otherLoc) {
        const d = getDistance(userLoc[0], userLoc[1], otherLoc[0], otherLoc[1]);
        setDistance(d);
    }
  }, [userLoc, otherLoc]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    push(ref(db, `orders/order_premium_johar/messages`), {
      sender: role, text: message, timestamp: Date.now()
    });
    setMessage("");
  };

  return (
    <div style={styles.container}>
      
      <div style={styles.topBar}>
        <div style={styles.brandSection}>
            <div style={styles.livePulse}></div>
            <span style={styles.appTitle}>SwiftRide <span style={{color:'#00d2ff'}}>Pro+</span></span>
        </div>

        <div style={styles.statsRow}>
            <div style={styles.statUnit}>
                <span style={styles.statLabel}>SPEED</span>
                <span style={styles.statValue}>{speed} <small>km/h</small></span>
            </div>
            <div style={styles.divider}></div>
            <div style={styles.statUnit}>
                <span style={styles.statLabel}>DISTANCE</span>
                <span style={styles.statValue}>{distance} <small>km</small></span>
            </div>
            <div style={styles.divider}></div>
            <div style={styles.statUnit}>
                <span style={styles.statLabel}>ETA</span>
                <span style={styles.statValue}>{Math.round(distance * 5)} <small>min</small></span>
            </div>
        </div>

        <button onClick={() => setRole(role === 'rider' ? 'customer' : 'rider')} style={styles.roleToggle}>
            {role.toUpperCase()}
        </button>
      </div>

      <div style={styles.mapWrap}>
        <MapContainer center={[24.9142, 67.1245]} zoom={15} zoomControl={false} style={{ height: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {userLoc && <Marker position={userLoc} icon={role === 'customer' ? homeIcon : carIcon} />}
          {otherLoc && <Marker position={otherLoc} icon={role === 'customer' ? carIcon : homeIcon} />}
          <AutoCenter userLoc={userLoc} otherLoc={otherLoc} />
        </MapContainer>
      </div>

      <div style={{...styles.chatWrapper, height: isChatOpen ? '380px' : '48px'}}>
        <div style={styles.chatHeader} onClick={() => setIsChatOpen(!isChatOpen)}>
            <span>💬 Live Chat</span>
            <span style={{fontSize:'10px'}}>{isChatOpen ? 'CLOSE' : 'OPEN'}</span>
        </div>
        {isChatOpen && (
            <div style={styles.chatBox}>
                <div style={styles.msgList}>
                    {chatLog.map((m, i) => (
                        <div key={i} style={{...styles.bubble, alignSelf: m.sender === role ? 'flex-end' : 'flex-start', background: m.sender === role ? '#00d2ff' : '#f1f1f1', color: m.sender === role ? '#fff' : '#333'}}>
                            {m.text}
                        </div>
                    ))}
                </div>
                <form onSubmit={sendMessage} style={styles.inputArea}>
                    <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type here..." style={styles.input} />
                    <button type="submit" style={styles.sendIcon}>➤</button>
                </form>
            </div>
        )}
      </div>
    </div>
  );
}

// Auto Center logic to keep both markers in view
function AutoCenter({ userLoc, otherLoc }) {
  const map = useMap();
  useEffect(() => {
    if (userLoc && otherLoc) {
        const bounds = L.latLngBounds([userLoc, otherLoc]);
        map.fitBounds(bounds, { padding: [50, 50] });
    } else if (userLoc) {
        map.flyTo(userLoc, 16);
    }
  }, [userLoc, otherLoc, map]);
  return null;
}

const styles = {
  container: { height: '100vh', width: '100%', position: 'relative', background: '#f0f2f5', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' },
  topBar: { position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', width: '92%', maxWidth: '900px', height: '65px', background: '#1e272e', borderRadius: '50px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 25px', zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' },
  brandSection: { display: 'flex', alignItems: 'center', gap: '10px' },
  livePulse: { width: '10px', height: '10px', background: '#00ff00', borderRadius: '50%', animation: 'pulse 1.5s infinite', boxShadow: '0 0 10px #00ff00' },
  appTitle: { color: '#fff', fontSize: '15px', fontWeight: 'bold' },
  statsRow: { display: 'flex', alignItems: 'center', gap: '25px' },
  statUnit: { textAlign: 'center' },
  statLabel: { display: 'block', fontSize: '9px', color: '#aaa', fontWeight: 'bold' },
  statValue: { color: '#00d2ff', fontSize: '18px', fontWeight: '900' },
  divider: { width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' },
  roleToggle: { background: '#00d2ff', color: '#1e272e', border: 'none', padding: '10px 18px', borderRadius: '25px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' },
  mapWrap: { height: '100%', width: '100%', zIndex: 1 },
  chatWrapper: { position: 'absolute', bottom: '20px', right: '20px', width: '300px', background: '#fff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', zIndex: 1000, transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)' },
  chatHeader: { padding: '15px 20px', background: '#1e272e', color: '#fff', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 'bold' },
  chatBox: { height: '332px', display: 'flex', flexDirection: 'column' },
  msgList: { flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' },
  bubble: { padding: '10px 15px', borderRadius: '15px', fontSize: '13px', maxWidth: '85%', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
  inputArea: { padding: '12px', display: 'flex', borderTop: '1px solid #eee', background: '#fff' },
  input: { flex: 1, border: 'none', background: '#f0f2f5', padding: '12px', borderRadius: '12px', outline: 'none' },
  sendIcon: { background: 'none', border: 'none', color: '#00d2ff', fontSize: '22px', cursor: 'pointer', marginLeft: '8px' }
};

export default App;