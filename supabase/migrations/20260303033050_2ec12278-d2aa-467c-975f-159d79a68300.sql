
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
  SELECT phone_whatsapp, evolution_instance_name, name
  INTO _phone, _instance, _store_name
  FROM public.store_config
  WHERE restaurant_id = NEW.restaurant_id
  LIMIT 1;

  IF _phone IS NOT NULL AND _instance IS NOT NULL AND _phone != '' AND _instance != '' THEN
    SELECT string_agg(oi.quantity || 'x ' || oi.product_name, ', ')
    INTO _items_text
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id;

    BEGIN
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
          'address', COALESCE(NEW.address_street || ', ' || NEW.address_number || ' - ' || NEW.address_neighborhood, ''),
          'restaurant_id', NEW.restaurant_id
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'WhatsApp notification failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;
