import { skills } from '../../data/content.js';
import { SectionLabel } from '../ui/SectionLabel.jsx';

export function Skills() {
  return (
    <section id="skills">
      <SectionLabel>03 — Навыки</SectionLabel>
      <div className="skills-heading reveal"><span>EXPERTISE / SELECTED FIELDS</span><h2>Три дисциплины.<br /><em>Один метод.</em></h2></div>
      <div className="skills-grid">
        {skills.map((skill, index) => (
          <article className="skill-card" style={{ transitionDelay: `${index * .09 + .04}s` }} key={skill.code}>
            <div className="skill-count">0{index + 1}</div><div className="skill-icon">{skill.code}</div>
            <h2 className="skill-title">{skill.title}</h2><p className="skill-desc">{skill.description}</p>
            <div className="skill-tags">{skill.tags.map(tag => <span className="skill-tag" key={tag}>{tag}</span>)}</div>
            <span className="skill-arrow" aria-hidden="true">↗</span>
          </article>
        ))}
      </div>
    </section>
  );
}
