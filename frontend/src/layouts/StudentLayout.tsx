import { ContactAdminModal } from "@/components/ContactAdminModal";
import { StudentHeader } from "@/components/StudentHeader";
import { Outlet, useLocation } from "react-router-dom";

const StudentLayout = () => {
    const location = useLocation();
    return (
        <div className="min-h-screen relative overflow-hidden bg-background">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-background via-emerald-50/30 to-emerald-100/20 dark:from-background dark:via-emerald-950/10 dark:to-emerald-900/5" />

            {/* Fixed Header */}
            <StudentHeader />

            {/* Main Content Area */}
            {/* Added pt-24 to account for the fixed header height */}
            <div className="relative z-10 pt-24">
                <Outlet />
            </div>

            {/* Floating Contact Button - Hide on contact page */}
            {location.pathname !== '/contact-admin' && <ContactAdminModal />}
        </div>
    );
};

export default StudentLayout;
