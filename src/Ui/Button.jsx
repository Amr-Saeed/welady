function Button({
  children,
  onClick,
  disabled,
  className,
  type = "submit",
  withTransition = true,
  withHover = true,
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={`
        ${className} 
        font-bold 
        rounded-[var(--main-radius)]
        ${withTransition ? "transition-colors duration-500" : ""}
        ${
          disabled
            ? "!cursor-not-allowed bg-gray-400  opacity-50 pointer-events-none"
            : "bg-[var(--main-color)] text-white cursor-pointer"
        }
        ${withHover && !disabled ? "hover:bg-[var(--main-lite-color)]" : ""}
      `}
    >
      {children}
    </button>
  );
}

export default Button;
