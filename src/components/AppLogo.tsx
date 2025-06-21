
import { cn } from "@/lib/utils";

const AppIconSvg = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className="h-full w-full text-primary"
  >
    <path d="M20.56 10.44 15.3 3.29A2.52 2.52 0 0 0 13.14 2H10.9A2.52 2.52 0 0 0 8.7 3.29L3.44 10.44A2.13 2.13 0 0 0 3 11.79V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8.21a2.13 2.13 0 0 0-.44-1.35Z"/><path d="m3.5 10.5 17 0"/><path d="M12 22V10.5"/>
  </svg>
);

export function AppLogo({ size = "md" }: { size?: "sm" | "md" | "lg" | "iconOnly" }) {
  const sizeClasses = {
    sm: "h-6 w-6", 
    md: "h-8 w-8", 
    lg: "h-10 w-10",
    iconOnly: "h-7 w-7" 
  };

  if (size === "iconOnly") {
    return (
      <div className={cn(sizeClasses.iconOnly, "flex items-center justify-center")}>
        <AppIconSvg />
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <div className={cn(sizeClasses[size])}>
        <AppIconSvg />
      </div>
      <span 
        className={cn(
            `font-headline font-bold text-primary`, // text-primary for default text color from theme
            size === 'sm' && 'text-xl',
            size === 'md' && 'text-2xl',
            size === 'lg' && 'text-3xl'
        )}
      >
        NGroup Products
      </span>
    </div>
  );
}

    