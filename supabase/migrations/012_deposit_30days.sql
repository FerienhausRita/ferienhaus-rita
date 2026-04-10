-- Update deposit config: remainder due 30 days before check-in (was 14)
UPDATE site_settings
SET value = jsonb_set(value, '{remainder_days_before_checkin}', '30')
WHERE key = 'deposit_config';
