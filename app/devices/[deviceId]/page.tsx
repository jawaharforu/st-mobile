import DeviceDetailClient from "./DeviceDetailClient";

// Required for Next.js static export with dynamic routes
export function generateStaticParams() {
    return [];
}

export default function DeviceDetailPage() {
    return <DeviceDetailClient />;
}
