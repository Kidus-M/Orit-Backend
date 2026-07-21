"use client";

import Image from "next/image";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

type ConcernStatus = "new" | "in_progress" | "resolved";
type Concern = {
  id: string;
  memberName: string;
  memberEmail: string;
  message: string;
  status: ConcernStatus;
  adminNotes: string | null;
  createdAt: string;
};
type Order = {
  id: string;
  memberName: string;
  memberEmail: string;
  locationName: string;
  quantity: number;
  totalCents: number;
  paid: boolean;
  status: string;
  createdAt: string;
};
type Plan = {
  id: string;
  code: string;
  name: string;
  durationMonths: number;
  priceCents: number;
  isActive: boolean;
  activeMembers: number;
};
type MemberUser = {
  id: string;
  firstName: string;
  email: string;
  isVendor: boolean;
  createdAt: string;
};
type DashboardData = {
  summary: {
    newConcernCount: number;
    pendingOrderCount: number;
    activeMemberCount: number;
  };
  concerns: Concern[];
  orders: Order[];
  plans: Plan[];
  users: MemberUser[];
};
type Tab = "concerns" | "orders" | "memberships" | "users";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(result.error ?? "The request could not be completed.");
  }
  return result;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: ConcernStatus) {
  if (status === "in_progress") return "In progress";
  if (status === "resolved") return "Resolved";
  return "New";
}

