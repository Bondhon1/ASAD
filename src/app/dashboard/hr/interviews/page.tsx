"use client";

import { useEffect, useMemo, useState, Suspense, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Calendar, Users, Link as LinkIcon, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useCachedUserProfile } from "@/hooks/useCachedUserProfile";

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

  const email = useMemo(() => session?.user?.email || (typeof window !== "undefined" ? window.localStorage.getItem("userEmail") : null), [session?.user?.email]);
  const { user, loading: userCacheLoading, refresh: refreshUser, setUser } = useCachedUserProfile(email);

  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({ connected: false, email: null, connectedAt: null });
  const [formData, setFormData] = useState({ startDate: "", startTime: "", endTime: "", capacity: 20, meetLink: "", autoCreateMeet: true });
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  const isLoading = loading || userCacheLoading || status === "loading";

  const skeletonGrid = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse space-y-4">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-24 bg-gray-200 rounded" />
          <div className="h-3 w-40 bg-gray-200 rounded" />
          <div className="h-10 w-full bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );

  const skeletonPage = (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between animate-pulse">
        <div className="space-y-2">
          <div className="h-6 w-40 bg-gray-200 rounded" />
          <div className="h-4 w-64 bg-gray-200 rounded" />
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded" />
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 animate-pulse">
        <div className="h-4 w-48 bg-gray-200 rounded" />
        <div className="h-3 w-32 bg-gray-200 rounded mt-3" />
      </div>
      {skeletonGrid}
    </div>
  );

  const displayName = useMemo(() => user?.fullName || user?.username || session?.user?.name || "HR", [session?.user?.name, user?.fullName, user?.username]);
  const displayEmail = useMemo(() => user?.email || session?.user?.email || "", [session?.user?.email, user?.email]);
  const displayRole = useMemo(() => (session as any)?.user?.role || (user?.role as "VOLUNTEER" | "HR" | "MASTER" | "ADMIN") || "HR", [session, user?.role]);

  useEffect(() => {
    const fetchUserAndSlots = async () => {
      if (status === "unauthenticated") {
        router.push("/auth");
        return;
      }
      if (status === "loading") return;
      if (!email) {
        router.push("/auth");
        return;
      }

      try {
        const currentUser = user || (await refreshUser());
        if (!currentUser) return;
        if (currentUser.role !== "HR" && currentUser.role !== "MASTER" && currentUser.role !== "ADMIN") {
          router.push("/dashboard");
          return;
        }
        setUser(currentUser);
        await Promise.all([fetchSlots(), fetchCalendarStatus()]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndSlots();
  }, [router, session, status, email, user, refreshUser, setUser]);

  // Handle OAuth callback from Google Calendar (exchange code for token)
  useEffect(() => {
    const code = searchParams?.get("calendar_code");
    if (!code) return;

    const exchange = async () => {
      try {
        const response = await fetch("/api/hr/connect-calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        if (!response.ok) {
          console.error("Calendar code exchange failed:", await response.text());
          alert("Failed to connect Google Calendar. Please try again.");
          return;
        }
        await fetchCalendarStatus();
        await fetchSlots();
        router.replace("/dashboard/hr/interviews");
        alert("Google Calendar connected successfully.");
      } catch (error) {
        console.error("Error exchanging calendar code:", error);
        alert("Failed to connect Google Calendar. Please try again.");
      }
    };

    exchange();
  }, [router, searchParams]);

  const fetchSlots = async () => {
    try {
      const response = await fetch("/api/hr/interview-slots");
      const data = await response.json();
      setSlots(data.slots || []);
    } catch (error) {
      console.error("Error fetching slots:", error);
    }
  };

  const fetchCalendarStatus = async () => {
    try {
      const response = await fetch("/api/hr/calendar-status");
      if (!response.ok) {
        console.error("Calendar status failed:", await response.text());
        setCalendarStatus({ connected: false, email: null, connectedAt: null });
        return;
      }
      const data = await response.json();
      setCalendarStatus({ connected: !!data.connected, email: data.email ?? null, connectedAt: data.connectedAt ?? null });
    } catch (error) {
      console.error("Error fetching calendar status:", error);
      setCalendarStatus({ connected: false, email: null, connectedAt: null });
    }
  };

  const generateMeetLink = () => {
    const token = Math.random().toString(36).substring(2, 9);
    setFormData((prev) => ({ ...prev, meetLink: `https://meet.google.com/${token}` }));
  };

  const handleCreateSlot = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.startDate || !formData.startTime || !formData.endTime) {
      alert("Please fill date and time.");
      return;
    }

    const startTime = new Date(`${formData.startDate}T${formData.startTime}:00`).toISOString();
    const endTime = new Date(`${formData.startDate}T${formData.endTime}:00`).toISOString();

    try {
      const response = await fetch("/api/hr/interview-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTime, endTime, capacity: formData.capacity, meetLink: formData.autoCreateMeet ? undefined : formData.meetLink, autoCreateMeet: formData.autoCreateMeet }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to create slot");
        return;
      }

      await fetchSlots();
      setShowCreateModal(false);
      setFormData({ startDate: "", startTime: "", endTime: "", capacity: 20, meetLink: "", autoCreateMeet: true });
    } catch (error) {
      console.error("Error creating slot:", error);
      alert("Failed to create slot");
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Delete this interview slot?")) return;
    try {
      await fetch(`/api/hr/interview-slots/${slotId}`, { method: "DELETE" });
      fetchSlots();
    } catch (error) {
      console.error("Error deleting slot:", error);
    }
  };

  const handleOpenParticipants = async (slotId: string) => {
    setSelectedSlotId(slotId);
    setShowParticipantsModal(true);
    setParticipantsLoading(true);
    try {
      const response = await fetch(`/api/hr/applications?status=INTERVIEW_SCHEDULED&slotId=${slotId}`);
      const data = await response.json();
      setParticipants(data.applications || []);
    } catch (error) {
      console.error("Error loading participants:", error);
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleCloseParticipants = () => {
    setShowParticipantsModal(false);
    setSelectedSlotId(null);
    setParticipants([]);
  };

  const handleApproveDecline = async (applicationId: string, action: "approve" | "decline") => {
    if (!selectedSlotId) return;
    try {
      const response = await fetch(`/api/hr/interview-slots/${selectedSlotId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, action }),
      });
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to update application");
        return;
      }
      await handleOpenParticipants(selectedSlotId);
    } catch (error) {
      console.error("Error updating application:", error);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const response = await fetch("/api/hr/connect-calendar");
      if (!response.ok) {
        console.error("Connect calendar failed:", await response.text());
        alert("Failed to start Google Calendar connection.");
        return;
      }
      const data = await response.json();
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      } else {
        alert("No authorization URL returned. Please try again.");
      }
    } catch (error) {
      console.error("Error starting calendar connection:", error);
      alert("Failed to start Google Calendar connection.");
    }
  };

  const handleDisconnectCalendar = async () => {
    try {
      const response = await fetch("/api/hr/connect-calendar", { method: "DELETE" });
      if (!response.ok) {
        console.error("Disconnect calendar failed:", await response.text());
        alert("Failed to disconnect calendar.");
        return;
      }
      fetchCalendarStatus();
    } catch (error) {
      console.error("Error disconnecting calendar:", error);
      alert("Failed to disconnect calendar.");
    }
  };

  if (status === "unauthenticated") return null;

  return (
    <DashboardLayout
      userRole={displayRole}
      userName={displayName}
      userEmail={displayEmail}
      userId={user?.id || ""}
      initialUserStatus={user?.status}
      initialFinalPaymentStatus={user?.finalPayment?.status}
    >
      {isLoading || !user ? skeletonPage : (
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Interview Slots</h1>
              <p className="text-gray-600 mt-2">Manage interview scheduling and Google Meet sessions</p>
            </div>
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2a4d75] transition-colors">
              <Plus className="w-5 h-5" />
              Create Slot
            </button>
          </div>

          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
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
                <button onClick={handleDisconnectCalendar} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  Disconnect
                </button>
              ) : (
                <button onClick={handleConnectCalendar} className="px-4 py-2 text-sm bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2a4d75] transition-colors">
                  Connect Calendar
                </button>
              )}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {slots.length === 0 ? (
              <div className="col-span-full bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-600">
                No interview slots yet. Create one to start scheduling interviews.
              </div>
            ) : (
              slots.map((slot, index) => (
                <motion.div key={slot.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#1E3A5F]" />
                      <h3 className="font-semibold text-gray-900">{new Date(slot.startTime).toLocaleDateString()}</h3>
                    </div>
                    <button onClick={() => handleDeleteSlot(slot.id)} className="text-red-600 hover:text-red-700" title="Delete slot">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Time:</span>
                      <span className="font-medium">{new Date(slot.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(slot.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Capacity:</span>
                      <span className="font-medium">{slot._count?.applications ?? slot.filledCount} / {slot.capacity}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Meet:</span>
                      <a href={slot.meetLink} target="_blank" rel="noreferrer" className="text-[#1E3A5F] underline">{slot.meetLink}</a>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <button onClick={() => handleOpenParticipants(slot.id)} className="flex items-center gap-2 px-3 py-2 text-sm text-[#1E3A5F] bg-[#1E3A5F]/10 rounded-md">
                      <Users className="w-4 h-4" />
                      View Participants
                    </button>
                    <button onClick={generateMeetLink} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border rounded-md">
                      <LinkIcon className="w-4 h-4" />
                      Regenerate Link
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Create Interview Slot</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">×</button>
            </div>
            <form onSubmit={handleCreateSlot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interview Date</label>
                <input type="date" required value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input type="time" required value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input type="time" required value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (20-30 recommended)</label>
                <input type="number" required min="1" max="50" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value, 10) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
              </div>

              <div className={`border rounded-lg p-4 ${calendarStatus.connected ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="autoCreateMeet" checked={formData.autoCreateMeet} onChange={(e) => setFormData({ ...formData, autoCreateMeet: e.target.checked })} disabled={!calendarStatus.connected} className="mt-1 w-4 h-4 text-[#1E3A5F] border-gray-300 rounded focus:ring-[#1E3A5F] disabled:opacity-50 disabled:cursor-not-allowed" />
                  <div className="flex-1">
                    <label htmlFor="autoCreateMeet" className={`font-medium ${calendarStatus.connected ? "text-gray-900" : "text-gray-500"} cursor-pointer`}>
                      🚀 Auto-generate Google Meet link
                    </label>
                    {calendarStatus.connected ? (
                      <p className="text-sm text-gray-600 mt-1">Automatically create a Google Calendar event with Meet link from your account ({calendarStatus.email}). Invitation emails will be sent automatically when you approve applications.</p>
                    ) : (
                      <p className="text-sm text-amber-600 mt-1">⚠️ Connect your Google Calendar above to enable auto-creation. Each HR can connect their own account to host Meet sessions.</p>
                    )}
                  </div>
                </div>
              </div>

              {!formData.autoCreateMeet && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Google Meet Link (Manual)</label>
                  <div className="flex gap-2">
                    <input type="url" required={!formData.autoCreateMeet} placeholder="https://meet.google.com/xxx-xxxx-xxx" value={formData.meetLink} onChange={(e) => setFormData({ ...formData, meetLink: e.target.value })} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]" />
                    <button type="button" onClick={generateMeetLink} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors" title="Generate sample link">
                      <LinkIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Create a meeting in Google Meet and paste the link here</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2a4d75] transition-colors">
                  Create Slot
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showParticipantsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Participants</h3>
              <button onClick={handleCloseParticipants} className="text-gray-500 hover:text-gray-700">×</button>
            </div>
            {participantsLoading ? (
              <div className="py-10 text-center text-gray-600">Loading participants...</div>
            ) : participants.length === 0 ? (
              <div className="py-10 text-center text-gray-500">No participants yet.</div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {participants.map((app) => (
                  <div key={app.id} className="border border-gray-200 rounded-lg p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{app.user?.fullName || app.user?.email}</div>
                        <div className="text-sm text-gray-600">{app.user?.email}</div>
                        <div className="text-xs text-gray-500">{app.user?.phone}</div>
                      </div>
                      <div className="text-sm text-gray-700">Status: {app.status}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleApproveDecline(app.id, "approve")} className="px-3 py-2 bg-green-50 text-green-700 rounded">
                        Approve
                      </button>
                      <button onClick={() => handleApproveDecline(app.id, "decline")} className="px-3 py-2 bg-red-50 text-red-700 rounded">
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function InterviewSlotsPage() {
  return (
    <Suspense fallback={null}>
      <InterviewSlotsContent />
    </Suspense>
  );
}
