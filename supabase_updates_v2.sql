-- Update Service Providers to track "Busy" state
ALTER TABLE service_providers
ADD COLUMN IF NOT EXISTS is_busy BOOLEAN DEFAULT false;

-- Update Chat Conversations to group by Quote Request and track status
ALTER TABLE chat_conversations
ADD COLUMN IF NOT EXISTS quote_request_id UUID,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'booked'));

-- Create a table for Quote Requests (optional but good for tracking the request itself)
CREATE TABLE IF NOT EXISTS quote_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES auth.users(id),
  service_category_id UUID REFERENCES service_categories(id),
  description TEXT,
  media_urls TEXT[], -- Array of strings for photo/video URLs
  latitude DECIMAL,
  longitude DECIMAL,
  address TEXT,
  status TEXT DEFAULT 'open', -- open, completed, expired
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update Booking Status check (if constraint exists) or just documentation
-- We will use statuses: 'pending', 'awaiting_payment', 'confirmed', 'in_progress', 'waiting_client_confirmation', 'completed', 'cancelled'
ALTER TABLE service_bookings
DROP CONSTRAINT IF EXISTS service_bookings_status_check;

ALTER TABLE service_bookings
ADD CONSTRAINT service_bookings_status_check
CHECK (status IN ('pending', 'awaiting_payment', 'confirmed', 'in_progress', 'waiting_client_confirmation', 'completed', 'cancelled'));
