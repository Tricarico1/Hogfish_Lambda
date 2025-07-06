require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { fetchWeatherApi } = require('openmeteo');

// Store connection state
let supabaseClient = null;
let connectionCreationTime = null;
const MAX_CONNECTION_AGE_MS = 55 * 60 * 1000; // 55 minutes

// Function to get or create Supabase client with context awareness
function getSupabaseClient(context) {
  const now = Date.now();
  
  // If we have a context, check if we're close to timeout
  const connectionTooOld = connectionCreationTime && (now - connectionCreationTime > MAX_CONNECTION_AGE_MS);
  const nearTimeout = context && context.getRemainingTimeInMillis && (context.getRemainingTimeInMillis() < 10000);
  
  if (!supabaseClient || connectionTooOld || nearTimeout) {
    if (context) {
      console.log(`Creating new Supabase client connection (Request ID: ${context.awsRequestId || 'local'}, Remaining time: ${
        context.getRemainingTimeInMillis ? context.getRemainingTimeInMillis() + 'ms' : 'N/A'
      })`);
    } else {
      console.log('Creating new Supabase client connection (local execution)');
    }
    
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    connectionCreationTime = now;
  } else {
    console.log(`Reusing existing Supabase connection (Age: ${(now - connectionCreationTime)/1000}s)`);
  }
  
  return supabaseClient;
}

