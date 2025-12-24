
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Edit2, Key, Mail, Phone, Save, Shield, User, X } from "lucide-react";
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 lg:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">

        {/* Header / Back Button for non-new users */}
        {!isNewUser && (
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/levels")}
              className="text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-all group"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Levels
            </Button>
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-1"
          >
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-800">
              {/* Avatar */}
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-emerald-800 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-md">
                  <User className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>

              {/* Name */}
              <div className="text-center mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
                  {formData.firstName || "Student"} {formData.lastName}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate px-2" title={formData.email}>
                  {formData.email}
                </p>
              </div>

              {/* Badge */}
              <div className="flex justify-center mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-medium">
                  <User className="w-3.5 h-3.5" />
                  Student
                </span>
              </div>

              {/* Quick Stats */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Member Since</span>
                  <span className="text-slate-900 dark:text-white">2024</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Profile Status</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3 space-y-6"
          >
            {/* Personal Information */}
            <form onSubmit={handleSaveProfile} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">Personal Information</h3>
                </div>
                {!isNewUser && !editing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="text-sm">Edit Details</span>
                  </Button>
                )}
                {/* Save/Cancel during Edit Mode located in header or footer? Design has Edit button in header. 
                    Let's place Save actions in the footer or replace Edit button. 
                    For now, following the design which shows "Edit Details" button.
                    When editing, we probably want buttons below the form.
                */}
              </div>

              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* First Name */}
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-500 dark:text-slate-400">First Name</Label>
                    <Input
                      required
                      disabled={!editing}
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className={`${!editing ? "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800" : "bg-white dark:bg-slate-950 border-emerald-500 ring-1 ring-emerald-500"} transition-all`}
                    />
                  </div>

                  {/* Last Name */}
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-500 dark:text-slate-400">Last Name</Label>
                    <Input
                      required
                      disabled={!editing}
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className={`${!editing ? "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800" : "bg-white dark:bg-slate-950 border-emerald-500 ring-1 ring-emerald-500"} transition-all`}
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-500 dark:text-slate-400">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        disabled
                        value={formData.email}
                        className="pl-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-80"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-500 dark:text-slate-400">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        required
                        disabled={!editing}
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className={`pl-10 ${!editing ? "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800" : "bg-white dark:bg-slate-950 border-emerald-500 ring-1 ring-emerald-500"} transition-all`}
                      />
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-500 dark:text-slate-400">Date of Birth</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type={editing ? "date" : "text"}
                        required
                        disabled={!editing}
                        value={formData.dob}
                        onChange={(e) => handleDobChange(e.target.value)}
                        className={`pl-10 ${!editing ? "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800" : "bg-white dark:bg-slate-950 border-emerald-500 ring-1 ring-emerald-500"} transition-all`}
                      />
                    </div>
                  </div>

                  {/* Age */}
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-500 dark:text-slate-400">Age</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        readOnly
                        disabled
                        value={formData.age}
                        className="pl-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-80"
                      />
                    </div>
                  </div>
                </div>

                {/* Edit Actions */}
                {editing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-800 mt-6"
                  >
                    <Button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 transition-colors"
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
                        className="flex-1 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    )}
                  </motion.div>
                )}
              </div>
            </form>

            {/* Account Security */}
            {!isNewUser && (
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">Account Security</h3>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-800">
                        <Key className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">Password</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Secure your account with a strong password</p>
                      </div>
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
                      className="text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-colors text-sm"
                    >
                      Reset Password
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
