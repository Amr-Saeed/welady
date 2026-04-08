-- ========================================
-- Safe delete RPC for parent homework
-- ========================================
-- Deletes a homework row only if it belongs to the authenticated parent's child.

CREATE OR REPLACE FUNCTION public.delete_parent_homework(
  p_child_id UUID,
  p_homework_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure the authenticated user owns this child
  IF NOT EXISTS (
    SELECT 1
    FROM public.children c
    WHERE c.id = p_child_id
      AND c."parentID" = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not allowed to delete homework for this child';
  END IF;

  DELETE FROM public.homework h
  WHERE h.id = p_homework_id
    AND h."childID" = p_child_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_parent_homework(UUID, UUID) TO authenticated;
