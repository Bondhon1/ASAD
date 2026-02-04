"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { divisions, getDistricts, getUpazilas } from '@/lib/bdGeo';
import { getServiceIdForInstitute } from '@/lib/serviceAssignment';
import { useModal } from '@/components/ui/ModalProvider';

type ExperienceInput = {
  id?: string;
  title: string;
  organization: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<any>(null);
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [institute, setInstitute] = useState("");
  const [profilePicUrl, setProfilePicUrl] = useState("");
  const [division, setDivision] = useState("");
  const [district, setDistrict] = useState("");
  const [upazila, setUpazila] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [experiences, setExperiences] = useState<ExperienceInput[]>([]);
  const [guardianName, setGuardianName] = useState("");
  const [guardianContact, setGuardianContact] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { toast } = useModal();
  const [accountExpanded, setAccountExpanded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ label: string; value: string; eiin?: number | string; institutionType?: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showOtherInstitute, setShowOtherInstitute] = useState(false);
  const hideTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isLoading = loading || status === "loading";

  const skeleton = (
    <div className="max-w-4xl mx-auto px-6 py-8 animate-pulse space-y-4">
      <div className="h-8 w-40 bg-gray-200 rounded" />
      <div className="bg-white border border-gray-200 rounded-md p-4 space-y-3">
        <div className="h-4 w-48 bg-gray-200 rounded" />
        <div className="h-3 w-64 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded" />
          ))}
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded" />
      </div>
    </div>
  );

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
          setPhone(data.user.phone || "");
          setInstitute(data.user.institute?.name || "");
          setProfilePicUrl(data.user.profilePicUrl || "");
          setDivision(data.user.division || "");
          setDistrict(data.user.district || "");
          setUpazila(data.user.upazila || "");
          setAddressLine(data.user.addressLine || "");
          setGuardianName(data.user.guardianName || "");
          setGuardianContact(data.user.guardianContact || "");
          setBirthdate(data.user.birthdate ? (new Date(data.user.birthdate)).toISOString().slice(0,10) : "");
          setExperiences(
            (data.user.experiences || []).map((exp: any) => ({
              id: exp.id,
              title: exp.title || "",
              organization: exp.organization || "",
              startDate: exp.startDate ? exp.startDate.slice(0, 10) : "",
              endDate: exp.endDate ? exp.endDate.slice(0, 10) : "",
              isCurrent: exp.isCurrent || false,
            }))
          );
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [session, status]);

  // Keep district and upazila in sync with division selection
  useEffect(() => {
    const availableDistricts = getDistricts(division);
    if (division && !availableDistricts.includes(district)) {
      setDistrict("");
      setUpazila("");
    }
  }, [division, district]);

  useEffect(() => {
    const availableUpazilas = getUpazilas(division, district);
    if (district && availableUpazilas.length && !availableUpazilas.includes(upazila)) {
      setUpazila("");
    }
  }, [division, district, upazila]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // ensure we send the actual current input value (DOM) in case a recent suggestion
      // selection hasn't fully propagated to React state yet
      const instituteToSend = inputRef.current?.value ?? institute;
      
      // Check if institute change requires auto-service assignment
      const serviceId = getServiceIdForInstitute(instituteToSend);
      
      const res = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          username,
          institute: instituteToSend,
            phone,
          profilePicUrl,
            address: { division, district, upazila, addressLine },
            guardianName,
            guardianContact,
            birthdate,
          experiences,
          serviceId, // Include serviceId if institute matches special institutes
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast('Profile updated', { type: 'success' });
        // if backend returned updated user, sync local fields from it
        if (json.user) {
          setUser(json.user);
          setFullName(json.user.fullName || fullName);
          setUsername(json.user.username || username);
          setPhone(json.user.phone || phone);
          setInstitute(json.user.institute?.name || instituteToSend);
          setProfilePicUrl(json.user.profilePicUrl || profilePicUrl);
          setDivision(json.user.division || division);
          setDistrict(json.user.district || district);
          setUpazila(json.user.upazila || upazila);
          setAddressLine(json.user.addressLine || addressLine);
          setGuardianName(json.user.guardianName || guardianName);
          setGuardianContact(json.user.guardianContact || guardianContact);
          setBirthdate(json.user.birthdate ? (new Date(json.user.birthdate)).toISOString().slice(0,10) : birthdate);
          setExperiences(
            (json.user.experiences || []).map((exp: any) => ({
              id: exp.id,
              title: exp.title || '',
              organization: exp.organization || '',
              startDate: exp.startDate ? exp.startDate.slice(0, 10) : '',
              endDate: exp.endDate ? exp.endDate.slice(0, 10) : '',
              isCurrent: !!exp.isCurrent,
            }))
          );
        } else {
          setUser((prev: any) => ({ ...(prev || {}), fullName, username, institute: { name: instituteToSend }, profilePicUrl }));
        }
      } else {
        toast(json.error || 'Failed to update', { type: 'error' });
      }
    } catch (e) {
      toast('Network error', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPwMessage(null);
    if (!newPassword || newPassword.length < 8) { setPwMessage('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setPwMessage('Passwords do not match'); return; }
    // if user has a password, ensure old password provided
    if (user?.hasPassword && !currentPassword) { setPwMessage('Old password is required'); return; }
    setPwSaving(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPassword || undefined, newPassword }),
      });
      const json = await res.json();
      if (res.ok) {
        setPwMessage('Password updated');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        // refetch profile to update hasPassword flag
        const email = session?.user?.email;
        if (email) {
          const r = await fetch(`/api/user/profile?email=${encodeURIComponent(email)}`);
          const d = await r.json(); if (d.user) setUser(d.user);
        }
      } else {
        setPwMessage(json.error || 'Failed to change password');
      }
    } catch (e) {
      setPwMessage('Network error');
    } finally {
      setPwSaving(false);
    }
  };

  const handleSendResetEmail = async () => {
    setPwMessage(null);
    try {
      const email = session?.user?.email;
      if (!email) { setPwMessage('No email available'); return; }
      const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      if (res.ok) setPwMessage('Password reset email sent if account exists');
      else setPwMessage('Failed to send reset email');
    } catch (e) { setPwMessage('Network error'); }
  };

  if (status === "unauthenticated") return null;

  const displayRole = (session as any)?.user?.role || (user?.role as any) || 'VOLUNTEER';

  return (
    <DashboardLayout userRole={displayRole} userName={user?.fullName || user?.username || 'User'} userEmail={user?.email || session?.user?.email} userId={user?.id || ""}>
      {isLoading ? (
        skeleton
      ) : (
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

                      // client-side image resize/compress to avoid large uploads (prevent 413)
                      const maxBytes = 2_500_000; // target max binary size (~2.5MB)

                      async function fileToImageBitmap(f: File) {
                        if ('createImageBitmap' in window) {
                          return await createImageBitmap(f);
                        }
                        return new Promise<ImageBitmap>((resolve, reject) => {
                          const img = new Image();
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.naturalWidth;
                            canvas.height = img.naturalHeight;
                            const ctx = canvas.getContext('2d')!;
                            ctx.drawImage(img, 0, 0);
                            canvas.toBlob((b) => {
                              if (!b) return reject(new Error('decode error'));
                              createImageBitmap(b).then(resolve).catch(reject);
                            });
                          };
                          img.onerror = reject;
                          img.src = URL.createObjectURL(f);
                        });
                      }

                      async function blobToBase64(b: Blob) {
                        return await new Promise<string>((resolve, reject) => {
                          const r = new FileReader();
                          r.onload = () => resolve((r.result as string).split(',')[1]);
                          r.onerror = reject;
                          r.readAsDataURL(b);
                        });
                      }

                      try {
                        const imgBitmap = await fileToImageBitmap(file);
                        // resize if large
                        const maxDim = 1600;
                        let { width, height } = imgBitmap;
                        let scale = 1;
                        if (Math.max(width, height) > maxDim) scale = maxDim / Math.max(width, height);
                        const canvas = document.createElement('canvas');
                        canvas.width = Math.max(1, Math.round(width * scale));
                        canvas.height = Math.max(1, Math.round(height * scale));
                        const ctx = canvas.getContext('2d');
                        if (!ctx) throw new Error('Canvas not supported');
                        ctx.drawImage(imgBitmap, 0, 0, canvas.width, canvas.height);

                        // try decreasing quality until under size limit
                        let quality = 0.92;
                        let blob: Blob | null = null;
                        for (; quality >= 0.4; quality -= 0.08) {
                          // eslint-disable-next-line @typescript-eslint/no-misused-promises
                          blob = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality));
                          if (!blob) break;
                          if (blob.size <= maxBytes) break;
                        }

                        if (!blob) throw new Error('Failed to encode image');

                        const base64 = await blobToBase64(blob);

                        const res = await fetch('/api/user/upload', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ fileName: file.name, mimeType: blob.type || file.type, data: base64 }),
                        });
                        const json = await res.json();
                        if (res.ok && json.url) {
                          setProfilePicUrl(json.url);
                          setUser((prev: any) => prev ? ({ ...prev, profilePicUrl: json.url }) : prev);
                          setMessage('Uploaded avatar');
                        } else if (json.url) {
                          setProfilePicUrl(json.url);
                          setUser((prev: any) => prev ? ({ ...prev, profilePicUrl: json.url }) : prev);
                          setMessage('Uploaded (fallback)');
                        } else {
                          setMessage(json.error || 'Upload failed');
                        }
                      } catch (err) {
                        console.error('upload error', err);
                        setMessage('Upload error');
                      }
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
                      <label className="text-xs text-gray-600">Phone / Contact number</label>
                      <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full mt-1 p-2 border border-gray-100 rounded-md" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Institute</label>
                      
                      {!showOtherInstitute ? (
                        <div className="relative">
                          <input 
                            ref={inputRef} 
                            value={institute} 
                            onChange={async (e) => {
                              const v = e.target.value;
                              setInstitute(v);
                              if (!v) { 
                                setSuggestions([]); 
                                setShowSuggestions(false); 
                                return; 
                              }
                              try {
                                const res = await fetch(`/api/institutes/suggestions?q=${encodeURIComponent(v)}`);
                                const data = await res.json();
                                setSuggestions(data.suggestions || []);
                                setShowSuggestions(true);
                              } catch (err) {
                                setSuggestions([]);
                                setShowSuggestions(false);
                              }
                            }} 
                            onFocus={async (e) => {
                              // clear pending hide timeout when focusing
                              if (hideTimeoutRef.current) { 
                                window.clearTimeout(hideTimeoutRef.current); 
                                hideTimeoutRef.current = null; 
                              }
                              const v = e.currentTarget.value || '';
                              try {
                                const res = await fetch(`/api/institutes/suggestions?q=${encodeURIComponent(v)}`);
                                const data = await res.json();
                                setSuggestions(data.suggestions || []);
                                setShowSuggestions(true);
                              } catch (err) { 
                                setSuggestions([]); 
                              }
                            }} 
                            onBlur={() => { 
                              hideTimeoutRef.current = window.setTimeout(() => { 
                                setShowSuggestions(false); 
                                hideTimeoutRef.current = null; 
                              }, 150); 
                            }} 
                            placeholder="Search for your school/institute"
                            className="w-full mt-1 p-2 border border-gray-100 rounded-md" 
                          />

                          {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-md shadow-sm max-h-52 overflow-auto">
                              {suggestions.slice(0,10).map(s => (
                                <div 
                                  key={s.value} 
                                  onMouseDown={(e) => { 
                                    e.preventDefault(); 
                                    if (hideTimeoutRef.current) { 
                                      window.clearTimeout(hideTimeoutRef.current); 
                                      hideTimeoutRef.current = null; 
                                    } 
                                    setInstitute(s.value); 
                                    setShowSuggestions(false); 
                                    setUser((prev: any) => prev ? ({ ...prev, institute: { name: s.value } }) : prev); 
                                    inputRef.current?.focus(); 
                                  }} 
                                  className="p-2 text-sm hover:bg-gray-50 cursor-pointer"
                                >
                                  <div className="font-medium text-gray-800">{s.value}</div>
                                  <div className="text-xs text-gray-500">{s.eiin ? `EIIN: ${s.eiin}` : ''} {s.institutionType ? ` · ${s.institutionType}` : ''}</div>
                                </div>
                              ))}
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setShowOtherInstitute(true);
                                  setInstitute("");
                                  setShowSuggestions(false);
                                }}
                                className="w-full text-left px-2 py-3 hover:bg-blue-50 bg-blue-50 border-t-2 border-blue-200 text-blue-700 font-medium text-sm"
                              >
                                ➕ My institute is not listed - Enter manually
                              </button>
                            </div>
                          )}

                          {showSuggestions && suggestions.length === 0 && institute && (
                            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-md shadow-sm">
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setShowOtherInstitute(true);
                                  setShowSuggestions(false);
                                }}
                                className="w-full text-left px-2 py-3 hover:bg-blue-50 text-blue-700 font-medium text-sm"
                              >
                                ➕ No results found - Enter manually
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={institute}
                            onChange={(e) => setInstitute(e.target.value)}
                            placeholder="Enter your institute name manually"
                            className="w-full mt-1 p-2 border border-gray-100 rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setShowOtherInstitute(false);
                              setInstitute("");
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            ← Back to search
                          </button>
                        </div>
                      )}
                      
                      <p className="text-xs text-muted mt-1">
                        {!showOtherInstitute 
                          ? "Search and select from the list. If not found, click the button to enter manually."
                          : "Enter your institute name manually since it's not in our database."
                        }
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-600">Guardian name</label>
                      <input value={guardianName} onChange={e => setGuardianName(e.target.value)} className="w-full mt-1 p-2 border border-gray-100 rounded-md" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Guardian contact</label>
                      <input value={guardianContact} onChange={e => setGuardianContact(e.target.value)} className="w-full mt-1 p-2 border border-gray-100 rounded-md" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Birthdate</label>
                      <input type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)} className="w-full mt-1 p-2 border border-gray-100 rounded-md" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-xs text-gray-600">Division</label>
                        <select value={division} onChange={(e) => setDivision(e.target.value)} className="w-full mt-1 p-2 border border-gray-100 rounded-md bg-white">
                          <option value="">Select division</option>
                          {divisions.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">District</label>
                        <select value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full mt-1 p-2 border border-gray-100 rounded-md bg-white" disabled={!division}>
                          <option value="">{division ? 'Select district' : 'Pick division first'}</option>
                          {getDistricts(division).map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Upazila</label>
                        <select value={upazila} onChange={(e) => setUpazila(e.target.value)} className="w-full mt-1 p-2 border border-gray-100 rounded-md bg-white" disabled={!district}>
                          <option value="">{district ? 'Select upazila' : 'Pick district first'}</option>
                          {getUpazilas(division, district).map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                          {district && <option value="Other">Other / not listed</option>}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Address line</label>
                        <input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} className="w-full mt-1 p-2 border border-gray-100 rounded-md" placeholder="House, road, village or area" />
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-900">Roles & Experience</div>
                        <button type="button" onClick={() => setExperiences((prev) => [...prev, { title: "", organization: "", startDate: "", endDate: "", isCurrent: false }])} className="px-3 py-2 text-xs bg-gray-100 rounded-md text-gray-800 hover:bg-gray-200">Add experience</button>
                      </div>
                      <div className="space-y-3 mt-3">
                        {experiences.length === 0 && (
                          <div className="text-sm text-gray-500">No experience added yet.</div>
                        )}
                        {experiences.map((exp, idx) => (
                          <div key={exp.id || idx} className="border border-gray-100 rounded-md p-3 bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-gray-600">Role / Title</label>
                                <input value={exp.title} onChange={(e) => {
                                  const v = e.target.value;
                                  setExperiences((prev) => prev.map((p, i) => i === idx ? { ...p, title: v } : p));
                                }} className="w-full mt-1 p-2 border border-gray-100 rounded-md" placeholder="e.g., Coordinator" />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600">Organization</label>
                                <input value={exp.organization} onChange={(e) => {
                                  const v = e.target.value;
                                  setExperiences((prev) => prev.map((p, i) => i === idx ? { ...p, organization: v } : p));
                                }} className="w-full mt-1 p-2 border border-gray-100 rounded-md" placeholder="Institute / workplace" />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600">Start date</label>
                                <input type="date" value={exp.startDate || ''} onChange={(e) => {
                                  const v = e.target.value;
                                  setExperiences((prev) => prev.map((p, i) => i === idx ? { ...p, startDate: v } : p));
                                }} className="w-full mt-1 p-2 border border-gray-100 rounded-md" />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600">End date</label>
                                <input type="date" value={exp.endDate || ''} disabled={exp.isCurrent} onChange={(e) => {
                                  const v = e.target.value;
                                  setExperiences((prev) => prev.map((p, i) => i === idx ? { ...p, endDate: v } : p));
                                }} className="w-full mt-1 p-2 border border-gray-100 rounded-md disabled:bg-gray-100" />
                              </div>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <label className="flex items-center gap-2 text-xs text-gray-600">
                                <input type="checkbox" checked={!!exp.isCurrent} onChange={(e) => {
                                  const checked = e.target.checked;
                                  setExperiences((prev) => prev.map((p, i) => i === idx ? { ...p, isCurrent: checked, endDate: checked ? "" : p.endDate } : p));
                                }} />
                                Currently working here
                              </label>
                              <button type="button" onClick={() => setExperiences((prev) => prev.filter((_, i) => i !== idx))} className="text-xs text-red-600 hover:underline">Remove</button>
                            </div>
                          </div>
                        ))}
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

        {/* Account Section */}
        <div className="bg-white border border-gray-200 rounded-md mt-4">
          <button className="w-full text-left px-4 py-3 flex items-center justify-between" onClick={() => setAccountExpanded(v => !v)} aria-expanded={accountExpanded}>
            <div>
              <div className="text-sm font-medium text-gray-900">Account</div>
              <div className="text-xs text-gray-500">Change password or manage login. Google signups handled.</div>
            </div>
            <div className="text-gray-500">{accountExpanded ? '−' : '+'}</div>
          </button>

          {accountExpanded && (
            <div className="p-4 border-t border-gray-100">
              <div className="space-y-3 max-w-xl">
                <div className="text-sm text-gray-700">Email: {user?.email || session?.user?.email}</div>
                {user?.hasPassword ? (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-600">Old password</label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full mt-1 p-2 pr-12 border border-gray-100 rounded-md" />
                        <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500">{showPassword ? 'Hide' : 'Show'}</button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">New password</label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full mt-1 p-2 pr-12 border border-gray-100 rounded-md" />
                        <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500">{showPassword ? 'Hide' : 'Show'}</button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Confirm new password</label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full mt-1 p-2 pr-12 border border-gray-100 rounded-md" />
                        <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500">{showPassword ? 'Hide' : 'Show'}</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={handleChangePassword} disabled={pwSaving} className="px-4 py-2 bg-[#07223f] text-white rounded-md">{pwSaving ? 'Saving...' : 'Change password'}</button>
                      {pwMessage && <div className="text-sm text-gray-600">{pwMessage}</div>}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {user?.authProviders && user.authProviders.includes('google') && (
                      <div className="text-sm text-gray-700">This account was created via Google sign-in and has no password set.</div>
                    )}
                    <div className="text-sm text-gray-600">No password is set for this account. Send a set-password email to create one.</div>
                    <div className="flex items-center gap-3">
                      <button onClick={handleSendResetEmail} className="px-3 py-2 border border-gray-100 rounded-md text-sm">Send set-password email</button>
                      {pwMessage && <div className="text-sm text-gray-600">{pwMessage}</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

    </DashboardLayout>
  );
}
