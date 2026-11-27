"use strict";

// ========================================
// ØYGARDEN MARINE
// Vær- og havoversikt
// ========================================

// Endepunkter for Open-Meteo API
const weatherApiUrl = "https://api.open-meteo.com/v1/forecast";
const marineApiUrl = "https://marine-api.open-meteo.com/v1/marine";

// Henter HTML-elementer
const locationSelect = document.getElementById("location-select");
const refreshBtn = document.getElementById("refresh-btn");
const weatherStatus = document.getElementById("weather-status");
const waveChart = document.getElementById("wave-chart");


// Lagrer data for det interaktive bølgediagrammet
let waveChartData = null;

const waveTooltip = document.getElementById("wave-tooltip");

// ========================================
// GEOGRAFISKE KOORDINATER
// ========================================

const locations = {

    steinsland: {
        name: "Steinsland",
        latitude: 60.2022,
        longitude: 5.0881
    },

    straume: {
        name: "Straume",
        latitude: 60.3613,
        longitude: 5.1220
    },

    rong: {
        name: "Rong",
        latitude: 60.5122,
        longitude: 4.9027
    },

    hellesoy: {
    name: "Hellesøy",
    latitude: 60.6605,
    longitude: 4.7912
    },

    telavag: {
        name: "Telavåg",
        latitude: 60.2629,
        longitude: 4.9864
    },

    misje: {
        name: "Misje",
        latitude: 60.4515,
        longitude: 4.9647
    },

    klokkarvik: {
        name: "Klokkarvik",
        latitude: 60.2236,
        longitude: 5.1520
    }
};

// ========================================
// WEATHER API
// ========================================

// Henter værdata fra Open-Meteo
const fetchWeather = async (location) => {

    const params = new URLSearchParams({

        latitude: location.latitude,
        longitude: location.longitude,

        current: "temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,precipitation,surface_pressure,weather_code,relative_humidity_2m,dew_point_2m,wind_gusts_10m",

        hourly: "temperature_2m,weather_code,wind_speed_10m,precipitation,is_day,visibility,uv_index",

        daily: "temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,sunrise,sunset",

        wind_speed_unit: "ms",
        timezone: "Europe/Oslo",
        forecast_days: 7
    });

    const response = await fetch(
        `${weatherApiUrl}?${params}`
    );

    if (!response.ok) {
        throw new Error(
            `Kunne ikke hente værdata: ${response.status}`
        );
    }

    return await response.json();
};

// ========================================
// MARINE API
// ========================================

// Henter havdata fra Open-Meteo
const fetchMarine = async (location) => {

    const params = new URLSearchParams({

        latitude: location.latitude,
        longitude: location.longitude,

        current: "wave_height,wave_direction,wave_period,sea_surface_temperature",

        hourly: "wave_height,wave_direction,wave_period",

        timezone: "Europe/Oslo",
        forecast_days: 7
    });

    const response = await fetch(
        `${marineApiUrl}?${params}`
    );

    if (!response.ok) {
        throw new Error(
            `Kunne ikke hente havdata: ${response.status}`
        );
    }

    return await response.json();
};

// Konverterer grader til kompassretning
const getCompassDirection = (degrees) => {

    if (degrees == null) {
        return "–";
    }

    const directions = [
        "N", "NØ", "Ø", "SØ",
        "S", "SV", "V", "NV"
    ];

    const index = Math.round(degrees / 45) % 8;

    return directions[index];
};

// ========================================
// LUFTTRYKKSMÅLER
// ========================================

// Tegner skalaen for lufttrykk
const drawPressureGauge = (pressure) => {

    const canvas = document.getElementById("pressure-gauge");
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = 120;
    const centerY = 108;
    const radius = 88;

    // Tegner skalaen med 41 streker
    for (let i = 0; i <= 40; i++) {

        const angle = (-135 + i * 6.75) * Math.PI / 180;

        const innerRadius = i % 10 === 0
            ? radius - 18
            : radius - 9;

        ctx.beginPath();

        ctx.moveTo(
            centerX + Math.sin(angle) * innerRadius,
            centerY - Math.cos(angle) * innerRadius
        );

        ctx.lineTo(
            centerX + Math.sin(angle) * radius,
            centerY - Math.cos(angle) * radius
        );

        ctx.strokeStyle = "#83a4ba";
        ctx.lineWidth = i % 10 === 0 ? 3 : 2;
        ctx.lineCap = "round";

        ctx.stroke();
    }

    // Tegner viseren basert på lufttrykket
if (Number.isFinite(pressure)) {

    const value = Math.max(960, Math.min(1080, pressure));

    const angle =
        (-135 + ((value - 960) / 120) * 270)
        * Math.PI / 180;

    ctx.beginPath();

    ctx.moveTo(centerX, centerY);

    ctx.lineTo(
        centerX + Math.sin(angle) * 65,
        centerY - Math.cos(angle) * 65
    );

    ctx.strokeStyle = "#d8ed4b";
    ctx.lineWidth = 5;
    ctx.stroke();

    // Tegner midtpunktet
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
}

// Viser minimum og maksimum på skalaen
ctx.font = "18px Arial";
ctx.textAlign = "center";
ctx.fillStyle = "#b8d5e5";

ctx.fillText("960", 45, 195);
ctx.fillText("1080", 195, 195);
ctx.fillText("hPa", 120, 155);
};

