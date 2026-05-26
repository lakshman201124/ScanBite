/* global React */
// ScanBite — Customer mobile screens (4 screens)
// Renders inside an IOSDevice frame (402x874).

const IMG = {
  promo: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80&auto=format',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80&auto=format',
  pasta: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=80&auto=format',
  salad: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80&auto=format',
  pizza: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80&auto=format',
  ramen: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80&auto=format',
  tacos: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80&auto=format',
  steak: 'https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=800&q=80&auto=format',
  poke: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80&auto=format',
  detail: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1000&q=80&auto=format',
  dessert: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80&auto=format'
};

// ─────────────────────────────────────────────────────────────
// Tiny inline icons (lucide-style, 1.75 stroke)
// ─────────────────────────────────────────────────────────────
const I = {
  pin: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>,
  chev: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>,
  bell: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>,
  search: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  filter: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M6 12h12M10 18h4" /></svg>,
  heart: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z" /></svg>,
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>,
  minus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>,
  star: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" /></svg>,
  clock: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  fire: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s4 5 4 9a4 4 0 0 1-8 0c0-1 .5-2 .5-2S6 11 6 14a6 6 0 1 0 12 0c0-6-6-12-6-12Z" /></svg>,
  back: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>,
  share: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg>,
  check: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-11" /></svg>,
  bag: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 7h12l-1 13H7L6 7Z" /><path d="M9 7V5a3 3 0 0 1 6 0v2" /></svg>,
  home: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /></svg>,
  receipt: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v18l3-2 3 2 3-2 3 2 3-2V3" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>,
  user: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>,
  game: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 12h4M9 10v4M14 13h.01M16 11h.01" /><path d="M17 18a4 4 0 0 0 4-4 8 8 0 0 0-16 0 4 4 0 0 0 4 4 6 6 0 0 0 4-1 6 6 0 0 0 4 1Z" /></svg>,
  note: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h6M8 17h4" /></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>,
  tag: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.6 12.6 12 21l-9-9 8.4-8.4a2 2 0 0 1 1.5-.6H20a1 1 0 0 1 1 1v6.1a2 2 0 0 1-.4 1.5Z" /><circle cx="16" cy="8" r="1.2" fill="currentColor" /></svg>
};

