require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// SQL script to convert coordinates from TEXT to DECIMAL
const convertToDecimalSQL = `
-- First create temporary columns
ALTER TABLE weather_forecast 
  ADD COLUMN latitude_decimal DECIMAL(15, 12),
  ADD COLUMN longitude_decimal DECIMAL(15, 12);

-- Copy the current text values as decimal
UPDATE weather_forecast
SET 
  latitude_decimal = latitude::DECIMAL(15, 12),
  longitude_decimal = longitude::DECIMAL(15, 12);

-- Drop original text columns
ALTER TABLE weather_forecast 
  DROP COLUMN latitude,
  DROP COLUMN longitude;

-- Rename decimal columns to original names
ALTER TABLE weather_forecast 
  RENAME COLUMN latitude_decimal TO latitude;
  
ALTER TABLE weather_forecast 
  RENAME COLUMN longitude_decimal TO longitude;

-- Add NOT NULL constraints
ALTER TABLE weather_forecast
  ALTER COLUMN latitude SET NOT NULL,
  ALTER COLUMN longitude SET NOT NULL;

-- Add indexes (or they will be dropped when the columns are dropped)
CREATE INDEX idx_weather_forecast_lat_lng 
ON weather_forecast (latitude, longitude);
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

// Main function to convert coordinates to DECIMAL
async function convertCoordinatesToDecimal() {
  console.log('Converting latitude and longitude columns to DECIMAL(15, 12) type...');
  console.log('WARNING: This will modify your database schema. Make sure you have a backup before proceeding.');
  console.log('This operation will preserve all existing data but change the column types from TEXT to DECIMAL.');
  
  // Prompt user to confirm (just for safety when running locally)
  process.stdout.write('\nDo you want to proceed? (y/n): ');
  process.stdin.once('data', async (data) => {
    const input = data.toString().trim().toLowerCase();
    if (input === 'y' || input === 'yes') {
      const converted = await runSQL(convertToDecimalSQL, 'Convert coordinates to DECIMAL');
      if (converted) {
        console.log('\nCoordinates successfully converted to DECIMAL(15, 12) type!');
        console.log('Your database now stores precise numeric values for coordinates.');
      } else {
        console.log('\nERROR: Failed to convert coordinates. Please try running the SQL manually in the Supabase SQL editor.');
      }
    } else {
      console.log('Operation canceled.');
    }
    process.exit(0);
  });
}

// Run the conversion
convertCoordinatesToDecimal(); 