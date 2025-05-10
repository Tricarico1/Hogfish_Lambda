require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

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

// Define coordinates to fetch 
const COORDINATES = [
  // North coast
  { lat: 19.0000, lng: -66.5000 }, // North
  { lat: 18.9800, lng: -66.2000 },
  { lat: 18.9500, lng: -66.8000 },
  { lat: 18.9200, lng: -65.9000 },
  
  // Northeast
  { lat: 18.8500, lng: -66.2000 }, 
  { lat: 18.8000, lng: -65.6000 },
  { lat: 18.7500, lng: -65.4000 },
  { lat: 18.7000, lng: -65.9000 }, 
  
  // East
  { lat: 18.5500, lng: -65.6000 }, // NE
  { lat: 18.4500, lng: -65.4000 },
  { lat: 18.3500, lng: -65.3000 }, // East
  { lat: 18.2500, lng: -65.2000 },
  
  // Southeast
  { lat: 18.0000, lng: -65.5000 },
  { lat: 17.9000, lng: -65.6000 },
  { lat: 17.8000, lng: -65.8000 },
  { lat: 17.7000, lng: -66.0000 },
  
  // South
  { lat: 17.5000, lng: -65.9000 }, // SE Offshore
  { lat: 17.5000, lng: -66.3000 },
  { lat: 17.5000, lng: -66.6000 },
  { lat: 17.5000, lng: -66.9000 },
  
  // Southwest
  { lat: 17.6000, lng: -67.2000 },
  { lat: 17.7000, lng: -67.1000 },
  { lat: 17.8000, lng: -67.0000 },
  
  // West
  { lat: 18.1000, lng: -67.2000 },
  { lat: 18.2033340, lng: -67.2021048 }, // Rincon
  { lat: 18.3000, lng: -67.2500 },
  { lat: 18.4000, lng: -67.3000 },
  
  // Northwest
  { lat: 18.5000, lng: -67.2000 },
  { lat: 18.6000, lng: -67.1000 },
  { lat: 18.7000, lng: -67.0000 },
  { lat: 18.7500, lng: -66.8000 }, // NW Offshore
  
  // Central/Offshore areas (reduced)
  { lat: 18.4661640, lng: -66.0136532 }, // Central North
  { lat: 18.1708446, lng: -65.5100 }, // NE Offshore
  { lat: 18.0732372, lng: -65.497277 }, // E Offshore
  { lat: 18.2000, lng: -67.8000 }, // Far West (Mona)
  
  // Only include a few strategic far offshore points
  { lat: 19.0500, lng: -65.7000 }, // NE Far
  { lat: 17.3000, lng: -65.5000 }, // South Far
  { lat: 17.3000, lng: -67.5000 }, // SW Far
];

// Fetch data for a single coordinate
async function fetchWeatherData(coord) {
  // Fetch marine data
  const marineData = await fetchMarineData(coord);
  
  // Fetch weather data
  const weatherData = await fetchWeatherForecast(coord);
  
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
      wind_speed_10m: weatherData.hourly.wind_speed_10m,
      wind_direction_10m: weatherData.hourly.wind_direction_10m,
      precipitation_probability: weatherData.hourly.precipitation_probability
    }
  };
}

// Fetch marine data from marine-api.open-meteo.com
async function fetchMarineData(coord) {
  const url = new URL('https://marine-api.open-meteo.com/v1/marine');
  const apiKey = process.env.MARINE_API_KEY;
  
  url.searchParams.append('latitude', coord.lat.toString());
  url.searchParams.append('longitude', coord.lng.toString());
  url.searchParams.append('hourly', [
    'wave_height', 
    'wave_period'
  ].join(','));
  url.searchParams.append('forecast_days', '7');
  
  if (apiKey) {
    url.searchParams.append('apikey', apiKey);
  }
  
  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Marine API request failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching marine data for ${coord.lat},${coord.lng}:`, error);
    return null;
  }
}

// Fetch weather data from api.open-meteo.com
async function fetchWeatherForecast(coord) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  const apiKey = process.env.WEATHER_API_KEY;
  
  url.searchParams.append('latitude', coord.lat.toString());
  url.searchParams.append('longitude', coord.lng.toString());
  url.searchParams.append('hourly', [
    'wind_speed_10m',
    'wind_direction_10m',
    'precipitation_probability'
  ].join(','));
  url.searchParams.append('forecast_days', '7');
  
  if (apiKey) {
    url.searchParams.append('apikey', apiKey);
  }
  
  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Weather API request failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching weather data for ${coord.lat},${coord.lng}:`, error);
    return null;
  }
}