// ─────────────────────────────────────────────────────────────
// 1) MENU — main customer screen after QR scan
// ─────────────────────────────────────────────────────────────
function ScreenMenu() {
  const cats = [
  { label: 'All', emoji: '✨', active: true },
  { label: 'Burgers', emoji: '🍔' },
  { label: 'Pizza', emoji: '🍕' },
  { label: 'Bowls', emoji: '🥗' },
  { label: 'Desserts', emoji: '🍰' }];

  const items = [
  { img: IMG.burger, name: 'Smash Beef Stack', rating: 4.9, prep: '12 min', price: 320, veg: false },
  { img: IMG.pasta, name: 'Truffle Carbonara', rating: 4.8, prep: '18 min', price: 460, veg: true },
  { img: IMG.poke, name: 'Salmon Poke Bowl', rating: 4.7, prep: '10 min', price: 380, veg: false },
  { img: IMG.ramen, name: 'Tonkotsu Ramen', rating: 4.9, prep: '15 min', price: 420, veg: false }];


  return (
    <div className="mob">
      <div className="mob-scroll">
        {/* Topbar */}
        <div className="cust-topbar">
          <div className="cust-loc">
            <div className="cust-loc__pin">{I.pin}</div>
            <div>
              <div className="cust-loc__label">Dining at</div>
              <div className="cust-loc__name">
                Olio Trattoria <span style={{ color: 'var(--muted-2)' }}>{I.chev}</span>
              </div>
            </div>
          </div>
          <div className="cust-icon-btn">{I.bell}<span className="dot"></span></div>
        </div>

        {/* Greet */}
        <div className="cust-greet">
          <h1>Hey Aanya — <em>scan, tap,</em> enjoy.</h1>
          <p style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <span className="table-chip">
              TABLE <span className="table-chip__num">T-12</span>
            </span>
            <span>· 4 guests · 7:42 PM</span>
          </p>
        </div>

        {/* Search */}
        <div className="cust-search">
          <span style={{ color: 'var(--muted-2)' }}>{I.search}</span>
          <input placeholder="Search dishes, ingredients…" />
          <span style={{ color: 'var(--brand)' }}>{I.filter}</span>
        </div>

        {/* Cats */}
        <div className="cust-cats">
          {cats.map((c) =>
          <div key={c.label} className={'cust-chip' + (c.active ? ' is-active' : '')}>
              <span className="cust-chip__ico">{c.emoji}</span>
              {c.label}
            </div>
          )}
        </div>

        {/* Promo */}
        <div className="promo">
          <span className="promo__tag">Chef's Special · Today</span>
          <h3 className="promo__title">Spicy Korean<br />Tonkotsu</h3>
          <p className="promo__sub">House broth, 20-hr cure, fresh nori</p>
          <span className="promo__btn">Order now →</span>
          <div className="promo__art" style={{ backgroundImage: `url(${IMG.ramen})` }}></div>
        </div>

        {/* Popular */}
        <div className="sect-head">
          <h2>Popular tonight</h2>
          <a href="#">See all</a>
        </div>
        <div className="food-row">
          {items.map((it) =>
          <div key={it.name} className="food-card">
              <div className="food-card__img" style={{ backgroundImage: `url(${it.img})` }}></div>
              <div className="food-card__heart">{I.heart}</div>
              <div className="food-card__title">{it.name}</div>
              <div className="food-card__meta">
                <span className={'veg-dot' + (it.veg ? '' : ' nonveg')}></span>
                <span style={{ color: '#F2A500' }}>{I.star}</span>
                <b style={{ color: 'var(--ink)' }}>{it.rating}</b>
                <span>·</span>
                {I.clock}{it.prep}
              </div>
              <div className="food-card__foot">
                <div className="food-card__price">₹{it.price}</div>
                <div className="food-card__add">{I.plus}</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ height: 90 }}></div>
      </div>

      {/* Tabbar */}
      <div className="tabbar">
        <div className="tabbar__item is-active">{I.home}<span>Menu</span></div>
        <div className="tabbar__item">{I.bag}</div>
        <div className="tabbar__item">{I.game}</div>
        <div className="tabbar__item">{I.receipt}</div>
        <div className="tabbar__item">{I.user}</div>
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────
// 2) DETAIL — food detail / customize
// ─────────────────────────────────────────────────────────────
function ScreenDetail() {
  return (
    <div className="mob">
      <div className="mob-scroll">
        {/* Hero */}
        <div className="detail-hero" style={{ backgroundImage: `url(${IMG.detail})` }}>
          <div className="detail-hero__top">
            <div className="detail-hero__btn">{I.back}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="detail-hero__btn" style={{ color: 'var(--brand)' }}>{I.heart}</div>
              <div className="detail-hero__btn">{I.share}</div>
            </div>
          </div>
          <div className="detail-hero__price">
            <span className="table-chip">TABLE <span className="table-chip__num">T-12</span></span>
          </div>
        </div>

        {/* Body */}
        <div className="detail-body">
          <div className="detail-title-row">
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span className="veg-dot nonveg"></span>
                <span style={{ font: '600 11px var(--sans)', color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Smash Burgers</span>
              </div>
              <h1>Smash Beef Stack</h1>
            </div>
            <div className="detail-price">₹320</div>
          </div>
          <div className="detail-meta">
            <span style={{ color: '#F2A500', display: 'flex', alignItems: 'center', gap: 4 }}>{I.star}<b>4.9</b></span>
            <span className="pip"></span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{I.clock}<b>12 min</b></span>
            <span className="pip"></span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--brand)' }}>{I.fire}<b>620 kcal</b></span>
          </div>

          <p className="detail-desc">
            Two 90-gram smash patties, melted cheddar, caramelised onions, house pickles, and our smoky burger sauce — stacked in a brioche bun toasted on the flat-top.
          </p>

          <div className="detail-section">
            <h3>Doneness</h3>
            <div className="opt-row">
              <div className="opt">Medium<span>Pink center</span></div>
              <div className="opt is-active">Med-Well<span>Just a hint</span></div>
              <div className="opt">Well<span>No pink</span></div>
            </div>
          </div>

          <div className="detail-section">
            <h3>Add-ons</h3>
            <div className="addon-row is-on">
              <div className="addon-row__l">
                <div className="addon-row__chk">{I.check}</div>
                <div>
                  <div className="addon-row__name">Extra cheese</div>
                  <div className="addon-row__price">Tillamook cheddar</div>
                </div>
              </div>
              <div className="addon-row__price">+ ₹60</div>
            </div>
            <div className="addon-row is-on">
              <div className="addon-row__l">
                <div className="addon-row__chk">{I.check}</div>
                <div>
                  <div className="addon-row__name">Crispy bacon</div>
                  <div className="addon-row__price">2 strips</div>
                </div>
              </div>
              <div className="addon-row__price">+ ₹80</div>
            </div>
            <div className="addon-row">
              <div className="addon-row__l">
                <div className="addon-row__chk"></div>
                <div>
                  <div className="addon-row__name">Truffle aioli</div>
                  <div className="addon-row__price">Black truffle, garlic</div>
                </div>
              </div>
              <div className="addon-row__price">+ ₹40</div>
            </div>
          </div>

          <div className="detail-section">
            <h3>Special note</h3>
            <div className="note-input">
              {I.note}
              <span className="ph">e.g. no onions, extra napkins…</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="cust-footer" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="qty-pill">
          <button>{I.minus}</button>
          <span className="qty-pill__n">2</span>
          <button className="plus">{I.plus}</button>
        </div>
        <button className="cta" style={{ flex: 1 }}>
          {I.bag} Add to bag · ₹780
        </button>
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────
// 3) CART — review + checkout
// ─────────────────────────────────────────────────────────────
function ScreenCart() {
  const items = [
  { img: IMG.burger, name: 'Smash Beef Stack', meta: 'Med-Well · +Cheese, Bacon', price: 460, qty: 2 },
  { img: IMG.ramen, name: 'Tonkotsu Ramen', meta: 'Extra noodles · No nori', price: 420, qty: 1 },
  { img: IMG.salad, name: 'Burrata Caprese', meta: 'Heirloom tomatoes', price: 380, qty: 1 }];


  return (
    <div className="mob">
      <div className="mob-scroll">
        <div className="cart-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="cust-icon-btn">{I.back}</div>
            <div>
              <h1>Your bag</h1>
              <div style={{ font: '500 12px var(--sans)', color: 'var(--muted)' }}>3 items · Table T-12</div>
            </div>
          </div>
          <div className="cust-icon-btn" style={{ color: 'var(--red)' }}>{I.trash}</div>
        </div>

        {items.map((it) =>
        <div key={it.name} className="cart-item">
            <div className="cart-item__img" style={{ backgroundImage: `url(${it.img})` }}></div>
            <div className="cart-item__body">
              <div className="cart-item__name">{it.name}</div>
              <div className="cart-item__meta">{it.meta}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                <div className="cart-item__price">₹{it.price * it.qty}</div>
                <div className="cart-item__qty">
                  <button>{I.minus}</button>
                  <span>{it.qty}</span>
                  <button style={{ background: 'var(--ink)', color: '#fff' }}>{I.plus}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coupon */}
        <div className="coupon">
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--brand)', color: '#fff', display: 'grid', placeItems: 'center' }}>{I.tag}</div>
          <div style={{ flex: 1 }}>
            <div className="coupon__b">FOODIE20 applied</div>
            <div className="coupon__s">20% off — saved ₹276</div>
          </div>
          <span style={{ color: 'var(--brand)' }}>{I.chev}</span>
        </div>

        {/* Special note */}
        <div className="note-input" style={{ background: 'var(--surface)' }}>
          {I.note}
          <span className="ph">Anything for the chef? Allergies, spice…</span>
        </div>

        {/* Bill */}
        <div className="bill-card">
          <div className="bill-row"><span>Subtotal</span><span>₹1,380</span></div>
          <div className="bill-row muted"><span>Discount (FOODIE20)</span><span style={{ color: 'var(--green)' }}>−₹276</span></div>
          <div className="bill-row muted"><span>CGST 2.5%</span><span>₹27.60</span></div>
          <div className="bill-row muted"><span>SGST 2.5%</span><span>₹27.60</span></div>
          <div className="bill-row total">
            <span>Total</span>
            <b>₹1,159</b>
          </div>
        </div>

        <div style={{ height: 110 }}></div>
      </div>

      <div className="cust-footer">
        <button className="cta full">
          Place order · Pay at counter
        </button>
      </div>
    </div>);

}

// ─────────────────────────────────────────────────────────────
// 4) ORDER TRACKING
// ─────────────────────────────────────────────────────────────
function ScreenTrack() {
  return (
    <div className="mob">
      <div className="mob-scroll">
        <div className="track-hero" style={{ width: "408px", backgroundColor: "rgb(0, 0, 0)" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div>
              <div className="track-hero__order">Order · ORD-2026-0042</div>
              <div className="track-hero__num"><span className="pulse"></span>Being prepared</div>
            </div>
            <div className="table-chip" style={{ background: 'rgba(255,255,255,.12)' }}>
              TABLE <span className="table-chip__num">T-12</span>
            </div>
          </div>
          <div style={{ marginTop: 18, position: 'relative', zIndex: 1 }}>
            <p className="track-hero__eta">Ready in <em>~ 9 minutes</em></p>
            <p className="track-hero__sub">Chef Marco is plating your Smash Beef Stack 🔥</p>
          </div>
        </div>

        {/* Steps */}
        <div className="track-steps">
          <div className="track-step is-done">
            <div className="track-step__bullet">{I.check}</div>
            <div className="track-step__body">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h4 className="track-step__t">Order received</h4>
                <span className="track-step__time">7:42 PM</span>
              </div>
              <p className="track-step__d">3 items · Confirmed at the bar</p>
            </div>
          </div>
          <div className="track-step is-done">
            <div className="track-step__bullet">{I.check}</div>
            <div className="track-step__body">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h4 className="track-step__t">KOT sent to kitchen</h4>
                <span className="track-step__time">7:43 PM</span>
              </div>
              <p className="track-step__d">Chef Marco picked it up</p>
            </div>
          </div>
          <div className="track-step is-now">
            <div className="track-step__bullet">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6" /></svg>
            </div>
            <div className="track-step__body">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h4 className="track-step__t">Preparing</h4>
                <span className="track-step__time">7:45 PM</span>
              </div>
              <p className="track-step__d">2 of 3 items already plated</p>
            </div>
          </div>
          <div className="track-step">
            <div className="track-step__bullet">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4" /></svg>
            </div>
            <div className="track-step__body">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h4 className="track-step__t">Served to your table</h4>
                <span className="track-step__time">~ 7:54 PM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Games unlock */}
        <div style={{ margin: '0 20px 12px', borderRadius: 'var(--r-3)', background: 'var(--surface)', border: '1px solid var(--hairline)', padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #FFB838, #FF4D3D)', display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 12h4M9 10v4M14 13h.01M16 11h.01" /><path d="M17 18a4 4 0 0 0 4-4 8 8 0 0 0-16 0 4 4 0 0 0 4 4 6 6 0 0 0 4-1 6 6 0 0 0 4 1Z" /></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ font: '800 14px var(--sans)' }}>While you wait — let's play 🎲</div>
            <div style={{ font: '500 12px var(--sans)', color: 'var(--muted)', marginTop: 2 }}>Trivia · Truth or Dare · Spin · with everyone at T-12</div>
          </div>
          <button style={{ background: 'var(--ink)', color: '#fff', border: 0, padding: '9px 14px', borderRadius: 999, font: '700 12px var(--sans)' }}>Play</button>
        </div>

        {/* Items snapshot */}
        <div style={{ margin: '0 20px 16px', borderRadius: 'var(--r-3)', background: 'var(--surface)', border: '1px solid var(--hairline)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ font: '700 13px var(--sans)' }}>Your order</div>
            <a href="#" style={{ font: '600 11px var(--sans)', color: 'var(--brand)', textDecoration: 'none' }}>View bill</a>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[IMG.burger, IMG.ramen, IMG.salad].map((src, i) =>
            <div key={i} style={{ width: 56, height: 56, borderRadius: 12, backgroundSize: 'cover', backgroundPosition: 'center', backgroundImage: `url(${src})` }}></div>
            )}
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ font: '500 11px var(--sans)', color: 'var(--muted)' }}>Total</div>
              <div style={{ font: '800 16px var(--sans)' }}>₹1,159</div>
            </div>
          </div>
        </div>

        <div style={{ height: 100 }}></div>
      </div>

      <div className="cust-footer" style={{ display: 'flex', gap: 10 }}>
        <button className="cta dark" style={{ flex: 1 }}>{I.receipt} Request bill</button>
        <button className="cta" style={{ background: 'var(--surface)', color: 'var(--ink)', boxShadow: 'var(--sh-2)' }}>
          Call server
        </button>
      </div>
    </div>);

}

Object.assign(window, { ScreenMenu, ScreenDetail, ScreenCart, ScreenTrack });