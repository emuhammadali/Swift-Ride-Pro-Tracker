import React, { useState } from "react";
import Axios from "axios";
import { FiSearch, FiLoader } from "react-icons/fi"; 

const Fly = ({ setLat, setLon }) => {
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);

  const getCoordinates = async () => {
    if (!city) return;
    
    setLoading(true);
    try {
      const response = await Axios.get(
        `https://nominatim.openstreetmap.org/search?city=${city}&format=json`
      );
      
      if (response.data && response.data.length > 0) {
        const { lat, lon } = response.data[0];
        setLat(parseFloat(lat));
        setLon(parseFloat(lon));
      } else {
        alert("City not found. Try a different name.");
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") getCoordinates();
  };

  return (
    <div className="fly">
      <FiSearch size={20} color="#95a5a6" style={{ marginLeft: "5px" }} />
      <input
        type="text"
        placeholder="Find a city or place..."
        value={city}
        onChange={(e) => setCity(e.target.value)}
        onKeyDown={handleKeyPress}
      />
      <button onClick={getCoordinates} disabled={loading}>
        {loading ? (
          <FiLoader className="spinner" /> 
        ) : (
          "Search"
        )}
      </button>
    </div>
  );
};

export default Fly;