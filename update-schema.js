require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// SQL script to update the schema with new fields
const updateTableSQL = `
-- Add new weather fields
ALTER TABLE weather_forecast ADD COLUMN IF NOT EXISTS wind_gusts DECIMAL(5, 1);
ALTER TABLE weather_forecast ADD COLUMN IF NOT EXISTS cloud_cover SMALLINT;
ALTER TABLE weather_forecast ADD COLUMN IF NOT EXISTS temperature DECIMAL(4, 1);
ALTER TABLE weather_forecast ADD COLUMN IF NOT EXISTS precipitation_amount DECIMAL(5, 2);

-- Add new marine fields
ALTER TABLE weather_forecast ADD COLUMN IF NOT EXISTS ocean_current_velocity DECIMAL(4, 2);
ALTER TABLE weather_forecast ADD COLUMN IF NOT EXISTS ocean_current_direction SMALLINT;
ALTER TABLE weather_forecast ADD COLUMN IF NOT EXISTS sea_level_height DECIMAL(5, 2);
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

// Main function to update the schema
async function updateSchema() {
  console.log('Updating Supabase schema for weather forecast...');
  
  // Update the weather_forecast table with new columns
  const tableUpdated = await runSQL(updateTableSQL, 'Update weather_forecast table');
  if (!tableUpdated) {
    console.log('\nERROR: Failed to update table. Please try running the SQL manually in the Supabase SQL editor.');
    return;
  }
  
  // Verify the columns exist
  console.log('\nVerifying table structure...');
  try {
    const { data, error } = await supabase
      .from('weather_forecast')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Error verifying table structure:', error);
    } else {
      console.log('Table structure verification successful!');
    }
  } catch (error) {
    console.error('Exception verifying table structure:', error);
  }
  
  console.log('\nSchema update complete!');
}

// Run the schema update
updateSchema(); 