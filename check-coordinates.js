require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkCoordinatePrecision() {
  console.log('Checking coordinate precision in the database...');
  
  try {
    // Run a direct SQL query to see full precision
    const { data, error } = await supabase.rpc('run_sql_query', { 
      sql_query: `
        SELECT 
          id, 
          latitude::text as lat_text, 
          longitude::text as lng_text,
          forecast_date
        FROM weather_forecast
        ORDER BY id DESC
        LIMIT 10;
      `
    });
    
    if (error) {
      console.error('Error querying database:', error);
      return;
    }
    
    console.log('Full precision coordinates from database (SQL):');
    console.log(data);
    
    // Let's also check what's being stored by our code
    console.log('\nChecking what coordinates are being stored by our code...');
    
    // Create a test entry with known precision
    const testCoord = {
      lat: 18.679631852292207,
      lng: -67.12815135415785
    };
    
    console.log(`Test coordinate: ${testCoord.lat}, ${testCoord.lng}`);
    console.log(`As string: ${testCoord.lat.toString()}, ${testCoord.lng.toString()}`);
    
    // Let's also modify our index.js to always use toString() for coordinates
    console.log('\nRecommendation:');
    console.log('1. Make sure index.js uses toString() when storing coordinates');
    console.log('2. When querying in your UI project, use a raw SQL query to cast coordinates to text:');
    console.log(`
      SELECT 
        id, 
        latitude::text as latitude, 
        longitude::text as longitude,
        forecast_date,
        forecast_timestamp,
        wave_height,
        wave_period,
        wind_speed,
        wind_direction,
        precipitation_probability,
        wind_gusts,
        cloud_cover,
        temperature,
        precipitation_amount,
        ocean_current_velocity,
        ocean_current_direction,
        sea_level_height
      FROM weather_forecast
      WHERE ...your conditions...
    `);
  } catch (err) {
    console.error('Exception:', err);
  }
}

// Check if the database is properly storing the full precision
checkCoordinatePrecision(); 