-- Update the partition maintenance function to handle 15 days
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

-- Run the function to create all needed partitions
SELECT maintain_forecast_partitions();

-- Verify that partitions were created
SELECT 
    c.relname as partition_name, 
    pg_size_pretty(pg_relation_size(c.oid)) as size
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname LIKE 'weather_forecast_%'
AND n.nspname = 'public'
AND c.relkind = 'r'
ORDER BY c.relname; 