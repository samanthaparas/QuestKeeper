import "./CategoryCard.css";

// One of the homepage's "Browse Categories" links. The artwork is the same
// hand-inked illustration the category's own pages use, so it's decorative
// here (alt=""): the title already says where the link goes.
// Portraits and emblems leave a lot of empty space around the drawing, while
// spell and item art fills its image; `tightArt` marks the second kind so
// all six drawings come out about the same size.
function CategoryCard({ art, tightArt = false, title, description }) {
  return (
    <article className="category-card">
      <img
        className={tightArt ? "category-card__art category-card__art--tight" : "category-card__art"}
        src={art}
        alt=""
        width="64"
        height="64"
      />
      <h3 className="category-card__title">{title}</h3>
      <p className="category-card__description">{description}</p>
    </article>
  );
}

export default CategoryCard;
