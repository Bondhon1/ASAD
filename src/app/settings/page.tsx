"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
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
  // Sectors & Clubs state
  const [orgsExpanded, setOrgsExpanded] = useState(false);
  const [sectors, setSectors] = useState<Array<{ id: string; name: string; imageUrl?: string | null; description?: string | null; isOpen: boolean }>>([]);
  const [clubs, setClubs] = useState<Array<{ id: string; name: string; imageUrl?: string | null; description?: string | null; isOpen: boolean }>>([]); 
  const [joinRequests, setJoinRequests] = useState<Array<{ id: string; type: string; entityId: string; entityName: string | null; status: string }>>([]);
  const [submittingJoin, setSubmittingJoin] = useState<string | null>(null); // entityId being joined
  const [userSectors, setUserSectors] = useState<string[]>([]);
  const [userClubs, setUserClubs] = useState<string[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<{ id: string; name: string; type: 'SECTOR' | 'CLUB'; imageUrl?: string | null; description?: string | null; isOpen: boolean } | null>(null);
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
          // Sync sectors/clubs from volunteer profile
          setUserSectors(data.user.volunteerProfile?.sectors || []);
          setUserClubs(data.user.volunteerProfile?.clubs || []);
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

  // Sectors & Clubs handlers
  const fetchOrgs = async () => {
    try {
      const [orgsRes, joinRes] = await Promise.all([
        fetch('/api/orgs', { cache: 'no-store' }),
        fetch('/api/user/org-join-requests'),
      ]);
      const orgsData = await orgsRes.json();
      const joinData = await joinRes.json();
      setSectors(orgsData.sectors || []);
      setClubs(orgsData.clubs || []);
      setJoinRequests(joinData.requests || []);
    } catch (e) {
      console.error('Failed to fetch orgs', e);
    }
  };

  const handleJoinRequest = async (type: 'SECTOR' | 'CLUB', entityId: string) => {
    setSubmittingJoin(entityId);
    try {
      const res = await fetch('/api/user/org-join-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type, entityId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      toast('Join request submitted!', { type: 'success' });
      if (data?.request) {
        setJoinRequests((prev) => {
          const filtered = prev.filter(r => !(r.type === type && r.entityId === entityId));
          return [data.request, ...filtered];
        });
      }
    } catch (e: any) {
      toast(e?.message || 'Failed to submit request', { type: 'error' });
    } finally {
      setSubmittingJoin(null);
    }
  };

  // Static descriptions from the public sectors page
  const getSectorDescription = (name: string, dbDescription?: string | null): string => {
    if (dbDescription) return dbDescription;
    const n = name.toLowerCase();
    if (n.includes('cultural')) return 'Works to develop and showcase volunteers\' talents through regular creative activities, live shows, workshops, and interactive sessions, while recognizing outstanding contributions through monthly awards and an annual mega event.';
    if (n.includes('photo')) return 'Enhances volunteers\' photography skills through regular photo posts, weekly features, tutorial sharing, workshops, and interactive sessions, while recognizing excellence and covering all organizational outdoor events.';
    if (n.includes('blood')) return 'Promotes blood donation awareness through regular posts, monthly reports and donor lists. Strengthens volunteer engagement with adda sessions and appreciates donors through dedicated posts.';
    if (n.includes('nature') || n.includes('environment')) return 'Raises awareness about environmental care through regular posts, tree planting drives, clean-up campaigns, and indoor activities like sapling distribution and workshops.';
    if (n.includes('education')) return 'Supports learning through regular workshops, indoor classes, and distribution of educational materials, while promoting awareness in rural areas and recognizing top contributors each month.';
    if (n.includes('charity')) return 'Supports the underprivileged through regular fundraising, relief distribution, special outdoor events during festivals, and essential services like healthcare, clothing, and food.';
    if (n.includes('medical')) return 'Promotes health awareness through regular posts and seminars, organizes free health camps, distributes medical supplies, and offers special sessions with healthcare professionals.';
    return '';
  };

  // Static feature tags from the public sectors page
  const getSectorFeatures = (name: string): string[] => {
    const n = name.toLowerCase();
    if (n.includes('cultural')) return ['Artist of the Month', 'Monthly Live Show', 'Weekly Streaming', 'Best Contributor', 'Artistic Carnival'];
    if (n.includes('photo')) return ['Photographer of the Month', 'Weekly Tutorial', 'Monthly Workshop', 'Outdoor Event Cover', 'Photo Exhibition'];
    if (n.includes('blood')) return ['Monthly Report', 'Blood Donor List', 'Best Contributor', 'Outdoor Event', 'Blood Donor Appreciation'];
    if (n.includes('nature') || n.includes('environment')) return ['Conservation Event', 'Clean-up Drive', 'Seminar', 'Indoor Activities', 'Best Contributor'];
    if (n.includes('education')) return ['Regular Workshops', 'Resource Distribution', 'Class Sessions', 'Awareness Programs', 'Best Contributors'];
    if (n.includes('charity')) return ['Fundraising Drives', 'Relief Distribution', 'Charity Activities', 'Special Events', 'Best Contributor'];
    if (n.includes('medical')) return ['Health Awareness', 'Health Camps', 'Health Supplies', 'Medical Sessions', 'Best Contributor'];
    return [];
  };

  // Map sector/club name keywords to public image paths
  const getSectorImage = (name: string, imageUrl?: string | null): string => {
    if (imageUrl) return imageUrl;
    const n = name.toLowerCase();
    if (n.includes('cultural')) return '/sectors/cultural.png';
    if (n.includes('photo')) return '/sectors/photography.png';
    if (n.includes('blood')) return '/sectors/blood.png';
    if (n.includes('nature') || n.includes('environment')) return '/sectors/nature.png';
    if (n.includes('education')) return '/sectors/education.png';
    if (n.includes('charity')) return '/sectors/charity.png';
    if (n.includes('medical')) return '/sectors/medical.png';
    return '/sectors/cultural.png';
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
                          const ImgCtor = (globalThis as any).Image;
                          const img = new ImgCtor();
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

        {/* Sectors & Clubs Section */}
        <div className="bg-white border border-gray-200 rounded-md mt-4">
          <button
            className="w-full text-left px-4 py-3 flex items-center justify-between"
            onClick={() => {
              setOrgsExpanded(v => {
                const next = !v;
                if (next && sectors.length === 0) fetchOrgs();
                return next;
              });
            }}
            aria-expanded={orgsExpanded}
          >
            <div>
              <div className="text-sm font-medium text-gray-900">Sectors &amp; Clubs</div>
              <div className="text-xs text-gray-500">Browse and request to join sectors or clubs.</div>
            </div>
            <div className="text-gray-500">{orgsExpanded ? '−' : '+'}</div>
          </button>

          {orgsExpanded && (
            <div className="p-4 border-t border-gray-100 space-y-6">

              {/* Current memberships banner */}
              {(userSectors.length > 0 || userClubs.length > 0) && (
                <div className="flex flex-wrap gap-2 p-3 bg-[#0b2545]/5 rounded-lg border border-[#0b2545]/10">
                  <span className="text-xs font-semibold text-[#0b2545] w-full mb-1">Your memberships</span>
                  {userSectors.map(id => {
                    const s = sectors.find(x => x.id === id);
                    return (
                      <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0b2545] text-white text-xs font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        {s?.name || id}
                      </span>
                    );
                  })}
                  {userClubs.map(id => {
                    const c = clubs.find(x => x.id === id);
                    return (
                      <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        {c?.name || id}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Sectors */}
              {sectors.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Sectors</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {sectors.map((sector) => {
                      const isMember = userSectors.includes(sector.id);
                      const request = joinRequests.find(r => r.type === 'SECTOR' && r.entityId === sector.id);
                      const isPending = request?.status === 'PENDING';
                      const isClosed = !sector.isOpen;
                      return (
                        <button
                          key={sector.id}
                          onClick={() => setSelectedOrg({ id: sector.id, name: sector.name, type: 'SECTOR', imageUrl: sector.imageUrl, description: sector.description, isOpen: sector.isOpen })}
                          className="group relative flex flex-col rounded-xl border border-gray-100 bg-gray-50 hover:border-[#0b2545]/30 hover:bg-white hover:shadow-md transition-all text-left overflow-hidden"
                        >
                          <div className="w-full bg-white overflow-hidden">
                            <Image
                              src={getSectorImage(sector.name, sector.imageUrl)}
                              alt={sector.name}
                              width={400}
                              height={300}
                              className="w-full h-auto"
                            />
                          </div>
                          {/* status badges */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1">
                            {isClosed && (
                              <span className="px-2 py-0.5 rounded-full bg-gray-800/80 text-white text-[10px] font-semibold backdrop-blur-sm">Closed</span>
                            )}
                            {isMember && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-semibold shadow">
                                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Member
                              </span>
                            )}
                            {!isMember && isPending && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-white text-[10px] font-semibold shadow">Pending</span>
                            )}
                          </div>
                          <div className="px-3 py-2.5">
                            <div className="font-semibold text-sm text-gray-900 leading-tight">{sector.name}</div>
                            <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{getSectorDescription(sector.name, sector.description)}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Clubs */}
              {clubs.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Clubs</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {clubs.map((club) => {
                      const isMember = userClubs.includes(club.id);
                      const request = joinRequests.find(r => r.type === 'CLUB' && r.entityId === club.id);
                      const isPending = request?.status === 'PENDING';
                      const isClosed = !club.isOpen;
                      return (
                        <button
                          key={club.id}
                          onClick={() => setSelectedOrg({ id: club.id, name: club.name, type: 'CLUB', imageUrl: club.imageUrl, description: club.description, isOpen: club.isOpen })}
                          className="group relative flex flex-col rounded-xl border border-gray-100 bg-gray-50 hover:border-[#0b2545]/30 hover:bg-white hover:shadow-md transition-all text-left overflow-hidden"
                        >
                          <div className="w-full bg-gradient-to-br from-[#0b2545]/10 to-emerald-50 overflow-hidden">
                            {club.imageUrl ? (
                              <Image src={club.imageUrl} alt={club.name} width={400} height={300} className="w-full h-auto" />
                            ) : (
                              <div className="aspect-[4/3] flex items-center justify-center text-4xl">🏆</div>
                            )}
                          </div>
                          <div className="absolute top-2 left-2 flex flex-col gap-1">
                            {isClosed && (
                              <span className="px-2 py-0.5 rounded-full bg-gray-800/80 text-white text-[10px] font-semibold backdrop-blur-sm">Closed</span>
                            )}
                            {isMember && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-semibold shadow">
                                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Member
                              </span>
                            )}
                            {!isMember && isPending && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-white text-[10px] font-semibold shadow">Pending</span>
                            )}
                          </div>
                          <div className="px-3 py-2.5">
                            <div className="font-semibold text-sm text-gray-900 leading-tight">{club.name}</div>
                            {club.description && (
                              <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{club.description}</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {sectors.length === 0 && clubs.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-8">No sectors or clubs available.</div>
              )}
            </div>
          )}
        </div>

        {/* Org Details Modal */}
        {selectedOrg && (() => {
          const isMember = selectedOrg.type === 'SECTOR' ? userSectors.includes(selectedOrg.id) : userClubs.includes(selectedOrg.id);
          const request = joinRequests.find(r => r.type === selectedOrg.type && r.entityId === selectedOrg.id);
          const isPending = request?.status === 'PENDING';
          const isRejected = request?.status === 'REJECTED';
          const isClosed = !selectedOrg.isOpen;
          const canRequest = !isMember && !isPending;
          const features = selectedOrg.type === 'SECTOR' ? getSectorFeatures(selectedOrg.name) : [];
          const description = getSectorDescription(selectedOrg.name, selectedOrg.description);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrg(null)}>
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
              <div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                {/* Header image — natural aspect ratio, no cropping */}
                <div className="relative w-full bg-gray-100 flex-shrink-0">
                  {selectedOrg.type === 'SECTOR' ? (
                    <Image
                      src={getSectorImage(selectedOrg.name, selectedOrg.imageUrl)}
                      alt={selectedOrg.name}
                      width={800}
                      height={600}
                      className="w-full h-auto"
                    />
                  ) : selectedOrg.imageUrl ? (
                    <Image src={selectedOrg.imageUrl} alt={selectedOrg.name} width={800} height={600} className="w-full h-auto" />
                  ) : (
                    <div className="aspect-[4/3] bg-gradient-to-br from-[#0b2545]/20 to-emerald-100 flex items-center justify-center text-6xl">🏆</div>
                  )}
                  {/* Close button */}
                  <button
                    onClick={() => setSelectedOrg(null)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                    aria-label="Close"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                  {/* Closed overlay badge */}
                  {isClosed && (
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full bg-gray-900/80 text-white text-xs font-semibold backdrop-blur-sm">Not Accepting Applications</span>
                    </div>
                  )}
                </div>

                {/* Body — scrollable */}
                <div className="p-5 space-y-4 overflow-y-auto">
                  {/* Name + type */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{selectedOrg.type === 'SECTOR' ? 'Sector' : 'Club'}</div>
                    <div className="text-xl font-bold text-[#0b2545] leading-tight">{selectedOrg.name}</div>
                  </div>

                  {/* Current membership status */}
                  <div className="flex flex-wrap gap-2">
                    {isMember ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        You are a member
                      </span>
                    ) : isPending ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold border border-amber-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Request pending approval
                      </span>
                    ) : isRejected ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold border border-red-200">
                        Previous request rejected
                      </span>
                    ) : !isClosed ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium border border-gray-200">
                        Not a member
                      </span>
                    ) : null}
                    {isClosed && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium border border-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        Not accepting applications
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {description && (
                    <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
                  )}

                  {/* Feature tags */}
                  {features.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {features.map(f => (
                        <span key={f} className="px-2 py-0.5 rounded-md bg-[#0b2545]/8 text-[#0b2545] text-[11px] font-medium border border-[#0b2545]/10">{f}</span>
                      ))}
                    </div>
                  )}

                  {/* Action */}
                  {canRequest && !isClosed && (
                    <button
                      onClick={async () => {
                        await handleJoinRequest(selectedOrg.type, selectedOrg.id);
                        setSelectedOrg(null);
                      }}
                      disabled={submittingJoin === selectedOrg.id}
                      className="w-full py-2.5 rounded-xl bg-[#0b2545] hover:bg-[#0d2d5a] text-white text-sm font-semibold disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                    >
                      {submittingJoin === selectedOrg.id ? (
                        <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      ) : null}
                      {submittingJoin === selectedOrg.id ? 'Submitting…' : isRejected ? 'Re-apply to Join' : 'Request to Join'}
                    </button>
                  )}

                  {isClosed && canRequest && (
                    <div className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-400 text-sm font-medium text-center cursor-not-allowed select-none">
                      Applications currently closed
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedOrg(null)}
                    className="w-full py-2 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
      )}

    </DashboardLayout>
  );
}
