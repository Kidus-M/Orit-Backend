"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ClubApiError,
  clubApi,
  type ClubUser,
  type MembershipState,
} from "@/lib/web-app/api";
import {
  AgeDetails,
  ChangeEmail,
  ClubPrivacy,
  ClubSettings,
  ConcernForm,
  MessageCenter,
  PaymentOptions,
} from "./club-account";
import { ClubLogin, ClubSignup } from "./club-auth";
import {
  BottleIcon,
  GiftIcon,
  HomeIcon,
  LogoutIcon,
  MessageIcon,
  OrdersIcon,
  SettingsIcon,
} from "./club-icons";
import {
  MembershipEnrollment,
  MembershipOptions,
} from "./club-membership";
import {
  ActiveOrders,
  ClubDashboard,
  ClubOrderFlow,
  MembershipGift,
} from "./club-orders";
import { VendorOrder } from "./club-vendor";

const emptyMembership: MembershipState = {
  isMember: false,
  isNonMember: false,
  membership: null,
};

export function WineClubApp({ initialView }: { initialView: string }) {
  const router = useRouter();
  const [user, setUser] = useState<ClubUser>();
  const [membership, setMembership] = useState<MembershipState>(emptyMembership);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const navigate = useCallback(
    (view: string) => router.push(`/club/${view}`),
    [router],
  );

  const refreshAccount = useCallback(async () => {
    const [{ user: account }, membershipResult] = await Promise.all([
      clubApi<{ user: ClubUser }>("/api/account"),
      clubApi<MembershipState>("/api/membership").catch(() => emptyMembership),
    ]);
    setUser(account);
    setMembership(membershipResult);
    return { account, membership: membershipResult };
  }, []);

  const routeAfterAuthentication = useCallback(async () => {
    const result = await refreshAccount();
    if (!result.account.dateOfBirth) {
      navigate("age-details");
    } else if (result.account.isVendor) {
      navigate("vendor-order");
    } else if (!result.membership.isMember && !result.membership.isNonMember) {
      navigate("membership");
    } else {
      navigate("home");
    }
  }, [navigate, refreshAccount]);

  const updateAccount = useCallback(async () => {
    await refreshAccount();
  }, [refreshAccount]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      clubApi<{ user: ClubUser }>("/api/account"),
      clubApi<MembershipState>("/api/membership").catch(() => emptyMembership),
    ])
      .then(([{ user: account }, currentMembership]) => {
        if (cancelled) return;
        setUser(account);
        setMembership(currentMembership);
        if (["login", "signup"].includes(initialView)) {
          if (!account.dateOfBirth) navigate("age-details");
          else if (account.isVendor) navigate("vendor-order");
          else if (!currentMembership.isMember && !currentMembership.isNonMember) navigate("membership");
          else navigate("home");
        }
      })
      .catch((caught) => {
        if (cancelled) return;
        if (caught instanceof ClubApiError && caught.status === 401) {
          setUser(undefined);
          setMembership(emptyMembership);
          if (!["login", "signup", "privacy"].includes(initialView)) navigate("login");
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [initialView, navigate]);

  useEffect(() => {
    if (!user || user.isVendor) return;
    clubApi<{ unreadCount: number }>("/api/messages")
      .then((result) => setUnreadCount(result.unreadCount))
      .catch(() => undefined);
  }, [user, initialView]);

  async function logout() {
    await clubApi("/api/auth/logout", { method: "POST", body: JSON.stringify({}) }).catch(() => undefined);
    setUser(undefined);
    setMembership(emptyMembership);
    navigate("login");
  }

  if (loading) {
    return <main className="club-boot"><Image src="/orit-tej-bee.png" alt="" width={80} height={80} priority /><span>Opening your Wine Club…</span></main>;
  }

  if (!user) {
    if (initialView === "signup") return <ClubSignup navigate={navigate} onAuthenticated={routeAfterAuthentication} />;
    if (initialView === "privacy") return <PublicPrivacy navigate={navigate} />;
    return <ClubLogin navigate={navigate} onAuthenticated={routeAfterAuthentication} />;
  }

  const content = (() => {
    if (!user.dateOfBirth) return <AgeDetails onUpdated={updateAccount} />;
    if (user.isVendor) {
      switch (initialView) {
        case "settings": return <ClubSettings user={user} navigate={navigate} onDeleted={async () => { setUser(undefined); navigate("signup"); }} />;
        case "email": return <ChangeEmail user={user} onUpdated={updateAccount} navigate={navigate} />;
        case "payment-options": return <PaymentOptions navigate={navigate} />;
        case "help": return <ConcernForm navigate={navigate} />;
        case "privacy": return <ClubPrivacy navigate={navigate} authenticated />;
        default: return <VendorOrder />;
      }
    }

    switch (initialView) {
      case "membership": return <MembershipEnrollment navigate={navigate} onUpdated={updateAccount} />;
      case "order": return <ClubOrderFlow membership={membership} user={user} navigate={navigate} />;
      case "orders": return <ActiveOrders user={user} navigate={navigate} />;
      case "benefits": return membership.isMember ? <MembershipGift /> : <ClubDashboard membership={membership} navigate={navigate} />;
      case "messages": return <MessageCenter />;
      case "settings": return <ClubSettings user={user} navigate={navigate} onDeleted={async () => { setUser(undefined); navigate("signup"); }} />;
      case "email": return <ChangeEmail user={user} onUpdated={updateAccount} navigate={navigate} />;
      case "membership-options": return <MembershipOptions membership={membership} onUpdated={updateAccount} />;
      case "payment-options": return <PaymentOptions navigate={navigate} />;
      case "help": return <ConcernForm navigate={navigate} />;
      case "privacy": return <ClubPrivacy navigate={navigate} authenticated />;
      default: return !membership.isMember && !membership.isNonMember ? <MembershipEnrollment navigate={navigate} onUpdated={updateAccount} /> : <ClubDashboard membership={membership} navigate={navigate} />;
    }
  })();

  return (
    <div className="club-app">
      <aside className="club-sidebar">
        <Link className="club-sidebar__brand" href="/download"><Image src="/orit-tej-bee.png" alt="" width={52} height={52} priority /><span><strong>Orit Tej</strong><small>Wine Club</small></span></Link>
        <nav aria-label="Wine Club navigation">
          {user.isVendor ? (
            <>
              <ClubNav active={initialView === "vendor-order"} icon={<BottleIcon />} label="Order Cases" onClick={() => navigate("vendor-order")} />
              <ClubNav active={initialView === "settings"} icon={<SettingsIcon />} label="Settings" onClick={() => navigate("settings")} />
            </>
          ) : (
            <>
              <ClubNav active={initialView === "home"} icon={<HomeIcon />} label="Home" onClick={() => navigate("home")} />
              <ClubNav active={initialView === "order"} icon={<BottleIcon />} label="Create order" onClick={() => navigate("order")} />
              <ClubNav active={initialView === "orders"} icon={<OrdersIcon />} label="Active orders" onClick={() => navigate("orders")} />
              {membership.isMember ? <ClubNav active={initialView === "benefits"} icon={<GiftIcon />} label="Membership gifts" onClick={() => navigate("benefits")} /> : null}
              <ClubNav active={initialView === "messages"} icon={<MessageIcon />} label="Messages" badge={unreadCount} onClick={() => navigate("messages")} />
              <ClubNav active={initialView === "settings"} icon={<SettingsIcon />} label="Settings" onClick={() => navigate("settings")} />
            </>
          )}
        </nav>
        <div className="club-sidebar__account"><span>{user.firstName.slice(0, 1).toUpperCase()}</span><div><strong>{user.firstName}</strong><small>{user.email}</small></div></div>
        <button className="club-sidebar__logout" type="button" onClick={logout}><LogoutIcon />Sign out</button>
      </aside>
      <header className="club-mobile-header"><Link href="/download"><Image src="/orit-tej-bee.png" alt="" width={42} height={42} priority /><strong>Orit Tej</strong></Link><div>{!user.isVendor ? <button type="button" aria-label="Open messages" onClick={() => navigate("messages")}><MessageIcon />{unreadCount ? <b>{unreadCount}</b> : null}</button> : null}<button type="button" aria-label="Open settings" onClick={() => navigate("settings")}><SettingsIcon /></button></div></header>
      <main id="main-content" className="club-main">{content}</main>
      <nav className="club-mobile-nav" aria-label="Wine Club mobile navigation">
        <button type="button" onClick={() => navigate(user.isVendor ? "vendor-order" : "home")}><HomeIcon /><span>Home</span></button>
        {!user.isVendor ? <><button type="button" onClick={() => navigate("order")}><BottleIcon /><span>Order</span></button><button type="button" onClick={() => navigate("orders")}><OrdersIcon /><span>Orders</span></button></> : null}
        <button type="button" onClick={() => navigate("settings")}><SettingsIcon /><span>Settings</span></button>
      </nav>
    </div>
  );
}

function ClubNav({ active, icon, label, badge, onClick }: { active: boolean; icon: React.ReactNode; label: string; badge?: number; onClick: () => void }) {
  return <button className={active ? "is-active" : ""} type="button" onClick={onClick}>{icon}<span>{label}</span>{badge ? <b>{badge}</b> : null}</button>;
}

function PublicPrivacy({ navigate }: { navigate: (view: string) => void }) {
  return <main className="club-public club-public--policy"><Link className="club-public__brand" href="/"><Image src="/orit-tej-bee.png" alt="" width={56} height={56} priority /><span><strong>Orit Tej</strong><small>Wine Club</small></span></Link><div className="club-public__panel club-public__panel--wide"><ClubPrivacy navigate={navigate} authenticated={false} /></div></main>;
}
