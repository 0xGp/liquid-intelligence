import { projects } from '../data'
import ProjectVisual from './ProjectVisual'

export default function UseCases() {
  return (
    <section className="work-section" id="work">
      <div className="work-head">
        <div>
          <div className="eyebrow-num">Use cases</div>
          <h2 className="section-title">
            Where agents
            <br />
            transact with agents.
          </h2>
        </div>
        <p>
          Vince sits between agents as a metered pipe — every call is priced, authorized, and settled before the
          response leaves the wire.
        </p>
      </div>

      {projects.map((project) => (
        <div className="project" data-hover key={project.title}>
          <div className="project-info">
            <div className="project-meta">
              {project.meta.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
            <div className="project-title">{project.title}</div>
            <div className="project-desc">{project.desc}</div>
          </div>
          <div className="project-visual">
            <div className="plate" style={{ background: '#0a0a0a' }}>
              <ProjectVisual type={project.visual} />
            </div>
          </div>
        </div>
      ))}
    </section>
  )
}