// All coordinates
const COORDINATES = [
  { lat: 18.473662304914722, lng: -66.09893874222648 }, // San Juan buoy
  { lat: 18.471315495423404, lng: -65.99472699654584 }, // North coast
  { lat: 18.469352021230247, lng: -65.90119814565588 }, // North coast
  { lat: 18.412025759081935, lng: -65.70863331120732 }, // North coast
  { lat: 18.407465226955747, lng: -65.6252058813458 }, // North coast
  { lat: 18.38205433755062, lng: -65.60340488696097 },
  { lat: 18.3087327256976, lng: -65.53422535137415 }, // Vieques buoy
  { lat: 18.277276377029175, lng: -65.58932865417829 },
  { lat: 18.22739089089242, lng: -65.56272114108008 },
  { lat: 18.174128168476376, lng: -65.65527919246607 },
  { lat: 18.11572943290649, lng: -65.73887828367968 },
  { lat: 18.036745991992426, lng: -65.80222133183761 },
  { lat: 17.992669559993733, lng: -65.83844188231564 },
  { lat: 17.956420684966197, lng: -65.91380122615756 },
  { lat: 17.937150238835557, lng: -66.02812770384574 },
  { lat: 17.90742391155582, lng: -66.15962031835241 },
  { lat: 17.899093112359083, lng: -66.2818432185471 },
  { lat: 17.88920962978046, lng: -66.49869289154907 },
  { lat: 17.938040900907268, lng: -66.68934884855996 },
  { lat: 17.900133039602814, lng: -66.96592236986336 },
  { lat: 17.901781376212103, lng: -67.11431359057184 },
  { lat: 17.91304459882946, lng: -67.23094793607278 },
  { lat: 17.999555214620532, lng: -67.24336198619613 },
  { lat: 18.073124506292164, lng: -67.24191849170548 },
  { lat: 18.136237765640892, lng: -67.23268012733953 },
  { lat: 18.20152230219071, lng: -67.21766778599921 },
  { lat: 18.15516730780977, lng: -67.30456614794363 },
  { lat: 18.054460585928208, lng: -67.34469529116998 },
  { lat: 18.292709981692713, lng: -67.29305541893561 },
  { lat: 18.31957063908189, lng: -67.26187594008307 },
  { lat: 18.39957970031728, lng: -67.25148278066426 },
  { lat: 18.42779321968278, lng: -67.17122449365206 },
  { lat: 18.496253371301783, lng: -67.18075155671322 },
  { lat: 18.53074692620983, lng: -67.13398234021767 },
  { lat: 18.530199463580924, lng: -66.99078769920814 },
  { lat: 18.517059839580348, lng: -66.81439268680076 },
  { lat: 18.510763412182147, lng: -66.74279536680582 },
  { lat: 18.51733359239015, lng: -66.65070042592072 },
  { lat: 18.512132220843927, lng: -66.52078593229155 },
  { lat: 18.509394593226606, lng: -66.3937584286635 },
  { lat: 18.498717427494576, lng: -66.31985151683192 },
  { lat: 18.504740525769666, lng: -66.21678601946698 },
  { lat: 18.49488443639305, lng: -66.14518869816996 },
  { lat: 18.35821305425859, lng: -65.53099210833696 },
  { lat: 18.340009664867708, lng: -65.56218751997487 },
  { lat: 18.396622333918664, lng: -65.59060183567512 },
  { lat: 18.34842613614497, lng: -65.30596604014258 },
  { lat: 18.350618293013362, lng: -65.2467827703442 },
  { lat: 18.303617840578767, lng: -65.2173354852345 },
  { lat: 18.281414939027094, lng: -65.26814648756059 },
  { lat: 18.2893644528016, lng: -65.3017799065228 },
  { lat: 18.3114292959636, lng: -65.32386537060279 },
  { lat: 18.297039499610285, lng: -65.33974380890731 },
  { lat: 18.17870387400129, lng: -65.41240082949915 },
  { lat: 18.163891620490563, lng: -65.3370504222722 },
  { lat: 18.161697105683697, lng: -65.2813315387672 },
  { lat: 18.13865303601745, lng: -65.25246165094077 },
  { lat: 18.10435564507094, lng: -65.31482060864586 },
  { lat: 18.091732514125987, lng: -65.40027547553483 },
  { lat: 18.073619479366986, lng: -65.47995636593575 },
  { lat: 18.070864481832103, lng: -65.52773797159983 },
  { lat: 18.080470262660864, lng: -65.57537328651344 },
  { lat: 18.088428939944503, lng: -65.58951953154838 },
  { lat: 18.11257719816197, lng: -65.58345685510484 },
  { lat: 18.130411842690407, lng: -65.58085856520046 },
  { lat: 18.12958874524684, lng: -65.53899722785215 },
  { lat: 18.158394851090556, lng: -65.52196399403456 },
  { lat: 18.15949213268533, lng: -65.4668225082861 },
  { lat: 17.859146098963205, lng: -66.54120486807635 }, // Caja de Muertos
  { lat: 17.908900504978376, lng: -66.49575915565502 },
  { lat: 17.906840164713525, lng: -66.53502220309896 },
  { lat: 17.925052502649272, lng: -66.44951252039478 },
  { lat: 18.053320938963985, lng: -67.82006833477364 }, // Mona
  { lat: 18.132949464863245, lng: -67.83071134033753 }, // Mona
  { lat: 18.132623192279688, lng: -67.93473813665543 }, // Mona
  { lat: 18.080411748523208, lng: -67.9906997465558 }, // Mona
  { lat: 18.056585113275563, lng: -67.91825864416941 }, // Mona
  { lat: 18.025158315891748, lng: -67.41752829227032 },
  { lat: 17.934404416807038, lng: -67.35674643648821 },
  { lat: 18.16623804439529, lng: -67.4245959499194 },
  { lat: 18.37627783146385, lng: -67.48059247233029 }, // Desecheo
  { lat: 18.392421877747466, lng: -67.48100106512902 }, // Desecheo
  { lat: 18.38294007743958, lng: -67.47063766596153 }, // Desecheo
  { lat: 18.386394474009023, lng: -67.4920330706944 }, // Desecheo
  { lat: 18.679631852292207, lng: -67.12815135415785 },
  { lat: 18.646846753124453, lng: -66.8236294193893 },
  { lat: 18.60585647632043, lng: -66.47412128971179 },
  { lat: 18.582897606884444, lng: -66.08481768371469 },
  { lat: 18.545172749636876, lng: -65.64533716644439 },
  { lat: 18.509080302998463, lng: -65.19893570278686 },
  { lat: 18.229928402272147, lng: -65.11934474256326 },
  { lat: 18.012865414167003, lng: -65.0882004537801 },
  { lat: 17.953619834980103, lng: -65.4636621574436 },
  { lat: 17.90587978610356, lng: -65.70070479984865 },
  { lat: 17.869654619487704, lng: -65.90487290849785 },
  { lat: 17.833422067482278, lng: -66.07616649407848 },
  { lat: 17.86306743141564, lng: -66.20420412191892 },
  { lat: 17.879534942901106, lng: -66.33570223011442 },
  { lat: 17.83177495790652, lng: -66.43086533472959 },
  { lat: 17.80871382681067, lng: -66.7059732126498 },
  { lat: 17.82189198133518, lng: -66.94474609332059 },
  { lat: 17.828480693253514, lng: -67.05202086579587 },
  { lat: 17.85153926557927, lng: -67.3046356525925 },
  { lat: 18.15760399147384, lng: -67.47419900263407 },
  { lat: 18.19376994706974, lng: -67.37557542148744 },
  { lat: 18.272651431353413, lng: -67.34616137097002 },
  { lat: 18.384338814549665, lng: -67.3392404179071 },
  { lat: 18.451644817473465, lng: -67.29598446126384 },
  { lat: 18.564856320010346, lng: -67.2250446923689 }
];