// ========================================
// VISER VÆRDATA
// ========================================

const displayWeather = (data) => {

    const current = data.current;

    document.getElementById("temperature").textContent =
        `${current.temperature_2m ?? "–"} °C`;

    document.getElementById("feels-like").textContent =
        `${current.apparent_temperature ?? "–"} °C`;

    document.getElementById("wind-speed").textContent =
        `${current.wind_speed_10m ?? "–"} m/s`;

    document.getElementById("wind-direction").textContent =
    `${getCompassDirection(current.wind_direction_10m)} (${current.wind_direction_10m ?? "–"}°)`;

// Oppdaterer kompassnålen med vindretningen
const windNeedle = document.getElementById("wind-needle");

if (Number.isFinite(current.wind_direction_10m)) {

    windNeedle.style.visibility = "visible";

    windNeedle.style.transform =
        `translate(-50%, -50%) rotate(${current.wind_direction_10m}deg)`;

} else {

    windNeedle.style.visibility = "hidden";
}

    document.getElementById("precipitation").textContent =
        `${current.precipitation ?? "–"} mm`;

    document.getElementById("pressure").textContent =
        `${current.surface_pressure ?? "–"} hPa`;

        drawPressureGauge(current.surface_pressure);
        // Viser luftfuktighet
document.getElementById("humidity").textContent =
    `${current.relative_humidity_2m ?? "–"} %`;

// Viser duggpunkt
document.getElementById("dew-point").textContent =
    `${current.dew_point_2m ?? "–"} °C`;

// Viser vindkast
document.getElementById("wind-gusts").textContent =
    `${current.wind_gusts_10m ?? "–"} m/s`;

// Finner aktuell time i værvarselet
const hourIndex = data.hourly?.time.findIndex(
    time => time.slice(0, 13) === current.time?.slice(0, 13)
) ?? -1;

// Henter sikt og UV-indeks
const visibility = data.hourly?.visibility?.[hourIndex];
const uvIndex = data.hourly?.uv_index?.[hourIndex];

// Konverterer sikt fra meter til kilometer
document.getElementById("visibility").textContent =
    Number.isFinite(visibility)
        ? `${(visibility / 1000).toFixed(1)} km`
        : "– km";

// Viser UV-indeks
document.getElementById("uv-index").textContent =
    uvIndex ?? "–";
};

// ========================================
// VISER HAVDATA
// ========================================

const displayMarine = (data) => {

    const current = data.current;

    document.getElementById("wave-height").textContent =
        `${current.wave_height ?? "–"} m`;

    document.getElementById("wave-direction").textContent =
    `${getCompassDirection(current.wave_direction)} (${current.wave_direction ?? "–"}°)`;

    document.getElementById("wave-period").textContent =
        `${current.wave_period ?? "–"} s`;

    document.getElementById("sea-temperature").textContent =
        `${current.sea_surface_temperature ?? "–"} °C`;
};
// ========================================
// VÆRIKONER
// ========================================

// Returnerer værikon basert på værkode
const getWeatherIcon = (code, isDay = 1) => {

    if (code === 0) return isDay === 1 ? "☀️" : "🌙";
    if (code === 1) return isDay === 1 ? "🌤️" : "🌙";
    if (code === 2) return isDay === 1 ? "⛅" : "☁️";
    if (code === 3) return "☁️";

    if ([45, 48].includes(code)) return "🌫️";

    if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";

    if ([61, 63, 65, 66, 67].includes(code)) return "🌧️";

    if ([71, 73, 75, 77].includes(code)) return "❄️";

    if ([80, 81, 82].includes(code)) return "🌧️";

    if ([85, 86].includes(code)) return "🌨️";

    if ([95, 96, 99].includes(code)) return "⛈️";

    return "❔";
};
// ========================================
// TIMEVARSEL
// ========================================

