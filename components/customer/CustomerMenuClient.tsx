"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  ChevronRight,
  Clock3,
  Gamepad2,
  Home,
  Leaf,
  MapPin,
  Receipt,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  User,
  X,
  Plus,
  Minus,
} from "lucide-react";

import { QueryProvider } from "@/components/providers/QueryProvider";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { cartItemCount, cartSubtotal, useCartStore } from "@/store/cart";
import { CartDrawer } from "./CartDrawer";
import { ItemDetailSheet } from "./ItemDetailSheet";

interface Customization {
  id: string;
  name: string;
  group_type: "single" | "multi" | "required" | string;
  is_required: boolean;
  options: { id: string; label: string; price_delta: number }[];
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  food_type: "veg" | "non_veg" | "egg" | "vegan" | string;
  is_available: boolean;
  is_featured: boolean;
  prep_time_minutes: number | null;
  customizations: Customization[];
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  items: MenuItem[];
}

interface MenuData {
  restaurant: { id: string; name: string; slug: string; logo_url: string | null };
  categories: Category[];
}

interface Props {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  restaurantLogo: string | null;
  tableNumber: string;
  tableId: string;
}

type Filter = "all" | "veg" | "non_veg" | "featured";

const foodTone: Record<string, { color: string; label: string }> = {
  veg: { color: "#0F8A1F", label: "Veg" },
  vegan: { color: "#0F8A1F", label: "Vegan" },
  non_veg: { color: "#E23744", label: "Non-veg" },
  egg: { color: "#FBBF24", label: "Egg" },
};

function FoodMark({ type }: { type: string }) {
  const tone = foodTone[type] ?? foodTone.veg;

  return (
    <span
      aria-label={tone.label}
      title={tone.label}
      className="inline-grid h-3 w-3 shrink-0 place-items-center rounded-[3px] border"
      style={{ borderColor: tone.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.color }} />
    </span>
  );
}

function price(value: number) {
  return `₹${Number(value).toFixed(0)}`;
}

