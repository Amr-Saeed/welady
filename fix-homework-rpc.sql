-- ========================================
-- Safe read RPC for parent homeworks
-- ========================================

CREATE OR REPLACE FUNCTION public.get_parent_homeworks(p_child_id UUID)
RETURNS TABLE (
  id UUID,
  "childID" UUID,
  title TEXT,
  description TEXT,
  "dueDate" DATE,
  "created_at" TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    h.id,
    h."childID",
    h.title,
    h.description,
    h."dueDate",
    h.created_at
  FROM public.homework h
  JOIN public.children c ON c.id = h."childID"
  WHERE h."childID" = p_child_id
    AND c."parentID" = auth.uid()
  ORDER BY h."dueDate" ASC, h.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_parent_homeworks(UUID) TO authenticated;