// Snorkeling coordinates with spot names and regions
const SNORKELING_COORDINATES = [
  { lat: 18.332075, lng: -65.319962, name: "Flamenco Beach", region: "Culebra" },
  { lat: 18.310976, lng: -65.317206, name: "Carlos Rosario Beach", region: "Culebra" },
  { lat: 18.316945, lng: -65.320134, name: "Tamarindo Beach", region: "Culebra" },
  { lat: 18.310976, lng: -65.317206, name: "Luis Peña Keys", region: "Culebra" },
  { lat: 18.2833, lng: -65.3000, name: "Punta Soldado Beach", region: "Culebra" },
  { lat: 18.3188, lng: -65.2599, name: "Culebrita Island (Tortuga Beach)", region: "Culebra" },
  { lat: 18.385006, lng: -65.626694, name: "Seven Seas Beach", region: "Fajardo" },
  { lat: 18.381074, lng: -65.587063, name: "Icacos Island (Cayo Icacos)", region: "Fajardo" },
  { lat: 18.343436, lng: -65.559195, name: "Palomino Island", region: "Fajardo" },
  { lat: 18.4650, lng: -66.0820, name: "Escambrón Beach", region: "San Juan" },
  { lat: 18.461118, lng: -66.082391, name: "Playita del Condado", region: "San Juan" },
  { lat: 17.9730, lng: -66.9960, name: "La Parguera", region: "Lajas" },
  { lat: 17.9400, lng: -66.8800, name: "Gilligan's Island (Cayo Aurora)", region: "Guanica" },
  { lat: 18.4750, lng: -67.1600, name: "Crash Boat Beach", region: "Aguadilla" },
  { lat: 18.3560, lng: -67.2600, name: "Steps Beach (Tres Palmas Marine Reserve)", region: "Rincón" },
  { lat: 18.473056, lng: -67.168989, name: "Playa Peña Blanca", region: "Aguadilla" },
  { lat: 18.3900, lng: -67.4800, name: "Desecheo Island", region: "Off West Coast" },
  { lat: 18.1150, lng: -65.4100, name: "La Chiva Beach (Blue Beach)", region: "Vieques" },
  { lat: 18.093051, lng: -65.466076, name: "Esperanza Beach", region: "Vieques" },
  { lat: 18.1500, lng: -65.4200, name: "Mosquito Pier", region: "Vieques" },
  { lat: 18.1000, lng: -65.4200, name: "Pata Prieta Beach", region: "Vieques" },
  { lat: 18.1400, lng: -65.5700, name: "Punta Arenas (Green Beach)", region: "Vieques" },
  { lat: 17.8900, lng: -66.5200, name: "Caja de Muertos Island", region: "Ponce" },
  { lat: 17.9500, lng: -66.6200, name: "Cardona Island", region: "Ponce" },
  { lat: 18.3000, lng: -65.3200, name: "Melones Beach", region: "Culebra" },
  { lat: 18.385600, lng: -65.719125, name: "Luquillo Beach", region: "Luquillo" },
  { lat: 18.5000, lng: -67.0700, name: "Jobos Beach", region: "Isabela" },
  { lat: 18.4800, lng: -66.5000, name: "Mar Chiquita Beach", region: "Manatí" },
  { lat: 17.9700, lng: -67.1800, name: "Isla de Ratones", region: "Cabo Rojo" },
  { lat: 18.3580, lng: -67.2580, name: "Black Eagle Beach", region: "Rincón" }
];

// Improved function to fetch data for a single coordinate
async function fetchWeatherData(coord) {
  try {
    // Fetch both marine and weather data in parallel
    const [marineData, weatherData] = await Promise.all([
      fetchMarineData(coord),
      fetchWeatherForecast(coord)
    ]);
  
    // Combine the data
    if (!marineData || !weatherData) {
      return null;
    }
  
    return {
      latitude: coord.lat,
      longitude: coord.lng,
      hourly: {
        time: weatherData.hourly.time,
        wave_height: marineData.hourly.wave_height,
        wave_period: marineData.hourly.wave_period,
        wave_direction: marineData.hourly.wave_direction,
        wind_speed_10m: weatherData.hourly.wind_speed_10m,
        wind_direction_10m: weatherData.hourly.wind_direction_10m,
        precipitation_probability: weatherData.hourly.precipitation_probability,
        wind_gusts_10m: weatherData.hourly.wind_gusts_10m,
        cloud_cover: weatherData.hourly.cloud_cover,
        temperature_2m: weatherData.hourly.temperature_2m,
        precipitation: weatherData.hourly.precipitation,
        ocean_current_velocity: marineData.hourly.ocean_current_velocity,
        ocean_current_direction: marineData.hourly.ocean_current_direction,
        sea_level_height_msl: marineData.hourly.sea_level_height_msl
      }
    };
  } catch (error) {
    console.error(`Error fetching data for ${coord.lat},${coord.lng}:`, error);
    return null;
  }
}

