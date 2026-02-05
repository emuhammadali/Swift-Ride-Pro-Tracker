import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
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

// Distance Calculation Function
const getDist = (l1, l2) => {
    if(!l1 || !l2) return 0;
    const R = 6371;
    const dLat = (l2[0]-l1[0]) * Math.PI/180;
    const dLon = (l2[1]-l1[1]) * Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(l1[0]*Math.PI/180)*Math.cos(l2[0]*Math.PI/180)*Math.sin(dLon/2)**2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(2);
};

function App() {
  const [role, setRole] = useState('customer'); 
  const [userLoc, setUserLoc] = useState(null);
  const [otherLoc, setOtherLoc] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const orderId = "order_premium_johar";

  useEffect(() => {
    // 1. Get User Location
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition((pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const s = pos.coords.speed ? (pos.coords.speed * 3.6).toFixed(0) : 0;
        set(ref(db, `orders/${orderId}/${role}`), { ...coords, speed: s });
        setUserLoc([coords.lat, coords.lng]);
        if (role === 'rider') setSpeed(s);
      }, null, { enableHighAccuracy: true });
    }

    // 2. Sync Other User & Chat
    const otherRole = role === 'rider' ? 'customer' : 'rider';
    onValue(ref(db, `orders/${orderId}/${otherRole}`), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setOtherLoc([data.lat, data.lng]);
        if (role === 'customer') setSpeed(data.speed || 0);
      }
    });

    onValue(ref(db, `orders/${orderId}/messages`), (snapshot) => {
      const data = snapshot.val();
      if (data) setChatLog(Object.values(data));
    });
  }, [role]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    push(ref(db, `orders/${orderId}/messages`), {
      sender: role, text: message, ts: Date.now()
    });
    setMessage("");
  };

  const distanceVal = getDist(userLoc, otherLoc);

  return (
    <div style={styles.container}>
      
      {/* --- Horizontal Top Bar --- */}
      <div style={styles.topBar}>
        <div style={styles.brand}>
            <div style={styles.pulse}></div>
            <span style={styles.title}>SwiftRide <span style={{color:'#00d2ff'}}>Pro+</span></span>
        </div>

        <div style={styles.statsRow}>
            <div style={styles.statUnit}>
                <span style={styles.statLabel}>SPEED</span>
                <span style={styles.statValue}>{speed} <small>km/h</small></span>
            </div>
            <div style={styles.divider}></div>
            <div style={styles.statUnit}>
                <span style={styles.statLabel}>DISTANCE</span>
                <span style={styles.statValue}>{distanceVal} <small>km</small></span>
            </div>
            <div style={styles.divider}></div>
            <div style={styles.statUnit}>
                <span style={styles.statLabel}>ETA</span>
                <span style={styles.statValue}>{Math.round(distanceVal * 5)} <small>min</small></span>
            </div>
        </div>

        <button onClick={() => setRole(role === 'rider' ? 'customer' : 'rider')} style={styles.toggleBtn}>
            {role.toUpperCase()}
        </button>
      </div>

      {/* --- Full Map --- */}
      <div style={styles.mapWrap}>
        <MapContainer center={[24.9142, 67.1245]} zoom={15} zoomControl={false} style={{ height: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {userLoc && <Marker position={userLoc} icon={role === 'customer' ? homeIcon : carIcon} />}
          {otherLoc && <Marker position={otherLoc} icon={role === 'customer' ? carIcon : homeIcon} />}
          
          {/* Tracking Line */}
          {userLoc && otherLoc && <Polyline positions={[userLoc, otherLoc]} color="#00d2ff" weight={4} dashArray="10, 10" />}
          
          <AutoCenter userLoc={userLoc} otherLoc={otherLoc} />
        </MapContainer>
      </div>

      {/* --- Improved Floating Chat --- */}
      <div style={{...styles.chatBox, height: isChatOpen ? '380px' : '50px'}}>
        <div style={styles.chatHeader} onClick={() => setIsChatOpen(!isChatOpen)}>
            <span>💬 Live Chat</span>
            <span>{isChatOpen ? '▼' : '▲'}</span>
        </div>
        {isChatOpen && (
            <div style={styles.chatContent}>
                <div style={styles.msgArea}>
                    {chatLog.map((m, i) => (
                        <div key={i} style={{...styles.bubble, alignSelf: m.sender === role ? 'flex-end' : 'flex-start', background: m.sender === role ? '#00d2ff' : '#eee', color: m.sender === role ? '#fff' : '#333'}}>
                            {m.text}
                        </div>
                    ))}
                </div>
                <form onSubmit={sendMessage} style={styles.chatInputRow}>
                    <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Send message..." style={styles.input} />
                    <button type="submit" style={styles.sendBtn}>➤</button>
                </form>
            </div>
        )}
      </div>
    </div>
  );
}

function AutoCenter({ userLoc, otherLoc }) {
  const map = useMap();
  useEffect(() => {
    if (userLoc && otherLoc) {
        map.fitBounds([userLoc, otherLoc], { padding: [70, 70] });
    } else if (userLoc) {
        map.flyTo(userLoc, 16);
    }
  }, [userLoc, otherLoc, map]);
  return null;
}

const styles = {
  container: { height: '100vh', width: '100%', position: 'relative', overflow: 'hidden', fontFamily: 'sans-serif' },
  topBar: { position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', width: '92%', height: '60px', background: '#1e272e', borderRadius: '50px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 25px', zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' },
  brand: { display: 'flex', alignItems: 'center', gap: '10px' },
  pulse: { width: '8px', height: '8px', background: '#00ff00', borderRadius: '50%', boxShadow: '0 0 10px #00ff00' },
  title: { color: '#fff', fontSize: '14px', fontWeight: 'bold' },
  statsRow: { display: 'flex', alignItems: 'center', gap: '20px' },
  statUnit: { textAlign: 'center' },
  statLabel: { display: 'block', fontSize: '8px', color: '#888', fontWeight: 'bold' },
  statValue: { color: '#00d2ff', fontSize: '16px', fontWeight: '900' },
  divider: { width: '1px', height: '25px', background: 'rgba(255,255,255,0.1)' },
  toggleBtn: { background: '#34495e', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' },
  mapWrap: { height: '100%', width: '100%' },
  chatBox: { position: 'absolute', bottom: '20px', right: '20px', width: '300px', background: '#fff', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 1000, transition: '0.4s' },
  chatHeader: { background: '#1e272e', color: '#fff', padding: '15px', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 'bold' },
  chatContent: { height: '330px', display: 'flex', flexDirection: 'column' },
  msgArea: { flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' },
  bubble: { padding: '10px 14px', borderRadius: '12px', fontSize: '12px', maxWidth: '80%' },
  chatInputRow: { padding: '12px', display: 'flex', borderTop: '1px solid #eee' },
  input: { flex: 1, border: 'none', background: '#f5f5f5', padding: '10px', borderRadius: '8px', outline: 'none' },
  sendBtn: { background: 'none', border: 'none', color: '#00d2ff', fontSize: '20px', marginLeft: '5px' }
};

export default App;