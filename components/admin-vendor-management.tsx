"use client";

import { FormEvent, useState } from "react";

export type AdminVendorInvitation = {
  id: string;
  code: string | null;
  status: "pending" | "claimed" | "revoked";
  vendorId: string | null;
  businessName: string | null;
  businessEmail: string | null;
  createdAt: string;
};

export type AdminVendor = {
  id: string;
  firstName: string;
  email: string;
  isVendor: boolean;
};

export type AdminLocation = {
  id: string;
  vendorId: string | null;
  vendorName: string | null;
  vendorEmail: string | null;
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  hoursText: string;
  bottlePriceCents: number;
  stockQuantity: number;
  casePriceCents: number;
  transportationFeeCents: number;
  inStock: boolean;
  active: boolean;
  createdAt: string;
};

type Props = {
  invitations: AdminVendorInvitation[];
  vendors: AdminVendor[];
  locations: AdminLocation[];
  onChanged: () => Promise<void>;
  onError: (message: string | null) => void;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(result.error ?? "The request could not be completed.");
  }
  return result;
}

function moneyInput(cents: number) {
  return (cents / 100).toFixed(2);
}

export function AdminVendorManagement({
  invitations,
  vendors,
  locations,
  onChanged,
  onError,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [visibleCodes, setVisibleCodes] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<AdminLocation | null>(null);

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("invitation");
    onError(null);
    try {
      await api("/api/admin/vendor-code", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setCode("");
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Invitation failed.");
    } finally {
      setBusy(null);
    }
  }

  async function revokeInvitation(invitation: AdminVendorInvitation) {
    setBusy(invitation.id);
    onError(null);
    try {
      await api(`/api/admin/vendor-code/${invitation.id}`, {
        method: "DELETE",
      });
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Revoke failed.");
    } finally {
      setBusy(null);
    }
  }

  async function releaseInvitation(invitation: AdminVendorInvitation) {
    const vendorLabel =
      invitation.businessName ?? invitation.businessEmail ?? "this vendor";
    if (
      !window.confirm(
        `Remove ${vendorLabel} from this code? Their vendor access will end, linked locations will become unassigned, and the code will be available again.`,
      )
    ) {
      return;
    }
    const busyKey = `release-${invitation.id}`;
    setBusy(busyKey);
    onError(null);
    try {
      await api(`/api/admin/vendor-code/${invitation.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "pending" }),
      });
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Release failed.");
    } finally {
      setBusy(null);
    }
  }

  async function saveLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const serviceCode = String(form.get("serviceCode") ?? "").trim();
    const values = {
      vendorId: String(form.get("vendorId") ?? "") || null,
      name: String(form.get("name") ?? ""),
      addressLine1: String(form.get("addressLine1") ?? ""),
      city: String(form.get("city") ?? ""),
      state: String(form.get("state") ?? ""),
      postalCode: String(form.get("postalCode") ?? ""),
      hoursText: String(form.get("hoursText") ?? ""),
      bottlePriceCents: Math.round(Number(form.get("bottlePrice")) * 100),
      stockQuantity: Math.round(Number(form.get("stockQuantity"))),
      casePriceCents: Math.round(Number(form.get("casePrice")) * 100),
      transportationFeeCents: Math.round(
        Number(form.get("transportationFee")) * 100,
      ),
      active: form.get("active") === "on",
      ...(serviceCode ? { serviceCode } : {}),
    };
    setBusy(editing?.id ?? "new-location");
    onError(null);
    try {
      await api(
        editing ? `/api/admin/locations/${editing.id}` : "/api/admin/locations",
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify(values),
        },
      );
      setEditing(null);
      formElement.reset();
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Location save failed.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteLocation(location: AdminLocation) {
    if (
      !window.confirm(
        `Delete ${location.name}? It will disappear from the customer app and admin location list. Existing order history will be preserved.`,
      )
    ) {
      return;
    }
    const busyKey = `delete-${location.id}`;
    setBusy(busyKey);
    onError(null);
    try {
      await api(`/api/admin/locations/${location.id}`, {
        method: "DELETE",
      });
      if (editing?.id === location.id) setEditing(null);
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setBusy(null);
    }
  }

  function toggleCode(id: string) {
    setVisibleCodes((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="admin-vendor-management">
      <section className="admin-subpanel">
        <div className="admin-subpanel-heading">
          <div>
            <p className="eyebrow">Vendor invitations</p>
            <h3>New Vendor</h3>
          </div>
          <span>{invitations.length} codes</span>
        </div>
        <form className="admin-vendor-code" onSubmit={createInvitation}>
          <div>
            <strong>One-time vendor code</strong>
            <span>Give this code to one vendor. Release a claimed code to reuse it.</span>
          </div>
          <input
            name="code"
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            placeholder="4-digit code"
            aria-label="New vendor code"
            required
          />
          <button
            type="submit"
            className="admin-primary-action"
            disabled={busy === "invitation"}
          >
            {busy === "invitation" ? "Creating..." : "Create Vendor Code"}
          </button>
        </form>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Status</th>
                <th>Vendor</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((invitation) => {
                const visible = visibleCodes.has(invitation.id);
                return (
                  <tr key={invitation.id}>
                    <td>
                      <strong className="admin-code-value">
                        {visible ? invitation.code ?? "Unavailable" : "••••"}
                      </strong>
                    </td>
                    <td>
                      <span className={`status-chip status-chip--${invitation.status}`}>
                        {invitation.status}
                      </span>
                    </td>
                    <td>
                      {invitation.businessName ? (
                        <>
                          <strong>{invitation.businessName}</strong>
                          <small>{invitation.businessEmail}</small>
                        </>
                      ) : (
                        <span>Waiting for signup</span>
                      )}
                    </td>
                    <td className="admin-row-actions">
                      <button
                        type="button"
                        className="admin-secondary-action"
                        onClick={() => toggleCode(invitation.id)}
                      >
                        {visible ? "Hide" : "Show"}
                      </button>
                      {invitation.status === "pending" ? (
                        <button
                          type="button"
                          className="admin-secondary-action"
                          disabled={busy === invitation.id}
                          onClick={() => revokeInvitation(invitation)}
                        >
                          {busy === invitation.id ? "Revoking..." : "Revoke"}
                        </button>
                      ) : null}
                      {invitation.status === "claimed" ? (
                        <button
                          type="button"
                          className="admin-danger-action"
                          disabled={busy === `release-${invitation.id}`}
                          onClick={() => releaseInvitation(invitation)}
                        >
                          {busy === `release-${invitation.id}`
                            ? "Releasing..."
                            : "Release Vendor"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {invitations.length === 0 ? (
            <p className="admin-empty">No vendor codes have been created.</p>
          ) : null}
        </div>
      </section>

      <section className="admin-subpanel">
        <div className="admin-subpanel-heading">
          <div>
            <p className="eyebrow">Customer pickup network</p>
            <h3>{editing ? "Edit Location" : "Add Location"}</h3>
          </div>
          <span>{locations.filter((location) => location.active).length} visible</span>
        </div>
        <form
          key={editing?.id ?? "new"}
          className="admin-location-form"
          onSubmit={saveLocation}
        >
          <label>
            Vendor
            <select name="vendorId" defaultValue={editing?.vendorId ?? ""}>
              <option value="">Orit Tej / unassigned</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.firstName} — {vendor.email}
                </option>
              ))}
            </select>
          </label>
          <label>
            Location name
            <input name="name" defaultValue={editing?.name} maxLength={120} required />
          </label>
          <label className="admin-location-form__wide">
            Street address
            <input
              name="addressLine1"
              defaultValue={editing?.addressLine1}
              maxLength={180}
              required
            />
          </label>
          <label>
            City
            <input name="city" defaultValue={editing?.city} maxLength={100} required />
          </label>
          <label>
            State
            <input name="state" defaultValue={editing?.state} maxLength={60} required />
          </label>
          <label>
            ZIP code
            <input
              name="postalCode"
              defaultValue={editing?.postalCode}
              maxLength={20}
              required
            />
          </label>
          <label className="admin-location-form__wide">
            Pickup hours
            <input
              name="hoursText"
              defaultValue={editing?.hoursText}
              maxLength={240}
              placeholder="Monday-Sunday, 5:30 PM-9:00 PM"
              required
            />
          </label>
          <label>
            Bottle price
            <input
              name="bottlePrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={moneyInput(editing?.bottlePriceCents ?? 1898)}
              required
            />
          </label>
          <label>
            Bottle stock
            <input
              name="stockQuantity"
              type="number"
              min="0"
              step="1"
              defaultValue={editing?.stockQuantity ?? 24}
              required
            />
          </label>
          <label>
            Case price
            <input
              name="casePrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={moneyInput(editing?.casePriceCents ?? 8500)}
              required
            />
          </label>
          <label>
            Transportation fee
            <input
              name="transportationFee"
              type="number"
              min="0"
              step="0.01"
              defaultValue={moneyInput(editing?.transportationFeeCents ?? 5000)}
              required
            />
          </label>
          <label>
            Service code
            <input
              name="serviceCode"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              placeholder={editing ? "Leave blank to keep current" : "4 digits"}
              required={!editing}
            />
          </label>

          <label className="admin-check-field">
            <input name="active" type="checkbox" defaultChecked={editing?.active ?? false} />
            Visible to customers
          </label>
          <div className="admin-location-form__actions">
            <button
              type="submit"
              className="admin-primary-action"
              disabled={busy === (editing?.id ?? "new-location")}
            >
              {busy === (editing?.id ?? "new-location") ? "Saving..." : "Save Location"}
            </button>
            {editing ? (
              <button
                type="button"
                className="admin-secondary-action"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Location</th>
                <th>Vendor</th>
                <th>Customer access</th>
                <th>Stock</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((location) => (
                <tr key={location.id}>
                  <td>
                    <strong>{location.name}</strong>
                    <small>
                      {location.addressLine1}, {location.city}, {location.state} {location.postalCode}
                    </small>
                  </td>
                  <td>
                    <strong>{location.vendorName ?? "Unassigned"}</strong>
                    {location.vendorEmail ? <small>{location.vendorEmail}</small> : null}
                  </td>
                  <td>
                    <span className={`status-chip status-chip--${location.active ? "completed" : "revoked"}`}>
                      {location.active ? "Visible" : "Hidden"}
                    </span>
                  </td>
                  <td>
                    {location.stockQuantity > 0
                      ? `${location.stockQuantity} bottles`
                      : "Out of stock (0 bottles)"}
                  </td>
                  <td className="admin-row-actions">
                    <button
                      type="button"
                      className="admin-secondary-action"
                      onClick={() => setEditing(location)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin-danger-action"
                      disabled={busy === `delete-${location.id}`}
                      onClick={() => deleteLocation(location)}
                    >
                      {busy === `delete-${location.id}`
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
