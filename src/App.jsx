import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, push } from "firebase/database";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Custom Modern Markers ---
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
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition((pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const s = pos.coords.speed ? (pos.coords.speed * 3.6).toFixed(0) : 0;
        set(ref(db, `orders/${orderId}/${role}`), { ...coords, speed: s });
        setUserLoc([coords.lat, coords.lng]);
        if (role === 'rider') setSpeed(s);
      }, null, { enableHighAccuracy: true });
    }

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
    push(ref(db, `orders/order_premium_johar/messages`), {
      sender: role, text: message
    });
    setMessage("");
  };

  return (
    <div style={styles.container}>
      
      {/* --- Top Slim Status Bar --- */}
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
                <span style={styles.statLabel}>ARRIVAL</span>
                <span style={styles.statValue}>{Math.round(distance * 4)} <small>min</small></span>
            </div>
        </div>

        <button onClick={() => setRole(role === 'rider' ? 'customer' : 'rider')} style={styles.roleToggle}>
            {role.toUpperCase()} MODE
        </button>
      </div>

      {/* --- Full Map --- */}
      <div style={styles.mapWrap}>
        <MapContainer center={[24.9142, 67.1245]} zoom={15} zoomControl={false} style={{ height: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {userLoc && <Marker position={userLoc} icon={role === 'customer' ? homeIcon : carIcon} />}
          {otherLoc && <Marker position={otherLoc} icon={role === 'customer' ? carIcon : homeIcon} />}
          <AutoCenter location={userLoc} />
        </MapContainer>
      </div>

      {/* --- Bottom Chat --- */}
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

function AutoCenter({ location }) {
  const map = useMap();
  useEffect(() => { if (location) map.flyTo(location, 16); }, [location, map]);
  return null;
}

const styles = {
  container: { height: '100vh', width: '100%', position: 'relative', background: '#eee', fontFamily: 'sans-serif' },
  
  topBar: { 
    position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', 
    width: '90%', maxWidth: '800px', height: '60px',
    background: '#1e272e', borderRadius: '50px', display: 'flex', alignItems: 'center', 
    justifyContent: 'space-between', padding: '0 25px', zIndex: 1000,
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)'
  },
  brandSection: { display: 'flex', alignItems: 'center', gap: '10px' },
  livePulse: { width: '8px', height: '8px', background: '#00ff00', borderRadius: '50%', boxShadow: '0 0 10px #00ff00' },
  appTitle: { color: '#fff', fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.5px' },
  
  statsRow: { display: 'flex', alignItems: 'center', gap: '20px' },
  statUnit: { textAlign: 'center' },
  statLabel: { display: 'block', fontSize: '8px', color: '#888', fontWeight: 'bold' },
  statValue: { color: '#00d2ff', fontSize: '16px', fontWeight: '900' },
  divider: { width: '1px', height: '25px', background: 'rgba(255,255,255,0.1)' },
  
  roleToggle: { background: '#34495e', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' },

  mapWrap: { height: '100%', width: '100%' },

  chatWrapper: { position: 'absolute', bottom: '20px', right: '20px', width: '280px', background: '#fff', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 5px 30px rgba(0,0,0,0.15)', zIndex: 1000, transition: '0.4s' },
  chatHeader: { padding: '14px 18px', background: '#1e272e', color: '#fff', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' },
  chatBox: { height: '332px', display: 'flex', flexDirection: 'column' },
  msgList: { flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' },
  bubble: { padding: '10px 14px', borderRadius: '12px', fontSize: '12px', maxWidth: '80%' },
  inputArea: { padding: '10px', display: 'flex', borderTop: '1px solid #eee' },
  input: { flex: 1, border: 'none', background: '#f5f5f5', padding: '10px', borderRadius: '10px', outline: 'none', fontSize: '12px' },
  sendIcon: { background: 'none', border: 'none', color: '#00d2ff', fontSize: '20px', cursor: 'pointer', marginLeft: '5px' }
};

export default App;