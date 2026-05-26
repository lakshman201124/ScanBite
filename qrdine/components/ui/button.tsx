import * as React from "react";

/**
 * Minimal shadcn-compatible Button base.
 * Lets button-with-icon.tsx import from "@/components/ui/button"
 * without needing the full shadcn CLI install.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", asChild: _asChild, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={className}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
