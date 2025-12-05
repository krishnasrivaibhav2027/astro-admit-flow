import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export const LandingHeader = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40 w-full">
            <div className="container mx-auto px-4 py-4 relative">
                <div className="flex items-center justify-between">
                    {/* Left: Desktop Links */}
                    <div className="hidden md:flex items-center space-x-8">
                        <span onClick={() => navigate("/about")} className="text-sm font-medium text-muted-foreground hover:text-emerald-500 transition-colors cursor-pointer">About</span>
                        <span onClick={() => navigate("/blog")} className="text-sm font-medium text-muted-foreground hover:text-emerald-500 transition-colors cursor-pointer">Blog</span>
                        <span onClick={() => navigate("/contact")} className="text-sm font-medium text-muted-foreground hover:text-emerald-500 transition-colors cursor-pointer">Contact</span>
                        <span onClick={() => navigate("/help")} className="text-sm font-medium text-muted-foreground hover:text-emerald-500 transition-colors cursor-pointer">Help</span>
                    </div>

                    {/* Center: Logo */}
                    <div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 cursor-pointer group"
                        onClick={() => navigate("/")}
                    >
                        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                            <ArrowRight className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-bold leading-none text-foreground">
                                Admit <span className="text-emerald-500">Flow</span>
                            </h1>
                            <span className="text-[10px] font-medium text-muted-foreground tracking-wide">
                                AI Powered Assessment
                            </span>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-4 ml-auto md:ml-0">
                        <div className="hidden md:flex items-center gap-4">
                            <ModeToggle />
                            <Button
                                variant="outline"
                                className="border-emerald-500 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                onClick={() => navigate("/login")}
                            >
                                Login
                            </Button>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <div className="md:hidden flex items-center gap-4">
                            <ModeToggle />
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-foreground">
                                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden border-t border-border bg-background p-4 space-y-4 animate-in slide-in-from-top-5">
                    <span onClick={() => navigate("/about")} className="block text-sm font-medium text-muted-foreground hover:text-emerald-500 cursor-pointer">About</span>
                    <span onClick={() => navigate("/blog")} className="block text-sm font-medium text-muted-foreground hover:text-emerald-500 cursor-pointer">Blog</span>
                    <span onClick={() => navigate("/contact")} className="block text-sm font-medium text-muted-foreground hover:text-emerald-500 cursor-pointer">Contact</span>
                    <span onClick={() => navigate("/help")} className="block text-sm font-medium text-muted-foreground hover:text-emerald-500 cursor-pointer">Help</span>
                    <Button
                        className="w-full bg-emerald-500 hover:bg-white hover:text-emerald-500 text-white dark:bg-emerald-500 dark:hover:bg-white dark:hover:text-emerald-500"
                        onClick={() => navigate("/login")}
                    >
                        Login
                    </Button>
                </div>
            )}
        </nav>
    );
};
