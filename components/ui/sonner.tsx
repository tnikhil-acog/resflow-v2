"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "hsl(var(--toast-bg))",
          "--normal-text": "hsl(var(--toast-text))",
          "--normal-border": "hsl(var(--toast-border))",
          "--success-bg": "hsl(var(--toast-bg))",
          "--success-text": "hsl(var(--toast-text))",
          "--success-border": "hsl(var(--toast-border))",
          "--error-bg": "hsl(var(--toast-bg))",
          "--error-text": "hsl(var(--toast-text))",
          "--error-border": "hsl(var(--toast-border))",
          "--warning-bg": "hsl(var(--toast-bg))",
          "--warning-text": "hsl(var(--toast-text))",
          "--warning-border": "hsl(var(--toast-border))",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
