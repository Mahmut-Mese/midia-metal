/**
 * ToasterIsland — mounts the Sonner toast container on every public page.
 * Must be included in BaseLayout.astro so that all public islands
 * (RegisterIsland, LoginIsland, CartIsland, CheckoutIsland, etc.) can call
 * toast.success() / toast.error() and have their output rendered.
 */
import { Toaster } from "@/components/ui/sonner";

export default function ToasterIsland() {
  return <Toaster richColors position="top-right" />;
}
