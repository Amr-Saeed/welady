function Button({
  children,
  onClick,
  disabled,
  className,
  type = "submit",
  withTransition = true,
  withHover = true,
  useDefaultStyles = true,
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={`
        font-bold 
        rounded-[var(--main-radius)]
        ${withTransition ? "transition-colors duration-500" : ""}
        ${
          disabled
            ? "!cursor-not-allowed bg-gray-400  opacity-50 pointer-events-none"
            : useDefaultStyles
              ? "bg-[var(--main-color)] text-white cursor-pointer"
              : "cursor-pointer"
        }
        ${withHover && !disabled && useDefaultStyles ? "hover:bg-[var(--main-lite-color)]" : ""}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

export default Button;
