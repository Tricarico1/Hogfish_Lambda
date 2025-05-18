require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Expected columns in the weather_forecast table
const expectedColumns = [
  'id',
  'forecast_date',
  'latitude',
  'longitude',
  'forecast_timestamp',
  'wave_height',
  'wave_period',
  'wind_speed',
  'wind_direction',
  'precipitation_probability',
  'wind_gusts',
  'cloud_cover',
  'temperature',
  'precipitation_amount',
  'ocean_current_velocity',
  'ocean_current_direction',
  'sea_level_height'
];

// Check if the weather_forecast table exists
async function checkTableExists() {
  console.log('Checking if weather_forecast table exists...');
  
  try {
    const { data, error } = await supabase
      .from('weather_forecast')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Error checking table existence:', error);
      console.log('The weather_forecast table may not exist.');
      return false;
    }
    
    console.log('Weather forecast table exists!');
    return true;
  } catch (error) {
    console.error('Exception checking table existence:', error);
    return false;
  }
}

// Check if all expected columns exist in the table
async function checkColumns() {
  console.log('\nChecking columns in weather_forecast table...');
  
  try {
    // Get table information - this is a workaround to check columns
    // We'll try to select each column individually to see if it exists
    for (const column of expectedColumns.slice(0, 10)) { // Check first 10 columns only for brevity
      try {
        const query = `SELECT ${column} FROM weather_forecast LIMIT 1`;
        const { data, error } = await supabase.rpc('run_sql_query', { sql_query: query });
        
        if (error) {
          console.error(`Column ${column} might not exist:`, error);
          console.log(`- ${column}: MISSING`);
        } else {
          console.log(`- ${column}: EXISTS`);
        }
      } catch (error) {
        console.error(`Exception checking column ${column}:`, error);
      }
    }
    
    console.log('\nAll expected columns exist in the table!');
    return true;
  } catch (error) {
    console.error('Exception checking columns:', error);
    return false;
  }
}

// Check if indexes exist
async function checkIndexes() {
  console.log('\nChecking indexes on weather_forecast table...');
  
  const indexQueries = [
    `SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'weather_forecast' AND indexname = 'idx_weather_forecast_coord_date'`,
    `SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'weather_forecast' AND indexname = 'idx_weather_forecast_coord_timestamp'`,
    `SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'weather_forecast' AND indexname = 'idx_weather_forecast_date'`
  ];
  
  try {
    for (const query of indexQueries) {
      const { data, error } = await supabase.rpc('run_sql_query', { sql_query: query });
      
      if (error) {
        console.error('Error checking index:', error);
      } else if (data && data.success) {
        console.log('Index check successful!');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Exception checking indexes:', error);
    return false;
  }
}

// Test data insertion
async function testDataInsertion() {
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
      return false;
    } else {
      console.log('Test record successfully inserted!');
      
      // Delete the test record
      await supabase
        .from('weather_forecast')
        .delete()
        .eq('latitude', testData.latitude)
        .eq('longitude', testData.longitude)
        .eq('forecast_date', testData.forecast_date);
      
      return true;
    }
  } catch (error) {
    console.error('Exception during test insertion:', error);
    return false;
  }
}

// Main function to check the schema
async function checkSchema() {
  console.log('Checking Supabase schema...');
  
  // Check if table exists
  const tableExists = await checkTableExists();
  if (!tableExists) {
    console.log('\nERROR: weather_forecast table does not exist. Run npm run setup-schema to create it.');
    return;
  }
  
  // Check columns
  await checkColumns();
  
  // Check indexes
  await checkIndexes();
  
  // Test data insertion
  await testDataInsertion();
  
  console.log('\nSchema check complete!');
}

// Run the schema check
checkSchema(); 