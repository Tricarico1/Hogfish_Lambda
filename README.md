# Hogfish Lambda Weather Data Service

This repository contains a Lambda function that fetches weather/boating condition data from Open-Meteo API every 4 hours and stores it in a Supabase database.

## Database Schema Setup

Before using this Lambda function, make sure your Supabase database is properly set up with the following schema:

```sql
-- Weather Forecast Table (with Date Partitioning)
CREATE TABLE weather_forecast (
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

ALTER TABLE weather_forecast ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for weather data" 
ON weather_forecast FOR SELECT 
USING (true);

CREATE POLICY "Only service accounts can insert weather data" 
ON weather_forecast FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only service accounts can update weather data" 
ON weather_forecast FOR UPDATE 
USING (auth.role() = 'service_role');

CREATE POLICY "Only service accounts can delete weather data" 
ON weather_forecast FOR DELETE 
USING (auth.role() = 'service_role');

-- Partition Maintenance Function
CREATE OR REPLACE FUNCTION maintain_forecast_partitions()
RETURNS void AS $$
DECLARE
    partition_name text;
    start_date date;
    end_date date;
BEGIN
    -- Create partitions for the next 7 days
    FOR i IN 0..6 LOOP
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
        EXECUTE format('DROP TABLE %I', partition_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Optional utility function for schema checks
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

## Setup Instructions

### 1. Configure AWS CLI

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
```

### 2. Set environment variables

```bash
# Set your account ID and region explicitly
export AWS_ACCOUNT_ID=805358684705
export AWS_REGION=us-east-1

# Verify they're set correctly
echo $AWS_ACCOUNT_ID
echo $AWS_REGION
```

### 3. Create .env file

Create a `.env` file with your credentials:

```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
MARINE_API_KEY=your_marine_api_key
WEATHER_API_KEY=your_weather_api_key
```

The function uses both the Marine API and Weather API from Open-Meteo to fetch comprehensive boating condition data.

### 4. Create ECR repository (if it doesn't exist)

```bash
aws ecr create-repository --repository-name boating-conditions || echo "Repository already exists"
```

### 5. Login to ECR

```bash
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

### 6. Build and deploy

```bash
# Build the Docker image
docker build -t hogfish-boating-conditions . 




#Log into ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Tag the image for ECR
docker tag hogfish-boating-conditions:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hogfish-boating-conditions:latest                


# Push to ECR
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hogfish-boating-conditions:latest
```


## Coordinates Configuration

Update the `COORDINATES` array in `index.js` with the actual coordinates you want to fetch data for.

## Testing Locally

Before deploying to AWS, you can test the Lambda function locally:

1. Make sure you have created a `.env` file with all required credentials.
2. Run the following command:

```bash
npm install  # Install dependencies
npm start    # Run the local test script
```

This will execute the function and display the results, allowing you to verify that it's working correctly before deployment.