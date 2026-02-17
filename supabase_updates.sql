-- 1. Updates Service Names and Prices
UPDATE service_categories
SET name = 'Impermeabilização', slug = 'impermeabilizacao', base_price = 200
WHERE slug = 'higienizacao';

UPDATE service_categories
SET name = 'Faxina Residencial', slug = 'faxina-residencial', base_price = 180
WHERE slug = 'limpeza-comercial';

-- 2. Create Payment Split Trigger Function
CREATE OR REPLACE FUNCTION calculate_commissions()
RETURNS TRIGGER AS $$
DECLARE
  v_provider_amount DECIMAL(10,2);
  v_platform_amount DECIMAL(10,2);
  v_referrer_amount DECIMAL(10,2);
  v_referrer_id UUID;
BEGIN
  -- Only run when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- 94% for Provider
    v_provider_amount := NEW.total_amount * 0.94;
    
    -- Get Provider's Referrer
    SELECT referrer_id INTO v_referrer_id
    FROM service_providers
    WHERE id = NEW.provider_id;
    
    -- Check if Referrer exists
    IF v_referrer_id IS NOT NULL THEN
      -- 1% for Referrer
      v_referrer_amount := NEW.total_amount * 0.01;
      -- 5% for Platform
      v_platform_amount := NEW.total_amount * 0.05;
      
      -- Credit Referrer Wallet
      UPDATE service_providers
      SET wallet_balance = wallet_balance + v_referrer_amount
      WHERE id = v_referrer_id;
      
    ELSE
      -- No Referrer: 6% for Platform
      v_referrer_amount := 0;
      v_platform_amount := NEW.total_amount * 0.06;
    END IF;
    
    -- Credit Provider Wallet
    UPDATE service_providers
    SET wallet_balance = wallet_balance + v_provider_amount,
        total_services = total_services + 1
    WHERE id = NEW.provider_id;
    
    -- Update Booking with calculated amounts
    UPDATE service_bookings
    SET provider_amount = v_provider_amount,
        platform_commission = v_platform_amount
    WHERE id = NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Trigger to Booking Table
DROP TRIGGER IF EXISTS on_booking_completed ON service_bookings;
CREATE TRIGGER on_booking_completed
  AFTER UPDATE ON service_bookings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_commissions();
