-- Create trigger function for project creation
CREATE OR REPLACE FUNCTION notify_new_project()
RETURNS trigger AS $$
BEGIN
  -- Only notify if consensusTimestamp is present
  IF NEW."consensusTimestamp" IS NOT NULL THEN
    PERFORM pg_notify('project_created', json_build_object(
      'consensusTimestamp', NEW."consensusTimestamp"
    )::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove old trigger if exists
DROP TRIGGER IF EXISTS project_insert_trigger ON "Project";

-- Create trigger
CREATE TRIGGER project_insert_trigger
AFTER INSERT ON "Project"
FOR EACH ROW
EXECUTE FUNCTION notify_new_project(); 