import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../store/auth";
import { ActivityFeed } from "../components/Layout";
import { io } from "socket.io-client";
import { socketUrl } from "../services/api";
import type { Activity, Project, Task } from "../types";

export default function Dashboard() {
  const { user } = useAuth();

  const [data, setData] = useState<any>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/dashboard"),
      api.get("/activity/recent"),
    ])
      .then(([d, a]) => {
        setData(d.data);
        setActivities(a.data.activities || []);
      })
      .catch((err) => {
        console.error("Dashboard loading error:", err);
        setError("Unable to load dashboard.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const token = (window as any).__ACCESS_TOKEN__;
    if (!token) return;
    const s = io(socketUrl, { auth: { token }, withCredentials: true });
    s.on("activity:new", (a: Activity) => {
      setActivities((current) => {
        if (current.some((x) => x.id === a.id)) return current;
        return [a, ...current].slice(0, 20);
      });
    });
    s.on("connect_error", (e) => console.error("Dashboard socket error:", e.message));
    return () => { s.disconnect(); };
  }, []);

  if (loading) {
    return <div className="loading">Loading workspace…</div>;
  }

  if (error || !data) {
    return (
      <div className="content">
        <section className="card">
          <h2>Dashboard unavailable</h2>
          <p>{error || "No dashboard data received."}</p>
        </section>
      </div>
    );
  }

  const admin = user?.role === "ADMIN";
  const pm = user?.role === "PM";
  const developer = user?.role === "DEVELOPER";

  const projects = Array.isArray(data.projects)
    ? data.projects
    : [];

  const tasksByStatus = Array.isArray(data.tasksByStatus)
    ? data.tasksByStatus
    : [];

  const developerTasks = Array.isArray(data.tasks)
    ? data.tasks
    : [];

  return (
    <div className="content">
      <div className="welcome">
        <div>
          <span className="eyebrow">
            {user?.role}
          </span>

          <h2>
            Good to see you,{" "}
            {user?.name?.split(" ")[0] || "there"}.
          </h2>

          <p>
            Here’s what needs your attention today.
          </p>
        </div>
      </div>

      {admin && (
        <div className="metrics">
          <Metric
            label="Total projects"
            value={data.projects ?? 0}
          />

          <Metric
            label="Overdue tasks"
            value={data.overdue ?? 0}
            danger
          />

          <Metric
            label="To do"
            value={
              tasksByStatus.find(
                (x: any) => x.status === "TODO"
              )?._count || 0
            }
          />

          <Metric
            label="In review"
            value={
              tasksByStatus.find(
                (x: any) => x.status === "IN_REVIEW"
              )?._count || 0
            }
          />
        </div>
      )}

      {pm && (
        <div className="metrics">
          <Metric
            label="My projects"
            value={projects.length}
          />

          <Metric
            label="Tasks across projects"
            value={projects.reduce(
              (n: number, p: Project) =>
                n + (p._count?.tasks || 0),
              0
            )}
          />
        </div>
      )}

      {developer && (
        <div className="metrics">
          <Metric
            label="Assigned tasks"
            value={developerTasks.length}
          />

          <Metric
            label="In progress"
            value={developerTasks.filter(
              (t: Task) =>
                t.status === "IN_PROGRESS"
            ).length}
          />

          <Metric
            label="Overdue"
            value={developerTasks.filter(
              (t: Task) => t.isOverdue
            ).length}
            danger
          />
        </div>
      )}

      <div className="grid">
        <ActivityFeed items={activities} />

        <section className="card">
          <div className="card-title">
            <div>
              <span className="eyebrow">
                TODAY
              </span>

              <h2>
                {pm
                  ? "My projects"
                  : developer
                  ? "My tasks"
                  : "Project health"}
              </h2>
            </div>
          </div>

          {pm &&
            projects.map((p: Project) => (
              <div
                className="row"
                key={p.id}
              >
                <div>
                  <b>{p.name}</b>

                  <small>
                    {p.client?.name || "Client"} ·{" "}
                    {p._count?.tasks || 0} tasks
                  </small>
                </div>

                <span className="tag">
                  Active
                </span>
              </div>
            ))}

          {developer &&
            developerTasks
              .slice(0, 8)
              .map((t: Task) => (
                <div
                  className="row"
                  key={t.id}
                >
                  <div>
                    <b>{t.title}</b>

                    <small>
                      {t.project?.name}
                    </small>
                  </div>

                  <span
                    className={
                      "priority " +
                      t.priority.toLowerCase()
                    }
                  >
                    {t.priority}
                  </span>
                </div>
              ))}

          {admin &&
            tasksByStatus.map((x: any) => (
              <div
                className="row"
                key={x.status}
              >
                <div>
                  <b>
                    {x.status.replaceAll(
                      "_",
                      " "
                    )}
                  </b>

                  <small>Tasks</small>
                </div>

                <strong>
                  {x._count}
                </strong>
              </div>
            ))}
        </section>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: any;
  danger?: boolean;
}) {
  return (
    <div
      className={
        "metric " + (danger ? "danger" : "")
      }
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}