// Fetch marine data from marine-api.open-meteo.com using the new package
async function fetchMarineData(coord) {
  const url = "https://marine-api.open-meteo.com/v1/marine";
  
  const params = {
    latitude: coord.lat,
    longitude: coord.lng,
    hourly: [
      "wave_height", 
      "wave_period",
      "wave_direction",
      "ocean_current_velocity",
      "ocean_current_direction",
      "sea_level_height_msl"
    ],
    forecast_days: 7,
    timezone: "America/Puerto_Rico" // Set timezone to Puerto Rico
  };
  
  // Add API key if available
  const apiKey = process.env.MARINE_API_KEY;
  if (apiKey) {
    params.apikey = apiKey;
  }
  
  try {
    const responses = await fetchWeatherApi(url, params);
    
    // Process first location
    const response = responses[0];
    
    // Get the hourly data
    const hourly = response.hourly();
    
    // Extract hourly data
    const hourlyData = {
      time: [...Array((Number(hourly.timeEnd()) - Number(hourly.time())) / hourly.interval())].map(
        (_, i) => new Date((Number(hourly.time()) + i * hourly.interval() + response.utcOffsetSeconds()) * 1000).toISOString()
      ),
      wave_height: hourly.variables(0).valuesArray(),
      wave_period: hourly.variables(1).valuesArray(),
      wave_direction: hourly.variables(2).valuesArray(),
      ocean_current_velocity: hourly.variables(3).valuesArray(),
      ocean_current_direction: hourly.variables(4).valuesArray(),
      sea_level_height_msl: hourly.variables(5).valuesArray()
    };
    
    return { hourly: hourlyData };
  } catch (error) {
    console.error(`Error fetching marine data for ${coord.lat},${coord.lng}:`, error);
    return null;
  }
}

// Fetch weather data from api.open-meteo.com using the new package
async function fetchWeatherForecast(coord) {
  const url = "https://api.open-meteo.com/v1/forecast";
  
  const params = {
    latitude: coord.lat,
    longitude: coord.lng,
    hourly: [
      "wind_speed_10m",
      "wind_direction_10m",
      "precipitation_probability",
      "wind_gusts_10m",
      "cloud_cover",
      "temperature_2m",
      "precipitation"
    ],
    forecast_days: 7,
    timezone: "America/Puerto_Rico" // Set timezone to Puerto Rico
  };
  
  // Add API key if available
  const apiKey = process.env.WEATHER_API_KEY;
  if (apiKey) {
    params.apikey = apiKey;
  }
  
  try {
    const responses = await fetchWeatherApi(url, params);
    
    // Process first location
    const response = responses[0];
    
    // Get the hourly data
    const hourly = response.hourly();
    
    // Extract hourly data
    const hourlyData = {
      time: [...Array((Number(hourly.timeEnd()) - Number(hourly.time())) / hourly.interval())].map(
        (_, i) => new Date((Number(hourly.time()) + i * hourly.interval() + response.utcOffsetSeconds()) * 1000).toISOString()
      ),
      wind_speed_10m: hourly.variables(0).valuesArray(),
      wind_direction_10m: hourly.variables(1).valuesArray(),
      precipitation_probability: hourly.variables(2).valuesArray(),
      wind_gusts_10m: hourly.variables(3).valuesArray(),
      cloud_cover: hourly.variables(4).valuesArray(),
      temperature_2m: hourly.variables(5).valuesArray(),
      precipitation: hourly.variables(6).valuesArray()
    };
    
    return { hourly: hourlyData };
  } catch (error) {
    console.error(`Error fetching weather data for ${coord.lat},${coord.lng}:`, error);
    return null;
  }
}

