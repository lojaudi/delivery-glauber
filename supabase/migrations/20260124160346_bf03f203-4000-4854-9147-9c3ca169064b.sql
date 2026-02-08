-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Waiters can update their own status" ON public.waiters;

-- Create a more restrictive policy for waiter self-update
-- Waiters should only be able to update their own record if they can prove ownership
-- Since waiters login via PIN and don't have user_id, this policy is only useful for admin contexts
-- The admin/reseller policies already cover updates properly, so we can safely remove this
-- If self-service waiter updates are needed in the future, implement proper authentication