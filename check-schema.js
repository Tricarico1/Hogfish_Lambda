require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkSchema() {
  console.log('Checking Supabase schema...');

  try {
    // Try to get a single row from the weather_forecast table to see if it exists
    console.log('Checking if weather_forecast table exists...');
    const { data: weatherData, error: weatherError } = await supabase
      .from('weather_forecast')
      .select('id')
      .limit(1);
    
    if (weatherError) {
      if (weatherError.code === '42P01') { // Table doesn't exist
        console.error('\nERROR: The weather_forecast table does not exist!');
        console.log('\nYou need to create the table using the SQL in the README.md');
        return;
      } else {
        console.error('Error querying weather_forecast table:', weatherError);
        return;
      }
    }

    console.log('Weather forecast table exists!');
    
    // Check columns
    console.log('\nChecking columns in weather_forecast table...');
    try {
      // Try to query each expected column to see if it exists
      const columnChecks = [
        { name: 'id', query: 'id' },
        { name: 'forecast_date', query: 'forecast_date' },
        { name: 'latitude', query: 'latitude' },
        { name: 'longitude', query: 'longitude' },
        { name: 'forecast_timestamp', query: 'forecast_timestamp' },
        { name: 'wave_height', query: 'wave_height' },
        { name: 'wave_period', query: 'wave_period' },
        { name: 'wind_speed', query: 'wind_speed' },
        { name: 'wind_direction', query: 'wind_direction' },
        { name: 'precipitation_probability', query: 'precipitation_probability' }
      ];
      
      const columnResults = [];
      
      for (const col of columnChecks) {
        const { error } = await supabase
          .from('weather_forecast')
          .select(col.query)
          .limit(1);
        
        columnResults.push({
          column: col.name,
          exists: !error
        });
        
        if (error && error.code !== 'PGRST116') { // Code when no rows found, which is fine
          console.log(`- ${col.name}: ERROR - ${error.message}`);
        } else {
          console.log(`- ${col.name}: ${!error ? 'EXISTS' : 'MISSING'}`);
        }
      }
      
      const missingColumns = columnResults.filter(col => !col.exists).map(col => col.column);
      
      if (missingColumns.length > 0) {
        console.error('\nMISSING COLUMNS:', missingColumns.join(', '));
        console.log('You need to add these columns to the weather_forecast table.');
      } else {
        console.log('\nAll expected columns exist in the table!');
      }
    } catch (columnsError) {
      console.error('Error checking columns:', columnsError);
    }
    
    // Check for partition function
    console.log('\nChecking for maintain_forecast_partitions function...');
    const { data: functionResult, error: functionError } = await supabase
      .rpc('maintain_forecast_partitions');
    
    if (functionError) {
      console.error('Error calling maintain_forecast_partitions:', functionError);
      console.log('The maintain_forecast_partitions function may not exist. Create it using the SQL in the README.md');
    } else {
      console.log('maintain_forecast_partitions function exists and can be called!');
    }
    
    // Create a sample record to test insertion
    console.log('\nTesting data insertion...');
    const testRecord = {
      forecast_date: new Date().toISOString().split('T')[0],
      latitude: 19.0000,
      longitude: -66.5000,
      forecast_timestamp: new Date().toISOString(),
      wave_height: 1.5,
      wave_period: 5.0,
      wind_speed: 10.0,
      wind_direction: 180,
      precipitation_probability: 20
    };
    
    // First delete any existing test records to avoid conflicts
    try {
      await supabase
        .from('weather_forecast')
        .delete()
        .eq('latitude', testRecord.latitude)
        .eq('longitude', testRecord.longitude)
        .eq('forecast_timestamp', testRecord.forecast_timestamp);
      
      const { error: insertError } = await supabase
        .from('weather_forecast')
        .insert(testRecord);
      
      if (insertError) {
        console.error('Error inserting test record:', insertError);
        console.log('This indicates an issue with table structure or permissions');
      } else {
        console.log('Test record successfully inserted!');
        
        // Clean up test data
        await supabase
          .from('weather_forecast')
          .delete()
          .eq('latitude', testRecord.latitude)
          .eq('longitude', testRecord.longitude)
          .eq('forecast_timestamp', testRecord.forecast_timestamp);
      }
    } catch (testError) {
      console.error('Error during insertion test:', testError);
    }
    
    console.log('\nSchema check complete!');
  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

// Run the schema check
checkSchema(); 