// Daily Tree Weather Integration
// Uses Open-Meteo API (no API key required)

export class WeatherManager {
  constructor() {
    this.currentWeather = null;
    this.lastUpdate = 0;
    this.updateInterval = 30 * 60 * 1000; // 30 minutes
  }

  async init() {
    this.updateWeather();
    // Update weather every 30 minutes
    setInterval(() => this.updateWeather(), this.updateInterval);
  }

  async updateWeather() {
    if (Date.now() - this.lastUpdate < this.updateInterval) return;

    try {
      const pos = await this._getLocation();
      const weather = await this._fetchWeather(pos.latitude, pos.longitude);
      this.currentWeather = weather;
      this._applyWeatherTheme(weather);
      this.lastUpdate = Date.now();
    } catch (err) {
      console.warn('Weather update failed:', err);
      // Fallback to default theme
    }
  }

  _getLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        err => reject(err),
        { timeout: 5000, maximumAge: 3600000 } // Cache for 1 hour
      );
    });
  }

  async _fetchWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,temperature_2m,wind_speed_10m&timezone=auto`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Weather API error');
    const data = await resp.json();
    const current = data.current;
    return {
      code: current.weather_code,
      temp: current.temperature_2m,
      wind: current.wind_speed_10m,
      condition: this._getWeatherCondition(current.weather_code),
    };
  }

  _getWeatherCondition(code) {
    // WMO Weather interpretation codes
    if (code === 0) return 'clear';
    if (code === 1 || code === 2) return 'cloudy';
    if (code === 3) return 'overcast';
    if (code === 45 || code === 48) return 'foggy';
    if (code >= 51 && code <= 67) return 'drizzle';
    if (code >= 71 && code <= 77) return 'snow';
    if (code >= 80 && code <= 82) return 'rain';
    if (code >= 85 && code <= 86) return 'snowshower';
    if (code >= 80 && code <= 82) return 'rain';
    if (code === 95 || code === 96 || code === 99) return 'thunderstorm';
    return 'cloudy';
  }

  _applyWeatherTheme(weather) {
    const root = document.documentElement;
    const condition = weather.condition;

    // Define color themes for each weather condition
    const themes = {
      clear: {
        bg: 'linear-gradient(135deg, #87CEEB 0%, #E0F6FF 100%)',
        tree: '--page-bg: #0A0C10;',
      },
      cloudy: {
        bg: 'linear-gradient(135deg, #B0C4DE 0%, #D3D3D3 100%)',
        tree: '--page-bg: #0A0C10;',
      },
      overcast: {
        bg: 'linear-gradient(135deg, #708090 0%, #A9A9A9 100%)',
        tree: '--page-bg: #0A0C10;',
      },
      foggy: {
        bg: 'linear-gradient(135deg, #DCDCDC 0%, #F5F5F5 100%)',
        tree: '--page-bg: #0A0C10;',
      },
      drizzle: {
        bg: 'linear-gradient(135deg, #8B9DC3 0%, #A8B5C8 100%)',
        tree: '--page-bg: #0A0C10;',
      },
      rain: {
        bg: 'linear-gradient(135deg, #4A5568 0%, #6B7C9B 100%)',
        tree: '--page-bg: #0A0C10;',
      },
      snow: {
        bg: 'linear-gradient(135deg, #E8F0FF 0%, #F0F8FF 100%)',
        tree: '--page-bg: #0A0C10;',
      },
      snowshower: {
        bg: 'linear-gradient(135deg, #D3E4FF 0%, #E6F2FF 100%)',
        tree: '--page-bg: #0A0C10;',
      },
      thunderstorm: {
        bg: 'linear-gradient(135deg, #2C3E50 0%, #3D5A6C 100%)',
        tree: '--page-bg: #0A0C10;',
      },
    };

    const theme = themes[condition] || themes.cloudy;

    // Apply background
    const canvas = document.getElementById('forest-canvas');
    if (canvas) {
      canvas.style.background = theme.bg;
    }
  }

  getWeather() {
    return this.currentWeather;
  }
}
