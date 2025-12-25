"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Calendar, Users, Link as LinkIcon, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AppLoading from "@/components/ui/AppLoading";
import useDelayedLoader from '@/lib/useDelayedLoader';

interface InterviewSlot {
  id: string;
  startTime: string;
  endTime: string;
  meetLink: string;
  capacity: number;
  filledCount: number;
  _count?: {
    applications: number;
  };
}

interface CalendarStatus {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
}

function InterviewSlotsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({
    connected: false,
    email: null,
    connectedAt: null,
  });
  const [formData, setFormData] = useState({
    startDate: "",
    startTime: "",
    endTime: "",
    capacity: 20,
    meetLink: "",
    autoCreateMeet: true,
  });
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (status === "unauthenticated") {
        router.push("/auth");
        return;
      }

      if (status === "loading") return;

      const userEmail = session?.user?.email || localStorage.getItem("userEmail");
      if (!userEmail) {
        router.push("/auth");
        return;
      }

      try {
        const userResponse = await fetch(`/api/user/profile?email=${encodeURIComponent(userEmail)}`);
        const userData = await userResponse.json();
        
        if (!userData.user || (userData.user.role !== "HR" && userData.user.role !== "MASTER")) {
          router.push("/dashboard");
          return;
        }
        
        setUser(userData.user);
        fetchSlots();
        fetchCalendarStatus();
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, session, status]);

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get("calendar_code");
    const error = searchParams.get("calendar_error");

    if (code) {
      handleCalendarCallback(code);
    } else if (error) {
      alert(`Failed to connect Google Calendar: ${error}`);
      // Remove error from URL
      router.replace("/dashboard/hr/interviews");
    }
  }, [searchParams]);

  const fetchCalendarStatus = async () => {
    try {
      const response = await fetch("/api/hr/calendar-status");
      const data = await response.json();
      setCalendarStatus(data);
      
      // Update form default if calendar not connected
      if (!data.connected) {
        setFormData(prev => ({ ...prev, autoCreateMeet: false }));
      }
    } catch (error) {
      console.error("Error fetching calendar status:", error);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const response = await fetch("/api/hr/connect-calendar");
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error("Error initiating calendar connection:", error);
      alert("Failed to initiate calendar connection");
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!confirm("Are you sure you want to disconnect your Google Calendar?")) {
      return;
    }

    try {
      const response = await fetch("/api/hr/connect-calendar", {
        method: "DELETE",
      });
      
      if (response.ok) {
        setCalendarStatus({ connected: false, email: null, connectedAt: null });
        alert("Google Calendar disconnected successfully");
      }
    } catch (error) {
      console.error("Error disconnecting calendar:", error);
      alert("Failed to disconnect calendar");
    }
  };

  const handleCalendarCallback = async (code: string) => {
    try {
      const response = await fetch("/api/hr/connect-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setCalendarStatus({ connected: true, email: data.email, connectedAt: new Date().toISOString() });
        alert(`Google Calendar connected successfully as ${data.email}`);
      } else {
        alert(`Failed to connect: ${data.error}`);
      }
    } catch (error) {
      console.error("Error completing calendar connection:", error);
      alert("Failed to complete calendar connection");
    } finally {
      // Remove code from URL
      router.replace("/dashboard/hr/interviews");
    }
  };

  const fetchSlots = async () => {
    try {
      const response = await fetch("/api/hr/interview-slots");
      const data = await response.json();
      setSlots(data.slots || []);
    } catch (error) {
      console.error("Error fetching slots:", error);
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.startDate}T${formData.endTime}`);

    setLoading(true);
    try {
      const response = await fetch("/api/hr/interview-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          capacity: formData.capacity,
          autoCreateMeet: formData.autoCreateMeet,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setShowCreateModal(false);
        setFormData({
          startDate: "",
          startTime: "",
          endTime: "",
          capacity: 20,
          meetLink: "",
          autoCreateMeet: true,
        });
        fetchSlots();
        alert(data.message || "Slot created successfully!");
      } else {
        alert(data.error || "Failed to create slot");
      }
    } catch (error) {
      console.error("Error creating slot:", error);
      alert("Failed to create slot");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Are you sure? This will unassign all applicants from this slot.")) return;

    try {
      const response = await fetch(`/api/hr/interview-slots/${slotId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchSlots();
      } else {
        alert("Failed to delete slot");
      }
    } catch (error) {
      console.error("Error deleting slot:", error);
    }
  };

  const generateMeetLink = () => {
    // Generate a random Google Meet-style link
    const randomId = Math.random().toString(36).substring(2, 12);
    setFormData({
      ...formData,
      meetLink: `https://meet.google.com/${randomId}`,
    });
  };

  const fetchParticipants = async (slotId: string) => {
    setParticipantsLoading(true);
    try {
      const res = await fetch(`/api/hr/interview-slots/${slotId}/participants`);
      const data = await res.json();
      setParticipants(data.applications || []);
    } catch (error) {
      console.error("Error fetching participants:", error);
      setParticipants([]);
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleOpenParticipants = (slotId: string) => {
    setSelectedSlotId(slotId);
    setShowParticipantsModal(true);
    fetchParticipants(slotId);
  };

  const handleCloseParticipants = () => {
    setShowParticipantsModal(false);
    setSelectedSlotId(null);
    setParticipants([]);
  };

  const handleApproveDecline = async (applicationId: string, action: "approve" | "decline") => {
    if (!selectedSlotId) return;
    if (!confirm(`Are you sure you want to ${action} this applicant?`)) return;

    try {
      const res = await fetch(`/api/hr/interview-slots/${selectedSlotId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, action }),
      });

      const data = await res.json();
      if (res.ok) {
        // refresh participants and slots
        fetchParticipants(selectedSlotId);
        fetchSlots();
        alert("Action completed");
      } else {
        alert(data.error || "Failed to update participant");
      }
    } catch (error) {
      console.error("Error updating participant:", error);
      alert("Failed to update participant");
    }
  };

  const showLoader = useDelayedLoader(loading, 300);
  if (showLoader) return <AppLoading />;

  if (!user) return null;

  return (
    <DashboardLayout
      userRole={(user.role as "VOLUNTEER" | "HR" | "MASTER") || "HR"}
      userName={user.fullName || user.username || "HR"}
      userEmail={user.email}
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Interview Slots</h1>
            <p className="text-gray-600 mt-2">Manage interview scheduling and Google Meet sessions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2a4d75] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Slot
          </button>
        </div>

        {/* Google Calendar Connection Card */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-[#1E3A5F]" />
              <div>
                <h3 className="font-semibold text-gray-900">Google Calendar</h3>
                {calendarStatus.connected ? (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Connected as {calendarStatus.email}
                  </p>
                ) : (
                  <p className="text-sm text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Not connected - Connect to auto-create Meet links
                  </p>
                )}
              </div>
            </div>
            {calendarStatus.connected ? (
              <button
                onClick={handleDisconnectCalendar}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnectCalendar}
                className="px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2a4d75] transition-colors"
              >
                Connect Calendar
              </button>
            )}
          </div>
        </motion.div>

        {/* Slots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {slots.map((slot, index) => (
            <motion.div
              key={slot.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#1E3A5F]" />
                  <h3 className="font-semibold text-gray-900">
                    {new Date(slot.startTime).toLocaleDateString()}
                  </h3>
                </div>
                <button
                  onClick={() => handleDeleteSlot(slot.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Time</p>
                  <p className="font-medium text-gray-900">
                    {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Capacity</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-900">
                      {slot.filledCount} / {slot.capacity}
                    </span>
                    <span className={`ml-auto text-sm px-2 py-0.5 rounded-full ${
                      slot.filledCount >= slot.capacity 
                        ? "bg-red-100 text-red-700" 
                        : slot.filledCount > slot.capacity * 0.7
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {slot.filledCount >= slot.capacity ? "Full" : `${slot.capacity - slot.filledCount} left`}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Meet Link</p>
                  <a
                    href={slot.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 break-all"
                  >
                    <LinkIcon className="w-4 h-4 flex-shrink-0" />
                    {slot.meetLink}
                  </a>
                </div>
                <div className="pt-3">
                  <button
                    onClick={() => handleOpenParticipants(slot.id)}
                    className="px-3 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2a4d75] transition-colors text-sm"
                  >
                    View Participants
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {slots.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No interview slots yet</h3>
              <p className="text-gray-600 mb-4">Create your first slot to start scheduling interviews</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2a4d75] transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create First Slot
              </button>
            </div>
          )}
        </div>

        {/* Participants Modal */}
        {showParticipantsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Participants</h2>
                <button onClick={handleCloseParticipants} className="text-gray-600 hover:text-gray-800">Close</button>
              </div>

              {participantsLoading ? (
                <div className="py-4"><AppLoading /></div>
              ) : participants.length === 0 ? (
                <div className="text-center py-8">No participants registered for this slot.</div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[55vh] pr-2">
                  {participants.map((app) => (
                    <div key={app.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <img src={app.user?.profilePicUrl || '/default-avatar.png'} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                        <div>
                          <div className="font-medium">{app.user?.fullName || app.user?.email}</div>
                          <div className="text-sm text-gray-600">{app.user?.email}</div>
                          <div className="text-xs text-gray-500">Application status: {app.status}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleApproveDecline(app.id, 'approve')} className="px-3 py-1 bg-green-50 text-green-700 rounded-md">Approve</button>
                        <button onClick={() => handleApproveDecline(app.id, 'decline')} className="px-3 py-1 bg-red-50 text-red-700 rounded-md">Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Interview Slot</h2>
              <form onSubmit={handleCreateSlot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacity (20-30 recommended)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="50"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                  />
                </div>

                <div className={`border rounded-lg p-4 ${calendarStatus.connected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="autoCreateMeet"
                      checked={formData.autoCreateMeet}
                      onChange={(e) => setFormData({ ...formData, autoCreateMeet: e.target.checked })}
                      disabled={!calendarStatus.connected}
                      className="mt-1 w-4 h-4 text-[#1E3A5F] border-gray-300 rounded focus:ring-[#1E3A5F] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="flex-1">
                      <label htmlFor="autoCreateMeet" className={`font-medium ${calendarStatus.connected ? 'text-gray-900' : 'text-gray-500'} cursor-pointer`}>
                        🚀 Auto-generate Google Meet link
                      </label>
                      {calendarStatus.connected ? (
                        <p className="text-sm text-gray-600 mt-1">
                          Automatically create a Google Calendar event with Meet link from your account ({calendarStatus.email}). 
                          Invitation emails will be sent automatically when you approve applications.
                        </p>
                      ) : (
                        <p className="text-sm text-amber-600 mt-1">
                          ⚠️ Connect your Google Calendar above to enable auto-creation. 
                          Each HR can connect their own account to host Meet sessions.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {!formData.autoCreateMeet && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Google Meet Link (Manual)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        required={!formData.autoCreateMeet}
                        placeholder="https://meet.google.com/xxx-xxxx-xxx"
                        value={formData.meetLink}
                        onChange={(e) => setFormData({ ...formData, meetLink: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                      />
                      <button
                        type="button"
                        onClick={generateMeetLink}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Generate sample link"
                      >
                        <LinkIcon className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Create a meeting in Google Meet and paste the link here
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2a4d75] transition-colors"
                  >
                    Create Slot
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function InterviewSlotsPage() {
  return (
    <Suspense fallback={
      <AppLoading />
    }>
      <InterviewSlotsContent />
    </Suspense>
  );
}
