
-- Add Evolution API instance name per restaurant
ALTER TABLE public.store_config ADD COLUMN IF NOT EXISTS evolution_instance_name text DEFAULT NULL;

-- Create function to notify via webhook on new order
CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _phone text;
  _instance text;
  _store_name text;
  _items_text text;
BEGIN
  -- Get store config for this restaurant
  SELECT phone_whatsapp, evolution_instance_name, name
  INTO _phone, _instance, _store_name
  FROM public.store_config
  WHERE restaurant_id = NEW.restaurant_id
  LIMIT 1;

  -- Only notify if both phone and instance are configured
  IF _phone IS NOT NULL AND _instance IS NOT NULL AND _phone != '' AND _instance != '' THEN
    -- Build items summary
    SELECT string_agg(oi.quantity || 'x ' || oi.product_name, ', ')
    INTO _items_text
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id;

    -- Call edge function via pg_net
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/notify-whatsapp-order',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'order_id', NEW.id,
        'customer_name', NEW.customer_name,
        'total_amount', NEW.total_amount,
        'payment_method', NEW.payment_method,
        'phone', _phone,
        'instance', _instance,
        'store_name', _store_name,
        'items', COALESCE(_items_text, 'Sem itens'),
        'address', COALESCE(NEW.address_street || ', ' || NEW.address_number || ' - ' || NEW.address_neighborhood, '')
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger on orders INSERT
DROP TRIGGER IF EXISTS on_new_order_notify_whatsapp ON public.orders;
CREATE TRIGGER on_new_order_notify_whatsapp
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_order();