export function AdminDashboard() {
  const [view, setView] = useState<"loading" | "login" | "dashboard">(
    "loading",
  );
  const [tab, setTab] = useState<Tab>("concerns");
  const [data, setData] = useState<DashboardData | null>(null);
  const [adminName, setAdminName] = useState("Admin");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");

  const loadDashboard = useCallback(async () => {
    const dashboard = await api<DashboardData>("/api/admin/dashboard");
    setData(dashboard);
  }, []);

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const session = await api<{ admin: { firstName: string } }>(
          "/api/admin/session",
        );
        if (!active) return;
        setAdminName(session.admin.firstName);
        await loadDashboard();
        if (active) setView("dashboard");
      } catch {
        if (active) setView("login");
      }
    }
    void initialize();
    return () => {
      active = false;
    };
  }, [loadDashboard]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ admin: { firstName: string } }>(
        "/api/admin/session",
        {
          method: "POST",
          body: JSON.stringify({
            email: String(form.get("email") ?? ""),
            pin: String(form.get("pin") ?? ""),
          }),
        },
      );
      setAdminName(result.admin.firstName);
      await loadDashboard();
      setView("dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed.");
    }
  }

  async function signOut() {
    await api("/api/admin/session", { method: "DELETE" });
    setData(null);
    setView("login");
  }

  async function updateConcern(
    concern: Concern,
    status: ConcernStatus,
    adminNotes: string,
  ) {
    setBusyId(concern.id);
    setError(null);
    try {
      await api(`/api/admin/concerns/${concern.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, adminNotes }),
      });
      await loadDashboard();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function updatePlan(
    plan: Plan,
    values: { priceCents?: number; isActive?: boolean },
  ) {
    setBusyId(plan.id);
    setError(null);
    try {
      await api(`/api/admin/membership-plans/${plan.id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      });
      await loadDashboard();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function updateVendor(user: MemberUser) {
    setBusyId(user.id);
    setError(null);
    try {
      await api("/api/admin/users/" + user.id + "/vendor", {
        method: "PATCH",
        body: JSON.stringify({ isVendor: !user.isVendor }),
      });
      await loadDashboard();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  }

  if (view === "loading") {
    return (
      <main className="admin-shell admin-shell--center">
        <p className="admin-loading">Opening the secure dashboard...</p>
      </main>
    );
  }

  if (view === "login") {
    return (
      <main className="admin-shell admin-shell--center">
        <section className="admin-login-card">
          <Image
            src="/app-icon.png"
            alt="Orit Tej"
            width={84}
            height={84}
            priority
          />
          <p className="eyebrow">Private access</p>
          <h1>Admin Dashboard</h1>
          <p>Sign in with an administrator account to continue.</p>
          <form onSubmit={signIn} className="admin-login-form">
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </label>
            <label>
              4-digit PIN
              <input
                name="pin"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                pattern="[0-9]{4}"
                maxLength={4}
                required
              />
            </label>
            <button className="button button--wine" type="submit">
              Sign in
            </button>
          </form>
          {error ? <p className="admin-error">{error}</p> : null}
        </section>
      </main>
    );
  }

  if (!data) return null;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    {
      id: "concerns",
      label: "Concerns",
      count: data.summary.newConcernCount,
    },
    { id: "orders", label: "Product Orders" },
    { id: "memberships", label: "Membership Programs" },
    { id: "users", label: "User Access" },
  ];
  const normalizedSearch = userSearch.trim().toLowerCase();
  const filteredUsers = data.users.filter(
    (user) =>
      normalizedSearch.length === 0 ||
      user.firstName.toLowerCase().includes(normalizedSearch) ||
      user.email.toLowerCase().includes(normalizedSearch),
  );

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div className="admin-brand">
          <Image src="/app-icon.png" alt="" width={54} height={54} />
          <div>
            <span>Orit Tej</span>
            <strong>Admin Dashboard</strong>
          </div>
        </div>
        <div className="admin-account">
          <span>Signed in as {adminName}</span>
          <button type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <section className="admin-workspace">
        <div className="admin-intro">
          <div>
            <p className="eyebrow">Operations</p>
            <h1>Good work starts with a clear view.</h1>
          </div>
          <div className="admin-summary" aria-label="Dashboard summary">
            <article>
              <strong>{data.summary.newConcernCount}</strong>
              <span>New concerns</span>
            </article>
            <article>
              <strong>{data.summary.pendingOrderCount}</strong>
              <span>Pending orders</span>
            </article>
            <article>
              <strong>{data.summary.activeMemberCount}</strong>
              <span>Active members</span>
            </article>
          </div>
        </div>

        <nav className="admin-tabs" aria-label="Dashboard sections">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? "is-active" : ""}
              onClick={() => setTab(item.id)}
            >
              {item.label}
              {item.count ? (
                <span className="admin-tab-badge">{item.count}</span>
              ) : null}
            </button>
          ))}
        </nav>

        {error ? <p className="admin-error">{error}</p> : null}

        {tab === "concerns" ? (
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <p className="eyebrow">Member support</p>
                <h2>Concerns and follow-ups</h2>
              </div>
              <span>{data.concerns.length} total</span>
            </div>
            <div className="concern-list">
              {data.concerns.length === 0 ? (
                <p className="admin-empty">No concerns have been submitted.</p>
              ) : (
                data.concerns.map((concern) => (
                  <ConcernCard
                    key={concern.id}
                    concern={concern}
                    busy={busyId === concern.id}
                    onSave={updateConcern}
                  />
                ))
              )}
            </div>
          </section>
        ) : null}

        {tab === "orders" ? (
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <p className="eyebrow">Fulfilment</p>
                <h2>Product orders</h2>
              </div>
              <span>{data.orders.length} total</span>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Pickup location</th>
                    <th>Quantity</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Placed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>{order.memberName}</strong>
                        <small>{order.memberEmail}</small>
                      </td>
                      <td>{order.locationName}</td>
                      <td>{order.quantity}</td>
                      <td>${(order.totalCents / 100).toFixed(2)}</td>
                      <td>
                        <span className={`status-chip status-chip--${order.status}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.orders.length === 0 ? (
                <p className="admin-empty">No product orders yet.</p>
              ) : null}
            </div>
          </section>
        ) : null}

        {tab === "users" ? (
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <p className="eyebrow">Access control</p>
                <h2>Members and vendors</h2>
              </div>
              <span>{filteredUsers.length} shown</span>
            </div>
            <label className="admin-user-search">
              Search users
              <input
                type="search"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Search by name or email"
              />
            </label>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Access</th>
                    <th>Joined</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.firstName}</strong>
                        <small>{user.email}</small>
                      </td>
                      <td>
                        <span className="status-chip">
                          {user.isVendor ? "Vendor" : "Customer"}
                        </span>
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className={
                            user.isVendor
                              ? "admin-secondary-action"
                              : "admin-primary-action"
                          }
                          disabled={busyId === user.id}
                          onClick={() => updateVendor(user)}
                        >
                          {busyId === user.id
                            ? "Saving..."
                            : user.isVendor
                              ? "Remove vendor access"
                              : "Make vendor"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 ? (
                <p className="admin-empty">No users match this search.</p>
              ) : null}
            </div>
          </section>
        ) : null}

        {tab === "memberships" ? (
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <p className="eyebrow">Programs</p>
                <h2>Membership programs</h2>
              </div>
              <span>{data.plans.length} plans</span>
            </div>
            <div className="plan-admin-grid">
              {data.plans.map((plan) => (
                <form
                  key={plan.id}
                  className="plan-admin-card"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    updatePlan(plan, {
                      priceCents: Math.round(
                        Number(form.get("price")) * 100,
                      ),
                    });
                  }}
                >
                  <div>
                    <span className="status-chip">
                      {plan.isActive ? "Active" : "Hidden"}
                    </span>
                    <strong>{plan.activeMembers} members</strong>
                  </div>
                  <h3>{plan.name}</h3>
                  <p>{plan.durationMonths} month program</p>
                  <label>
                    Price
                    <span className="price-input">
                      <span>$</span>
                      <input
                        name="price"
                        type="number"
                        min="0"
                        max="1000"
                        step="0.01"
                        defaultValue={(plan.priceCents / 100).toFixed(2)}
                      />
                    </span>
                  </label>
                  <div className="plan-actions">
                    <button
                      type="submit"
                      className="admin-primary-action"
                      disabled={busyId === plan.id}
                    >
                      Save price
                    </button>
                    <button
                      type="button"
                      className="admin-secondary-action"
                      disabled={busyId === plan.id}
                      onClick={() =>
                        updatePlan(plan, { isActive: !plan.isActive })
                      }
                    >
                      {plan.isActive ? "Hide plan" : "Activate plan"}
                    </button>
                  </div>
                </form>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function ConcernCard({
  concern,
  busy,
  onSave,
}: {
  concern: Concern;
  busy: boolean;
  onSave: (
    concern: Concern,
    status: ConcernStatus,
    notes: string,
  ) => Promise<void>;
}) {
  const [status, setStatus] = useState<ConcernStatus>(concern.status);
  const [notes, setNotes] = useState(concern.adminNotes ?? "");

  return (
    <article
      className={`concern-card concern-card--${concern.status}`}
    >
      <div className="concern-card__meta">
        <div>
          <strong>{concern.memberName}</strong>
          <a href={`mailto:${concern.memberEmail}`}>
            {concern.memberEmail}
          </a>
        </div>
        <div>
          <span className={`status-chip status-chip--${concern.status}`}>
            {statusLabel(concern.status)}
          </span>
          <time>{formatDate(concern.createdAt)}</time>
        </div>
      </div>
      <p className="concern-message">{concern.message}</p>
      <div className="concern-card__actions">
        <label>
          To-do status
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as ConcernStatus)
            }
          >
            <option value="new">New</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>
        <label className="concern-notes">
          Admin notes
          <input
            value={notes}
            maxLength={500}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional internal note"
          />
        </label>
        <button
          type="button"
          className="admin-primary-action"
          disabled={busy}
          onClick={() => onSave(concern, status, notes)}
        >
          {busy ? "Saving..." : "Save"}
        </button>
      </div>
    </article>
  );
}