// Process and store data in Supabase - optimized for bulk operations
async function processAndStoreData(weatherData, supabase) {
  if (!weatherData || !weatherData.hourly) return;
  
  const { latitude, longitude, hourly } = weatherData;
  const { 
    time, 
    wave_height, 
    wave_period, 
    wind_speed_10m, 
    wind_direction_10m, 
    precipitation_probability,
    wind_gusts_10m,
    cloud_cover,
    temperature_2m,
    precipitation,
    ocean_current_velocity,
    ocean_current_direction,
    sea_level_height_msl
  } = hourly;
  
  // We can use the numeric values directly now since we're using DECIMAL in the DB
  console.log(`Inserting data for ${latitude},${longitude}`);
  
  // Process each hourly data point
  const forecasts = time.map((timestamp, index) => {
    const date = new Date(timestamp);
    
    // Store as numeric values for DECIMAL columns
    return {
      forecast_date: date.toISOString().split('T')[0],
      latitude: latitude, // Store as numeric value
      longitude: longitude, // Store as numeric value
      forecast_timestamp: timestamp,
      wave_height: wave_height?.[index] || null,
      wave_period: wave_period?.[index] || null,
      wind_speed: wind_speed_10m?.[index] || null,
      wind_direction: wind_direction_10m?.[index] || null,
      precipitation_probability: precipitation_probability?.[index] || null,
      wind_gusts: wind_gusts_10m?.[index] || null,
      cloud_cover: cloud_cover?.[index] || null,
      temperature: temperature_2m?.[index] || null,
      precipitation_amount: precipitation?.[index] || null,
      ocean_current_velocity: ocean_current_velocity?.[index] || null,
      ocean_current_direction: ocean_current_direction?.[index] || null,
      sea_level_height: sea_level_height_msl?.[index] || null
    };
  });
  
  // Insert data in larger chunks - 168 is typically a full week of hourly data
  const CHUNK_SIZE = 168;
  
  try {
    // First delete existing records using precise location matching
    const precision = 0.0001; // Small buffer for floating point precision
    const startDate = new Date(time[0]);
    const endDate = new Date(time[time.length - 1]);
    
    await supabase
      .from('weather_forecast')
      .delete()
      .gte('latitude', parseFloat(latitude) - precision)
      .lte('latitude', parseFloat(latitude) + precision)
      .gte('longitude', parseFloat(longitude) - precision)
      .lte('longitude', parseFloat(longitude) + precision)
      .gte('forecast_timestamp', startDate.toISOString())
      .lte('forecast_timestamp', endDate.toISOString());
    
    // Insert data in larger chunks
    for (let i = 0; i < forecasts.length; i += CHUNK_SIZE) {
      const chunk = forecasts.slice(i, i + CHUNK_SIZE);
      
      const { error: insertError } = await supabase
        .from('weather_forecast')
        .insert(chunk);
      
      if (insertError) {
        console.error(`Error inserting data for ${latitude},${longitude}:`, insertError);
      }
    }
  } catch (error) {
    console.error(`Error processing data for ${latitude},${longitude}:`, error);
  }
}

// Get directional coefficient K based on spot location and swell direction
function getDirectionalCoefficient(spotName, region, swellDirection) {
  // Default K value
  let K = 0.7;
  
  // Normalize swell direction to 0-360 range
  const direction = swellDirection || 0;
  
  // Regional directional coefficients based on Puerto Rico geography
  const spotCoefficients = {
    // North Coast spots (exposed to Atlantic swells)
    "Crash Boat Beach": {
      favorable: [270, 360, 45], // NW to NE swells
      unfavorable: [90, 180], // E to S swells
      K_favorable: 0.9,
      K_unfavorable: 0.3
    },
    "Steps Beach (Tres Palmas Marine Reserve)": {
      favorable: [270, 360, 45],
      unfavorable: [90, 180],
      K_favorable: 0.8,
      K_unfavorable: 0.2
    },
    "Playa Peña Blanca": {
      favorable: [270, 360, 45],
      unfavorable: [90, 180],
      K_favorable: 0.9,
      K_unfavorable: 0.3
    },
    
    // East Coast spots (somewhat protected)
    "Seven Seas Beach": {
      favorable: [180, 270], // S to W swells (offshore)
      unfavorable: [45, 135], // NE to SE swells (onshore)
      K_favorable: 0.8,
      K_unfavorable: 0.4
    },
    "Luquillo Beach": {
      favorable: [180, 270],
      unfavorable: [45, 135],
      K_favorable: 0.8,
      K_unfavorable: 0.4
    },
    
    // South Coast spots (generally calmer)
    "La Parguera": {
      favorable: [315, 45], // NW to NE swells (offshore)
      unfavorable: [135, 225], // SE to SW swells (onshore)
      K_favorable: 0.9,
      K_unfavorable: 0.5
    },
    "Gilligan's Island (Cayo Aurora)": {
      favorable: [315, 45],
      unfavorable: [135, 225],
      K_favorable: 0.9,
      K_unfavorable: 0.5
    },
    
    // West Coast spots (can be rough)
    "Black Eagle Beach": {
      favorable: [45, 135], // NE to SE swells (offshore)
      unfavorable: [225, 315], // SW to NW swells (onshore)
      K_favorable: 0.7,
      K_unfavorable: 0.2
    },
    
    // Protected bays and islands (generally good)
    "Flamenco Beach": {
      favorable: [180, 360], // Generally protected
      unfavorable: [45, 135], // Strong E swells
      K_favorable: 0.9,
      K_unfavorable: 0.6
    },
    "Carlos Rosario Beach": {
      favorable: [180, 360],
      unfavorable: [45, 135],
      K_favorable: 0.9,
      K_unfavorable: 0.6
    },
    "Esperanza Beach": {
      favorable: [270, 90], // Generally protected
      unfavorable: [135, 225], // Strong S swells
      K_favorable: 0.8,
      K_unfavorable: 0.5
    }
  };
  
  // Get spot-specific coefficients
  const spotData = spotCoefficients[spotName];
  if (spotData) {
    // Check if direction falls in favorable range
    const isFavorable = spotData.favorable.some(favorableDir => 
      Math.abs(direction - favorableDir) <= 45 || 
      Math.abs(direction - favorableDir) >= 315
    );
    
    const isUnfavorable = spotData.unfavorable.some(unfavorableDir => 
      Math.abs(direction - unfavorableDir) <= 45
    );
    
    if (isFavorable) {
      K = spotData.K_favorable;
    } else if (isUnfavorable) {
      K = spotData.K_unfavorable;
    }
  } else {
    // Regional defaults based on general location
    if (region === "Culebra" || region === "Vieques") {
      K = 0.8; // Generally protected
    } else if (region === "Fajardo") {
      K = 0.7; // Somewhat exposed
    } else if (region === "San Juan") {
      K = 0.6; // Urban, more exposed
    } else if (region === "Aguadilla" || region === "Rincón" || region === "Isabela") {
      K = 0.5; // West coast, can be rough
    } else if (region === "Ponce" || region === "Guanica" || region === "Lajas") {
      K = 0.8; // South coast, generally calmer
    }
  }
  
  return K;
}

