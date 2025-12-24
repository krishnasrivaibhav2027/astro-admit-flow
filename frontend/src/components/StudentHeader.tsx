import { ModeToggle } from "@/components/mode-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, ChevronRight, KeyRound, LogOut, Trophy, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { WeatherIcon } from "./WeatherIcons";

export const StudentHeader = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [studentName, setStudentName] = useState<string>("");
    const [studentEmail, setStudentEmail] = useState<string>("");
    const [greeting, setGreeting] = useState<string>("");
    const [weather, setWeather] = useState<{ type: 'sunny' | 'rainy' | 'cloudy' | 'windy' | 'clear-night'; temp?: number } | null>(null);

    useEffect(() => {
        const updateGreeting = () => {
            const hour = new Date().getHours();
            if (hour < 12) setGreeting("Good Morning");
            else if (hour < 18) setGreeting("Good Afternoon");
            else setGreeting("Good Evening");
        };
        updateGreeting();

        // Weather Logic
        const fetchWeather = async (lat: number, lon: number) => {
            try {
                const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
                const data = await response.json();
                const code = data.current_weather?.weathercode;
                const temp = data.current_weather?.temperature;
                const isDay = data.current_weather?.is_day; // 1 for Day, 0 for Night

                // WMO Code Mapping
                let type: 'sunny' | 'rainy' | 'cloudy' | 'windy' | 'clear-night' = 'sunny';

                if (code === 0 || code === 1) {
                    type = isDay === 1 ? 'sunny' : 'clear-night';
                }
                else if (code === 2 || code === 3) type = 'cloudy';
                else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95)) type = 'rainy';
                else type = 'windy';

                setWeather({ type, temp });
            } catch (e) {
                console.error("Weather fetch failed", e);
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    fetchWeather(position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    console.log("Location access denied or failed", error);
                }
            );
        }

        const fetchStudentData = async () => {
            try {
                const storedStudentId = sessionStorage.getItem('studentId');
                const storedEmail = sessionStorage.getItem('studentEmail');
                if (storedEmail) setStudentEmail(storedEmail);

                if (!storedStudentId) return;

                const { data: studentData } = await supabase
                    .from("students")
                    .select("first_name, last_name")
                    .eq("id", storedStudentId)
                    .single();

                if (studentData) {
                    setStudentName(`${studentData.first_name} ${studentData.last_name}`);
                }
            } catch (error) {
                console.error("Error fetching student data:", error);
            }
        };

        fetchStudentData();
    }, []);

    const handleLogout = async () => {
        try {
            // Call backend to track logout
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (token && backendUrl) {
                await fetch(`${backendUrl}/api/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({})
                });
            }

            await supabase.auth.signOut();

            localStorage.removeItem('firebase_token'); // Cleanup legacy
            sessionStorage.removeItem('studentId');
            sessionStorage.removeItem('studentEmail');

            toast({
                title: "Logged Out",
                description: "You have been successfully logged out.",
            });

            navigate("/");
        } catch (error) {
            console.error("Logout error:", error);
            // Force navigation even if error
            navigate("/");
        }
    };

    const handleChangePassword = async () => {
        try {
            const email = sessionStorage.getItem('studentEmail');
            if (!email) {
                toast({
                    title: "Error",
                    description: "Email not found. Please log in again.",
                    variant: "destructive"
                });
                return;
            }

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password?type=update`,
            });

            if (error) throw error;

            toast({
                title: "Password Reset Email Sent!",
                description: "Please check your email to reset your password.",
            });
        } catch (error: any) {
            console.error('Error sending password reset:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to send password reset email.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between">
            {/* Left: Greeting */}
            <div>
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-foreground">{greeting},</h2>
                    {weather && (
                        <div className="flex items-center gap-1 animate-in fade-in duration-700">
                            <WeatherIcon type={weather.type} />
                            <span className="text-sm font-medium text-muted-foreground">{weather.temp}°C</span>
                        </div>
                    )}
                </div>
                <p className="text-muted-foreground font-medium">{studentName || "Student"}</p>
            </div>

            {/* Center: App Name */}
            <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 cursor-pointer group"
                onClick={() => navigate("/levels")}
            >
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                    <ArrowRight className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                    <h1 className="text-xl font-bold leading-none">
                        Admit <span className="text-emerald-500">Flow</span>
                    </h1>
                    <span className="text-[10px] font-medium text-muted-foreground tracking-wide">
                        AI Powered Assessment
                    </span>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    onClick={() => navigate("/leaderboard")}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white border-0 rounded-full px-6 shadow-lg shadow-orange-500/20"
                >
                    <Trophy className="w-4 h-4 mr-2" />
                    Leaderboard
                </Button>

                <NotificationBell />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full hover:bg-muted"
                            title="Account"
                        >
                            <User className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80 p-2 bg-popover border-border text-popover-foreground shadow-2xl">
                        {/* User Header */}
                        <div className="flex items-center gap-3 p-4 mb-2 bg-muted/50 rounded-xl border border-border">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {studentName.charAt(0) || "U"}
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-semibold text-foreground truncate">My Account</p>
                                <p className="text-xs text-muted-foreground truncate">{studentEmail}</p>
                            </div>
                        </div>

                        {/* Menu Items */}
                        <div className="space-y-1">
                            <DropdownMenuItem
                                onClick={() => navigate("/profile")}
                                className="p-3 focus:bg-muted rounded-lg cursor-pointer group border border-transparent focus:border-border"
                            >
                                <div className="w-8 h-8 rounded-lg bg-muted group-hover:bg-background flex items-center justify-center mr-3 transition-colors border border-border/50">
                                    <User className="w-4 h-4 text-emerald-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground">My Profile</p>
                                    <p className="text-xs text-muted-foreground">View and edit your profile</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={handleChangePassword}
                                className="p-3 focus:bg-muted rounded-lg cursor-pointer group border border-transparent focus:border-border"
                            >
                                <div className="w-8 h-8 rounded-lg bg-muted group-hover:bg-background flex items-center justify-center mr-3 transition-colors border border-border/50">
                                    <KeyRound className="w-4 h-4 text-emerald-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground">Change Password</p>
                                    <p className="text-xs text-muted-foreground">Update your password</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="bg-border my-2" />

                            <DropdownMenuItem
                                onClick={handleLogout}
                                className="p-3 focus:bg-red-500/10 rounded-lg cursor-pointer group border border-transparent focus:border-red-500/20"
                            >
                                <div className="w-8 h-8 rounded-lg bg-red-500/10 group-hover:bg-red-500/20 flex items-center justify-center mr-3 transition-colors">
                                    <LogOut className="w-4 h-4 text-red-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-red-500">Logout</p>
                                    <p className="text-xs text-red-500/70">Sign out of your account</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-red-500/50 group-hover:text-red-500" />
                            </DropdownMenuItem>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>

                <ModeToggle />
            </div>
        </div>
    );
};
