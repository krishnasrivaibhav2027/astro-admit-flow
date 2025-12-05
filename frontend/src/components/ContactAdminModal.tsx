import { Button } from "@/components/ui/button";
import { Headset } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ContactAdminModal() {
    const navigate = useNavigate();

    return (
        <Button
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-emerald-600 hover:bg-emerald-700 text-white z-[100] transition-transform hover:scale-105 dark:bg-none"
            onClick={() => navigate("/contact-admin")}
        >
            <Headset className="h-8 w-8" strokeWidth={2.5} />
            <span className="sr-only">Contact Support</span>
        </Button>
    );
}