// Calculate snorkeling suitability energy score (0-100) using MCP approach
function calculateSnorkelingScore(waveHeight, wavePeriod, swellDirection, windSpeed, windDirection, precipitationProbability, precipitationAmount, cloudCover, temp, spotName, region) {
  // Step 1: Get directional coefficient K
  const K = getDirectionalCoefficient(spotName, region, swellDirection);
  
  // Step 2: Calculate base wave energy
  const H = waveHeight || 0;
  const T = wavePeriod || 8; // Default period if not available
  const baseEnergy = K * (H * H) * T;
  
  // Step 3: Start with scaled base energy (scale to reasonable range)
  let suitabilityScore = baseEnergy * 10;
  
  // Step 4: Apply penalties and bonuses
  
  // Wind speed penalty (ideal: <10 knots)
  if (windSpeed > 10) {
    suitabilityScore -= (windSpeed - 10) * 2;
  }
  
  // Wind direction penalty (onshore winds are generally worse)
  // This is a simplified check - in reality you'd need spot-specific wind exposure
  if (windSpeed > 15) {
    // Additional penalty for strong onshore winds based on region
    if (region === "Aguadilla" || region === "Rincón") {
      // West coast spots suffer from strong easterly winds
      if (windDirection >= 45 && windDirection <= 135) {
        suitabilityScore -= 10;
      }
    } else if (region === "Fajardo" || region === "Luquillo") {
      // East coast spots suffer from strong westerly winds
      if (windDirection >= 225 && windDirection <= 315) {
        suitabilityScore -= 10;
      }
    }
  }
  
  // Rain impact (heavy penalty for rain)
  if (precipitationProbability > 30 || precipitationAmount > 0.5) {
    suitabilityScore -= 30;
  } else if (precipitationProbability > 15 || precipitationAmount > 0.1) {
    suitabilityScore -= 15;
  }
  
  // Cloud cover impact (reduces visibility and enjoyment)
  if (cloudCover > 80) {
    suitabilityScore -= 5;
  } else if (cloudCover > 60) {
    suitabilityScore -= 3;
  }
  
  // Temperature impact (ideal: 24-29°C / 75-85°F)
  if (temp < 20 || temp > 32) {
    suitabilityScore -= 15;
  } else if (temp < 22 || temp > 30) {
    suitabilityScore -= 8;
  }
  
  // Bonus for ideal conditions
  if (H < 0.5 && windSpeed < 8 && precipitationProbability < 10 && cloudCover < 30) {
    suitabilityScore += 10; // Perfect conditions bonus
  }
  
  // Clamp score between 0 and 100
  return Math.max(0, Math.min(100, Math.round(suitabilityScore)));
}

