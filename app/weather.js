// app/weather.js — Open-Meteo 天气 + Canvas 粒子层

const WEATHER_KEY = 'daily_tree_weather';

function wmoToCondition(code) {
  if (code === 0)                                return 'clear';
  if (code <= 2)                                 return 'cloudy';
  if (code === 3)                                return 'overcast';
  if (code === 45 || code === 48)                return 'fog';
  if (code >= 51 && code <= 67)                  return 'rain';
  if (code >= 71 && code <= 77)                  return 'snow';
  if (code >= 80 && code <= 82)                  return 'rain';
  if (code === 95 || code === 96 || code === 99) return 'storm';
  return 'cloudy';
}

async function fetchWeatherData() {
  const cached = JSON.parse(sessionStorage.getItem(WEATHER_KEY) || 'null');
  if (cached) {
    const cachedDate = new Date(cached.ts).toDateString();
    if (cachedDate === new Date().toDateString()) return cached;
  }

  const pos = await new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('no geolocation'));
    navigator.geolocation.getCurrentPosition(
      p => resolve(p.coords),
      err => reject(err),
      { timeout: 6000, maximumAge: 3600000 }
    );
  });

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${pos.latitude}&longitude=${pos.longitude}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('weather api error');
  const data = await resp.json();
  const c = data.current;
  const result = {
    code: c.weather_code,
    temp: Math.round(c.temperature_2m),
    wind: c.wind_speed_10m,
    condition: wmoToCondition(c.weather_code),
    ts: Date.now(),
  };
  sessionStorage.setItem(WEATHER_KEY, JSON.stringify(result));
  return result;
}

// ── Particle Systems ──

class RainLayer {
  constructor(canvas, density = 1) {
    this.canvas = canvas;
    this.density = density;
    this.particles = [];
    this._init();
  }
  _init() {
    const count = Math.round(80 * this.density);
    const W = this.canvas.width, H = this.canvas.height;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        speed: 6 + Math.random() * 6,
        drift: 0.5 + Math.random() * 1.2,
        len:   8 + Math.random() * 8,
        alpha: 0.2 + Math.random() * 0.3,
      });
    }
  }
  draw() {
    const ctx = this.canvas.getContext('2d');
    const W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(180, 220, 255, 0.5)';
    ctx.lineWidth = 1;
    this.particles.forEach(p => {
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.drift * 1.5, p.y + p.len);
      ctx.stroke();
      p.y += p.speed;
      p.x += p.drift;
      if (p.y > H) { p.y = -p.len; p.x = Math.random() * W; }
      if (p.x > W) { p.x = 0; }
    });
    ctx.globalAlpha = 1;
  }
}

class SnowLayer {
  constructor(canvas) {
    this.canvas = canvas;
    this.particles = [];
    this._init();
  }
  _init() {
    const W = this.canvas.width, H = this.canvas.height;
    for (let i = 0; i < 60; i++) {
      this.particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 1.5 + Math.random() * 3,
        speed: 0.8 + Math.random() * 1.5,
        drift: (Math.random() - 0.5) * 0.8,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }
  draw() {
    const ctx = this.canvas.getContext('2d');
    const W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    const t = Date.now() / 2000;
    this.particles.forEach(p => {
      const sway = Math.sin(t + p.phase) * 1.5;
      ctx.beginPath();
      ctx.arc(p.x + sway, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fill();
      p.y += p.speed;
      p.x += p.drift;
      if (p.y > H) { p.y = -p.r; p.x = Math.random() * W; }
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
    });
  }
}

// ── WeatherManager ──

export class WeatherManager {
  constructor(weatherCanvas) {
    this.canvas = weatherCanvas;
    this.weather = null;
    this.layer = null;
    this.raf = null;
    this.fps = 60;
    this._lastFrame = 0;
  }

  async init() {
    try {
      this.weather = await fetchWeatherData();
      this._applyWeather(this.weather);
      this._updateTopBarWeather(this.weather);
    } catch (e) {
      // silent fail — no weather effects
    }
  }

  _applyWeather(w) {
    const condition = w.condition;
    const isWindy = w.wind > 5;

    if (condition === 'rain' || condition === 'storm') {
      this.layer = new RainLayer(this.canvas, condition === 'storm' ? 2 : 1);
    } else if (condition === 'snow') {
      this.layer = new SnowLayer(this.canvas);
    }

    if (this.layer) this._startLoop();
    if (isWindy) document.documentElement.style.setProperty('--wind-sway', '1');
  }

  _updateTopBarWeather(w) {
    const icons = { clear: '☀', cloudy: '⛅', overcast: '☁', fog: '🌫', rain: '🌧', snow: '❄', storm: '⛈' };
    const icon = icons[w.condition] || '🌡';
    const el = document.getElementById('top-weather');
    if (el) el.textContent = `${icon} ${w.temp}°`;
  }

  _startLoop() {
    const loop = (ts) => {
      if (!this.layer) return;
      const delta = ts - this._lastFrame;
      if (delta > 1000 / Math.min(this.fps, 30)) {
        this.layer.draw();
        this._lastFrame = ts;
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.layer = null;
  }
}