function MenuSkeleton() {
  return (
    <div className="space-y-7 px-4 pt-4 pb-32">
      {[0, 1, 2].map((section) => (
        <div key={section}>
          <div className="mb-3 h-5 w-32 animate-pulse rounded-full bg-[var(--surface-2)]" />
          <div className="space-y-3">
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="flex gap-3 rounded-[20px] border border-[var(--hairline)] bg-[var(--surface)] p-3"
              >
                <div className="h-24 w-24 shrink-0 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
                <div className="flex flex-1 flex-col justify-center">
                  <div className="h-4 w-2/3 animate-pulse rounded-full bg-[var(--surface-2)]" />
                  <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-[var(--surface-2)]" />
                  <div className="mt-2 h-3 w-4/5 animate-pulse rounded-full bg-[var(--surface-2)]" />
                  <div className="mt-4 h-8 w-full animate-pulse rounded-full bg-[var(--surface-2)]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MenuItemRow({
  item,
  onTap,
  onQuickAdd,
}: {
  item: MenuItem;
  onTap: () => void;
  onQuickAdd: () => void;
}) {
  const hasCustomizations = item.customizations.length > 0;
  const cartItems = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  const cartItem = cartItems.find(
    (i) => i.menuItemId === item.id && i.customizations.length === 0
  );

  return (
    <motion.article
      layout
      variants={staggerItem}
      whileTap={{ scale: 0.99 }}
      onClick={onTap}
      className="group grid cursor-pointer grid-cols-[1fr_116px] gap-3 border-b border-[var(--hairline)] bg-[var(--bg)] px-4 py-4 last:border-b-0 md:grid-cols-[1fr_118px] md:rounded-[24px] md:border md:bg-[var(--surface)] md:p-3 md:shadow-[var(--sh-1)]"
    >
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2">
          <FoodMark type={item.food_type} />
          {item.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--amber-soft)] px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#8a5b00]">
              <Sparkles size={11} strokeWidth={2.4} />
              Bestseller
            </span>
          )}
        </div>

        <h3 className="line-clamp-2 text-[15px] font-extrabold leading-snug tracking-normal text-[var(--ink)]">
          {item.name}
        </h3>

        {item.description && (
          <p className="mt-1 line-clamp-2 max-w-[34ch] text-[12.5px] font-medium leading-relaxed text-[var(--muted)]">
            {item.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-semibold text-[var(--muted)]">
          <span className="text-[15px] font-extrabold text-[var(--ink)]">{price(item.price)}</span>
          {item.prep_time_minutes ? (
            <span className="inline-flex items-center gap-1">
              <Clock3 size={12} />
              {item.prep_time_minutes} min
            </span>
          ) : null}
          {hasCustomizations ? <span className="text-[var(--brand-deep)]">Customisable</span> : null}
        </div>
      </div>

      <div className="relative h-[116px] overflow-hidden rounded-[18px] bg-[var(--surface-2)]">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="grid h-full place-items-center text-[var(--muted-2)]">
            <ShoppingBag size={26} />
          </div>
        )}
        {!hasCustomizations && cartItem ? (
          <div
            onClick={(event) => event.stopPropagation()}
            className="absolute inset-x-2 bottom-2.5 inline-flex h-9 items-center justify-between gap-1 rounded-full border border-[var(--brand)] bg-[var(--surface)] text-[12px] font-extrabold text-[var(--ink)] shadow-[var(--sh-2)] p-0.5"
          >
            <button
              type="button"
              onClick={() => updateQuantity(cartItem.id, cartItem.quantity - 1)}
              className="grid h-7 w-7 place-items-center rounded-full bg-[var(--surface-2)] text-[var(--ink)] active:scale-90 transition-transform"
              aria-label="Decrease quantity"
            >
              <Minus size={11} strokeWidth={3} />
            </button>
            <span className="text-[13px] font-black">{cartItem.quantity}</span>
            <button
              type="button"
              onClick={() => updateQuantity(cartItem.id, cartItem.quantity + 1)}
              className="grid h-7 w-7 place-items-center rounded-full bg-[var(--ink)] text-[var(--surface)] active:scale-90 transition-transform"
              aria-label="Increase quantity"
            >
              <Plus size={11} strokeWidth={3} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (hasCustomizations) {
                onTap();
              } else {
                onQuickAdd();
              }
            }}
            className="absolute inset-x-3 bottom-3 inline-flex h-9 items-center justify-center gap-1 rounded-full border border-[rgba(255,77,61,0.22)] bg-[var(--surface)] text-[12px] font-extrabold text-[var(--brand-deep)] shadow-[var(--sh-2)] transition-transform active:scale-95"
          >
            ADD
            <ChevronRight size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </motion.article>
  );
}

function MenuItemHeroCard({
  item,
  onTap,
  onQuickAdd,
}: {
  item: MenuItem;
  onTap: () => void;
  onQuickAdd: () => void;
}) {
  const hasCustomizations = item.customizations.length > 0;
  const cartItems = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  const cartItem = cartItems.find(
    (i) => i.menuItemId === item.id && i.customizations.length === 0
  );

  return (
    <motion.article
      layout
      variants={staggerItem}
      whileTap={{ scale: 0.985 }}
      onClick={onTap}
      className="menu-hero mx-4 mb-1 md:mx-0"
    >
      <div className="menu-hero__img" style={item.image_url ? { backgroundImage: `url(${item.image_url})` } : undefined}>
        {!item.image_url && (
          <div className="grid h-full place-items-center text-[var(--muted-2)]">
            <ShoppingBag size={44} strokeWidth={1.5} />
          </div>
        )}

        {/* Top badges */}
        <div className="menu-hero__badges">
          <span className="menu-hero__veg-pill">
            <FoodMark type={item.food_type} />
            <span style={{ font: "600 10px var(--sans)", color: "var(--ink-2)" }}>
              {item.food_type === "non_veg" ? "Non-veg" : item.food_type === "egg" ? "Egg" : item.food_type === "vegan" ? "Vegan" : "Veg"}
            </span>
          </span>
          {item.is_featured && (
            <span className="menu-hero__best">
              <Sparkles size={10} strokeWidth={2.5} />
              Bestseller
            </span>
          )}
        </div>

        {/* Bottom: name + price + add CTA */}
        <div className="menu-hero__foot">
          <div className="menu-hero__info">
            <h3 className="menu-hero__name">{item.name}</h3>
            <div className="menu-hero__price-row">
              <span className="menu-hero__price">{price(item.price)}</span>
              {item.prep_time_minutes ? (
                <span className="menu-hero__time">
                  <Clock3 size={11} />
                  {item.prep_time_minutes} min
                </span>
              ) : null}
            </div>
          </div>
          {!hasCustomizations && cartItem ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="inline-flex h-9 items-center justify-between gap-3.5 rounded-full border border-white bg-[rgba(27,27,34,.9)] px-1.5 py-1 text-[12px] font-extrabold text-[#fff]"
              style={{ minWidth: 96 }}
            >
              <button
                type="button"
                onClick={() => updateQuantity(cartItem.id, cartItem.quantity - 1)}
                className="grid h-6 w-6 place-items-center rounded-full bg-[rgba(255,255,255,.15)] text-[#fff] active:scale-90 transition-transform"
                aria-label="Decrease quantity"
              >
                <Minus size={11} strokeWidth={3} />
              </button>
              <span className="text-[12px] font-black">{cartItem.quantity}</span>
              <button
                type="button"
                onClick={() => updateQuantity(cartItem.id, cartItem.quantity + 1)}
                className="grid h-6 w-6 place-items-center rounded-full bg-[var(--brand)] text-[#fff] active:scale-90 transition-transform"
                aria-label="Increase quantity"
              >
                <Plus size={11} strokeWidth={3} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="menu-hero__add"
              onClick={(e) => {
                e.stopPropagation();
                hasCustomizations ? onTap() : onQuickAdd();
              }}
            >
              ADD
              <ChevronRight size={13} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {item.description ? (
        <p className="menu-hero__desc">
          <span className="line-clamp-1">{item.description}</span>
          {hasCustomizations && <span className="menu-hero__custom">Customisable</span>}
        </p>
      ) : null}
    </motion.article>
  );
}

function CustomerMenuInner({
  restaurantId,
  restaurantName,
  restaurantSlug,
  restaurantLogo,
  tableNumber,
  tableId,
}: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )customer_name=([^;]*)/);
    if (match) setCustomerName(decodeURIComponent(match[1]));
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    };
    updateTime();
    const t = setInterval(updateTime, 60000);
    return () => clearInterval(t);
  }, []);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const tabsRef = useRef<HTMLDivElement>(null);

  const cartItems = useCartStore((state) => state.items);
  const setRestaurantContext = useCartStore((state) => state.setRestaurantContext);
  const addItem = useCartStore((state) => state.addItem);
  const itemCount = cartItemCount(cartItems);
  const subtotal = cartSubtotal(cartItems);

  useEffect(() => {
    setRestaurantContext(restaurantId, tableId, restaurantSlug);
  }, [restaurantId, restaurantSlug, setRestaurantContext, tableId]);

  const {
    data: menu,
    isError,
    isLoading,
    refetch,
  } = useQuery<MenuData>({
    queryKey: ["menu", restaurantSlug],
    queryFn: async () => {
      const response = await fetch(`/api/public/menu/${restaurantSlug}`);
      if (!response.ok) {
        throw new Error("Menu request failed");
      }
      const payload = (await response.json()) as { data: MenuData };
      return payload.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const categories = useMemo(() => menu?.categories ?? [], [menu?.categories]);
  const currentCategoryId = activeCategoryId ?? categories[0]?.id ?? null;

  const featuredItem = useMemo(() => {
    for (const cat of categories) {
      for (const item of cat.items) {
        if (item.is_featured && item.is_available && item.image_url) return item;
      }
    }
    for (const cat of categories) {
      for (const item of cat.items) {
        if (item.is_featured && item.is_available) return item;
      }
    }
    return null;
  }, [categories]);

  const popularItems = useMemo(() => {
    const items: MenuItem[] = [];
    for (const cat of categories) {
      for (const item of cat.items) {
        if (item.is_available) items.push(item);
        if (items.length >= 4) break;
      }
      if (items.length >= 4) break;
    }
    return items;
  }, [categories]);

  useEffect(() => {
    if (search.trim()) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveCategoryId(visible.target.id);
        }
      },
      { rootMargin: "-220px 0px -55% 0px", threshold: [0.2, 0.45, 0.7] },
    );

    Object.values(sectionRefs.current).forEach((element) => {
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [categories, search]);

  useEffect(() => {
    if (!currentCategoryId) {
      return;
    }
    const tabEl = tabsRef.current?.querySelector(`[data-cat="${currentCategoryId}"]`) as HTMLElement | null;
    tabEl?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [currentCategoryId]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          if (filter === "veg" && item.food_type === "non_veg") return false;
          if (filter === "non_veg" && item.food_type !== "non_veg") return false;
          if (filter === "featured" && !item.is_featured) return false;
          if (!query) return true;

          const haystack = `${item.name} ${item.description ?? ""}`.toLowerCase();
          return haystack.includes(query);
        }),
      }))
      .filter((category) => category.items.length > 0);
  }, [categories, filter, search]);

  const filterItems: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "veg", label: "Veg" },
    { id: "non_veg", label: "Non-veg" },
    { id: "featured", label: "Best" },
  ];

  const scrollToCategory = useCallback((id: string) => {
    setActiveCategoryId(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleQuickAdd = (item: MenuItem) => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: Number(item.price),
      image_url: item.image_url,
      food_type: item.food_type,
      customizations: [],
    });
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--ink)] md:bg-[linear-gradient(90deg,var(--bg)_0%,var(--bg)_50%,var(--surface-2)_50%,var(--surface-2)_100%)]">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[var(--bg)] md:max-w-[960px] md:px-6 md:py-6 lg:max-w-[1120px]">
        <header className="sticky top-0 z-30 border-b border-[var(--hairline)] bg-[color-mix(in_oklab,var(--bg)_92%,transparent)] pb-3 shadow-[0_10px_30px_-28px_rgba(20,19,26,.45)] backdrop-blur-xl md:static md:overflow-hidden md:rounded-[32px] md:border md:bg-[var(--surface)] md:pb-5 md:shadow-[var(--sh-2)]">
          {/* Topbar: location pin + restaurant name + bell */}
          <div className="cust-topbar">
            <div className="cust-loc">
              <div className="cust-loc__pin overflow-hidden">
                {restaurantLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={restaurantLogo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <MapPin size={19} strokeWidth={2.4} />
                )}
              </div>
              <div className="min-w-0">
                <p className="cust-loc__label">Dining at</p>
                <p className="cust-loc__name truncate">{restaurantName}</p>
              </div>
            </div>
            <button type="button" className="cust-icon-btn" aria-label="Notifications">
              <Bell size={18} strokeWidth={2} />
              <span className="dot" />
            </button>
          </div>

          {/* Greeting: personalised + table chip */}
          <div className="cust-greet">
            <h1>
              {customerName ? (
                <>Hey {customerName.split(" ")[0]} — <em>scan, tap,</em> enjoy.</>
              ) : (
                <>Order <em>fresh</em>{", eat "}<em>happy</em></>
              )}
            </h1>
            <p style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <span className="table-chip">
                TABLE <span className="table-chip__num">{tableNumber || "–"}</span>
              </span>
              {currentTime && (
                <span style={{ font: "500 13px var(--sans)", color: "var(--muted)" }}>· {currentTime}</span>
              )}
            </p>
          </div>

          <div className="cust-search">
            <Search size={18} className="shrink-0 text-[var(--muted-2)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search dishes, ingredients…"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="grid h-7 w-7 place-items-center rounded-full bg-[var(--surface-2)] text-[var(--muted)]"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            ) : (
              <SlidersHorizontal size={17} className="text-[var(--brand-deep)]" />
            )}
          </div>

          <div className="cust-cats">
            {filterItems.map((item) => {
              const active = filter === item.id;
              const emojis: Record<string, string> = { all: "✨", veg: "🥗", non_veg: "🍖", featured: "⭐" };
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`cust-chip${active ? " is-active" : ""}`}
                >
                  <span className="cust-chip__ico">{emojis[item.id]}</span>
                  {item.label}
                </button>
              );
            })}
          </div>

          {!search && categories.length > 0 ? (
            <nav
              ref={tabsRef}
              aria-label="Menu categories"
              className="cat-tabs-wrap mt-3 md:px-6"
            >
              {categories.map((category) => {
                const active = currentCategoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    data-cat={category.id}
                    onClick={() => scrollToCategory(category.id)}
                    className={`cat-tab-btn ${active ? "active" : "inactive"}`}
                  >
                    {category.name}
                    <span className="tab-count">{category.items.length}</span>
                    {active ? (
                      <motion.span
                        layoutId="cat-tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[var(--brand)]"
                        transition={{ type: "spring", stiffness: 500, damping: 42 }}
                      />
                    ) : null}
                  </button>
                );
              })}
            </nav>
          ) : null}
        </header>

        {isLoading ? (
          <MenuSkeleton />
        ) : isError ? (
          <section className="px-5 py-20 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--brand-tint)] text-[var(--brand)]">
              <ShoppingBag size={25} />
            </div>
            <h2 className="mt-5 text-lg font-black">Menu did not load</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted)]">
              The restaurant menu could not be fetched. Check your connection and try again.
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-5 rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-extrabold text-[var(--surface)]"
            >
              Retry
            </button>
          </section>
        ) : filteredCategories.length === 0 ? (
          <section className="px-5 py-20 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--surface)] text-[var(--muted)] shadow-[var(--sh-1)]">
              <Search size={24} />
            </div>
            <h2 className="mt-5 text-lg font-black">{search ? "No matching dishes" : "Menu coming soon"}</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted)]">
              {search ? "Try another dish name or clear the filters." : "The restaurant has not published items yet."}
            </p>
            {search || filter !== "all" ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                className="mt-5 rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-extrabold text-[var(--surface)]"
              >
                Clear filters
              </button>
            ) : null}
          </section>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="pb-36 md:pt-4"
          >
            {/* Chef's Special promo card — first featured item */}
            {!search && filter === "all" && featuredItem && (
              <motion.div
                variants={staggerItem}
                className="promo mx-4 mt-4 md:mx-0 cursor-pointer"
                onClick={() => setDetailItem(featuredItem)}
                whileTap={{ scale: 0.985 }}
              >
                <span className="promo__tag">Chef&apos;s Special · Today</span>
                <h3 className="promo__title">{featuredItem.name}</h3>
                {featuredItem.description && (
                  <p className="promo__sub" style={{ WebkitLineClamp: 2, overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical" }}>
                    {featuredItem.description}
                  </p>
                )}
                <span className="promo__btn">Order now →</span>
                {featuredItem.image_url && (
                  <div className="promo__art" style={{ backgroundImage: `url(${featuredItem.image_url})` }} />
                )}
              </motion.div>
            )}

            {/* Popular tonight — 2-column food card grid */}
            {!search && filter === "all" && popularItems.length > 0 && (
              <div className="mt-5 md:mt-6">
                <div className="sect-head px-4 md:px-0">
                  <h2>Popular tonight</h2>
                </div>
                <div className="food-row px-4 md:px-0">
                  {popularItems.map((item) => (
                    <div
                      key={item.id}
                      className="food-card cursor-pointer"
                      onClick={() => setDetailItem(item)}
                    >
                      <div
                        className="food-card__img"
                        style={item.image_url ? { backgroundImage: `url(${item.image_url})` } : undefined}
                      >
                        {!item.image_url && (
                          <div className="grid h-full place-items-center text-[var(--muted-2)]">
                            <ShoppingBag size={28} strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                      <div
                        className="food-card__heart"
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: "var(--brand)" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z"/></svg>
                      </div>
                      <div className="food-card__title line-clamp-2">{item.name}</div>
                      <div className="food-card__meta">
                        <span className={`veg-dot${item.food_type === "non_veg" ? " nonveg" : ""}`} />
                        <Star size={11} fill="#F2A500" stroke="none" />
                        <b style={{ color: "var(--ink)", fontWeight: 700 }}>4.8</b>
                        <span>·</span>
                        {item.prep_time_minutes ? (
                          <>
                            <Clock3 size={11} />
                            {item.prep_time_minutes} min
                          </>
                        ) : null}
                      </div>
                      <div className="food-card__foot">
                        <div className="food-card__price">₹{Number(item.price).toFixed(0)}</div>
                        <button
                          type="button"
                          className="food-card__add"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.customizations.length > 0) setDetailItem(item);
                            else handleQuickAdd(item);
                          }}
                          aria-label={`Add ${item.name}`}
                        >
                          <Plus size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredCategories.map((category) => (
              <section
                id={category.id}
                key={category.id}
                ref={(element) => {
                  sectionRefs.current[category.id] = element;
                }}
                className="scroll-mt-[260px]"
              >
                <div className="flex items-end justify-between gap-4 px-4 pb-1 pt-6 md:px-0">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--brand-deep)]">
                      {category.items.length} items
                    </p>
                    <h2 className="text-[20px] font-black tracking-normal">{category.name}</h2>
                  </div>
                  {category.description ? (
                    <p className="max-w-[12rem] truncate text-right text-[12px] font-semibold text-[var(--muted)]">
                      {category.description}
                    </p>
                  ) : null}
                </div>

                {/* Magazine hero card — first item in category */}
                {category.items[0] ? (
                  <MenuItemHeroCard
                    item={category.items[0]}
                    onTap={() => setDetailItem(category.items[0]!)}
                    onQuickAdd={() => handleQuickAdd(category.items[0]!)}
                  />
                ) : null}

                {/* Remaining items — horizontal card rows */}
                {category.items.length > 1 ? (
                  <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-3"
                  >
                    {category.items.slice(1).map((item) => (
                      <MenuItemRow
                        key={item.id}
                        item={item}
                        onTap={() => setDetailItem(item)}
                        onQuickAdd={() => handleQuickAdd(item)}
                      />
                    ))}
                  </motion.div>
                ) : null}
              </section>
            ))}
          </motion.div>
        )}

        {/* Bottom tabbar — replaces FloatingCartBar on mobile */}
        <div
          className="md:hidden tabbar"
          style={{
            position: "fixed",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "calc(100% - 28px)",
            maxWidth: 452,
            zIndex: 40,
          }}
        >
          <div className="tabbar__item is-active">
            <Home size={18} /><span>Menu</span>
          </div>
          <button
            type="button"
            className="tabbar__item"
            style={{ background: "none", border: 0, cursor: "pointer", position: "relative", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.5)" }}
            onClick={() => setShowCart(true)}
            aria-label="Open cart"
          >
            <ShoppingBag size={18} />
            {itemCount > 0 && (
              <motion.span
                key={itemCount}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                style={{
                  position: "absolute",
                  top: 6,
                  right: "50%",
                  transform: "translateX(10px)",
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "var(--brand)",
                  color: "#fff",
                  font: "800 10px var(--sans)",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "var(--sh-coral)",
                }}
              >
                {itemCount}
              </motion.span>
            )}
          </button>
          <div className="tabbar__item" style={{ cursor: "default" }}>
            <Gamepad2 size={18} />
          </div>
          <div className="tabbar__item" style={{ cursor: "default" }}>
            <Receipt size={18} />
          </div>
          <div className="tabbar__item" style={{ cursor: "default" }}>
            <User size={18} />
          </div>
        </div>

        {/* Desktop floating cart bar */}
        <div className="hidden md:block">
          <AnimatePresence>
            {itemCount > 0 && (
              <motion.div
                initial={{ y: 110, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 110, opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-32px)] max-w-[448px] -translate-x-1/2 items-center gap-3 rounded-full bg-[var(--ink)] p-2 pl-3 shadow-[0_18px_40px_-14px_rgba(20,19,26,.55)]"
              >
                <button
                  type="button"
                  onClick={() => setShowCart(true)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-full text-left text-[var(--surface)]"
                >
                  <motion.span
                    key={itemCount}
                    initial={{ scale: 1.25 }}
                    animate={{ scale: 1 }}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-sm font-black"
                  >
                    {itemCount}
                  </motion.span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-black">View bag</span>
                    <span className="block text-[11px] font-semibold text-[rgba(255,252,248,.62)]">
                      ₹{subtotal.toFixed(0)}
                    </span>
                  </span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showCart ? <CartDrawer onClose={() => setShowCart(false)} restaurantSlug={restaurantSlug} /> : null}
        </AnimatePresence>

        <AnimatePresence>
          {detailItem ? (
            <ItemDetailSheet
              item={detailItem}
              onClose={() => setDetailItem(null)}
              onAdded={() => setDetailItem(null)}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </main>
  );
}

export function CustomerMenuClient(props: Props) {
  return (
    <QueryProvider>
      <CustomerMenuInner {...props} />
    </QueryProvider>
  );
}