// Process and store data in Supabase snorkeling_spots table
async function processAndStoreSnorkelingData(weatherData, supabase, spotInfo) {
  if (!weatherData || !weatherData.hourly) return;
  
  const { latitude, longitude, hourly } = weatherData;
  const { 
    time, 
    wave_height, 
    wave_period,
    wave_direction,
    wind_speed_10m, 
    wind_direction_10m, 
    precipitation_probability,
    wind_gusts_10m,
    cloud_cover,
    temperature_2m,
    precipitation,
    ocean_current_velocity,
    ocean_current_direction,
    sea_level_height_msl
  } = hourly;
  
  console.log(`Inserting snorkeling data for ${spotInfo.name} (${latitude},${longitude})`);
  
  // Process each hourly data point
  const forecasts = time.map((timestamp, index) => {
    const date = new Date(timestamp);
    
    // Calculate snorkeling suitability score using enhanced MCP approach
    const energy = calculateSnorkelingScore(
      wave_height?.[index] || 0,
      wave_period?.[index] || 8,
      wave_direction?.[index] || 0, // Actual swell wave direction
      wind_speed_10m?.[index] || 0,
      wind_direction_10m?.[index] || 0,
      precipitation_probability?.[index] || 0,
      precipitation?.[index] || 0,
      cloud_cover?.[index] || 0,
      temperature_2m?.[index] || 25,
      spotInfo.name,
      spotInfo.region
    );
    
    return {
      name_of_snorkeling_spot: spotInfo.name,
      region: spotInfo.region,
      forecast_date: date.toISOString().split('T')[0],
      latitude: latitude,
      longitude: longitude,
      forecast_timestamp: timestamp,
      wave_height: wave_height?.[index] || null,
      wave_period: wave_period?.[index] || null,
      wind_speed: wind_speed_10m?.[index] || null,
      wind_direction: wind_direction_10m?.[index] || null,
      precipitation_probability: precipitation_probability?.[index] || null,
      wind_gusts: wind_gusts_10m?.[index] || null,
      cloud_cover: cloud_cover?.[index] || null,
      temperature: temperature_2m?.[index] || null,
      precipitation_amount: precipitation?.[index] || null,
      ocean_current_velocity: ocean_current_velocity?.[index] || null,
      ocean_current_direction: ocean_current_direction?.[index] || null,
      sea_level_height: sea_level_height_msl?.[index] || null,
      swell_wave_direction: wave_direction?.[index] || null, // Actual swell wave direction
      energy: energy
    };
  });
  
  // Insert data in larger chunks - 168 is typically a full week of hourly data
  const CHUNK_SIZE = 168;
  
  try {
    // First delete existing records for this spot and time range
    const precision = 0.0001; // Small buffer for floating point precision
    const startDate = new Date(time[0]);
    const endDate = new Date(time[time.length - 1]);
    
    await supabase
      .from('snorkeling_spots')
      .delete()
      .eq('name_of_snorkeling_spot', spotInfo.name)
      .gte('latitude', parseFloat(latitude) - precision)
      .lte('latitude', parseFloat(latitude) + precision)
      .gte('longitude', parseFloat(longitude) - precision)
      .lte('longitude', parseFloat(longitude) + precision)
      .gte('forecast_timestamp', startDate.toISOString())
      .lte('forecast_timestamp', endDate.toISOString());
    
    // Insert data in larger chunks
    for (let i = 0; i < forecasts.length; i += CHUNK_SIZE) {
      const chunk = forecasts.slice(i, i + CHUNK_SIZE);
      
      const { error: insertError } = await supabase
        .from('snorkeling_spots')
        .insert(chunk);
      
      if (insertError) {
        console.error(`Error inserting snorkeling data for ${spotInfo.name}:`, insertError);
      }
    }
  } catch (error) {
    console.error(`Error processing snorkeling data for ${spotInfo.name}:`, error);
  }
}

// Process locations in parallel batches
async function processBatch(coords, supabase, context) {
  const batchPromises = coords.map(async (coord) => {
    console.log(`🔍 Processing location [${coord.lat}, ${coord.lng}]`);
    try {
      const data = await fetchWeatherData(coord);
      if (data) {
        await processAndStoreData(data, supabase);
        return { success: true, coord };
      }
      return { success: false, coord, error: 'No data returned' };
    } catch (error) {
      console.error(`❌ Error processing location [${coord.lat}, ${coord.lng}]:`, error);
      return { success: false, coord, error: error.message };
    }
  });

  return Promise.all(batchPromises);
}

// Process snorkeling locations in parallel batches
async function processSnorkelingBatch(coords, supabase, context) {
  const batchPromises = coords.map(async (coord) => {
    console.log(`🏊 Processing snorkeling spot [${coord.name}] at [${coord.lat}, ${coord.lng}]`);
    try {
      const data = await fetchWeatherData(coord);
      if (data) {
        await processAndStoreSnorkelingData(data, supabase, coord);
        return { success: true, coord };
      }
      return { success: false, coord, error: 'No data returned' };
    } catch (error) {
      console.error(`❌ Error processing snorkeling spot [${coord.name}]:`, error);
      return { success: false, coord, error: error.message };
    }
  });

  return Promise.all(batchPromises);
}

