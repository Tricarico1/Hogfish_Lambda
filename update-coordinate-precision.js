require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// SQL script to update coordinate precision
const updatePrecisionSQL = `
-- Alter latitude and longitude columns to increase precision
ALTER TABLE weather_forecast 
  ALTER COLUMN latitude TYPE DECIMAL(15, 12),
  ALTER COLUMN longitude TYPE DECIMAL(15, 12);
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

// Main function to update coordinate precision
async function updateCoordinatePrecision() {
  console.log('Updating coordinate precision in weather_forecast table...');
  
  // Update precision of latitude and longitude columns
  const precisionUpdated = await runSQL(updatePrecisionSQL, 'Update coordinate precision');
  if (!precisionUpdated) {
    console.log('\nERROR: Failed to update coordinate precision. Please try running the SQL manually in the Supabase SQL editor.');
    return;
  }
  
  console.log('\nCoordinate precision update complete! The table now stores the full precision of latitude and longitude values.');
}

// Run the update
updateCoordinatePrecision(); 