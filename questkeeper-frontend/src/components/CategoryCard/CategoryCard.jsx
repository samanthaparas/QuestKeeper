import "./CategoryCard.css";

function CategoryCard({ icon, title, description }) {
  return (
    <article className="category-card">
      <div className="category-card__icon">{icon}</div>
      <h3 className="category-card__title">{title}</h3>
      <p className="category-card__description">{description}</p>
    </article>
  );
}

export default CategoryCard;