// Main function with context - optimized for batch processing
async function updateWeatherData(context) {
  const supabase = getSupabaseClient(context);
  const startTime = Date.now();
  console.log(`🚀 Starting weather data update at ${new Date().toISOString()}`);
  
  try {
    // Count total records before update for both tables
    let weatherRecordsBefore = 0;
    let snorkelingRecordsBefore = 0;
    
    try {
      const { count: weatherCount } = await supabase
        .from('weather_forecast')
        .select('*', { count: 'exact', head: true });
      weatherRecordsBefore = weatherCount || 0;
      
      const { count: snorkelingCount } = await supabase
        .from('snorkeling_spots')
        .select('*', { count: 'exact', head: true });
      snorkelingRecordsBefore = snorkelingCount || 0;
      
      console.log(`📊 Records before update - Weather: ${weatherRecordsBefore}, Snorkeling: ${snorkelingRecordsBefore}`);
    } catch (countError) {
      // Silently ignore count errors
    }
    
    // Process coordinates in batches of 15
    const BATCH_SIZE = 15;
    let weatherSuccessCount = 0;
    let weatherErrorCount = 0;
    let snorkelingSuccessCount = 0;
    let snorkelingErrorCount = 0;
    let apiCalls = 0;
    
    // Process weather forecast coordinates
    console.log(`\n🌊 Processing ${COORDINATES.length} weather forecast locations...`);
    for (let i = 0; i < COORDINATES.length; i += BATCH_SIZE) {
      const batch = COORDINATES.slice(i, i + BATCH_SIZE);
      console.log(`\n📦 Processing weather batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(COORDINATES.length/BATCH_SIZE)}`);
      
      const results = await processBatch(batch, supabase, context);
      apiCalls += batch.length * 2; // 2 API calls per location
      
      // Count successes and failures
      results.forEach(result => {
        if (result.success) {
          weatherSuccessCount++;
        } else {
          weatherErrorCount++;
        }
      });
      
      // Delay between batches
      if (i + BATCH_SIZE < COORDINATES.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Process snorkeling coordinates
    console.log(`\n🏊 Processing ${SNORKELING_COORDINATES.length} snorkeling spots...`);
    for (let i = 0; i < SNORKELING_COORDINATES.length; i += BATCH_SIZE) {
      const batch = SNORKELING_COORDINATES.slice(i, i + BATCH_SIZE);
      console.log(`\n📦 Processing snorkeling batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(SNORKELING_COORDINATES.length/BATCH_SIZE)}`);
      
      const results = await processSnorkelingBatch(batch, supabase, context);
      apiCalls += batch.length * 2; // 2 API calls per location
      
      // Count successes and failures
      results.forEach(result => {
        if (result.success) {
          snorkelingSuccessCount++;
        } else {
          snorkelingErrorCount++;
        }
      });
      
      // Delay between batches
      if (i + BATCH_SIZE < SNORKELING_COORDINATES.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Count total records after update for both tables
    let weatherRecordsAfter = 0;
    let snorkelingRecordsAfter = 0;
    
    try {
      const { count: weatherCount } = await supabase
        .from('weather_forecast')
        .select('*', { count: 'exact', head: true });
      weatherRecordsAfter = weatherCount || 0;
      
      const { count: snorkelingCount } = await supabase
        .from('snorkeling_spots')
        .select('*', { count: 'exact', head: true });
      snorkelingRecordsAfter = snorkelingCount || 0;
      
      console.log(`📊 Records after update - Weather: ${weatherRecordsAfter}, Snorkeling: ${snorkelingRecordsAfter}`);
    } catch (countError) {
      // Silently ignore count errors
    }
    
    const totalTime = (Date.now() - startTime) / 1000;
    const totalSuccessCount = weatherSuccessCount + snorkelingSuccessCount;
    const totalErrorCount = weatherErrorCount + snorkelingErrorCount;
    
    console.log(`✅ Weather data update completed at ${new Date().toISOString()}`);
    console.log(`📋 Summary:`);
    console.log(`   Weather locations: ${weatherSuccessCount} updated, ${weatherErrorCount} failures`);
    console.log(`   Snorkeling spots: ${snorkelingSuccessCount} updated, ${snorkelingErrorCount} failures`);
    console.log(`   Total: ${totalSuccessCount} locations updated, ${totalErrorCount} failures, ${apiCalls} API calls in ${totalTime.toFixed(1)} seconds`);
    console.log(`📈 Performance: ${(totalSuccessCount/totalTime).toFixed(2)} locations/second, ${(apiCalls/totalTime).toFixed(2)} API calls/second`);
    
    return { 
      success: true,
      summary: {
        weatherLocationsUpdated: weatherSuccessCount,
        weatherLocationsFailed: weatherErrorCount,
        snorkelingLocationsUpdated: snorkelingSuccessCount,
        snorkelingLocationsFailed: snorkelingErrorCount,
        totalLocationsUpdated: totalSuccessCount,
        totalLocationsFailed: totalErrorCount,
        apiCalls: apiCalls,
        executionTime: totalTime,
        requestId: context ? context.awsRequestId : null
      }
    };
  } catch (error) {
    console.error('❌ Error in updateWeatherData:', error);
    return { success: false, error: error.message };
  }
}

// AWS Lambda handler with context
exports.handler = async (event, context) => {
  try {
    // Log invocation details
    if (context) {
      console.log(`Lambda invocation: ${context.awsRequestId}, Memory: ${context.memoryLimitInMB}MB, Timeout: ${context.getRemainingTimeInMillis()/1000}s remaining`);
    }
    
    const result = await updateWeatherData(context);
    
    return {
      statusCode: result.success ? 200 : 500,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error(`Error in Lambda handler: ${error.message}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: error.message,
        requestId: context ? context.awsRequestId : null
      })
    };
  }
}; 