// Viser værvarsel for de neste 12 timene
const displayHourlyForecast = (data) => {

    const hourly = data.hourly;
    const forecastContainer = document.getElementById("hourly-forecast");

    forecastContainer.innerHTML = "";

    const startIndex = hourly.time.findIndex(
        time => time >= data.current.time
    );

    if (startIndex === -1) return;

    for (let i = startIndex; i < startIndex + 12 && i < hourly.time.length; i++) {

        const hour = hourly.time[i].slice(11, 16);

        const card = document.createElement("article");

        card.classList.add("forecast-card");
        // Gir kortet forskjellig stil for dag og natt
if (hourly.is_day[i] === 1) {
    card.classList.add("day-card");
} else {
    card.classList.add("night-card");
}
        card.innerHTML = `
            <h3>${hour}</h3>

            <p class="temp-max"><div class="weather-icon">${getWeatherIcon(hourly.weather_code[i], hourly.is_day[i])}</div>${hourly.temperature_2m[i] ?? "–"} °C</p>
            <p class="temp-min">Vind: ${hourly.wind_speed_10m[i] ?? "–"} m/s</p>
            <p class="rain-value">Nedbør: ${hourly.precipitation[i] ?? "–"} mm</p>
        `;

        forecastContainer.appendChild(card);
    }
};

// ========================================
// 7-DAGERS VARSEL
// ========================================

// Viser værvarsel for de neste 7 dagene
const displayDailyForecast = (data) => {

    const daily = data.daily;
    const forecastContainer = document.getElementById("daily-forecast");

    forecastContainer.innerHTML = "";

    for (let i = 0; i < daily.time.length; i++) {

        const date = new Date(daily.time[i]);

        const day = date.toLocaleDateString("nb-NO", {
            weekday: "long",
            day: "numeric",
            month: "short"
        });

        const card = document.createElement("article");

        card.classList.add("forecast-card");
        
        card.innerHTML = `
            <h3>${day}</h3>
            <p class="temp-max">Maks: ${daily.temperature_2m_max[i] ?? "–"} °C</p>
            <p class="temp-min">Min: ${daily.temperature_2m_min[i] ?? "–"} °C</p>
            <p class="rain-value">Nedbør: ${daily.precipitation_sum[i] ?? "–"} mm</p>
        `;

        forecastContainer.appendChild(card);
    }
};

// ========================================
// BØLGEPROGNOSE
// ========================================

// Tegner bølgeprognosen i Canvas
const drawWaveChart = (data) => {

    const ctx = waveChart.getContext("2d");

    const hourly = data.hourly;

    const startIndex = hourly.time.findIndex(
        time => time >= data.current.time
    );

    if (startIndex === -1) return;

    // Henter data for de neste 24 timene
    const times = hourly.time.slice(
        startIndex, startIndex + 24
    );

    const heights = hourly.wave_height.slice(
        startIndex, startIndex + 24
    );

   // Tilpasser diagramhøyden til skjermbredden
waveChart.height = window.innerWidth <= 600 ? 600 : 350;

const width = waveChart.width;
const height = waveChart.height;

// Tilpasser margene til skjermbredden
const padding = {
    top: 40,
    right: 40,
    bottom: 60,
    left: window.innerWidth <= 600 ? 130 : 85
};

const chartWidth = width - padding.left - padding.right;
const chartHeight = height - padding.top - padding.bottom;

// Fjerner tidligere diagram
ctx.clearRect(0, 0, width, height);

// Beregner maksimal bølgehøyde
const validHeights = heights.filter(Number.isFinite);
const maxHeight = Math.max(1, Math.ceil(Math.max(...validHeights)));

// Tegner horisontale hjelpelinjer
// Tilpasser tekststørrelsen til skjermbredden
const isMobile = window.innerWidth <= 600;

ctx.font = isMobile
    ? "30px Arial"
    : "18px Arial";
ctx.textAlign = "right";

for (let i = 0; i <= 5; i++) {

    const value = (maxHeight / 5) * i;
    const y = height - padding.bottom - (chartHeight / 5) * i;

    ctx.beginPath();
    ctx.strokeStyle = "#34566c";
    ctx.lineWidth = 1;

    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);

    ctx.stroke();

    ctx.fillStyle = "#b8d5e5";
    ctx.fillText(`${value.toFixed(1)} m`, padding.left - 10, y + 5);
}

