
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Mail, Phone, Save, ShieldCheck, Sparkles, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

// Reuse registration schema for validation of profile details
const profileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  age: z.number().min(8, "Must be at least 8 years old").max(100, "Invalid age"),
  dob: z.string().min(1, "Date of birth is required"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
});

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [studentData, setStudentData] = useState<any>(null);

  // Form Data
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    dob: "",
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

      // Initial form set with just email
      setFormData(prev => ({ ...prev, email: currentUser.email || "" }));

      const accessToken = session.access_token;
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/students/by-email/${currentUser.email}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStudentData(data);
        // Pre-fill form
        setFormData({
          firstName: data.first_name,
          lastName: data.last_name,
          age: data.age.toString(),
          dob: data.dob,
          phone: data.phone,
          email: data.email
        });
        setIsNewUser(false);
        setEditing(false); // Default to read-only for existing users
      } else if (response.status === 404) {
        // User is authenticated but no profile exists -> New User Flow
        setIsNewUser(true);
        setEditing(true); // Force edit mode for new users
        toast({
          title: "Complete Your Profile",
          description: "Please fill in your details to continue.",
        });
      } else {
        throw new Error("Failed to fetch profile");
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

  const calculateAge = (dob: string) => {
    if (!dob) return "";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  const handleDobChange = (dob: string) => {
    const calculatedAge = calculateAge(dob);
    setFormData({ ...formData, dob, age: calculatedAge });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate
      const validationData = {
        ...formData,
        age: parseInt(formData.age)
      };
      profileSchema.parse(validationData);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      let response;
      if (isNewUser) {
        // CREATE
        response = await fetch(`${backendUrl}/api/students`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            first_name: formData.firstName,
            last_name: formData.lastName,
            age: parseInt(formData.age),
            dob: formData.dob,
            email: formData.email,
            phone: formData.phone
          })
        });
      } else {
        // UPDATE (using existing student ID)
        if (!studentData?.id) throw new Error("Missing Student ID for update");

        response = await fetch(`${backendUrl}/api/students/${studentData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            first_name: formData.firstName,
            last_name: formData.lastName,
            age: parseInt(formData.age),
            dob: formData.dob,
            email: formData.email,
            phone: formData.phone
          })
        });
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to save profile");
      }

      const updatedStudent = await response.json();
      setStudentData(updatedStudent);
      setIsNewUser(false);
      setEditing(false); // Lock it back

      toast({
        title: isNewUser ? "Profile Completed!" : "Profile Updated!",
        description: isNewUser ? "You are now ready to start the test." : "Your details have been saved.",
      });

      if (isNewUser) {
        // Redirect to levels selection after successful creation
        setTimeout(() => navigate("/levels"), 1500);
      }

    } catch (error: any) {
      console.error("Profile save error:", error);
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
    if (isNewUser) {
      // New users generally shouldn't cancel, but if they want to logout they can use header.
      // Or we just do nothing.
      return;
    }
    // Revert to original data
    if (studentData) {
      setFormData({
        firstName: studentData.first_name,
        lastName: studentData.last_name,
        age: studentData.age.toString(),
        dob: studentData.dob,
        phone: studentData.phone,
        email: studentData.email
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
          {/* Show Back button only if NOT a new user (since new users MUST fill this out) */}
          {!isNewUser && (
            <Button
              variant="ghost"
              onClick={() => navigate("/levels")}
              className="mb-8 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-all group"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Levels
            </Button>
          )}
          {isNewUser && (
            // Spacer for layout consistency
            <div className="h-8 mb-8"></div>
          )}
        </motion.div>

        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                  {formData.firstName || user?.email?.split('@')[0] || "Student"} {formData.lastName}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{user?.email}</p>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 capitalize">{studentData?.role || 'Student'}</span>
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

                {/* Actions: Edit / Save / Cancel */}
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
                {/* Save/Cancel buttons are shown below form, or could be here. Let's put them below for better mobile flow. */}
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
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-600 dark:text-slate-400">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 dark:text-emerald-500 z-10" />
                    <Input
                      disabled // Email is always disabled
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
                      required
                      disabled={!editing}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`pl-10 ${!editing ? "bg-slate-50 dark:bg-white/5 border-transparent cursor-default" : "bg-white dark:bg-slate-900"}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-600 dark:text-slate-400">Date of Birth</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 dark:text-emerald-500 z-10" />
                      <Input
                        type={editing ? "date" : "text"}
                        required
                        disabled={!editing}
                        value={formData.dob}
                        onChange={(e) => handleDobChange(e.target.value)}
                        className={`pl-10 ${!editing ? "bg-slate-50 dark:bg-white/5 border-transparent cursor-default" : "bg-white dark:bg-slate-900"}`}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 dark:text-slate-400">Age</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 dark:text-emerald-500 z-10" />
                      <Input
                        readOnly
                        disabled // Always auto-calculated
                        value={formData.age}
                        className={`pl-10 bg-slate-50 dark:bg-white/5 border-transparent cursor-not-allowed opacity-80`}
                      />
                    </div>
                  </div>
                </div>

                {/* Edit Actions */}
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
                      {submitting ? "Saving..." : (isNewUser ? "Complete & Continue" : "Save Changes")}
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

        {/* Security Section (Outside Form) */}
        {!isNewUser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="hidden lg:block"></div> {/* Spacer to align with right column */}
            <div className="lg:col-span-2">
              <Card className="bg-white dark:bg-white/5 backdrop-blur-xl border-slate-200 dark:border-white/10 shadow-lg dark:shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl text-slate-900 dark:text-white">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    Account Security
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-white/10 rounded-lg bg-slate-50 dark:bg-black/20">
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-white">Password</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Secure your account with a strong password
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          if (!user?.email) throw new Error("No email found");
                          const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                            redirectTo: `${window.location.origin}/reset-password?type=update`,
                          });
                          if (error) throw error;
                          toast({
                            title: "Email Sent Successfully",
                            description: "Check your inbox for the password reset link.",
                          });
                        } catch (error: any) {
                          toast({
                            title: "Error",
                            description: error.message,
                            variant: "destructive",
                          });
                        }
                      }}
                      className="border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
                    >
                      Reset Password
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Profile;
