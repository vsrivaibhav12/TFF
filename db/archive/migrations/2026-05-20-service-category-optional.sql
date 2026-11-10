-- Make service category optional so services can exist without categories
ALTER TABLE services
  ALTER COLUMN category_id DROP NOT NULL;

-- Update any existing services that reference deleted categories to be uncategorized
UPDATE services
SET category_id = NULL
WHERE category_id IN (
  SELECT id FROM service_categories WHERE is_deleted = TRUE
);
