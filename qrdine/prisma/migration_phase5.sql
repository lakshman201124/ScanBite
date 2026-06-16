-- Phase 5: order_items unique constraint
-- Prevents duplicate (order_id, menu_item_id) rows and enables safe upsert.
-- Safe to run multiple times — IF NOT EXISTS guard on the constraint name.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_items_order_id_menu_item_id_key'
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT "order_items_order_id_menu_item_id_key"
      UNIQUE (order_id, menu_item_id);
  END IF;
END $$;
