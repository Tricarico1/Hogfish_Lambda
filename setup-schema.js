require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// SQL scripts to set up the schema
const createTableSQL = `
CREATE TABLE IF NOT EXISTS weather_forecast (
  id BIGSERIAL PRIMARY KEY,
  forecast_date DATE NOT NULL,
  latitude DECIMAL(15, 12) NOT NULL,
  longitude DECIMAL(15, 12) NOT NULL,
  forecast_timestamp TIMESTAMPTZ NOT NULL,
  wave_height DECIMAL(4, 2),
  wave_period DECIMAL(4, 1),
  wind_speed DECIMAL(5, 1),
  wind_direction DECIMAL(5, 1),
  precipitation_probability DECIMAL(5, 1),
  wind_gusts DECIMAL(5, 1),
  cloud_cover DECIMAL(5, 1),
  temperature DECIMAL(4, 1),
  precipitation_amount DECIMAL(5, 2),
  ocean_current_velocity DECIMAL(4, 2),
  ocean_current_direction DECIMAL(5, 1),
  sea_level_height DECIMAL(5, 2)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_weather_forecast_lat_lng ON weather_forecast (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_weather_forecast_date ON weather_forecast (forecast_date);
`;

const createPoliciesSQL = `
ALTER TABLE weather_forecast ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Public read access for weather data" 
ON weather_forecast FOR SELECT 
USING (true);

CREATE POLICY IF NOT EXISTS "Only service accounts can insert weather data" 
ON weather_forecast FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Only service accounts can update weather data" 
ON weather_forecast FOR UPDATE 
USING (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Only service accounts can delete weather data" 
ON weather_forecast FOR DELETE 
USING (auth.role() = 'service_role');
`;

// Run a SQL query against the Supabase database
async function runSQL(sql, description) {
  console.log(`\nExecuting: ${description}...`);
  try {
    const { data, error } = await supabase.rpc('run_sql_query', { sql_query: sql });
    
    if (error) {
      if (error.message.includes('function "run_sql_query" does not exist')) {
        console.error(`ERROR: The 'run_sql_query' function does not exist in your Supabase database.`);
        console.log(`\nYou need to create this function first. Please run the following SQL in the Supabase SQL editor:`);
        console.log(`
CREATE OR REPLACE FUNCTION run_sql_query(sql_query TEXT)
RETURNS JSONB AS $$
BEGIN
    EXECUTE sql_query;
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
        `);
        process.exit(1);
      }
      
      console.error(`Error executing ${description}:`, error);
      return false;
    }
    
    console.log(`${description} executed successfully!`);
    return true;
  } catch (error) {
    console.error(`Exception executing ${description}:`, error);
    return false;
  }
}

// Main function to set up the schema
async function setupSchema() {
  console.log('Setting up Supabase schema for weather forecast...');
  
  // Step 1: Create the weather_forecast table
  const tableCreated = await runSQL(createTableSQL, 'Create weather_forecast table');
  if (!tableCreated) {
    console.log('\nERROR: Failed to create table. Please try running the SQL manually in the Supabase SQL editor.');
    return;
  }
  
  // Step 2: Create row level security policies
  const policiesCreated = await runSQL(createPoliciesSQL, 'Create RLS policies');
  if (!policiesCreated) {
    console.log('\nWARNING: Failed to create RLS policies. You may need to run this SQL manually.');
  }
  
  // Test inserting a record
  console.log('\nTesting data insertion...');
  try {
    const testData = {
      forecast_date: new Date().toISOString().split('T')[0],
      latitude: 18.473662304914722,
      longitude: -66.09893874222648,
      forecast_timestamp: new Date().toISOString(),
      wave_height: 1.2,
      wave_period: 5.5,
      wind_speed: 10.0,
      wind_direction: 180.0,
      precipitation_probability: 20.0
    };
    
    // First delete any existing test record
    await supabase
      .from('weather_forecast')
      .delete()
      .eq('latitude', testData.latitude)
      .eq('longitude', testData.longitude)
      .eq('forecast_date', testData.forecast_date);
    
    // Insert test record
    const { error: insertError } = await supabase
      .from('weather_forecast')
      .insert([testData]);
    
    if (insertError) {
      console.error('Error inserting test record:', insertError);
      console.log('\nWARNING: Test insertion failed. Schema might not be set up correctly.');
    } else {
      console.log('Test record successfully inserted!');
      
      // Delete the test record
      await supabase
        .from('weather_forecast')
        .delete()
        .eq('latitude', testData.latitude)
        .eq('longitude', testData.longitude)
        .eq('forecast_date', testData.forecast_date);
    }
  } catch (error) {
    console.error('Exception during test insertion:', error);
  }
  
  console.log('\nSchema setup complete!');
}

// Run the schema setup
setupSchema(); 