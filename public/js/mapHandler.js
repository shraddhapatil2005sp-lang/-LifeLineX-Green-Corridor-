// Map and Routing Helpers
const MapHandler = {
  createMap(containerId, initialCenter = CONFIG.DEFAULT_MAP_CENTER, initialZoom = 14) {
    const map = L.map(containerId, { zoomControl: true }).setView(initialCenter, initialZoom);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
      maxZoom: 16
    }).addTo(map);
    return map;
  },

  makeDivIcon(cls, emoji, size) {
    return L.divIcon({
      className: '',
      html: `<div class="loc-icon ${cls}" style="width:${size}px;height:${size}px;"><span>${emoji}</span></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size]
    });
  },

  haversine(a, b) {
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  },

  async fetchOSRMRoute(origin, dest) {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&steps=false`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('OSRM routing network error');
      const data = await res.json();
      if (!data.routes || !data.routes.length) throw new Error('No route found');
      const r = data.routes[0];
      return {
        coords: r.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] })),
        distance: r.distance
      };
    } catch (e) {
      console.warn('Falling back to straight-line route:', e.message);
      return {
        coords: [{ lat: origin.lat, lng: origin.lng }, { lat: dest.lat, lng: dest.lng }],
        distance: this.haversine(origin, dest)
      };
    }
  },

  nearestJunction(coord, junctions, usedCodes) {
    let best = null;
    let bestDist = Infinity;
    junctions.forEach(j => {
      if (usedCodes.has(j.code)) return;
      const d = this.haversine(coord, j);
      if (d < bestDist) {
        bestDist = d;
        best = j;
      }
    });
    return best;
  },

  buildSignals(coords, totalDist, junctions = []) {
    const out = [];
    let acc = 0;
    let lastMark = 0;
    let genericCount = 0;
    const usedCodes = new Set();

    for (let i = 1; i < coords.length; i++) {
      acc += this.haversine(coords[i - 1], coords[i]);
      if (acc - lastMark >= CONFIG.SIGNAL.SPACING_M && out.length < CONFIG.SIGNAL.MAX_SIGNALS && acc < totalDist - 150) {
        lastMark = acc;
        genericCount++;
        const j = this.nearestJunction(coords[i], junctions, usedCodes);
        if (j) {
          usedCodes.add(j.code);
          out.push({ distM: acc, coord: coords[i], name: j.name, code: j.code });
        } else {
          out.push({ distM: acc, coord: coords[i], name: `Signal Junction ${genericCount}`, code: `KOP-SIG-${String(genericCount).padStart(3, '0')}` });
        }
      }
    }

    out.forEach(s => {
      s.etaCorridor = s.distM / CONFIG.SPEED.CORRIDOR_SPEED_MPS;
      s.etaNormal = s.distM / CONFIG.SPEED.NORMAL_SPEED_MPS;
      s.state = 'idle';
    });
    return out;
  }
};
