const fs = require('fs');
let code = fs.readFileSync('src/components/TouristView.tsx', 'utf8');

const oldFetch = 'const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current_weather=true`);';
const newFetch = 'const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current_weather=true&hourly=temperature_2m,weathercode&timezone=auto&forecast_days=1`);';

code = code.replace(oldFetch, newFetch);

const oldSetWeatherAlert = `setWeatherAlert({
            status,
            code,
            color,
            temperature: data.current_weather.temperature,
            windspeed: data.current_weather.windspeed,
            containerClass,
            dotClass
          });`;

const newSetWeatherAlert = `let forecast: {time: string, temp: number, code: number}[] = [];
          if (data.hourly && data.hourly.time && data.hourly.temperature_2m) {
            for (let i = 0; i < data.hourly.time.length; i++) {
              const t = data.hourly.time[i];
              // Pick 08:00, 12:00, 16:00, 20:00
              if (t.endsWith("08:00") || t.endsWith("12:00") || t.endsWith("16:00") || t.endsWith("20:00")) {
                forecast.push({
                  time: t.substring(11, 16),
                  temp: data.hourly.temperature_2m[i],
                  code: data.hourly.weathercode[i]
                });
              }
            }
          }
          setWeatherAlert({
            status,
            code,
            color,
            temperature: data.current_weather.temperature,
            windspeed: data.current_weather.windspeed,
            containerClass,
            dotClass,
            forecast
          });`;

code = code.replace(oldSetWeatherAlert, newSetWeatherAlert);

fs.writeFileSync('src/components/TouristView.tsx', code);
