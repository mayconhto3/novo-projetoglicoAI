-- Migration: Add medical_data column to profiles table
-- Date: 2026-01-04
-- Description: Adds JSONB column to store all medical and user preference data

-- Add medical_data column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS medical_data JSONB DEFAULT '{}'::jsonb;

-- Add index for better query performance on medical_data
CREATE INDEX IF NOT EXISTS idx_profiles_medical_data 
ON profiles USING gin (medical_data);

-- Add comment for documentation
COMMENT ON COLUMN profiles.medical_data IS 'Stores all medical information, preferences, and settings in JSONB format. Includes: weight, height, insulin settings, communication preferences, meal times, medications, etc.';

-- Example of data structure stored in medical_data:
-- {
--   "weight": 70,
--   "height": 175,
--   "phone": "5511999999999",
--   "communicationStyle": "Amigável",
--   "insulinMethod": "Caneta",
--   "insulinStep": 1.0,
--   "basalInsulin": {
--     "brand": "Lantus",
--     "morningDose": 10,
--     "nightDose": 12
--   },
--   "bolusInsulin": {
--     "brand": "Humalog"
--   },
--   "notificationSettings": {
--     "meals": true,
--     "medication": true,
--     "glucose": true,
--     "whatsapp": true
--   },
--   "diabetesMeds": ["Metformina"],
--   "glycemicMeds": [],
--   "comorbidities": ["Hipertensão"],
--   "mealTimes": {
--     "breakfast": "08:00",
--     "lunch": "12:00",
--     "dinner": "19:00"
--   },
--   "targetGlucosePreMeal": 90,
--   "targetGlucosePostMeal": 180
-- }
