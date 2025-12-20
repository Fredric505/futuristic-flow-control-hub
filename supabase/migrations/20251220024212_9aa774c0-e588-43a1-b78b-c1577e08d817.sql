-- Delete duplicates keeping first occurrence
DELETE FROM system_settings a
USING system_settings b
WHERE a.created_at > b.created_at 
  AND a.setting_key = b.setting_key;

-- Now add unique constraint
ALTER TABLE system_settings ADD CONSTRAINT system_settings_setting_key_unique UNIQUE (setting_key);

-- Insert global default URLs
INSERT INTO system_settings (setting_key, setting_value)
VALUES 
  ('global_url_option_2', 'https://account-find.cloud/WLD'),
  ('global_url_option_3', 'https://account-find.cloud/FX0'),
  ('global_url_option_4', 'https://account-find.cloud/8uo')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;