// Beregner posisjonene i diagrammet
const getX = (index) =>
    padding.left + (index / Math.max(1, heights.length - 1)) * chartWidth;

const getY = (value) =>
    height - padding.bottom - (value / maxHeight) * chartHeight;

// Lagrer diagramdata for musebevegelser
waveChartData = {
    times,
    heights,
    padding,
    chartWidth,
    chartHeight,
    getX,
    getY
};

// Viser klokkeslett langs x-aksen
ctx.textAlign = "center";
ctx.fillStyle = "#b8d5e5";

for (let i = 0; i < times.length; i += (isMobile ? 6 : 3)) {

    ctx.fillText(
        times[i].slice(11, 16),
        getX(i),
        height - 20
    );
}
// Lager en fargegradient under bølgelinjen
const gradient = ctx.createLinearGradient(
    0, padding.top,
    0, height - padding.bottom
);

gradient.addColorStop(0, "rgba(56, 189, 248, 0.45)");
gradient.addColorStop(1, "rgba(56, 189, 248, 0.02)");

// Fyller området under bølgelinjen
for (let i = 0; i < heights.length - 1; i++) {

    if (
        !Number.isFinite(heights[i]) ||
        !Number.isFinite(heights[i + 1])
    ) continue;

    ctx.beginPath();

    ctx.moveTo(getX(i), height - padding.bottom);
    ctx.lineTo(getX(i), getY(heights[i]));
    ctx.lineTo(getX(i + 1), getY(heights[i + 1]));
    ctx.lineTo(getX(i + 1), height - padding.bottom);

    ctx.closePath();

    ctx.fillStyle = gradient;
    ctx.fill();
}
// Tegner linjen for bølgehøyde
ctx.beginPath();
ctx.strokeStyle = "#38bdf8";
ctx.lineWidth = 3;

let hasPoint = false;

for (let i = 0; i < heights.length; i++) {

    if (!Number.isFinite(heights[i])) {
        hasPoint = false;
        continue;
    }

    const x = getX(i);
    const y = getY(heights[i]);

    if (!hasPoint) {
        ctx.moveTo(x, y);
        hasPoint = true;
    } else {
        ctx.lineTo(x, y);
    }
}

ctx.stroke();

// Tegner punkter på bølgelinjen
for (let i = 0; i < heights.length; i++) {

    if (!Number.isFinite(heights[i])) continue;

    ctx.beginPath();
    ctx.arc(getX(i), getY(heights[i]), 4, 0, Math.PI * 2);
    ctx.fillStyle = "#d8ed4b";
    ctx.fill();
}
};

// ========================================
// API-STATUS
// ========================================

// Oppdaterer status for API-tilkoblingen
const updateApiStatus = (status, message) => {

    const apiStatus = document.getElementById("api-status");

    apiStatus.className = `api-status ${status}`;

    apiStatus.innerHTML = `
        <span class="status-dot"></span>
        ${message}
    `;
};

// Viser tidspunktet for siste oppdatering
const updateLastUpdated = () => {

    const now = new Date();

    const date = now.toLocaleDateString("nb-NO", {
        timeZone: "Europe/Oslo"
    });

    const time = now.toLocaleTimeString("nb-NO", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Europe/Oslo"
    });

    document.getElementById("last-updated").textContent =
        `Sist oppdatert: ${date} kl. ${time}`;
};


// ========================================
// OPPDATERER VÆR- OG HAVDATA
// ========================================

