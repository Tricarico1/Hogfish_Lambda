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
  id BIGSERIAL,
  forecast_date DATE NOT NULL,
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,
  forecast_timestamp TIMESTAMPTZ NOT NULL,
  wave_height DECIMAL(4, 2),
  wave_period DECIMAL(4, 1),
  wind_speed DECIMAL(5, 1),
  wind_direction SMALLINT,
  precipitation_probability SMALLINT,
  PRIMARY KEY (forecast_date, id)
) PARTITION BY RANGE (forecast_date);
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

const createPartitionFunctionSQL = `
CREATE OR REPLACE FUNCTION maintain_forecast_partitions()
RETURNS void AS $$
DECLARE
    partition_name text;
    start_date date;
    end_date date;
BEGIN
    -- Create partitions for the next 15 days (to cover full API forecast range)
    FOR i IN 0..14 LOOP
        start_date := CURRENT_DATE + (i || ' days')::interval;
        end_date := start_date + INTERVAL '1 day';
        partition_name := 'weather_forecast_' || to_char(start_date, 'YYYYMMDD');
        
        -- Check if partition exists, if not create it
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c 
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.relname = partition_name AND n.nspname = 'public'
        ) THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF weather_forecast 
                FOR VALUES FROM (%L) TO (%L)',
                partition_name, start_date, end_date
            );
        END IF;
    END LOOP;
    
    -- Clean up old partitions
    FOR partition_name IN
        SELECT c.relname FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname LIKE 'weather_forecast_%'
        AND n.nspname = 'public'
        AND c.relkind = 'r'
        AND substring(c.relname FROM 'weather_forecast_([0-9]+)')::date < CURRENT_DATE
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I', partition_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;
`;

const createPartitionCheckFunctionSQL = `
CREATE OR REPLACE FUNCTION check_partitions_exist()
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(row_to_json(t))
    INTO result
    FROM (
        SELECT c.relname as partition_name, 
               pg_size_pretty(pg_relation_size(c.oid)) as size
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname LIKE 'weather_forecast_%'
        AND n.nspname = 'public'
        AND c.relkind = 'r'
        ORDER BY c.relname
    ) t;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql;
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
  
  // Step 3: Create the partition maintenance function
  const partitionFunctionCreated = await runSQL(createPartitionFunctionSQL, 'Create partition maintenance function');
  if (!partitionFunctionCreated) {
    console.log('\nERROR: Failed to create partition maintenance function. This is required for the Lambda to work.');
    return;
  }
  
  // Step 4: Create the partition check function
  const checkFunctionCreated = await runSQL(createPartitionCheckFunctionSQL, 'Create partition check function');
  if (!checkFunctionCreated) {
    console.log('\nWARNING: Failed to create partition check function. This is not critical but helpful for debugging.');
  }
  
  // Step 5: Run the partition maintenance function to create initial partitions
  console.log('\nCreating initial partitions...');
  try {
    const { error } = await supabase.rpc('maintain_forecast_partitions');
    if (error) {
      console.error('Error running maintain_forecast_partitions:', error);
      console.log('\nWARNING: Failed to create initial partitions. The Lambda may still work but should be verified.');
    } else {
      console.log('Initial partitions created successfully!');
    }
  } catch (error) {
    console.error('Exception running maintain_forecast_partitions:', error);
  }
  
  console.log('\nSchema setup complete! Run npm run check-schema to verify the setup.');
}

// Run the schema setup
setupSchema(); 