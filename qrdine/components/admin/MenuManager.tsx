"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Eye, Plus, ArrowLeft } from "lucide-react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { CategoryPanel } from "./CategoryPanel";
import { ItemGrid } from "./ItemGrid";
import { ItemFormModal } from "./ItemFormModal";
import { CategoryFormModal } from "./CategoryFormModal";
import type { MenuItem, MenuCategory } from "@/types";

interface Props { restaurantId: string }

function MenuManagerInner({ restaurantId }: Props) {
  const qc = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editCategory, setEditCategory] = useState<MenuCategory | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MenuItem | null>(null);
  const [noCatWarning, setNoCatWarning] = useState(false);
  const [arrowVisible, setArrowVisible] = useState(false);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: categories = [], isLoading: catsLoading } = useQuery<(MenuCategory & { _count: { items: number } })[]>({
    queryKey: ["categories", restaurantId],
    queryFn: () => fetch("/api/menu/categories").then(r => r.json()).then(r => r.data ?? []),
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery<MenuItem[]>({
    queryKey: ["items", selectedCategoryId],
    queryFn: () => {
      const url = selectedCategoryId
        ? `/api/menu/items?category_id=${selectedCategoryId}`
        : "/api/menu/items";
      return fetch(url).then(r => r.json()).then(r => r.data ?? []);
    },
  });

  const toggleAvailable = useMutation({
    mutationFn: ({ id, is_available }: { id: string; is_available: boolean }) =>
      fetch(`/api/menu/items/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_available }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items"] }),
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => fetch(`/api/menu/items/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["items"] }),
  });

  const selectedCat = categories.find(c => c.id === selectedCategoryId);

  function handleAddItemClick() {
    if (!selectedCategoryId) {
      setNoCatWarning(true);
      setArrowVisible(true);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      warningTimerRef.current = setTimeout(() => {
        setNoCatWarning(false);
        setArrowVisible(false);
      }, 4000);
      return;
    }
    setNoCatWarning(false);
    setArrowVisible(false);
    setEditItem(null);
    setShowItemForm(true);
  }

  // Dismiss warning when a category is selected
  useEffect(() => {
    if (selectedCategoryId) {
      setNoCatWarning(false);
      setArrowVisible(false);
    }
  }, [selectedCategoryId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (warningTimerRef.current) clearTimeout(warningTimerRef.current); };
  }, []);

  return (
    <div className="grid min-h-[calc(100vh-120px)] grid-cols-1 items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      {/* Category panel with arrow indicator */}
      <div style={{ position: "relative" }}>
        <CategoryPanel
          categories={categories}
          loading={catsLoading}
          selectedId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
          onAdd={() => { setEditCategory(null); setShowCatForm(true); }}
          onEdit={(cat) => { setEditCategory(cat); setShowCatForm(true); }}
          highlight={arrowVisible}
        />

        {/* Animated arrow pointing to categories */}
        {arrowVisible && (
          <div
            style={{
              position: "absolute",
              top: 20,
              right: -48,
              display: "flex",
              alignItems: "center",
              gap: 6,
              animation: "arrowPulse 0.8s ease-in-out infinite alternate",
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            <ArrowLeft size={20} strokeWidth={2.5} style={{ color: "var(--amber)" }} />
          </div>
        )}
      </div>

      <section className="min-w-0">
        {/* Premium header */}
        <div
          className="mb-5 flex flex-col gap-4 rounded-[28px] p-5 sm:flex-row sm:items-center sm:justify-between"
          style={{
            background: "linear-gradient(135deg, var(--surface) 0%, var(--bg) 100%)",
            border: "1px solid var(--hairline)",
            boxShadow: "var(--sh-2)",
          }}
        >
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--brand)",
                margin: 0,
              }}
            >
              Menu builder
            </p>
            <h2
              style={{
                marginTop: 4,
                marginBottom: 0,
                fontSize: 22,
                fontFamily: "var(--display)",
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "var(--ink)",
              }}
            >
              {selectedCat ? selectedCat.name : "All Items"}
            </h2>
            <p
              style={{
                marginTop: 4,
                marginBottom: 0,
                fontSize: 12,
                fontWeight: 600,
                color: "var(--muted)",
              }}
            >
              {items.length} item{items.length !== 1 ? "s" : ""}
              {!selectedCategoryId && " across all categories"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Link href="/dashboard/menu/preview" className="no-underline">
              <button
                className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--bg)] px-4 text-[13px] font-black text-[var(--ink-2)]"
                style={{ transition: "box-shadow 0.18s, background 0.18s" }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "var(--sh-1)";
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--bg)";
                }}
              >
                <Eye size={15} strokeWidth={2.4} />
                Preview
              </button>
            </Link>

            {/* Add item button — always enabled */}
            <button
              onClick={handleAddItemClick}
              className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[13px] font-black"
              style={{
                background: selectedCategoryId ? "var(--brand)" : "rgba(242,165,0,0.12)",
                color: selectedCategoryId ? "var(--surface)" : "#9a6000",
                boxShadow: selectedCategoryId ? "var(--sh-coral)" : "none",
                border: selectedCategoryId ? "none" : "1.5px solid rgba(242,165,0,0.35)",
                transition: "background 0.22s, color 0.22s, box-shadow 0.22s, border 0.22s",
              }}
            >
              <Plus size={15} strokeWidth={2.7} />
              Add Item
            </button>
          </div>
        </div>

        {/* Inline warning banner */}
        <div
          style={{
            overflow: "hidden",
            maxHeight: noCatWarning ? 64 : 0,
            opacity: noCatWarning ? 1 : 0,
            marginBottom: noCatWarning ? 16 : 0,
            transition: "max-height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease, margin-bottom 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              borderRadius: 14,
              background: "rgba(242,165,0,0.10)",
              border: "1.5px solid rgba(242,165,0,0.32)",
              color: "#8a5b00",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "var(--sans)",
            }}
          >
            <span style={{ fontSize: 16 }}></span>
            Please select a category from the left panel before adding an item.
          </div>
        </div>

        <ItemGrid
          items={items}
          loading={itemsLoading}
          onEdit={(item) => { setEditItem(item); setShowItemForm(true); }}
          onToggleAvailable={(item) => toggleAvailable.mutate({ id: item.id, is_available: !item.is_available })}
          onDelete={(item) => setPendingDelete(item)}
        />
      </section>

      {/* Modals */}
      {showItemForm && (
        <ItemFormModal
          item={editItem}
          categoryId={selectedCategoryId!}
          onClose={() => { setShowItemForm(false); setEditItem(null); }}
          onSaved={() => { setShowItemForm(false); setEditItem(null); qc.invalidateQueries({ queryKey: ["items"] }); }}
        />
      )}
      {showCatForm && (
        <CategoryFormModal
          category={editCategory}
          onClose={() => { setShowCatForm(false); setEditCategory(null); }}
          onSaved={() => { setShowCatForm(false); setEditCategory(null); qc.invalidateQueries({ queryKey: ["categories"] }); }}
        />
      )}
      {pendingDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full border border-zinc-200 [box-shadow:var(--sh-3)] space-y-4 text-xs">
            <h4 className="text-sm font-extrabold text-zinc-950">Delete item?</h4>
            <p className="text-zinc-500">
              <span className="font-bold text-zinc-800">&ldquo;{pendingDelete.name}&rdquo;</span> will be permanently removed from the menu.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => { deleteItem.mutate(pendingDelete.id); setPendingDelete(null); }}
                className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Arrow pulse animation */}
      <style>{`
        @keyframes arrowPulse {
          from { transform: translateX(0); opacity: 0.7; }
          to   { transform: translateX(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export function MenuManager({ restaurantId }: Props) {
  return (
    <QueryProvider>
      <MenuManagerInner restaurantId={restaurantId} />
    </QueryProvider>
  );
}
