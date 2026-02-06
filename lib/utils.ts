import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Format date utilities
export function formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

export function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
}

// Calculate percentage
export function calculatePercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100 * 100) / 100;
}

// Generate random color for avatars
export function getAvatarColor(name?: string): string {
    const defaultColor = 'bg-indigo-600';
    if (!name) return defaultColor;

    const colors = [
        'bg-red-500',
        'bg-blue-500',
        'bg-green-500',
        'bg-yellow-500',
        'bg-purple-500',
        'bg-pink-500',
        'bg-indigo-500',
        'bg-teal-500'
    ];

    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
}

// Get initials from name
export function getInitials(name?: string): string {
    if (!name) return '??';
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

// Validate email
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
}

// Generate slug from text
export function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Deep clone object
export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Shuffle array
export function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Shuffles an array but keeps items with the same group key together.
 * Useful for passages and their sub-questions.
 */
export function shuffleGrouped<T>(array: T[], groupKeySelector: (item: T) => any): T[] {
    // 1. Group items
    const groups: Map<any, T[]> = new Map();
    const standalones: T[] = [];

    array.forEach(item => {
        const key = groupKeySelector(item);
        if (key === null || key === undefined || key === '') {
            standalones.push(item);
        } else {
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(item);
        }
    });

    // 2. Prepare units for shuffling (each group is a unit, each standalone is a unit)
    const units: (T | T[])[] = [
        ...standalones,
        ...Array.from(groups.values())
    ];

    // 3. Shuffle units
    const shuffledUnits = shuffleArray(units);

    // 4. Flatten
    const result: T[] = [];
    shuffledUnits.forEach(unit => {
        if (Array.isArray(unit)) {
            result.push(...unit);
        } else {
            result.push(unit);
        }
    });

    return result;
}

// Calculate streak
export function calculateStreak(dates: Date[]): number {
    if (dates.length === 0) return 0;

    const sortedDates = dates.sort((a, b) => b.getTime() - a.getTime());
    let streak = 1;

    for (let i = 0; i < sortedDates.length - 1; i++) {
        const diff = Math.floor((sortedDates[i].getTime() - sortedDates[i + 1].getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
            streak++;
        } else if (diff > 1) {
            break;
        }
    }

    return streak;
}
