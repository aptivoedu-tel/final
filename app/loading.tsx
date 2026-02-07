import Loader from '@/components/ui/Loader';

export default function Loading() {
    return (
        <div className="fixed inset-0 z-[99999] bg-white flex items-center justify-center">
            <Loader size="lg" text="Loading Aptivo Portal..." />
        </div>
    );
}
