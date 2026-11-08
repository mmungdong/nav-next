interface IconProps {
  name: string;
  className?: string;
}

export default function Icon({ name, className }: IconProps) {
  return (
    <svg className={className ? `ico ${className}` : 'ico'} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}
