
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Phone, Save, ShieldCheck, Sparkles, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

// Admin profile schema
const adminProfileSchema = z.object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    phone: z.string().min(10, "Phone number must be at least 10 characters"),
});

const AdminProfile = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [editing, setEditing] = useState(false);
    const [isNewUser, setIsNewUser] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [adminData, setAdminData] = useState<any>(null);

    // Form Data
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        email: ""
    });

    useEffect(() => {
        checkAuthAndLoadProfile();
    }, []);

    const checkAuthAndLoadProfile = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                navigate("/login");
                return;
            }

            const currentUser = session.user;
            setUser(currentUser);
            setFormData(prev => ({ ...prev, email: currentUser.email || "" }));

            // Fetch admin data from admins table
            const { data, error } = await supabase
                .from("admins")
                .select("*")
                .eq("email", currentUser.email)
                .maybeSingle();

            if (error) {
                console.error("Supabase Error:", error);
                throw error;
            }

            if (data) {
                setAdminData(data);
                // Pre-fill form
                setFormData({
                    firstName: data.first_name || "",
                    lastName: data.last_name || "",
                    phone: data.phone || "",
                    email: data.email || currentUser.email || ""
                });

                // Algorithm to check "completeness"
                if (data.first_name === "Admin" && data.last_name === "User" || !data.phone) {
                    setIsNewUser(true);
                    setEditing(true); // Force edit mode
                    toast({
                        title: "Complete Your Profile",
                        description: "Please update your details to access the dashboard",
                    });
                } else {
                    setIsNewUser(false);
                    setEditing(false);
                }
            } else {
                // Should not happen if trigger worked, but if it did...
                setIsNewUser(true);
                setEditing(true);
            }

        } catch (error: any) {
            console.error("Profile load error:", error);
            toast({
                title: "Error",
                description: "Failed to load profile data. " + error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // Validate
            adminProfileSchema.parse(formData);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No session");

            // Update admins table directly
            const { error } = await supabase
                .from("admins")
                .update({
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    phone: formData.phone
                })
                .eq("email", formData.email);

            if (error) throw error;

            console.log("Updated Admin Profile");

            // Fetch updated data locally to update state
            const { data: newData } = await supabase
                .from("admins")
                .select("*")
                .eq("email", formData.email)
                .single();

            setAdminData(newData);
            setIsNewUser(false);
            setEditing(false);

            toast({
                title: isNewUser ? "Profile Completed!" : "Profile Updated!",
                description: "Your details have been saved.",
            });

            if (isNewUser) {
                setTimeout(() => navigate("/admin"), 1000);
            }

        } catch (error: any) {
            console.error("Profile update error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to save profile.",
                variant: "destructive"
            });
        } finally {
            setSubmitting(false);
        }
    };

    const cancelEdit = () => {
        if (isNewUser) return;

        if (adminData) {
            setFormData({
                firstName: adminData.first_name || "",
                lastName: adminData.last_name || "",
                phone: adminData.phone || "",
                email: adminData.email || ""
            });
        }
        setEditing(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white selection:bg-emerald-500/30 transition-colors duration-300">
            {/* Backgrounds */}
            <div className="fixed inset-0 pointer-events-none hidden dark:block">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 container max-w-4xl mx-auto px-4 py-12">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {!isNewUser && (
                        <Button
                            variant="ghost"
                            onClick={() => navigate("/admin")}
                            className="mb-8 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-all group"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            Back to Dashboard
                        </Button>
                    )}
                    {isNewUser && <div className="h-8 mb-8"></div>}
                </motion.div>

                <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Profile Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="lg:col-span-1"
                    >
                        <Card className="bg-white dark:bg-white/5 backdrop-blur-xl border-slate-200 dark:border-white/10 overflow-hidden relative group shadow-lg dark:shadow-none h-fit">
                            <CardContent className="pt-8 pb-8 flex flex-col items-center text-center relative z-10">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 p-[2px] mb-4 shadow-lg shadow-emerald-500/20">
                                    <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                                        <User className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                                    {formData.firstName || "Admin"} {formData.lastName}
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{user?.email}</p>
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 capitalize">{adminData?.role || 'Admin'}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Details Column */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="lg:col-span-2 space-y-6"
                    >
                        <Card className="bg-white dark:bg-white/5 backdrop-blur-xl border-slate-200 dark:border-white/10 shadow-lg dark:shadow-none">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-xl text-slate-900 dark:text-white">
                                    <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    Personal Information
                                </CardTitle>
                                {!isNewUser && !editing && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditing(true)}
                                        className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                                    >
                                        Edit Details
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-slate-600 dark:text-slate-400">First Name</Label>
                                        <div className="relative">
                                            <Input
                                                required
                                                disabled={!editing}
                                                value={formData.firstName}
                                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                                className={`${!editing ? "bg-slate-50 dark:bg-white/5 border-transparent cursor-default" : "bg-white dark:bg-slate-900"}`}
                                                placeholder="Admin Name"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-600 dark:text-slate-400">Last Name</Label>
                                        <Input
                                            required
                                            disabled={!editing}
                                            value={formData.lastName}
                                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                            className={`${!editing ? "bg-slate-50 dark:bg-white/5 border-transparent cursor-default" : "bg-white dark:bg-slate-900"}`}
                                            placeholder="Surname"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-600 dark:text-slate-400">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 dark:text-emerald-500 z-10" />
                                        <Input
                                            disabled
                                            value={formData.email}
                                            className="pl-10 bg-slate-50 dark:bg-white/5 border-transparent cursor-not-allowed opacity-80"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-600 dark:text-slate-400">Phone Number</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 dark:text-emerald-500 z-10" />
                                        <Input
                                            type="tel"
                                            required
                                            disabled={!editing}
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className={`pl-10 ${!editing ? "bg-slate-50 dark:bg-white/5 border-transparent cursor-default" : "bg-white dark:bg-slate-900"}`}
                                            placeholder="+1234567890"
                                        />
                                    </div>
                                </div>

                                {editing && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="flex gap-4 pt-4"
                                    >
                                        <Button
                                            type="submit"
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                                            disabled={submitting}
                                        >
                                            <Save className="w-4 h-4 mr-2" />
                                            {submitting ? "Saving..." : (isNewUser ? "Save & Dashboard" : "Save Changes")}
                                        </Button>
                                        {!isNewUser && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={cancelEdit}
                                                disabled={submitting}
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Cancel
                                            </Button>
                                        )}
                                    </motion.div>
                                )}

                            </CardContent>
                        </Card>
                    </motion.div>
                </form>
            </div>
        </div>
    );
};

export default AdminProfile;
