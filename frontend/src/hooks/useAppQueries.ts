import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

// --- Student Queries ---

export const useStudentProgress = (studentId: string | null) => {
    return useQuery({
        queryKey: ["studentProgress", studentId],
        queryFn: async () => {
            if (!studentId) throw new Error("No student ID");

            const { data, error } = await supabase
                .from("results")
                .select("*")
                .eq("student_id", studentId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!studentId,
        staleTime: 0,
        refetchInterval: 5000, // Refresh every 5 seconds
    });
};

export const useStudentAnnouncements = (studentEmail: string | null) => {
    return useQuery({
        queryKey: ["studentAnnouncements", studentEmail],
        queryFn: async () => {
            if (!studentEmail) return [];
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const token = localStorage.getItem("firebase_token");

            const response = await fetch(`${backendUrl}/api/student/announcements`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Failed to fetch announcements");
            return response.json();
        },
        enabled: !!studentEmail,
        staleTime: 0,
        refetchInterval: 5000, // Refresh every 5 seconds
    });
};

// --- Admin Queries ---

export const useAdminStats = () => {
    return useQuery({
        queryKey: ["adminStats"],
        queryFn: async () => {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const token = localStorage.getItem("firebase_token");

            const [statsRes, activityRes] = await Promise.all([
                fetch(`${backendUrl}/api/admin/stats/overview`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${backendUrl}/api/admin/activity`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (!statsRes.ok || !activityRes.ok) throw new Error("Failed to fetch dashboard data");

            const stats = await statsRes.json();
            const activities = await activityRes.json();

            return { stats, activities };
        },
        staleTime: 0,
        refetchInterval: 5000, // Refresh every 5 seconds
    });
};

export const useAdmins = () => {
    return useQuery({
        queryKey: ["adminsList"],
        queryFn: async () => {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const token = localStorage.getItem("firebase_token");

            const response = await fetch(`${backendUrl}/api/chat/admins`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Failed to fetch admins");

            const data = await response.json();
            // Sort by last message time (descending)
            data.sort((a: any, b: any) => {
                if (!a.last_message_at) return 1;
                if (!b.last_message_at) return -1;
                return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
            });

            return data;
            return data;
        },
        refetchInterval: 5000, // Poll every 5 seconds
        staleTime: 0,
    });
};

export const useAppSettings = () => {
    return useQuery({
        queryKey: ["appSettings"],
        queryFn: async () => {
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const token = localStorage.getItem("firebase_token"); // Use same token as student

            const response = await fetch(`${backendUrl}/api/admin/settings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Failed to fetch settings");
            return response.json();
        },
        staleTime: 60000, // Cache for 1 minute
    });
};
