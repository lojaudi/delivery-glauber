
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _phone text;
  _instance text;
  _store_name text;
  _custom_msg text;
BEGIN
  -- Only fire when status actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT phone_whatsapp, evolution_instance_name, name,
    CASE NEW.status
      WHEN 'preparing' THEN msg_order_preparing
      WHEN 'delivery' THEN msg_order_delivery
      WHEN 'completed' THEN msg_order_completed
      ELSE NULL
    END
  INTO _phone, _instance, _store_name, _custom_msg
  FROM public.store_config
  WHERE restaurant_id = NEW.restaurant_id
  LIMIT 1;

  IF _phone IS NOT NULL AND _instance IS NOT NULL AND _phone != '' AND _instance != '' THEN
    BEGIN
      PERFORM net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/notify-whatsapp-status',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
          'order_id', NEW.id,
          'customer_name', NEW.customer_name,
          'customer_phone', NEW.customer_phone,
          'status', NEW.status,
          'store_name', _store_name,
          'instance', _instance,
          'message', _custom_msg,
          'restaurant_id', NEW.restaurant_id
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'WhatsApp status notification failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create the trigger on UPDATE
DROP TRIGGER IF EXISTS on_order_status_change_notify_whatsapp ON public.orders;
CREATE TRIGGER on_order_status_change_notify_whatsapp
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_change();
