import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { Project } from "../types";

export default function Projects({
  onOpen,
}: {
  onOpen: (id: string) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    api
      .get("/projects")
      .then((r) => setProjects(r.data.projects))
      .catch((error) => {
        console.error("Failed to load projects:", error);
      });
  }, []);

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <span className="eyebrow">DELIVERY</span>
          <h2>Projects</h2>
          <p>Track client work and task progress.</p>
        </div>
      </div>

      <div className="project-grid">
        {projects.map((p) => (
          <button
            className="project-card"
            onClick={() => onOpen(p.id)}
            key={p.id}
          >
            <div className="project-icon">{p.name.charAt(0)}</div>

            <div>
              <h3>{p.name}</h3>

              <p>{p.description}</p>

              <small>
                {p.client?.name || "Client"} ·{" "}
                {p.taskCount ?? p._count?.tasks ?? 0} tasks
              </small>
            </div>

            <span>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}