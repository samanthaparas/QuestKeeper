import "./Button.css";

function Button({
  variant = "primary",
  large = false,
  type = "button",
  className = "",
  children,
  ...rest
}) {
  const classes = [
    "qk-button",
    `qk-button--${variant}`,
    large ? "qk-button--large" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}

export default Button;
