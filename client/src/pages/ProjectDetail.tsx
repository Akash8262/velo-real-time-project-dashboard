import { useEffect, useState } from "react";
import { api, socketUrl } from "../services/api";
import { io } from "socket.io-client";
import type {
  Activity,
  Project,
  Status,
  Task,
} from "../types";

export default function ProjectDetail({
  id,
  onBack,
}: {
  id: string;
  onBack: () => void;
}) {
  const [project, setProject] = useState<Project | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    let mounted = true;

    // Load project + activity history
    Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/activity/project/${id}`),
    ])
      .then(([p, a]) => {
        if (!mounted) return;

        setProject(p.data.project);
        setActivities(a.data.activities || []);
      })
      .catch((err) => {
        console.error("Failed to load project:", err);
      });

    const token = (window as any).__ACCESS_TOKEN__;

    if (!token) {
      console.error("No access token available for Socket.IO");

      return () => {
        mounted = false;
      };
    }

    // -----------------------------------------
    // SOCKET.IO CONNECTION
    // -----------------------------------------

    const s = io(socketUrl, {
      auth: {
        token,
      },
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    // Socket connected
    s.on("connect", () => {
      console.log("🟢 Socket connected:", s.id);

      // IMPORTANT:
      // Join project room only AFTER socket connects.
      s.emit("project:join", id);

      console.log(
        "📥 Requested project room:",
        `project:${id}`
      );
    });

    // Connection error
    s.on("connect_error", (error) => {
      console.error(
        "❌ Socket connection error:",
        error.message
      );
    });

    // Socket disconnected
    s.on("disconnect", (reason) => {
      console.log(
        "🔴 Socket disconnected:",
        reason
      );
    });

    // -----------------------------------------
    // REAL-TIME ACTIVITY
    // -----------------------------------------

    s.on("activity:new", (a: Activity) => {
      console.log("📢 REALTIME ACTIVITY RECEIVED:", a);

      if (!mounted) return;

      // Add new activity to top
      setActivities((current) => {
        // Prevent duplicate activity
        if (
          current.some(
            (existing) => existing.id === a.id
          )
        ) {
          return current;
        }

        return [a, ...current].slice(0, 20);
      });

      // Update task status immediately
      setProject((currentProject) => {
        if (!currentProject) {
          return currentProject;
        }

        return {
          ...currentProject,

          tasks: currentProject.tasks?.map((task) =>
            task.id === a.taskId && a.newStatus
              ? {
                  ...task,
                  status: a.newStatus,
                }
              : task
          ),
        };
      });
    });

    // -----------------------------------------
    // CLEANUP
    // -----------------------------------------

    return () => {
      mounted = false;

      console.log(
        "👋 Leaving project:",
        id
      );

      s.emit("project:leave", id);

      s.disconnect();
    };
  }, [id]);

  // -----------------------------------------
  // LOADING
  // -----------------------------------------

  if (!project) {
    return (
      <div className="loading">
        Loading project…
      </div>
    );
  }

  // -----------------------------------------
  // FILTER TASKS
  // -----------------------------------------

  const tasks = (project.tasks || []).filter(
    (t) =>
      filter === "ALL" ||
      t.status === filter
  );

  // -----------------------------------------
  // UPDATE TASK
  // -----------------------------------------

  const update = async (
    t: Task,
    status: Status
  ) => {
    try {
      await api.patch(`/tasks/${t.id}`, {
        status,
      });

      // Update local UI immediately
      setProject((currentProject) => {
        if (!currentProject) {
          return currentProject;
        }

        return {
          ...currentProject,

          tasks: currentProject.tasks?.map(
            (task) =>
              task.id === t.id
                ? {
                    ...task,
                    status,
                  }
                : task
          ),
        };
      });
    } catch (err) {
      console.error(
        "Failed to update task:",
        err
      );
    }
  };

  // -----------------------------------------
  // UI
  // -----------------------------------------

  return (
    <div className="content">
      <button
        className="back"
        onClick={onBack}
      >
        ← All projects
      </button>

      <div className="page-head">
        <div>
          <span className="eyebrow">
            PROJECT
          </span>

          <h2>{project.name}</h2>

          <p>{project.description}</p>
        </div>

        <span className="tag">
          {project.client?.name}
        </span>
      </div>

      <div className="filterbar">
        <span>Filter</span>

        {[
          "ALL",
          "TODO",
          "IN_PROGRESS",
          "IN_REVIEW",
          "DONE",
        ].map((x) => (
          <button
            className={
              filter === x ? "active" : ""
            }
            onClick={() => setFilter(x)}
            key={x}
          >
            {x.replaceAll("_", " ")}
          </button>
        ))}
      </div>

      <div className="grid project-detail">

        {/* TASKS */}
        <section className="card">
          <div className="card-title">
            <div>
              <span className="eyebrow">
                TASKS
              </span>

              <h2>Project work</h2>
            </div>

            <span>
              {tasks.length} shown
            </span>
          </div>

          {tasks.length ? (
            tasks.map((t) => (
              <div
                className="task"
                key={t.id}
              >
                <div className="task-main">
                  <div className="task-check">
                    {t.status === "DONE"
                      ? "✓"
                      : "•"}
                  </div>

                  <div>
                    <b>{t.title}</b>

                    <p>
                      {t.description}
                    </p>

                    <small>
                      {t.developer?.name ||
                        "Unassigned"}{" "}
                      · Due{" "}
                      {new Date(
                        t.dueDate
                      ).toLocaleDateString()}
                    </small>

                    {t.isOverdue && (
                      <small className="overdue">
                        Overdue
                      </small>
                    )}
                  </div>
                </div>

                <div className="task-meta">
                  <span
                    className={
                      "priority " +
                      t.priority.toLowerCase()
                    }
                  >
                    {t.priority}
                  </span>

                  <select
                    value={t.status}
                    onChange={(e) =>
                      update(
                        t,
                        e.target
                          .value as Status
                      )
                    }
                  >
                    <option value="TODO">
                      To Do
                    </option>

                    <option value="IN_PROGRESS">
                      In Progress
                    </option>

                    <option value="IN_REVIEW">
                      In Review
                    </option>

                    <option value="DONE">
                      Done
                    </option>
                  </select>
                </div>
              </div>
            ))
          ) : (
            <div className="empty">
              No tasks found.
            </div>
          )}
        </section>

        {/* ACTIVITY */}
        <section className="card">
          <div className="card-title">
            <div>
              <span className="eyebrow">
                HISTORY
              </span>

              <h2>Recent activity</h2>
            </div>
          </div>

          {activities.length ? (
            activities.map((a) => {
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
                <div
                  className="activity compact"
                  key={a.id}
                >
                  <div className="activity-avatar">
                    {a.user?.name?.charAt(0) ||
                      "U"}
                  </div>

                  <div>
                    <b>
                      {a.user?.name ||
                        "User"}
                    </b>

                    <div>
                      {oldStatus}

                      <span> → </span>

                      {newStatus}
                    </div>

                    {a.message && (
                      <small>
                        {a.message}
                      </small>
                    )}

                    <small>
                      {new Date(
                        a.createdAt
                      ).toLocaleString()}
                    </small>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty">
              No activity yet.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}