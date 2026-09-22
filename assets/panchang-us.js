// U.S. Daily Panchang
// Uses DivineAPI with a U.S. location (place + latitude + longitude + UTC offset).

const PANCHANG_API_URL = 'https://astroapi-1.divineapi.com/indian-api/v2/find-panchang';

const US_PANCHANG_CITIES = [
  { id: 'new-york', name: 'New York, NY', lat: 40.7128, lon: -74.0060, timeZone: 'America/New_York' },
  { id: 'boston', name: 'Boston, MA', lat: 42.3601, lon: -71.0589, timeZone: 'America/New_York' },
  { id: 'washington-dc', name: 'Washington, DC', lat: 38.9072, lon: -77.0369, timeZone: 'America/New_York' },
  { id: 'miami', name: 'Miami, FL', lat: 25.7617, lon: -80.1918, timeZone: 'America/New_York' },
  { id: 'atlanta', name: 'Atlanta, GA', lat: 33.7490, lon: -84.3880, timeZone: 'America/New_York' },
  { id: 'chicago', name: 'Chicago, IL', lat: 41.8781, lon: -87.6298, timeZone: 'America/Chicago' },
  { id: 'dallas', name: 'Dallas, TX', lat: 32.7767, lon: -96.7970, timeZone: 'America/Chicago' },
  { id: 'houston', name: 'Houston, TX', lat: 29.7604, lon: -95.3698, timeZone: 'America/Chicago' },
  { id: 'denver', name: 'Denver, CO', lat: 39.7392, lon: -104.9903, timeZone: 'America/Denver' },
  { id: 'phoenix', name: 'Phoenix, AZ', lat: 33.4484, lon: -112.0740, timeZone: 'America/Phoenix' },
  { id: 'salt-lake-city', name: 'Salt Lake City, UT', lat: 40.7608, lon: -111.8910, timeZone: 'America/Denver' },
  { id: 'los-angeles', name: 'Los Angeles, CA', lat: 34.0522, lon: -118.2437, timeZone: 'America/Los_Angeles' },
  { id: 'san-francisco', name: 'San Francisco, CA', lat: 37.7749, lon: -122.4194, timeZone: 'America/Los_Angeles' },
  { id: 'seattle', name: 'Seattle, WA', lat: 47.6062, lon: -122.3321, timeZone: 'America/Los_Angeles' },
  { id: 'portland', name: 'Portland, OR', lat: 45.5152, lon: -122.6784, timeZone: 'America/Los_Angeles' },
  { id: 'las-vegas', name: 'Las Vegas, NV', lat: 36.1699, lon: -115.1398, timeZone: 'America/Los_Angeles' },
  { id: 'honolulu', name: 'Honolulu, HI', lat: 21.3069, lon: -157.8583, timeZone: 'Pacific/Honolulu' }
];

function hasPanchangCredentials() {
  return Boolean(
    window.PANCHANG_API_KEY &&
    window.PANCHANG_ACCESS_TOKEN &&
    window.PANCHANG_API_KEY !== 'YOUR_DIVINE_API_KEY' &&
    window.PANCHANG_ACCESS_TOKEN !== 'YOUR_DIVINE_ACCESS_TOKEN'
  );
}

function getCityById(id) {
  return US_PANCHANG_CITIES.find(city => city.id === id) || null;
}

function getDefaultUSCityId() {
  const saved = localStorage.getItem('cosmic-insights-us-panchang-city');
  if (getCityById(saved)) return saved;

  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const match = US_PANCHANG_CITIES.find(city => city.timeZone === browserZone);
  return match?.id || 'new-york';
}

function populateUSCitySelector() {
  const select = document.getElementById('panchangCity');
  if (!select) return;

  select.innerHTML = US_PANCHANG_CITIES
    .map(city => `<option value="${city.id}">${city.name}</option>`)
    .join('');

  select.value = getDefaultUSCityId();

  select.addEventListener('change', () => {
    localStorage.setItem('cosmic-insights-us-panchang-city', select.value);
    loadUSPanchang();
  });
}

function getUTCOffsetHours(timeZone, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const offsetText = parts.find(part => part.type === 'timeZoneName')?.value || 'GMT';
  if (offsetText === 'GMT') return 0;

  const match = offsetText.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;

  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) + Number(match[3] || 0) / 60);
}

function getDatePartsInTimeZone(timeZone, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));

  return {
    day: Number(values.day),
    month: Number(values.month),
    year: Number(values.year)
  };
}

function formatDate(timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());
}

