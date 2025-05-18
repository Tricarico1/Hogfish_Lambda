require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// SQL script to remove coordinate_id column
const removeCoordinateIdSQL = `
-- Drop any indexes that reference coordinate_id
DROP INDEX IF EXISTS idx_weather_forecast_coord_date;
DROP INDEX IF EXISTS idx_weather_forecast_coord_timestamp;

-- Make sure we have a good index on latitude and longitude
CREATE INDEX IF NOT EXISTS idx_weather_forecast_lat_lng 
ON weather_forecast (latitude, longitude);

-- Drop the coordinate_id column
ALTER TABLE weather_forecast
DROP COLUMN IF EXISTS coordinate_id;
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

// Main function to remove coordinate_id
async function removeCoordinateId() {
  console.log('Removing coordinate_id column from weather_forecast table...');
  console.log('WARNING: This will modify your database schema. Make sure you have a backup before proceeding.');
  
  // Prompt user to confirm (just for safety when running locally)
  process.stdout.write('\nDo you want to proceed? (y/n): ');
  process.stdin.once('data', async (data) => {
    const input = data.toString().trim().toLowerCase();
    if (input === 'y' || input === 'yes') {
      const removed = await runSQL(removeCoordinateIdSQL, 'Remove coordinate_id column');
      if (removed) {
        console.log('\ncoordinate_id column successfully removed!');
        console.log('Your database now uses latitude and longitude as the primary way to identify locations.');
      } else {
        console.log('\nERROR: Failed to remove coordinate_id column. Please try running the SQL manually in the Supabase SQL editor.');
      }
    } else {
      console.log('Operation canceled.');
    }
    process.exit(0);
  });
}

// Run the removal
removeCoordinateId(); 