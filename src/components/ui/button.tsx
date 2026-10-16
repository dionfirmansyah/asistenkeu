import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-sm border-2 border-transparent bg-clip-padding font-display text-[15px] font-bold tracking-normal whitespace-nowrap transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-foreground bg-foreground text-background shadow-[3px_3px_0_var(--color-accent-graphic)] hover:shadow-[3px_3px_0_var(--foreground)] hover:bg-accent-graphic hover:text-primary-foreground hover:border-foreground active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        outline:
          "border-foreground bg-card text-foreground hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground",
        secondary:
          "border-foreground bg-card text-foreground hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground",
        ghost:
          "hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 gap-1.5 px-5",
        xs: "h-6 gap-1 rounded-[2px] px-2 text-xs in-data-[slot=button-group]:rounded-[2px] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[2px] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-[2px] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-1.5 px-5",
        icon: "size-11",
        "icon-xs":
          "size-6 rounded-[2px] in-data-[slot=button-group]:rounded-[2px] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[2px] in-data-[slot=button-group]:rounded-[2px]",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
