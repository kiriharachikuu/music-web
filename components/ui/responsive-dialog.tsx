"use client";

import * as React from "react";

import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const ResponsiveDialog = ({
  children,
  ...props
}: React.ComponentProps<typeof Dialog>) => {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <Sheet {...(props as React.ComponentProps<typeof Sheet>)}>{children}</Sheet>;
  }
  return <Dialog {...props}>{children}</Dialog>;
};
ResponsiveDialog.displayName = "ResponsiveDialog";

const ResponsiveDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  React.ComponentPropsWithoutRef<typeof DialogContent>
>(({ className, children, ...props }, ref) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <SheetContent
        side="bottom"
        className={cn(
          "border-t-0 rounded-t-[20px] p-0 max-h-[85vh] overflow-hidden",
          className
        )}
        {...(props as React.ComponentPropsWithoutRef<typeof SheetContent>)}
      >
        <div
          className="flex h-1.5 w-12 shrink-0 rounded-full bg-foreground/20 mx-auto mt-3 mb-1"
          aria-hidden="true"
        />
        <div className="px-6 pb-6 pt-2 overflow-y-auto max-h-[calc(85vh-28px)]">
          {children}
        </div>
      </SheetContent>
    );
  }

  return (
    <DialogContent ref={ref} className={className} {...props}>
      {children}
    </DialogContent>
  );
});
ResponsiveDialogContent.displayName = "ResponsiveDialogContent";

const ResponsiveDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <SheetHeader className={cn("text-center", className)} {...props} />;
  }
  return <DialogHeader className={className} {...props} />;
};
ResponsiveDialogHeader.displayName = "ResponsiveDialogHeader";

const ResponsiveDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <SheetFooter
        className={cn("flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
        {...props}
      />
    );
  }
  return <DialogFooter className={className} {...props} />;
};
ResponsiveDialogFooter.displayName = "ResponsiveDialogFooter";

const ResponsiveDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogTitle>,
  React.ComponentPropsWithoutRef<typeof DialogTitle>
>(({ className, ...props }, ref) => {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <SheetTitle
        ref={ref as React.Ref<React.ElementRef<typeof SheetTitle>>}
        className={className}
        {...props}
      />
    );
  }
  return <DialogTitle ref={ref} className={className} {...props} />;
});
ResponsiveDialogTitle.displayName = "ResponsiveDialogTitle";

const ResponsiveDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogDescription>,
  React.ComponentPropsWithoutRef<typeof DialogDescription>
>(({ className, ...props }, ref) => {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <SheetDescription
        ref={ref as React.Ref<React.ElementRef<typeof SheetDescription>>}
        className={className}
        {...props}
      />
    );
  }
  return <DialogDescription ref={ref} className={className} {...props} />;
});
ResponsiveDialogDescription.displayName = "ResponsiveDialogDescription";

export {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
};
