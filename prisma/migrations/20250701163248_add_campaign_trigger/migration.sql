-- This is an empty migration.
-- Trigger function
CREATE OR REPLACE FUNCTION notify_new_campaign()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('campaign_inserted', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove old trigger if exists
DROP TRIGGER IF EXISTS campaign_insert_trigger ON "Campaign";

-- Create trigger
CREATE TRIGGER campaign_insert_trigger
AFTER INSERT ON "Campaign"
FOR EACH ROW
EXECUTE FUNCTION notify_new_campaign();
