import React, { createContext, useContext, useState, useCallback } from 'react';

const UrbanZoneContext = createContext();

export function UrbanZoneProvider({ children }) {
  const [selectedZone, setSelectedZone] = useState(null);

  const clearSelectedZone = useCallback(() => {
    setSelectedZone(null);
  }, []);

  const isZoneSelected = selectedZone !== null;
  
  const selectedZoneName = selectedZone 
    ? selectedZone.nom 
    : "Toutes les zones";

  return (
    <UrbanZoneContext.Provider value={{
      selectedZone,
      setSelectedZone,
      clearSelectedZone,
      isZoneSelected,
      selectedZoneName
    }}>
      {children}
    </UrbanZoneContext.Provider>
  );
}

export function useUrbanZone() {
  const context = useContext(UrbanZoneContext);
  if (!context) {
    throw new Error('useUrbanZone must be used within UrbanZoneProvider');
  }
  return context;
}
