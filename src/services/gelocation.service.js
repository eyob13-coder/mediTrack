import fetch from "node-fetch";
import prisma from "../config/database.js";
import { GEBETA_MAPS_API_KEY } from "../config/env.js";

class GeolocationService {
  constructor() {
    this.apiKey = GEBETA_MAPS_API_KEY;
    this.geocodeUrl = "https://mapapi.gebeta.app/api/geocode/";
    this.directionsUrl = "https://mapapi.gebeta.app/api/route/direction/";
  }

  async geocodeAddress(address) {
    try {
      const url = `${this.geocodeUrl}?address=${encodeURIComponent(address)}&apiKey=${this.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Gebeta Geocode API error: ${res.status}`);
      const data = await res.json();

      if (!data || !data.results || data.results.length === 0) return null;

      return {
        latitude: data.results[0].latitude,
        longitude: data.results[0].longitude,
        formattedAddress: data.results[0].formattedAddress
      };
    } catch (error) {
      console.error("Geocode error:", error);
      return null;
    }
  }

  async getDirections(originLat, originLon, destLat, destLon) {
    try {
      const origin = `${originLat},${originLon}`;
      const destination = `${destLat},${destLon}`;
      const url = `${this.directionsUrl}?origin={${origin}}&destination={${destination}}&instruction=1&apiKey=${this.apiKey}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Gebeta Directions API error: ${res.status}`);
      const data = await res.json();

      return {
        distance: data?.route?.distance || 0,
        duration: data?.route?.duration || 0,
        instructions: data?.route?.instructions || []
      };
    } catch (error) {
      console.error("Directions error:", error);
      return null;
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  async findNearbyPharmacies(userLat, userLon, radius = 10) {
    const pharmacies = await prisma.pharmacy.findMany({
      where: { isActive: true, verified: true },
      include: {
        inventory: { where: { isAvailable: true, expiryAt: { gt: new Date() } } }
      }
    });

    const results = [];

    for (const pharmacy of pharmacies) {
      if (!pharmacy.latitude || !pharmacy.longitude) continue;
      const routeData = await this.getDirections(userLat, userLon, pharmacy.latitude, pharmacy.longitude);
      if (routeData && routeData.distance <= radius) {
        results.push({ ...pharmacy, distance: routeData.distance, duration: routeData.duration, instructions: routeData.instructions });
      }
    }

    return results.sort((a, b) => a.distance - b.distance);
  }
}

export const geolocationService = new GeolocationService();
