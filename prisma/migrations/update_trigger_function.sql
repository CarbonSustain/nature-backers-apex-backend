-- Update the existing function to notify for ALL status changes
CREATE OR REPLACE FUNCTION notify_campaign_status_updated()
RETURNS TRIGGER AS $$
DECLARE
    status_name TEXT;
BEGIN
    -- Get the status name
    SELECT name INTO status_name FROM "CampaignStatus" WHERE id = NEW."campaignStatusId";
    
    -- Notify for ALL status changes (not just Active)
    PERFORM pg_notify(
        'campaign_status_updated',
        json_build_object(
            'campaign_id', NEW.id,
            'campaign_name', NEW.name,
            'new_status', status_name,
            'department_ids', (
                SELECT array_agg("departmentId") 
                FROM "CampaignDepartment" 
                WHERE "campaignId" = NEW.id
            )
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql; 