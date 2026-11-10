-- Add storage file reference to DSC records so certificate files can be uploaded
-- to the dsc-files bucket and linked to the record.
ALTER TABLE public.dsc_records
  ADD COLUMN IF NOT EXISTS certificate_file_path TEXT,
  ADD COLUMN IF NOT EXISTS certificate_file_name TEXT;