const updateWeather = async () => {

    const selectedLocation = locations[locationSelect.value];

    weatherStatus.textContent = "Henter vær- og havdata...";
    updateApiStatus("loading", "Kobler til API...");
    refreshBtn.disabled = true;
    locationSelect.disabled = true;

    // Nullstiller tidligere data
    displayWeather({ current: {} });
    displayMarine({ current: {} });

    try {

        // Henter begge API-er samtidig
        const [weatherResult, marineResult] =
            await Promise.allSettled([
                fetchWeather(selectedLocation),
                fetchMarine(selectedLocation)
            ]);

        // Kontrollerer værdata
        if (weatherResult.status === "fulfilled") {

            displayWeather(weatherResult.value);
            displayHourlyForecast(weatherResult.value);
            displayDailyForecast(weatherResult.value);
            
        } else {

            console.error(
                "Kunne ikke hente værdata:",
                weatherResult.reason
            );
        }

        // Kontrollerer havdata
        if (marineResult.status === "fulfilled") {

            displayMarine(marineResult.value);
            drawWaveChart(marineResult.value);
        } else {

            console.error(
                "Kunne ikke hente havdata:",
                marineResult.reason
            );
        }

        // Viser status for API-forespørslene
        if (
            weatherResult.status === "fulfilled" &&
            marineResult.status === "fulfilled"
        ) {

            weatherStatus.textContent =
                `Vær- og havdata oppdatert for ${selectedLocation.name}`;
            updateApiStatus("online", "API tilkoblet");
           updateLastUpdated(); 

        } else if (
            weatherResult.status === "rejected" &&
            marineResult.status === "rejected"
        ) {

            weatherStatus.textContent =
                "Kunne ikke hente vær- eller havdata.";
            updateApiStatus("offline", "API utilgjengelig");
        } else {

            weatherStatus.textContent =
                `Data delvis oppdatert for ${selectedLocation.name}`;
            updateApiStatus("partial", "Delvis tilkoblet");
            updateLastUpdated();
        }

    } catch (error) {

        weatherStatus.textContent =
            "Det oppstod en feil.";
        updateApiStatus("offline", "Oppdateringsfeil");
        console.error(error);

    } finally {

        refreshBtn.disabled = false;
        locationSelect.disabled = false;
    }
};

// ========================================
// HENDELSESLYTTERE
// ========================================

// Oppdaterer ved klikk på knappen
refreshBtn.addEventListener("click", updateWeather);

// Oppdaterer ved valg av et nytt sted
locationSelect.addEventListener("change", updateWeather);

// ========================================
// INTERAKTIVT BØLGEDIAGRAM
// ========================================

// Viser bølgehøyde ved musebevegelse
waveChart.addEventListener("pointermove", (event) => {

    if (!waveChartData) return;

    const rect = waveChart.getBoundingClientRect();

    const mouseX =
        (event.clientX - rect.left) *
        (waveChart.width / rect.width);

    const { times, heights, padding, chartWidth } = waveChartData;

    // Finner nærmeste datapunkt
    const index = Math.round(
        ((mouseX - padding.left) / chartWidth) *
        (heights.length - 1)
    );

    // Skjuler informasjon utenfor diagrammet
    if (
        index < 0 ||
        index >= heights.length ||
        !Number.isFinite(heights[index])
    ) {
        waveTooltip.style.display = "none";
        return;
    }

    const time = times[index].slice(11, 16);
    const waveHeight = heights[index].toFixed(2);

    waveTooltip.innerHTML = `
        Kl. ${time}<br>
        Bølgehøyde: ${waveHeight} m
    `;

    waveTooltip.style.display = "block";

    waveTooltip.style.left = `${Math.max(
        0,
        Math.min(
            event.clientX - rect.left + 15,
            rect.width - waveTooltip.offsetWidth
        )
    )}px`;

    waveTooltip.style.top =
        `${Math.max(0, event.clientY - rect.top - 65)}px`;
});

// Skjuler informasjon når musen forlater diagrammet
waveChart.addEventListener("pointerleave", () => {
    waveTooltip.style.display = "none";
});

// Viser bølgehøyde ved berøring
waveChart.addEventListener("pointerdown", (event) => {

    waveChart.dispatchEvent(
        new PointerEvent("pointermove", {
            clientX: event.clientX,
            clientY: event.clientY
        })
    );
});

// ========================================
// TIL TOPPEN
// ========================================

const backToTop = document.getElementById("back-to-top");

// Viser knappen når brukeren ruller ned
const toggleBackToTop = () => {

    backToTop.classList.toggle(
        "visible",
        window.scrollY > 300
    );
};

window.addEventListener("scroll", toggleBackToTop);

toggleBackToTop();

// Ruller tilbake til toppen av siden
backToTop.addEventListener("click", () => {

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});


// Henter data ved oppstart
updateWeather();

// ========================================
// REGISTRERER SERVICE WORKER
// ========================================

if ("serviceWorker" in navigator) {

    navigator.serviceWorker
        .register("./service-worker.js")
        .then((registration) => {

            console.log(
                "Service Worker registrert:",
                registration.scope
            );

        })
        .catch((error) => {

            console.error(
                "Kunne ikke registrere Service Worker:",
                error
            );

        });
}