// Process and store data in Supabase
async function processAndStoreData(weatherData, supabase) {
  if (!weatherData || !weatherData.hourly) return;
  
  const { latitude, longitude, hourly } = weatherData;
  const { time, wave_height, wave_period, wind_speed_10m, wind_direction_10m, precipitation_probability } = hourly;
  
  console.log(`Inserting data for ${latitude},${longitude}`);
  
  // Process each hourly data point
  const forecasts = time.map((timestamp, index) => {
    const date = new Date(timestamp);
    
    return {
      forecast_date: date.toISOString().split('T')[0],
      latitude,
      longitude, 
      forecast_timestamp: timestamp,
      wave_height: wave_height?.[index] || null,
      wave_period: wave_period?.[index] || null,
      wind_speed: wind_speed_10m?.[index] || null,
      wind_direction: wind_direction_10m?.[index] || null,
      precipitation_probability: precipitation_probability?.[index] || null
    };
  });
  
  // Insert data in chunks
  for (let i = 0; i < forecasts.length; i += 100) {
    const chunk = forecasts.slice(i, i + 100);
    const chunkStart = new Date(chunk[0].forecast_timestamp);
    const chunkEnd = new Date(chunk[chunk.length - 1].forecast_timestamp);
    
    try {
      const precision = 0.0001; // Adjust precision to handle floating point inconsistencies
      
      // First delete existing records - still using forecast_date for indexing efficiency
      await supabase
        .from('weather_forecast')
        .delete()
        .gte('latitude', latitude - precision)
        .lte('latitude', latitude + precision)
        .gte('longitude', longitude - precision)
        .lte('longitude', longitude + precision)
        .gte('forecast_timestamp', chunkStart.toISOString())
        .lte('forecast_timestamp', chunkEnd.toISOString());
      
      // Insert new records
      const { error: insertError } = await supabase
        .from('weather_forecast')
        .insert(chunk);
      
      if (insertError) {
        console.error(`Error inserting data for ${latitude},${longitude}:`, insertError);
      }
    } catch (error) {
      console.error(`Error processing data for ${latitude},${longitude}:`, error);
    }
  }
}

// Main function with context
async function updateWeatherData(context) {
  const supabase = getSupabaseClient(context);
  const startTime = Date.now();
  console.log(`🚀 Starting weather data update at ${new Date().toISOString()}`);
  
  try {
    // Count total records before update
    try {
      const { count, error: countError } = await supabase
        .from('weather_forecast')
        .select('*', { count: 'exact', head: true });
      
      if (!countError) {
        console.log(`📊 Total records before update: ${count || 0}`);
      }
    } catch (countError) {
      // Silently ignore count errors
    }
    
    // Process each coordinate
    let successCount = 0;
    let errorCount = 0;
    let apiCalls = 0;
    
    for (const coord of COORDINATES) {
      console.log(`🔍 Processing location [${coord.lat}, ${coord.lng}]`);
      try {
        const data = await fetchWeatherData(coord);
        apiCalls += 2; // 1 call to marine API, 1 call to weather API
        
        if (data) {
          await processAndStoreData(data, supabase);
          successCount++;
        } else {
          errorCount++;
        }
      } catch (coordError) {
        console.error(`❌ Error processing location [${coord.lat}, ${coord.lng}]:`, coordError);
        errorCount++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Count total records after update
    try {
      const { count, error: countError } = await supabase
        .from('weather_forecast')
        .select('*', { count: 'exact', head: true });
      
      if (!countError) {
        console.log(`📊 Total records after update: ${count || 0}`);
      }
    } catch (countError) {
      // Silently ignore count errors
    }
    
    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`✅ Weather data update completed at ${new Date().toISOString()}`);
    console.log(`📋 Summary: ${successCount} locations updated, ${errorCount} failures, ${apiCalls} API calls in ${totalTime.toFixed(1)} seconds`);
    
    return { 
      success: true,
      summary: {
        locationsUpdated: successCount,
        locationsFailed: errorCount,
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