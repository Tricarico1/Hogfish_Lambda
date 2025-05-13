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

// Original coordinate list - 38 locations
const ORIGINAL_COORDINATES = [
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

// Additional coordinates to get to 100 total points
// These are generated surrounding the existing points to provide more density
const ADDITIONAL_COORDINATES = [
  // ---- RANDOMLY ADDED COORDINATES GROUP ----
  
  // More North coast points
  { lat: 19.0200, lng: -66.3500 }, 
  { lat: 19.0300, lng: -66.7000 },
  { lat: 18.9600, lng: -66.0000 },
  { lat: 18.9900, lng: -65.8000 },
  { lat: 18.9700, lng: -66.6000 },
  
  // More Northeast points
  { lat: 18.8800, lng: -65.8000 },
  { lat: 18.8200, lng: -65.3000 },
  { lat: 18.7800, lng: -66.0000 },
  { lat: 18.8300, lng: -65.7500 },
  { lat: 18.7700, lng: -65.2500 },
  
  // More East points
  { lat: 18.5000, lng: -65.3000 },
  { lat: 18.4000, lng: -65.2000 },
  { lat: 18.3000, lng: -65.1500 },
  { lat: 18.6000, lng: -65.5000 },
  { lat: 18.5200, lng: -65.4500 },
  
  // More Southeast points
  { lat: 18.1000, lng: -65.3000 },
  { lat: 17.9500, lng: -65.4000 },
  { lat: 17.8500, lng: -65.6000 },
  { lat: 17.7500, lng: -65.8000 },
  { lat: 17.6500, lng: -65.9500 },
  
  // More South points
  { lat: 17.4000, lng: -66.0000 },
  { lat: 17.4000, lng: -66.5000 },
  { lat: 17.4500, lng: -66.7500 },
  { lat: 17.4500, lng: -65.7000 },
  { lat: 17.6000, lng: -66.5000 },
  
  // More Southwest points  
  { lat: 17.5500, lng: -67.0000 },
  { lat: 17.6500, lng: -67.3000 },
  { lat: 17.7500, lng: -67.2500 },
  { lat: 17.9000, lng: -67.1500 },
  { lat: 17.5000, lng: -67.2000 },
  
  // More West points
  { lat: 18.0500, lng: -67.3000 },
  { lat: 18.1500, lng: -67.2500 },
  { lat: 18.2500, lng: -67.3000 },
  { lat: 18.3500, lng: -67.2000 },
  { lat: 18.4500, lng: -67.2500 },
  
  // More Northwest points
  { lat: 18.5500, lng: -67.0000 },
  { lat: 18.6500, lng: -66.9000 },
  { lat: 18.7700, lng: -66.7000 },
  { lat: 18.8000, lng: -66.9000 },
  { lat: 18.6800, lng: -67.1500 },
  
  // More Central/Offshore areas
  { lat: 18.3500, lng: -66.2000 },
  { lat: 18.2500, lng: -66.1000 },
  { lat: 18.1500, lng: -66.2000 },
  { lat: 18.2500, lng: -65.7000 },
  { lat: 18.3000, lng: -65.8000 },
  
  // More Offshore points
  { lat: 19.1000, lng: -66.0000 },
  { lat: 19.2000, lng: -66.3000 },
  { lat: 19.1500, lng: -65.5000 },
  { lat: 17.2000, lng: -66.0000 },
  { lat: 17.2000, lng: -67.0000 },
  
  // Vieques & Culebra area
  { lat: 18.1500, lng: -65.4500 },
  { lat: 18.3300, lng: -65.3000 },
  { lat: 18.1200, lng: -65.3000 },
  
  // Mona Island area
  { lat: 18.1000, lng: -67.9000 },
  { lat: 18.0800, lng: -67.8500 },
  { lat: 18.0500, lng: -67.9500 },
  
  // Far offshore strategic points
  { lat: 19.3000, lng: -66.2000 }, // Far North
  { lat: 18.9000, lng: -64.9000 }, // Far East
  { lat: 17.0000, lng: -66.5000 }, // Far South
  { lat: 18.0000, lng: -68.0000 }  // Far West
];

// Combine original and additional coordinates
const COORDINATES = [...ORIGINAL_COORDINATES, ...ADDITIONAL_COORDINATES];

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
      "ocean_current_velocity",
      "ocean_current_direction",
      "sea_level_height_msl"
    ],
    forecast_days: 7
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
      ocean_current_velocity: hourly.variables(2).valuesArray(),
      ocean_current_direction: hourly.variables(3).valuesArray(),
      sea_level_height_msl: hourly.variables(4).valuesArray()
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
    forecast_days: 7
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
    // First delete existing records in a single operation
    const precision = 0.0001; // Adjust precision to handle floating point inconsistencies
    const startDate = new Date(time[0]);
    const endDate = new Date(time[time.length - 1]);
    
    await supabase
      .from('weather_forecast')
      .delete()
      .gte('latitude', latitude - precision)
      .lte('latitude', latitude + precision)
      .gte('longitude', longitude - precision)
      .lte('longitude', longitude + precision)
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

// Main function with context - optimized for batch processing
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
    
    // Process coordinates in batches of 15
    const BATCH_SIZE = 15;
    let successCount = 0;
    let errorCount = 0;
    let apiCalls = 0;
    
    // Split coordinates into batches
    for (let i = 0; i < COORDINATES.length; i += BATCH_SIZE) {
      const batch = COORDINATES.slice(i, i + BATCH_SIZE);
      console.log(`\n📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(COORDINATES.length/BATCH_SIZE)}`);
      
      const results = await processBatch(batch, supabase, context);
      apiCalls += batch.length * 2; // 2 API calls per location
      
      // Count successes and failures
      results.forEach(result => {
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      });
      
      // Smaller delay between batches - we're increasing batch size but reducing delay
      // This helps to maintain a steady flow without overwhelming the APIs
      if (i + BATCH_SIZE < COORDINATES.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
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
    console.log(`📈 Performance: ${(successCount/totalTime).toFixed(2)} locations/second, ${(apiCalls/totalTime).toFixed(2)} API calls/second`);
    
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