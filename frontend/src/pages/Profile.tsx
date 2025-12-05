import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/config/firebase";
import { useToast } from "@/hooks/use-toast";
import { sendPasswordResetEmail } from "firebase/auth";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Edit2, KeyRound, Mail, Phone, Save, ShieldCheck, Sparkles, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [studentData, setStudentData] = useState<any>(null);
  const [editedPhone, setEditedPhone] = useState("");

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    try {
      const studentId = sessionStorage.getItem('studentId');
      const email = sessionStorage.getItem('studentEmail');

      if (!studentId || !email) {
        navigate("/login");
        return;
      }

      const token = localStorage.getItem('firebase_token');
      if (!token) {
        navigate("/login");
        return;
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/students/by-email/${email}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch profile data');

      const data = await response.json();
      setStudentData(data);
      setEditedPhone(data.phone);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data.",
        variant: "destructive"
      });
    }
  };

  const handleSavePhone = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('firebase_token');
      const backendUrl = import.meta.env.VITE_BACKEND_URL;

      const response = await fetch(`${backendUrl}/api/students/${studentData.id}/phone`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          student_id: studentData.id,
          phone: editedPhone
        })
      });

      if (!response.ok) throw new Error('Failed to update phone number');

      const result = await response.json();
      setStudentData(result.student);
      setEditing(false);

      toast({
        title: "Updated!",
        description: "Phone number updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update phone number.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      const email = sessionStorage.getItem('studentEmail');
      if (!email) throw new Error('Email not found');

      await sendPasswordResetEmail(auth, email);

      toast({
        title: "Email Sent",
        description: "Check your inbox for the password reset link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email.",
        variant: "destructive"
      });
    }
  };

  if (!studentData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white selection:bg-emerald-500/30 transition-colors duration-300">
      {/* Animated Background - Dark Mode */}
      <div className="fixed inset-0 pointer-events-none hidden dark:block">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse delay-1000" />
        <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] rounded-full bg-purple-500/10 blur-[100px] animate-pulse delay-2000" />
      </div>

      {/* Animated Background - Light Mode */}
      <div className="fixed inset-0 pointer-events-none dark:hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px] animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 container max-w-4xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate("/levels")}
            className="mb-8 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-all group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Levels
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-1"
          >
            <Card className="bg-white dark:bg-white/5 backdrop-blur-xl border-slate-200 dark:border-white/10 overflow-hidden relative group shadow-lg dark:shadow-none">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 dark:from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardContent className="pt-8 pb-8 flex flex-col items-center text-center relative z-10">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 p-[2px] mb-4 shadow-lg shadow-emerald-500/20">
                  <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                    <User className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                  {studentData.first_name} {studentData.last_name}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{studentData.email}</p>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 capitalize">{studentData.role || 'Student'}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Column: Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            <Card className="bg-white dark:bg-white/5 backdrop-blur-xl border-slate-200 dark:border-white/10 shadow-lg dark:shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-slate-900 dark:text-white">
                  <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-600 dark:text-slate-400">First Name</Label>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                      <User className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                      <span className="text-slate-900 dark:text-slate-200">{studentData.first_name}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 dark:text-slate-400">Last Name</Label>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                      <User className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                      <span className="text-slate-900 dark:text-slate-200">{studentData.last_name}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-600 dark:text-slate-400">Email Address</Label>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                    <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                    <span className="text-slate-900 dark:text-slate-200">{studentData.email}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-600 dark:text-slate-400">Phone Number</Label>
                  {editing ? (
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                        <Input
                          value={editedPhone}
                          onChange={(e) => setEditedPhone(e.target.value)}
                          placeholder="Enter phone number"
                          className="pl-10 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-emerald-500/50"
                        />
                      </div>
                      <Button
                        onClick={handleSavePhone}
                        disabled={loading}
                        size="icon"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => {
                          setEditing(false);
                          setEditedPhone(studentData.phone);
                        }}
                        size="icon"
                        variant="ghost"
                        className="hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 group hover:border-emerald-500/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                        <span className="text-slate-900 dark:text-slate-200">{studentData.phone || 'Not provided'}</span>
                      </div>
                      <Button
                        onClick={() => setEditing(true)}
                        size="sm"
                        variant="ghost"
                        className="h-8 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Edit2 className="w-3 h-3 mr-2" />
                        Edit
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-600 dark:text-slate-400">Date of Birth</Label>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                      <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                      <span className="text-slate-900 dark:text-slate-200">{new Date(studentData.dob).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 dark:text-slate-400">Age</Label>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                      <User className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                      <span className="text-slate-900 dark:text-slate-200">{studentData.age} years</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-white/5 backdrop-blur-xl border-slate-200 dark:border-white/10 shadow-lg dark:shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-slate-900 dark:text-white">
                  <KeyRound className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                  <div className="space-y-1 text-center sm:text-left">
                    <p className="font-medium text-slate-900 dark:text-white">Password</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Update your password to keep your account secure</p>
                  </div>
                  <Button
                    onClick={handleChangePassword}
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300 w-full sm:w-auto"
                  >
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