function formatTime(value) {
  if (!value) return '—';

  const match = String(value).match(/(?:^|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return String(value);

  let hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;

  return `${hour}:${minute} ${suffix}`;
}

function firstItem(value) {
  return Array.isArray(value) && value.length ? value[0] : null;
}

function getContainer() {
  return document.getElementById('panchangContainer');
}

function renderError(message) {
  const container = getContainer();
  if (!container) return;

  container.innerHTML = `
    <div class="panchang-error">
      <strong>Unable to load today's U.S. Panchang.</strong>
      <span>${message}</span>
    </div>`;
}

function renderPanchang(data, location, requestDate) {
  const container = getContainer();
  if (!container) return;

  const tithi = firstItem(data.tithis);
  const nakshatra = firstItem(data.nakshatras?.nakshatra_list);
  const yoga = firstItem(data.yogas);
  const karana = firstItem(data.karnas);

  const cards = [
    {
      label: 'Tithi',
      value: tithi ? `${tithi.paksha || ''} ${tithi.tithi || ''}`.trim() : '—',
      sub: tithi?.end_time ? `Ends ${formatTime(tithi.end_time)}` : 'Lunar day',
      icon: '🌙'
    },
    {
      label: 'Nakshatra',
      value: nakshatra?.nak_name || '—',
      sub: nakshatra?.end_time ? `Ends ${formatTime(nakshatra.end_time)}` : 'Star / Constellation',
      icon: '⭐'
    },
    {
      label: 'Yoga',
      value: yoga?.yoga_name || '—',
      sub: yoga?.end_time ? `Ends ${formatTime(yoga.end_time)}` : 'Auspicious influence',
      icon: '✨'
    },
    {
      label: 'Karana',
      value: karana?.karana_name || '—',
      sub: karana?.end_time ? `Ends ${formatTime(karana.end_time)}` : 'Half Tithi',
      icon: '🔄'
    },
    { label: 'Sunrise', value: formatTime(data.sunrise), sub: location.name, icon: '🌅' },
    { label: 'Sunset', value: formatTime(data.sunset), sub: location.name, icon: '🌇' },
    { label: 'Moonrise', value: formatTime(data.moonrise), sub: location.name, icon: '🌔' },
    { label: 'Moonset', value: formatTime(data.moonset), sub: location.name, icon: '🌘' }
  ];

  const title = document.querySelector('.panchang-location-copy strong');
  const helper = document.querySelector('.panchang-location-copy > span:last-child');

  if (title) title.textContent = location.name;
  if (helper) helper.textContent = `Local Vedic Panchang for ${location.name}.`;

  const meta = `U.S. Daily Panchang · ${formatDate(location.timeZone)} · ${location.name}`;

  container.innerHTML = `
    <div class="panchang-meta">${meta}</div>
    ${cards.map(card => `
      <div class="panchang-card reveal visible">
        <div class="panchang-card-inner">
          <div class="panchang-icon">${card.icon}</div>
          <div class="panchang-label">${card.label}</div>
          <div class="panchang-value">${card.value || '—'}</div>
          <div class="panchang-sub">${card.sub || ''}</div>
        </div>
      </div>
    `).join('')}`;
}

async function loadUSPanchang() {
  const container = getContainer();
  const select = document.getElementById('panchangCity');
  if (!container || !select) return;

  const location = getCityById(select.value) || getCityById('new-york');
  const requestDate = getDatePartsInTimeZone(location.timeZone);
  const timezoneOffset = getUTCOffsetHours(location.timeZone);

  container.innerHTML = `
    <div class="panchang-loading">
      ✨ Fetching Panchang for ${location.name}…
    </div>`;

  if (!hasPanchangCredentials()) {
    renderError('Add your DivineAPI API key and access token in assets/panchang-config.js.');
    return;
  }

  try {
    // DivineAPI supported request parameters:
    // api_key, day, month, year, place, lat, lon, tzone, lan
    const form = new FormData();
    form.append('api_key', window.PANCHANG_API_KEY);
    form.append('day', String(requestDate.day));
    form.append('month', String(requestDate.month));
    form.append('year', String(requestDate.year));
    form.append('place', location.name);
    form.append('lat', String(location.lat));
    form.append('lon', String(location.lon));
    form.append('tzone', String(timezoneOffset));
    form.append('lan', 'en');

    const response = await fetch(PANCHANG_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${window.PANCHANG_ACCESS_TOKEN}`
      },
      body: form
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result || result.success !== 1 || !result.data) {
      throw new Error(
        result?.message ||
        result?.error ||
        `API request failed (${response.status})`
      );
    }

    renderPanchang(result.data, location, requestDate);
  } catch (error) {
    console.error('U.S. Panchang API error:', error);
    renderError(error.message || 'Please check your DivineAPI credentials and try again.');
  }
}

function initUSPanchang() {
  populateUSCitySelector();
  loadUSPanchang();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUSPanchang);
} else {
  initUSPanchang();
}
