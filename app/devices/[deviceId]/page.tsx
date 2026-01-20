import DeviceDetailClient from "./DeviceDetailClient";

// Required for Next.js static export with dynamic routes
// Returns empty array to allow client-side routing only
export function generateStaticParams() {
    return [];
}

// Allow dynamic params at runtime (client-side navigation)
export const dynamicParams = true;

export default function DeviceDetailPage() {
    return <DeviceDetailClient />;
}
