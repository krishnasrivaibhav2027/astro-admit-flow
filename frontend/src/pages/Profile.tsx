import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, Calendar, Edit2, Save, X, KeyRound, ArrowLeft } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

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
        toast({
          title: "Not Logged In",
          description: "Please login to view your profile.",
          variant: "destructive"
        });
        navigate("/login");
        return;
      }

      // Get Firebase token
      const token = localStorage.getItem('firebase_token');
      if (!token) {
        navigate("/login");
        return;
      }

      // Fetch student data from backend
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/students/by-email/${email}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile data');
      }

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

      if (!response.ok) {
        throw new Error('Failed to update phone number');
      }

      const result = await response.json();
      setStudentData(result.student);
      setEditing(false);

      toast({
        title: "Updated!",
        description: "Phone number updated successfully.",
      });
    } catch (error: any) {
      console.error('Error updating phone:', error);
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
      if (!email) {
        throw new Error('Email not found');
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/send-password-reset-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to_email: email
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to send password reset email');
      }

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

  if (!studentData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-purple-50 to-blue-50 dark:from-background dark:via-purple-950/20 dark:to-blue-950/20" />
      
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>

      {/* Content */}
      <div className="relative z-10 container max-w-4xl mx-auto px-4 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate("/levels")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Levels
        </Button>

        <Card className="backdrop-blur-sm bg-background/80">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-3">
              <User className="w-8 h-8 text-primary" />
              My Profile
            </CardTitle>
            <CardDescription>
              View and manage your personal information
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Name Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">First Name</Label>
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{studentData.first_name}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Last Name</Label>
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{studentData.last_name}</span>
                </div>
              </div>
            </div>

            {/* Email Section */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Email</Label>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{studentData.email}</span>
              </div>
            </div>

            {/* Phone Section - Editable */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Phone Number</Label>
              {editing ? (
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <Input
                      value={editedPhone}
                      onChange={(e) => setEditedPhone(e.target.value)}
                      placeholder="Phone number"
                      className="pl-10"
                    />
                  </div>
                  <Button
                    onClick={handleSavePhone}
                    disabled={loading}
                    size="icon"
                    variant="default"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => {
                      setEditing(false);
                      setEditedPhone(studentData.phone);
                    }}
                    size="icon"
                    variant="outline"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{studentData.phone}</span>
                  </div>
                  <Button
                    onClick={() => setEditing(true)}
                    size="sm"
                    variant="ghost"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              )}
            </div>

            {/* DOB and Age Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Date of Birth</Label>
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{new Date(studentData.dob).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Age</Label>
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{studentData.age} years</span>
                </div>
              </div>
            </div>

            {/* Change Password Section */}
            <div className="pt-6 border-t">
              <Button
                onClick={handleChangePassword}
                variant="outline"
                className="w-full"
              >
                <KeyRound className="w-4 h-4 mr-2" />
                Change Password
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                A password reset link will be sent to your email
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
