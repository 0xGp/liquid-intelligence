import { services } from '../data'

export default function Services() {
  return (
    <section className="services" id="services">
      {services.map((service) => (
        <div className="service-row" data-hover key={service.num}>
          <div className="s-num">{service.num}</div>
          <div className="s-name">{service.name}</div>
          <div className="s-desc">{service.desc}</div>
        </div>
      ))}
    </section>
  )
}
