"use client";

interface CRMProps {
  breakdown: {
    total: number;
    newCount: number;
    returningCount: number;
    loyalCount: number;
    winBackReady: number;
  };
}

function UpArrow() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 15 6-6 6 6"/>
    </svg>
  );
}

export function CustomerCRM({ breakdown }: CRMProps) {
  const { total, newCount, returningCount, loyalCount, winBackReady } = breakdown;
  const newPct    = total > 0 ? Math.round((newCount / total) * 100) : 0;
  const returnPct = total > 0 ? Math.round((returningCount / total) * 100) : 0;
  const loyalPct  = total > 0 ? Math.round((loyalCount / total) * 100) : 0;

  return (
    <div className="card">
      <div className="card__h">
        <h3>Customers</h3>
        <a href="#">CRM →</a>
      </div>

      <div className="as-cohort__big">
        <div className="as-cohort__num">{total.toLocaleString("en-IN")}</div>
        <div className="as-cohort__lbl">Unique guests</div>
        <span className="as-delta up"><UpArrow /> {returnPct + loyalPct}%</span>
      </div>

      <div className="as-cohort__bar">
        <div className="as-cohort__seg" />
        <div className="as-cohort__seg" />
        <div className="as-cohort__seg" />
      </div>

      <div className="as-cohort__list">
        <div className="as-cohort__row">
          <span className="sw" />
          <div>
            <div className="as-cohort__name">New</div>
            <div className="as-cohort__sub">{newPct}% of total</div>
          </div>
          <div>
            <div className="as-cohort__count">{newCount}</div>
            <div className="as-delta up small"><UpArrow /> +{newPct}%</div>
          </div>
        </div>
        <div className="as-cohort__row">
          <span className="sw" />
          <div>
            <div className="as-cohort__name">Returning</div>
            <div className="as-cohort__sub">{returnPct}% of total</div>
          </div>
          <div>
            <div className="as-cohort__count">{returningCount}</div>
            <div className="as-delta up small"><UpArrow /> +{returnPct}%</div>
          </div>
        </div>
        <div className="as-cohort__row">
          <span className="sw" />
          <div>
            <div className="as-cohort__name">Loyal (5+)</div>
            <div className="as-cohort__sub">{loyalPct}% of total</div>
          </div>
          <div>
            <div className="as-cohort__count">{loyalCount}</div>
            <div className="as-delta up small"><UpArrow /> +{loyalPct}%</div>
          </div>
        </div>
      </div>

      {winBackReady > 0 && (
        <div className="as-cohort__cta">
          <div>
            <div>Win-back ready</div>
            <div>{winBackReady} guests inactive for 21+ days</div>
          </div>
          <button className="as-btn as-btn--primary as-btn--sm">Send offer</button>
        </div>
      )}
    </div>
  );
}
