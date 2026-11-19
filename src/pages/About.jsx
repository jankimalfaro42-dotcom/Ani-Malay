
import {
  Sprout,
  Tractor,
  Fish,
  ShoppingBasket,
  HeartHandshake,
  Users,
  Leaf,
  ArrowRight,
} from 'lucide-react'

import { Link } from 'react-router-dom'
import './About.css'

const purposeItems = [
  {
    icon: Leaf,
    title: 'Local Products',
    subtitle: 'Crops • Livestock • Fisheries',
    description:
      'A single marketplace featuring agricultural products sourced within the local community of Malay.',
  },
  {
    icon: HeartHandshake,
    title: 'Farmer Support',
    subtitle: 'Wider Market Access',
    description:
      'The platform provides an additional channel where locally sourced products can be presented to potential consumers.',
  },
  {
    icon: ShoppingBasket,
    title: 'Community Access',
    subtitle: 'Convenient Local Shopping',
    description:
      'Consumers can browse locally sourced agricultural products through an organized digital marketplace.',
  },
  {
    icon: Users,
    title: 'Community Growth',
    subtitle: 'Support Local Agriculture',
    description:
      "Choosing local products helps promote local agriculture and supports the people involved in the community's agricultural activities.",
  },
]

const farmers = [
  { image: 'farmer1.jpg', label: 'Local Farmers' },
  { image: 'farmer2.jpg', label: 'Local Farmers' },
  { image: 'farmer3.jpg', label: 'Agricultural Producers' },
  { image: 'farmer4.jpg', label: 'Local Agriculture' },
  { image: 'farmer5.jpg', label: 'Community Farmers' },
  { image: 'farmer6.jpg', label: 'Local Producers' },
  { image: 'farmer7.jpg', label: 'Fisherfolk & Farmers' },
  { image: 'farmer8.jpg', label: 'Malay Agricultural Community' },
]

const categories = [
  {
    icon: Sprout,
    title: 'Crops',
    description:
      'Fresh fruits, vegetables, rice, and other locally grown agricultural products.',
  },
  {
    icon: Tractor,
    title: 'Livestock',
    description:
      'Locally sourced livestock products that help support agricultural livelihoods in the community.',
  },
  {
    icon: Fish,
    title: 'Fisheries',
    description:
      'Fresh fish and other locally sourced fisheries products from the community.',
  },
]

function About() {
  return (
    <main className="about-page">

      {/* HERO */}
      <section className="about-hero">
        <div className="about-hero-content">
          <span className="about-label">ABOUT ANI-MALAY</span>

          <h1>
            Supporting Local Farmers,
            <span> Growing Our Community</span>
          </h1>

          <p>
            Ani-Malay is a digital marketplace created to help promote
            locally sourced agricultural products from the Municipality
            of Malay. By connecting the community with local crops,
            livestock, and fisheries products, the platform helps provide
            farmers with a wider market while making fresh and locally
            produced goods more accessible to consumers.
          </p>

          <Link to="/products" className="about-primary-btn">
            Explore Local Products <ArrowRight size={18} />
          </Link>
        </div>

        <div className="about-hero-decoration">
          <div className="about-hero-image">
            <img
              src="/images/farmers/farmer1.jpg"
              alt="Local agricultural community"
            />
          </div>
        </div>
      </section>

      {/* PURPOSE */}
      <section className="about-section about-purpose">
        <div className="about-section-heading">
          <span className="about-label">OUR PURPOSE</span>
          <h2>Creating Opportunities Through Local Agriculture</h2>
          <p>
            Ani-Malay aims to strengthen the connection between local
            agricultural producers, the LGU, and the community through
            a convenient and organized digital marketplace.
          </p>
        </div>

        <div className="about-purpose-grid">
          {purposeItems.map((item) => {
            const Icon = item.icon

            return (
              <article className="about-purpose-card" key={item.title}>
                <div className="about-purpose-icon">
                  <Icon size={26} />
                </div>

                <h3>{item.title}</h3>
                <span className="about-card-subtitle">
                  {item.subtitle}
                </span>
                <p>{item.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      {/* COMMUNITY GALLERY */}
      <section className="about-section about-farmers">
        <div className="about-section-heading">
          <span className="about-label">OUR COMMUNITY</span>
          <h2>The People Behind Local Agriculture</h2>
          <p>
            Ani-Malay recognizes the local farmers and agricultural
            producers who help provide fresh and locally sourced
            products to the community of Malay.
          </p>
        </div>

        <div className="about-farmers-grid">
          {farmers.map((farmer, index) => (
            <article className="about-farmer-card" key={farmer.image}>
              <img
                src={`/images/farmers/${farmer.image}`}
                alt={`Local agricultural community ${index + 1}`}
                loading="lazy"
              />

              <div className="about-farmer-overlay">
                <span>{farmer.label}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="about-section about-categories">
        <div className="about-section-heading">
          <span className="about-label">WHAT YOU CAN FIND</span>
          <h2>Explore Local Products</h2>
          <p>
            Discover products from three major agricultural categories
            available through Ani-Malay.
          </p>
        </div>

        <div className="about-category-grid">
          {categories.map((category) => {
            const Icon = category.icon

            return (
              <article className="about-category-card" key={category.title}>
                <div className="about-category-icon">
                  <Icon size={31} />
                </div>

                <h3>{category.title}</h3>
                <p>{category.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      {/* CLOSING */}
      <section className="about-closing">
        <div className="about-closing-content">
          <span className="about-label">ANI-MALAY</span>

          <h2>
            When You Choose Local,
            <span> You Support the Community.</span>
          </h2>

          <p>
            Together, we can help promote local agriculture and make
            locally sourced products more accessible to the people of Malay.
          </p>

          <Link to="/products" className="about-primary-btn about-closing-btn">
            Discover Local Products <ArrowRight size={18} />
          </Link>
        </div>
      </section>

    </main>
  )
}

export default About
