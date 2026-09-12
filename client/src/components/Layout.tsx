import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { socketUrl } from "../services/api";
import { useAuth } from "../store/auth";
import type { Activity, Notification } from "../types";

export function Layout({
  children,
  onLogout,
}: {
  children: React.ReactNode;
  onLogout: () => void;
}) {
  const { user } = useAuth();

  const [online, setOnline] = useState(0);
  const [notes, setNotes] = useState<Notification[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    import("../services/api").then(({ api }) => {
      api
        .get("/notifications")
        .then((r) => setNotes(r.data.notifications))
        .catch(() => {});
    });

    const token = (window as any).__ACCESS_TOKEN__;

    if (!token) {
      return;
    }

    const s = io(socketUrl, {
      auth: {
        token,
      },
    });

    s.on("presence:count", (count: number) => {
      setOnline(count);
    });

    s.on(`notification:${user.id}`, (n: Notification) => {
      setNotes((x) => [n, ...x]);
    });

    s.on("activity:new", (a: Activity) => {
      setActivity((x) => [a, ...x].slice(0, 20));
    });

    return () => {
      s.disconnect();
    };
  }, [user]);

  if (!user) {
    return <>{children}</>;
  }

  const unread = notes.filter((n) => !n.read).length;

  const handleLogout = () => {
    onLogout();
  };

  return (
    <div className="app">
      <aside>
        <div className="brand">
          <span className="brandmark">V</span>

          <div>
            <b>VELO</b>
            <small>PROJECT OPS</small>
          </div>
        </div>

        <div className="profile">
          <div className="avatar">
            {user.name?.charAt(0) || "U"}
          </div>

          <div>
            <strong>{user.name}</strong>
            <span>
              {user.role === "PM" ? "Project Manager" : user.role}
            </span>
          </div>
        </div>

        <div className="side-status">
          <span className="dot" /> {online} online now
        </div>

        <button
          className="sidebar-logout"
          type="button"
          onClick={handleLogout}
        >
          <span>↪</span> Sign out
        </button>
      </aside>

      <main>
        <header>
          <div>
            <span className="eyebrow">WORKSPACE</span>
            <h1>Client Project Dashboard</h1>
          </div>

          <div className="header-actions">
            <button
              className="icon-btn"
              type="button"
              onClick={() => setOpen(!open)}
              aria-label="Notifications"
            >
              🔔
              {unread > 0 && <i>{unread}</i>}
            </button>

            <button
              className="ghost logout-btn"
              type="button"
              onClick={handleLogout}
            >
              Sign out
            </button>
          </div>
        </header>

        {open && (
          <div className="notifications">
            <div className="notif-head">
              <b>Notifications</b>
              <span>{unread} unread</span>
            </div>

            {notes.length ? (
              notes.slice(0, 8).map((n) => (
                <div
                  className={`notif ${!n.read ? "unread" : ""}`}
                  key={n.id}
                >
                  {n.message}

                  <small>
                    {new Date(n.createdAt).toLocaleString()}
                  </small>
                </div>
              ))
            ) : (
              <p>No notifications.</p>
            )}
          </div>
        )}

        {children}
      </main>
    </div>
  );
}

export function ActivityFeed({
  items,
}: {
  items: Activity[];
}) {
  return (
    <section className="card">
      <div className="card-title">
        <div>
          <span className="eyebrow">LIVE</span>
          <h2>Activity feed</h2>
        </div>

        <span className="live-pill">
          <span className="dot" /> realtime
        </span>
      </div>

      {items.length ? (
        items.map((a) => {
          const oldStatus = (
            a.oldStatus ??
            a.fromStatus ??
            "TODO"
          ).replaceAll("_", " ");

          const newStatus = (
            a.newStatus ??
            a.toStatus ??
            "TODO"
          ).replaceAll("_", " ");

          return (
            <div className="activity" key={a.id}>
              <div className="activity-avatar">
                {a.user?.name?.charAt(0) || "U"}
              </div>

              <div>
                <b>{a.user?.name || "User"}</b>{" "}
                moved{" "}
                <strong>{a.task?.title || "a task"}</strong>

                <div className="change">
                  {oldStatus}
                  <span>→</span>
                  {newStatus}
                </div>

                {a.message && (
                  <div className="activity-message">
                    {a.message}
                  </div>
                )}

                <small>
                  {new Date(a.createdAt).toLocaleString()}
                </small>
              </div>
            </div>
          );
        })
      ) : (
        <div className="empty">No live events yet.</div>
      )}
    </section>
  );
}