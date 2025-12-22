"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<any>(null);
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [institute, setInstitute] = useState("");
  const [profilePicUrl, setProfilePicUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ label: string; value: string; eiin?: number | string; institutionType?: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (status !== "authenticated") return;
      setLoading(true);
      const email = session?.user?.email;
      if (!email) return;
      try {
        const res = await fetch(`/api/user/profile?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          setFullName(data.user.fullName || "");
          setUsername(data.user.username || "");
          setInstitute(data.user.institute?.name || "");
          setProfilePicUrl(data.user.profilePicUrl || "");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [session, status]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, username, institute, profilePicUrl }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessage('Profile updated');
        // if backend returned updated user, sync local fields from it
        if (json.user) {
          setUser(json.user);
          setFullName(json.user.fullName || fullName);
          setUsername(json.user.username || username);
          setInstitute(json.user.institute?.name || institute);
          setProfilePicUrl(json.user.profilePicUrl || profilePicUrl);
        } else {
          setUser((prev: any) => ({ ...(prev || {}), fullName, username, institute: { name: institute }, profilePicUrl }));
        }
      } else {
        setMessage(json.error || 'Failed to update');
      }
    } catch (e) {
      setMessage('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <DashboardLayout userRole={(user?.role as any) || 'VOLUNTEER'} userName={user?.fullName || user?.username || 'User'} userEmail={user?.email}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-semibold text-[#07223f] mb-4">Settings</h1>

        <div className="bg-white border border-gray-200 rounded-md">
          <button
            className="w-full text-left px-4 py-3 flex items-center justify-between"
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
          >
            <div>
              <div className="text-sm font-medium text-gray-900">Profile</div>
              <div className="text-xs text-gray-500">Update your non-sensitive information and profile picture</div>
            </div>
            <div className="text-gray-500">{expanded ? '−' : '+'}</div>
          </button>

          {expanded && (
            <div className="p-4 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 flex flex-col items-center">
                  <div className="w-28 h-28 bg-gray-50 rounded-md overflow-hidden border border-gray-200 flex items-center justify-center mb-3">
                    {profilePicUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profilePicUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5a8.25 8.25 0 0115 0" />
                      </svg>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">Upload a local file or paste an image URL using the input below</div>
                  <div className="mt-2 flex items-center gap-2">
                    <input type="file" accept="image/*" id="avatarFileInput" className="hidden" onChange={async (e) => {
                      const file = e.currentTarget.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async () => {
                        const dataUrl = reader.result as string;
                        const base64 = dataUrl.split(',')[1];
                        try {
                          const res = await fetch('/api/user/upload', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ fileName: file.name, mimeType: file.type, data: base64 }),
                          });
                          const json = await res.json();
                          if (res.ok && json.url) {
                            setProfilePicUrl(json.url);
                            setUser((prev: any) => prev ? ({ ...prev, profilePicUrl: json.url }) : prev);
                            setMessage('Uploaded avatar');
                          } else if (json.url) {
                            // fallback data url
                            setProfilePicUrl(json.url);
                            setUser((prev: any) => prev ? ({ ...prev, profilePicUrl: json.url }) : prev);
                            setMessage('Uploaded (fallback)');
                          } else {
                            setMessage(json.error || 'Upload failed');
                          }
                        } catch (err) {
                          setMessage('Upload error');
                        }
                      };
                      reader.readAsDataURL(file);
                    }} />

                    <label htmlFor="avatarFileInput" className="inline-flex items-center gap-2 px-3 py-2 bg-[#07223f] text-white text-sm rounded-md cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l2.25 3L12 11.25l2.25 3L16.5 9"/></svg>
                      Upload image
                    </label>
                    <button type="button" onClick={() => { setProfilePicUrl(''); setUser((prev: any) => prev ? ({ ...prev, profilePicUrl: null }) : prev); setMessage(null); }} className="text-sm text-gray-500">Remove</button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-600">Full name</label>
                      <input value={fullName} onChange={e=>setFullName(e.target.value)} className="w-full mt-1 p-2 border border-gray-100 rounded-md" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Username</label>
                      <input value={username} disabled className="w-full mt-1 p-2 border border-gray-100 rounded-md bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Institute</label>
                      <div className="relative">
                        <input value={institute} onChange={async (e) => {
                          const v = e.target.value;
                          setInstitute(v);
                          if (!v) { setSuggestions([]); setShowSuggestions(false); return; }
                          try {
                            const res = await fetch(`/api/institutes/suggestions?q=${encodeURIComponent(v)}`);
                            const data = await res.json();
                            setSuggestions(data.suggestions || []);
                            setShowSuggestions(true);
                          } catch (err) {
                            setSuggestions([]);
                            setShowSuggestions(false);
                          }
                        }} onFocus={async (e) => {
                          const v = e.currentTarget.value || '';
                          try {
                            const res = await fetch(`/api/institutes/suggestions?q=${encodeURIComponent(v)}`);
                            const data = await res.json();
                            setSuggestions(data.suggestions || []);
                            setShowSuggestions(true);
                          } catch (err) { setSuggestions([]); }
                        }} onBlur={() => { setTimeout(()=>setShowSuggestions(false), 150); }} className="w-full mt-1 p-2 border border-gray-100 rounded-md" />

                        {showSuggestions && suggestions.length > 0 && (
                          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-md shadow-sm max-h-52 overflow-auto">
                            {suggestions.slice(0,5).map(s => (
                              <div key={s.value} onClick={() => { setInstitute(s.value); setShowSuggestions(false); setUser((prev: any) => prev ? ({ ...prev, institute: { name: s.value } }) : prev); }} className="p-2 text-sm hover:bg-gray-50 cursor-pointer">
                                <div className="font-medium text-gray-800">{s.value}</div>
                                <div className="text-xs text-gray-500">{s.eiin ? `EIIN: ${s.eiin}` : ''} {s.institutionType ? ` · ${s.institutionType}` : ''}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#07223f] text-white rounded-md">{saving ? 'Saving...' : 'Save changes'}</button>
                      {message && <div className="text-sm text-gray-600">{message}</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
